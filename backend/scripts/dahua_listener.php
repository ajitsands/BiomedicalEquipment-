<?php
// Dahua DHI-ASI1201M-MEP Real-Time RFID Access Control Listener Daemon
// Connects to Dahua Reader at 192.168.8.108 and auto-toggles asset location
// Biomedical Equipment Maintenance Management System
// Powered and Engineered by SaNDS Lab Middle East W.L.L

require_once __DIR__ . '/../config/db.php';

$dahuaIp = '192.168.8.108';
$dahuaPort = 80;
$dahuaUser = 'admin';
$dahuaPass = 'admin@123';

echo "\n=======================================================\n";
echo " Dahua DHI-ASI1201M-MEP RFID Live Listener Service\n";
echo " Reader IP: {$dahuaIp} | Port: {$dahuaPort}\n";
echo " Monitored Asset: BME-OT-ANES-008 (Anesthesia Workstation OT-2)\n";
echo " Monitored RFID Cards: 6F4244DB | BMEOTANES008 | FFCD3BDB\n";
echo "=======================================================\n\n";

$onceMode = in_array('--once', $argv);
$lastProcessedRecNo = null;

function callDahua($path, $ip = null, $port = 80) {
    global $dahuaIp, $dahuaPort, $dahuaUser, $dahuaPass;
    $targetIp = $ip ?: $dahuaIp;
    $targetPort = $port ?: $dahuaPort;
    $ch = curl_init("http://{$targetIp}:{$targetPort}{$path}");
    curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_DIGEST);
    curl_setopt($ch, CURLOPT_USERPWD, "{$dahuaUser}:{$dahuaPass}");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 2);
    curl_setopt($ch, CURLOPT_TIMEOUT, 4);
    $res = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['ok' => ($httpCode === 200), 'response' => $res];
}

function parseDahuaRecords($rawText) {
    $lines = explode("\n", str_replace("\r", "", $rawText));
    $parsed = [];
    foreach ($lines as $line) {
        $p = strpos($line, '=');
        if ($p !== false) {
            $parsed[trim(substr($line, 0, $p))] = trim(substr($line, $p + 1));
        }
    }
    return $parsed;
}

