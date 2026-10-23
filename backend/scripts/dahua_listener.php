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

function processCardSwipe($cardNo, $pdo, $dahuaIp, $recordTimestamp = null, $deviceRecNo = null) {
    $rawCard = trim($cardNo);
    if (empty($rawCard)) return;

    $hexCard = (is_numeric($rawCard) && (int)$rawCard > 100000) ? strtoupper(dechex((int)$rawCard)) : strtoupper($rawCard);

    // 1. Check if this exact reader scan record is ALREADY stored in database
    if (!empty($recordTimestamp) || !empty($deviceRecNo)) {
        $chkStmt = $pdo->prepare("SELECT id FROM rfid_scan_logs 
            WHERE reader_ip = ? 
              AND (raw_card_number = ? OR rfid_tag_id = ? OR raw_card_number = ? OR rfid_tag_id = ?) 
              AND (
                  (device_timestamp = ? AND device_timestamp > 0)
                  OR (device_rec_no = ? AND device_rec_no > 0)
              )
            LIMIT 1");
        $chkStmt->execute([$dahuaIp, $rawCard, $rawCard, $hexCard, $hexCard, (int)$recordTimestamp, (int)$deviceRecNo]);
        if ($chkStmt->fetchColumn()) {
            return; // Already processed and present in database! Ignore duplicate.
        }
    }

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
        return;
    }

    // 2. Chronological Guard: Check asset's last detected device timestamp
    $lastAssetDeviceTime = (int)($eq['rfid_last_device_time'] ?? 0);

    // Resolve Reader Node dynamically from database
    $rStmt = $pdo->prepare("SELECT r.*, d.name as department_name, d.building as dept_building, d.floor as dept_floor
        FROM rfid_readers r
        LEFT JOIN departments d ON r.department_id = d.id
        WHERE r.ip_address = ? LIMIT 1");
    $rStmt->execute([$dahuaIp]);
    $reader = $rStmt->fetch();

    $currentDeptId = (int)($eq['department_id'] ?? 0);
    $targetDeptId = !empty($reader['department_id']) ? (int)$reader['department_id'] : $currentDeptId;
    $isCrossDepartment = ($currentDeptId !== $targetDeptId);

    // If an asset was already scanned at a later time, an older swipe from another reader CANNOT pull it backwards into the past!
    if ($isCrossDepartment && !empty($recordTimestamp) && $lastAssetDeviceTime > 0 && (int)$recordTimestamp <= $lastAssetDeviceTime) {
        return;
    }

    // 3. 4-second debounce check: if this same card/asset was swiped within the last 4 seconds, ignore duplicate!
    $recentStmt = $pdo->prepare("SELECT movement_direction, scan_timestamp 
        FROM rfid_scan_logs 
        WHERE (equipment_id = ? OR raw_card_number = ? OR rfid_tag_id = ?) 
          AND scan_timestamp >= (NOW() - INTERVAL 4 SECOND)
        ORDER BY id DESC LIMIT 1");
    $recentStmt->execute([$eq['id'], $rawCard, $eq['rfid_tag_id']]);
    $recentLog = $recentStmt->fetch();

    if ($recentLog) {
        return;
    }

    $targetDeptName = !empty($reader['department_name']) ? $reader['department_name'] : 'Department';
    $building = !empty($reader['building']) ? $reader['building'] : ($reader['dept_building'] ?? $eq['building'] ?? 'Hospital Main Building');
    $floor = !empty($reader['floor']) ? $reader['floor'] : ($reader['dept_floor'] ?? $eq['floor'] ?? 'Ground Floor');
    $doorZone = !empty($reader['door_zone']) ? $reader['door_zone'] : "{$targetDeptName} Gate";
    $readerNode = $reader ? $reader['name'] : "Reader ({$dahuaIp})";
    $readerCode = $reader ? ($reader['reader_code'] ?: $reader['device_model']) : 'DHI-ASI1201M-MEP';

    $currentTransit = strtoupper($eq['transit_status'] ?? 'IN');

    if ($isCrossDepartment) {
        // CROSS-DEPARTMENT TRANSFER:
        // Asset arrived at a different department's reader -> Relocate to new department and mark 🟢 IN!
        $newTransit = 'IN';
        $deptId = $targetDeptId;
        $deptName = $targetDeptName;
        $room = "{$doorZone} (Inside Department)";
        echo "[+] Transferring asset {$eq['asset_id']} to new Department: {$deptName} (🟢 IN)\n";
    } elseif ($currentTransit === 'OUT') {
        // SAME DEPARTMENT RETURN:
        // Asset was OUT in transit -> Returned to this department as 🟢 IN!
        $newTransit = 'IN';
        $deptId = $targetDeptId;
        $deptName = $targetDeptName;
        $room = (!empty($eq['room_number']) && !str_contains($eq['room_number'], 'Gate') && !str_contains($eq['room_number'], 'Outside')) ? $eq['room_number'] : "{$doorZone} (Inside Department)";
        echo "[+] Asset {$eq['asset_id']} returned to {$deptName} (🟢 IN)\n";
    } else {
        // SAME DEPARTMENT EXIT:
        // Asset was IN this department -> Exited as 🟠 OUT!
        $newTransit = 'OUT';
        $deptId = $targetDeptId;
        $deptName = 'In Transit / Corridor';
        $room = "{$doorZone} (Outside Department / In Transit)";
        echo "[+] Asset {$eq['asset_id']} exited {$targetDeptName} (🟠 OUT / In Transit)\n";
    }

    $newDeviceTime = !empty($recordTimestamp) ? (int)$recordTimestamp : max($lastAssetDeviceTime, time());

    $pdo->beginTransaction();

    $logStmt = $pdo->prepare("INSERT INTO rfid_scan_logs (
        equipment_id, rfid_tag_id, raw_card_number, movement_direction,
        reader_id, reader_ip, detected_building, detected_floor,
        detected_department, detected_room, signal_strength_rssi,
        device_rec_no, device_timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, -46, ?, ?)");

    $logStmt->execute([
        $eq['id'],
        $eq['rfid_tag_id'],
        $rawCard,
        $newTransit,
        $readerCode,
        $dahuaIp,
        $building,
        $floor,
        $deptName,
        $room,
        $deviceRecNo,
        $recordTimestamp
    ]);

    $upStmt = $pdo->prepare("UPDATE equipments SET 
        building = ?, floor = ?, room_number = ?, department_id = ?,
        transit_status = ?, rfid_last_detected_at = NOW(),
        rfid_last_device_time = ?,
        rfid_reader_node = ?
        WHERE id = ?");
    $upStmt->execute([$building, $floor, $room, $deptId, $newTransit, $newDeviceTime, $readerNode, $eq['id']]);

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
            $settingTimeKey = 'dahua_time_' . str_replace('.', '_', $curIp);

            $recRes = callDahua("/cgi-bin/recordFinder.cgi?action=find&name=AccessControlCardRec&count=5000", $curIp, $curPort);
            if (!$recRes['ok']) {
                continue;
            }

            $parsed = parseDahuaRecords($recRes['response']);
            $found = (int)($parsed['found'] ?? 0);
            
            // If reader buffer is empty (found = 0), keep existing pointer and continue
            if ($found === 0) {
                continue;
            }

            // Get last processed RecNo and Device Timestamp for this specific reader IP
            $recStmt = $pdo->prepare("SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN (?, ?)");
            $recStmt->execute([$settingKey, $settingTimeKey]);
            $savedSettings = $recStmt->fetchAll(PDO::FETCH_KEY_PAIR);

            $lastSavedRec = isset($savedSettings[$settingKey]) ? (int)$savedSettings[$settingKey] : null;
            $lastSavedTime = isset($savedSettings[$settingTimeKey]) ? (int)$savedSettings[$settingTimeKey] : 0;

            $maxRecNo = 0;
            $maxTime = 0;
            $records = [];
            for ($i = 0; $i < $found; $i++) {
                $recNo = (int)($parsed["records[{$i}].RecNo"] ?? 0);
                $cardNo = $parsed["records[{$i}].CardNo"] ?? '';
                $userId = $parsed["records[{$i}].UserID"] ?? '';
                $createTime = (int)($parsed["records[{$i}].CreateTime"] ?? $parsed["records[{$i}].CreateTimeRealUTC"] ?? 0);
                if ($recNo > $maxRecNo) $maxRecNo = $recNo;
                if ($createTime > $maxTime) $maxTime = $createTime;

                if (!empty($cardNo) || !empty($userId)) {
                    $records[] = [
                        'rec_no' => $recNo,
                        'card_no' => $cardNo,
                        'user_id' => $userId,
                        'create_time' => $createTime
                    ];
                }
            }

            if ($lastSavedRec === null) {
                // Brand-new reader never seen before in database: initialize pointers to current max RecNo & Time
                $pdo->prepare("INSERT INTO system_settings (setting_key, setting_value, category, description) VALUES (?, ?, 'hardware', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)")
                    ->execute([$settingKey, $maxRecNo, "Last processed RecNo for reader {$curIp}"]);
                $pdo->prepare("INSERT INTO system_settings (setting_key, setting_value, category, description) VALUES (?, ?, 'hardware', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)")
                    ->execute([$settingTimeKey, $maxTime, "Last processed Device Timestamp for reader {$curIp}"]);
                continue;
            }

            $lastProcessed = $lastSavedRec;

            // Handle wrap-around or manual hardware clear: fast-forward pointer to maxRecNo
            if ($maxRecNo > 0 && $maxRecNo < $lastProcessed) {
                echo "[*] Reader {$curIp} records reset or wrapped around (max: {$maxRecNo} < last: {$lastProcessed}). Fast-forwarding bookmark to {$maxRecNo}.\n";
                $lastProcessed = $maxRecNo;
                $pdo->prepare("UPDATE system_settings SET setting_value = ? WHERE setting_key = ?")->execute([$maxRecNo, $settingKey]);
                $pdo->prepare("UPDATE system_settings SET setting_value = ? WHERE setting_key = ?")->execute([$maxTime, $settingTimeKey]);
                continue;
            }

            foreach ($records as $r) {
                $effectiveCard = !empty($r['card_no']) ? $r['card_no'] : $r['user_id'];
                if (empty($effectiveCard)) continue;
                $recTime = (int)($r['create_time'] ?? 0);
                $recNo = (int)($r['rec_no'] ?? 0);
                $hexCard = (is_numeric($effectiveCard) && (int)$effectiveCard > 100000) ? strtoupper(dechex((int)$effectiveCard)) : strtoupper($effectiveCard);

                // User Rule: Check if record is ALREADY in rfid_scan_logs with reader IP, RFID card, and timestamp/rec_no. If present, IGNORE!
                if ($recTime > 0 || $recNo > 0) {
                    $chk = $pdo->prepare("SELECT id FROM rfid_scan_logs 
                        WHERE reader_ip = ? 
                          AND (raw_card_number = ? OR rfid_tag_id = ? OR raw_card_number = ? OR rfid_tag_id = ?) 
                          AND (
                              (device_timestamp = ? AND device_timestamp > 0)
                              OR (device_rec_no = ? AND device_rec_no > 0)
                          )
                        LIMIT 1");
                    $chk->execute([$curIp, $effectiveCard, $effectiveCard, $hexCard, $hexCard, $recTime, $recNo]);
                    if ($chk->fetchColumn()) {
                        continue; // Already processed and present in database! Ignore.
                    }
                }

                $isNew = ($recNo > $lastProcessed) || ($lastSavedTime > 0 && $recTime > $lastSavedTime);
                if ($isNew) {
                    $lastProcessed = max($lastProcessed, $recNo);
                    $lastSavedTime = max($lastSavedTime, $recTime);

                    $pdo->prepare("UPDATE system_settings SET setting_value = ? WHERE setting_key = ?")->execute([$lastProcessed, $settingKey]);
                    $pdo->prepare("INSERT INTO system_settings (setting_key, setting_value, category, description) VALUES (?, ?, 'hardware', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)")
                        ->execute([$settingTimeKey, $lastSavedTime, "Last processed Device Timestamp for reader {$curIp}"]);

                    processCardSwipe($effectiveCard, $pdo, $curIp, $recTime, $recNo);
                }
            }

            // Auto-Purge: When records on the device reach 500, clear device log so it restarts from 0
            if ($found >= 500 || $lastProcessed >= 500) {
                echo "[*] Reader {$curIp} reached {$lastProcessed} records. Purging device log to keep hardware lightweight...\n";
                callDahua("/cgi-bin/recordUpdater.cgi?action=clear&name=AccessControlCardRec", $curIp, $curPort);
                $pdo->prepare("UPDATE system_settings SET setting_value = '0' WHERE setting_key = ?")->execute([$settingKey]);
                echo "[+] Reader {$curIp} access log purged. Pointer reset to 0.\n";
            }
        }
    } catch (Exception $e) {
        echo "[-] Error during poll: " . $e->getMessage() . "\n";
    }

    if ($onceMode) break;
    sleep(2);
}
