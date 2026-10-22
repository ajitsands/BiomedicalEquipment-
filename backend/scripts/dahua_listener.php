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

function callDahua($path) {
    global $dahuaIp, $dahuaPort, $dahuaUser, $dahuaPass;
    $ch = curl_init("http://{$dahuaIp}:{$dahuaPort}{$path}");
    curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_DIGEST);
    curl_setopt($ch, CURLOPT_USERPWD, "{$dahuaUser}:{$dahuaPass}");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);
    curl_setopt($ch, CURLOPT_TIMEOUT, 6);
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

    $currentTransit = strtoupper($eq['transit_status'] ?? 'IN');
    $newTransit = ($currentTransit === 'IN') ? 'OUT' : 'IN';

    $homeRoom = !empty($eq['room_number']) && !str_contains($eq['room_number'], 'Gate') ? $eq['room_number'] : 'OT Suite 3';
    $building = !empty($eq['building']) ? $eq['building'] : 'Surgical Pavilion B';
    $floor = !empty($eq['floor']) ? $eq['floor'] : '2nd Floor';
    $deptId = !empty($eq['department_id']) ? (int)$eq['department_id'] : 2;

    if ($newTransit === 'OUT') {
        $room = 'OT Exit Gate (Outside Department / In Transit)';
        $deptName = 'In Transit / Corridor';
    } else {
        $room = "{$homeRoom} (Inside Department)";
        $deptName = 'Operation Theatre Complex (OT)';
    }
    $readerNode = "DHI-ASI1201M-MEP ({$dahuaIp})";

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

// Initial status check
$info = callDahua("/cgi-bin/magicBox.cgi?action=getSystemInfo");
if (!$info['ok']) {
    echo "[-] Warning: Unable to connect to Dahua reader at {$dahuaIp}. Retrying...\n";
} else {
    echo "[+] Successfully connected to Dahua reader ({$dahuaIp})!\n";
}

// Initialize latest RecNo from system_settings or reader
$recStmt = $pdo->query("SELECT setting_value FROM system_settings WHERE setting_key = 'dahua_last_processed_recno'");
$savedRec = $recStmt->fetchColumn();

if ($savedRec !== false && $savedRec !== null) {
    $lastProcessedRecNo = (int)$savedRec;
    echo "[+] Initialized with stored RecNo from database: {$lastProcessedRecNo}\n";
} else {
    $initRecords = callDahua("/cgi-bin/recordFinder.cgi?action=find&name=AccessControlCardRec&count=500");
    if ($initRecords['ok']) {
        $parsed = parseDahuaRecords($initRecords['response']);
        $found = (int)($parsed['found'] ?? 0);
        if ($found > 0) {
            $lastProcessedRecNo = (int)($parsed["records[" . ($found - 1) . "].RecNo"] ?? 0);
            echo "[+] Initialized with Dahua latest record RecNo: {$lastProcessedRecNo}\n";
            $pdo->prepare("INSERT INTO system_settings (setting_key, setting_value, category, description) VALUES ('dahua_last_processed_recno', ?, 'hardware', 'Last processed Dahua RecNo') ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)")->execute([$lastProcessedRecNo]);
        }
    }
}

echo "[*] Listening for real-time RFID card swipes... Press Ctrl+C to stop.\n\n";

while (true) {
    try {
        $recRes = callDahua("/cgi-bin/recordFinder.cgi?action=find&name=AccessControlCardRec&count=500");
        if ($recRes['ok']) {
            $parsed = parseDahuaRecords($recRes['response']);
            $found = (int)($parsed['found'] ?? 0);
            if ($found > 0) {
                for ($i = 0; $i < $found; $i++) {
                    $recNo = (int)($parsed["records[{$i}].RecNo"] ?? 0);
                    $cardNo = $parsed["records[{$i}].CardNo"] ?? '';
                    $userId = $parsed["records[{$i}].UserID"] ?? '';

                    if ($lastProcessedRecNo === null || $recNo > $lastProcessedRecNo) {
                        $lastProcessedRecNo = $recNo;
                        $pdo->prepare("UPDATE system_settings SET setting_value = ? WHERE setting_key = 'dahua_last_processed_recno'")->execute([$lastProcessedRecNo]);
                        $effectiveCard = !empty($cardNo) ? $cardNo : $userId;
                        processCardSwipe($effectiveCard, $pdo, $dahuaIp);
                    }
                }
            }
        }
    } catch (Exception $e) {
        echo "[-] Error during poll: " . $e->getMessage() . "\n";
    }

    if ($onceMode) break;
    sleep(2);
}