function processCardSwipe($cardNo, $pdo, $dahuaIp) {
    $rawCard = trim($cardNo);
    if (empty($rawCard)) return;

    $hexCard = (is_numeric($rawCard) && (int)$rawCard > 100000) ? strtoupper(dechex((int)$rawCard)) : strtoupper($rawCard);

    // Dynamic lookup for ANY registered medical equipment
    $stmt = $pdo->prepare("SELECT * FROM equipments WHERE 
        rfid_tag_id = ? 
        OR rfid_card_hex = ? 
        OR rfid_card_alias = ? 
        OR rfid_tag_id = ? 
        OR rfid_card_hex = ? 
        OR rfid_card_alias = ?
        ORDER BY (rfid_tag_id = ? OR rfid_card_hex = ?) DESC, id DESC 
        LIMIT 1");
    $stmt->execute([$rawCard, $rawCard, $rawCard, $hexCard, $hexCard, $hexCard, $rawCard, $hexCard]);
    $eq = $stmt->fetch();

    if (!$eq) {
        echo "[-] Card {$rawCard} (Hex: {$hexCard}) detected, but not registered to any equipment in database.\n";
        return;
    }

    // 5-second debounce check: if this same card/asset was swiped within the last 5 seconds, ignore duplicate!
    $recentStmt = $pdo->prepare("SELECT movement_direction, scan_timestamp 
        FROM rfid_scan_logs 
        WHERE (equipment_id = ? OR raw_card_number = ? OR rfid_tag_id = ?) 
          AND scan_timestamp >= (NOW() - INTERVAL 5 SECOND)
        ORDER BY id DESC LIMIT 1");
    $recentStmt->execute([$eq['id'], $rawCard, $eq['rfid_tag_id']]);
    $recentLog = $recentStmt->fetch();

    if ($recentLog) {
        echo "[i] Debounce: Card {$rawCard} already processed at {$recentLog['scan_timestamp']} ({$recentLog['movement_direction']}). Skipping duplicate toggle.\n";
        return;
    }

    // Resolve Reader Node dynamically from database
    $rStmt = $pdo->prepare("SELECT r.*, d.name as department_name, d.building as dept_building, d.floor as dept_floor
        FROM rfid_readers r
        LEFT JOIN departments d ON r.department_id = d.id
        WHERE r.ip_address = ? LIMIT 1");
    $rStmt->execute([$dahuaIp]);
    $reader = $rStmt->fetch();

    $targetDeptId = !empty($reader['department_id']) ? (int)$reader['department_id'] : (int)$eq['department_id'];
    $targetDeptName = !empty($reader['department_name']) ? $reader['department_name'] : 'Operation Theatre Complex (OT)';
    $building = !empty($reader['building']) ? $reader['building'] : ($reader['dept_building'] ?? 'Surgical Pavilion B');
    $floor = !empty($reader['floor']) ? $reader['floor'] : ($reader['dept_floor'] ?? '2nd Floor');
    $doorZone = !empty($reader['door_zone']) ? $reader['door_zone'] : "{$targetDeptName} Gate";
    $readerNode = $reader ? $reader['name'] : "DHI-ASI1201M-MEP ({$dahuaIp})";

    $currentTransit = strtoupper($eq['transit_status'] ?? 'IN');
    $currentDeptId = (int)($eq['department_id'] ?? 0);
    $isCrossDepartment = ($currentDeptId !== $targetDeptId);

    if ($isCrossDepartment) {
        $newTransit = 'IN';
        $deptId = $targetDeptId;
        $deptName = $targetDeptName;
        $room = "{$doorZone} (Inside Department)";
    } elseif ($currentTransit === 'OUT') {
        $newTransit = 'IN';
        $deptId = $targetDeptId;
        $deptName = $targetDeptName;
        $room = (!empty($eq['room_number']) && !str_contains($eq['room_number'], 'Gate')) ? $eq['room_number'] : "{$doorZone} (Inside Department)";
    } else {
        $newTransit = 'OUT';
        $deptId = $targetDeptId;
        $deptName = 'In Transit / Corridor';
        $room = "{$doorZone} (Outside Department / In Transit)";
    }

    $pdo->beginTransaction();

    $logStmt = $pdo->prepare("INSERT INTO rfid_scan_logs (
        equipment_id, rfid_tag_id, raw_card_number, movement_direction,
        reader_id, reader_ip, detected_building, detected_floor,
        detected_department, detected_room, signal_strength_rssi
    ) VALUES (?, ?, ?, ?, 'DHI-ASI1201M-MEP', ?, ?, ?, ?, ?, -46)");

    $logStmt->execute([
        $eq['id'],
        $eq['rfid_tag_id'],
        $rawCard,
        $newTransit,
        $dahuaIp,
        $building,
        $floor,
        $deptName,
        $room
    ]);

    $upStmt = $pdo->prepare("UPDATE equipments SET 
        building = ?, floor = ?, room_number = ?, department_id = ?,
        transit_status = ?, rfid_last_detected_at = NOW(),
        rfid_reader_node = ?
        WHERE id = ?");
    $upStmt->execute([$building, $floor, $room, $deptId, $newTransit, $readerNode, $eq['id']]);

    $pdo->commit();

    $formattedTime = formatSystemDateTime(date('Y-m-d H:i:s'), true);

    echo "\n>>> [CARD DETECTED AT DAHUA READER {$dahuaIp}]\n";
    echo "    Card No: {$rawCard} (Hex: {$hexCard})\n";
    echo "    Matched Asset: {$eq['name']} ({$eq['asset_id']})\n";
    echo "    New Direction: " . ($newTransit === 'IN' ? "[🟢 IN - IN DEPARTMENT]" : "[🟠 OUT - EXITED DOOR]") . "\n";
    echo "    Location: {$room}\n";
    echo "    Timestamp: {$formattedTime}\n\n";
}

// Initialize active Dahua readers from database
$readersStmt = $pdo->query("SELECT r.*, d.name as department_name, d.building as dept_building, d.floor as dept_floor
    FROM rfid_readers r
    LEFT JOIN departments d ON r.department_id = d.id
    WHERE r.is_active = 1 AND (r.reader_type LIKE '%Dahua%' OR r.device_model LIKE '%DHI%' OR r.ip_address IN ('192.168.8.108', '192.168.8.109'))
    ORDER BY r.id ASC");
$activeDahuaReaders = $readersStmt->fetchAll();

if (empty($activeDahuaReaders)) {
    $activeDahuaReaders = [[
        'id' => 1,
        'ip_address' => $dahuaIp,
        'port' => $dahuaPort,
        'department_id' => 2,
        'department_name' => 'Operation Theatre Complex (OT)',
        'door_zone' => 'Operation Theatre Complex (OT Gate)',
        'name' => 'DHI-ASI1201M-MEP (192.168.8.108)'
    ]];
}

echo "[*] Monitoring Active Dahua Readers in Hospital Network:\n";
foreach ($activeDahuaReaders as $reader) {
    echo "    - Node #{$reader['id']}: {$reader['name']} (IP: {$reader['ip_address']}) -> Dept: {$reader['department_name']}\n";
    
    // Check connection
    $info = callDahua("/cgi-bin/magicBox.cgi?action=getSystemInfo", $reader['ip_address'], $reader['port']);
    if ($info['ok']) {
        echo "      [+] Online & Connected to {$reader['ip_address']}\n";
    } else {
        echo "      [-] Warning: Unreachable at {$reader['ip_address']} (will retry during loop)\n";
    }
}

echo "\n[*] Listening for real-time RFID card swipes across all readers... Press Ctrl+C to stop.\n\n";

while (true) {
    try {
        foreach ($activeDahuaReaders as $reader) {
            $curIp = $reader['ip_address'];
            $curPort = !empty($reader['port']) ? (int)$reader['port'] : 80;
            $settingKey = 'dahua_recno_' . str_replace('.', '_', $curIp);

            $recRes = callDahua("/cgi-bin/recordFinder.cgi?action=find&name=AccessControlCardRec&count=5000", $curIp, $curPort);
            if (!$recRes['ok']) {
                continue;
            }

            $parsed = parseDahuaRecords($recRes['response']);
            $found = (int)($parsed['found'] ?? 0);
            if ($found === 0) continue;

            // Get last processed RecNo for this specific reader IP
            $recStmt = $pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = ?");
            $recStmt->execute([$settingKey]);
            $lastSavedRecVal = $recStmt->fetchColumn();

            $maxRecNo = 0;
            $records = [];
            for ($i = 0; $i < $found; $i++) {
                $recNo = (int)($parsed["records[{$i}].RecNo"] ?? 0);
                $cardNo = $parsed["records[{$i}].CardNo"] ?? '';
                $userId = $parsed["records[{$i}].UserID"] ?? '';
                if ($recNo > $maxRecNo) $maxRecNo = $recNo;

                if (!empty($cardNo) || !empty($userId)) {
                    $records[] = [
                        'rec_no' => $recNo,
                        'card_no' => $cardNo,
                        'user_id' => $userId
                    ];
                }
            }

            if ($lastSavedRecVal === false || $lastSavedRecVal === null) {
                // Initialize setting for this reader
                $pdo->prepare("INSERT INTO system_settings (setting_key, setting_value, category, description) VALUES (?, ?, 'hardware', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)")
                    ->execute([$settingKey, $maxRecNo, "Last processed RecNo for reader {$curIp}"]);
                continue;
            }

            $lastProcessed = (int)$lastSavedRecVal;

            foreach ($records as $r) {
                if ($r['rec_no'] > $lastProcessed) {
                    $effectiveCard = !empty($r['card_no']) ? $r['card_no'] : $r['user_id'];
                    $lastProcessed = $r['rec_no'];
                    $pdo->prepare("UPDATE system_settings SET setting_value = ? WHERE setting_key = ?")->execute([$lastProcessed, $settingKey]);
                    processCardSwipe($effectiveCard, $pdo, $curIp);
                }
            }
        }
    } catch (Exception $e) {
        echo "[-] Error during poll: " . $e->getMessage() . "\n";
    }

    if ($onceMode) break;
    sleep(2);
}
