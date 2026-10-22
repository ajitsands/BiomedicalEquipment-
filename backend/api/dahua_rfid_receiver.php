<?php
// Dahua DHI-ASI1201M-MEP RFID Access Control Integration Service & Webhook
// Biomedical Equipment Maintenance Management System
// Powered and Engineered by SaNDS Lab Middle East W.L.L

require_once __DIR__ . '/../config/db.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? $_POST['action'] ?? 'status';

$dahuaIp = '192.168.8.108';
$dahuaPort = 80;
$dahuaUser = 'admin';
$dahuaPass = 'admin@123';

/**
 * Execute Dahua HTTP Digest Request
 */
function callDahuaCgi($path, $timeout = 4) {
    global $dahuaIp, $dahuaPort, $dahuaUser, $dahuaPass;
    $url = "http://{$dahuaIp}:{$dahuaPort}{$path}";
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_DIGEST);
    curl_setopt($ch, CURLOPT_USERPWD, "{$dahuaUser}:{$dahuaPass}");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 2);
    curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    return [
        'ok' => ($httpCode === 200),
        'code' => $httpCode,
        'response' => $response,
        'error' => $error
    ];
}

/**
 * Parse Dahua key=value and records response format
 */
function parseDahuaKeyValue($text) {
    $lines = explode("\n", str_replace("\r", "", $text));
    $data = [];
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line)) continue;
        $pos = strpos($line, '=');
        if ($pos !== false) {
            $k = trim(substr($line, 0, $pos));
            $v = trim(substr($line, $pos + 1));
            $data[$k] = $v;
        }
    }
    return $data;
}

// 1. ACTION: Test / Trigger Instant Swipe (Toggle IN <-> OUT)
if ($action === 'test_swipe' || $action === 'toggle') {
    try {
        $card = $_GET['card_number'] ?? $_POST['card_number'] ?? '6F4244DB';
        $readerId = 'DHI-ASI1201M-MEP';
        $readerIp = $dahuaIp;

        // Call rfid_scan logic directly
        $stmt = $pdo->prepare("SELECT * FROM equipments WHERE 
            rfid_tag_id = ? 
            OR rfid_card_hex = ? 
            OR rfid_card_alias = ? 
            OR asset_id = 'BME-OT-ANES-008' 
            LIMIT 1");
        $stmt->execute([$card, $card, $card]);
        $eq = $stmt->fetch();

        if (!$eq) {
            jsonError("Target asset BME-OT-ANES-008 not found for card: {$card}", 404);
        }

        $currentTransit = strtoupper($eq['transit_status'] ?? 'IN');
        $newTransit = ($currentTransit === 'IN') ? 'OUT' : 'IN';

        if ($newTransit === 'OUT') {
            $building = 'Surgical Pavilion B';
            $floor = '2nd Floor';
            $room = 'OT Exit Gate (Outside Department / In Transit)';
            $deptName = 'In Transit / Corridor';
            $deptId = 2;
            $msg = "{$eq['name']} ({$eq['asset_id']}) has EXITED through OT Door Gate (OUT of Department).";
        } else {
            $building = 'Surgical Pavilion B';
            $floor = '2nd Floor';
            $room = 'OT Suite 2 (Inside Department)';
            $deptName = 'Operation Theatre Complex (OT)';
            $deptId = 2;
            $msg = "{$eq['name']} ({$eq['asset_id']}) has ENTERED and is now IN Department (OT Suite 2).";
        }

        $readerNode = "{$readerId} ({$readerIp})";

        $pdo->beginTransaction();

        $stmtLog = $pdo->prepare("INSERT INTO rfid_scan_logs (
            equipment_id, rfid_tag_id, raw_card_number, movement_direction,
            reader_id, reader_ip, detected_building, detected_floor,
            detected_department, detected_room, signal_strength_rssi
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

        $stmtLog->execute([
            $eq['id'],
            $eq['rfid_tag_id'],
            $card,
            $newTransit,
            $readerId,
            $readerIp,
            $building,
            $floor,
            $deptName,
            $room,
            -48
        ]);

        $logId = $pdo->lastInsertId();

        $stmtUp = $pdo->prepare("UPDATE equipments SET 
            building = ?, floor = ?, room_number = ?, department_id = ?,
            transit_status = ?, rfid_last_detected_at = NOW(), rfid_reader_node = ?
            WHERE id = ?");
        $stmtUp->execute([
            $building, $floor, $room, $deptId,
            $newTransit, $readerNode, $eq['id']
        ]);

        $pdo->commit();

        $formattedTime = formatSystemDateTime(date('Y-m-d H:i:s'), true);

        jsonResponse([
            'status' => 'success',
            'message' => $msg,
            'equipment_id' => $eq['id'],
            'asset_id' => $eq['asset_id'],
            'equipment_name' => $eq['name'],
            'card_number' => $card,
            'movement_direction' => $newTransit,
            'transit_status' => $newTransit,
            'reader_ip' => $readerIp,
            'reader_model' => $readerId,
            'detected_location' => [
                'building' => $building,
                'floor' => $floor,
                'department' => $deptName,
                'room' => $room
            ],
            'formatted_timestamp' => $formattedTime,
            'log_id' => $logId
        ]);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        jsonError("Failed to trigger Dahua RFID scan: " . $e->getMessage(), 500);
    }
}

// 2. ACTION: Poll Dahua Reader for Live Hardware Swipes
if ($action === 'poll' || $action === 'sync') {
    try {
        $res = callDahuaCgi("/cgi-bin/recordFinder.cgi?action=find&name=AccessControlCardRec&count=10");
        if (!$res['ok']) {
            jsonError("Failed to reach Dahua reader at {$dahuaIp}: " . ($res['error'] ?: "HTTP {$res['code']}"), 502);
        }

        $parsed = parseDahuaKeyValue($res['response']);
        $totalFound = (int)($parsed['found'] ?? 0);
        $records = [];

        // Group into individual record blocks
        for ($i = 0; $i < $totalFound; $i++) {
            $cardNo = $parsed["records[{$i}].CardNo"] ?? null;
            $cardName = $parsed["records[{$i}].CardName"] ?? null;
            $userId = $parsed["records[{$i}].UserID"] ?? null;
            $recNo = $parsed["records[{$i}].RecNo"] ?? null;
            $timeUtc = (int)($parsed["records[{$i}].CreateTimeRealUTC"] ?? $parsed["records[{$i}].CreateTime"] ?? 0);
            
            if ($cardNo) {
                $records[] = [
                    'index' => $i,
                    'rec_no' => $recNo,
                    'card_no' => $cardNo,
                    'card_name' => $cardName,
                    'user_id' => $userId,
                    'time_utc' => $timeUtc,
                    'datetime' => $timeUtc > 0 ? date('Y-m-d H:i:s', $timeUtc) : 'N/A'
                ];
            }
        }

        // Check if latest record is target card and if it needs syncing
        $latestRecord = !empty($records) ? end($records) : null;
        $syncedEvent = null;

        if ($latestRecord) {
            $targetCards = ['6F4244DB', 'FFCD3BDB', '1866613979', 'BMEOTANES008'];
            $matched = in_array(strtoupper($latestRecord['card_no']), $targetCards) ||
                       in_array(strtoupper($latestRecord['user_id'] ?? ''), $targetCards);

            if ($matched) {
                // Check if already processed in last 4 seconds to prevent duplicate bounce
                $checkStmt = $pdo->prepare("SELECT id, scan_timestamp, movement_direction FROM rfid_scan_logs 
                    WHERE (rfid_tag_id = ? OR raw_card_number = ?)
                    ORDER BY scan_timestamp DESC LIMIT 1");
                $checkStmt->execute([$latestRecord['card_no'], $latestRecord['card_no']]);
                $lastLog = $checkStmt->fetch();

                $now = time();
                $lastLogTime = $lastLog ? strtotime($lastLog['scan_timestamp']) : 0;

                // If no log in the last 4 seconds, process auto-toggle
                if (($now - $lastLogTime) > 4) {
                    $eqStmt = $pdo->prepare("SELECT * FROM equipments WHERE asset_id = 'BME-OT-ANES-008' LIMIT 1");
                    $eqStmt->execute();
                    $eq = $eqStmt->fetch();

                    if ($eq) {
                        $currentTransit = strtoupper($eq['transit_status'] ?? 'IN');
                        $newTransit = ($currentTransit === 'IN') ? 'OUT' : 'IN';

                        $building = 'Surgical Pavilion B';
                        $floor = '2nd Floor';
                        $room = ($newTransit === 'OUT') ? 'OT Exit Gate (Outside Department / In Transit)' : 'OT Suite 2 (Inside Department)';
                        $deptName = ($newTransit === 'OUT') ? 'In Transit / Corridor' : 'Operation Theatre Complex (OT)';

                        $pdo->beginTransaction();
                        $logStmt = $pdo->prepare("INSERT INTO rfid_scan_logs (
                            equipment_id, rfid_tag_id, raw_card_number, movement_direction,
                            reader_id, reader_ip, detected_building, detected_floor,
                            detected_department, detected_room, signal_strength_rssi
                        ) VALUES (?, ?, ?, ?, 'DHI-ASI1201M-MEP', ?, ?, ?, ?, ?, -50)");
                        $logStmt->execute([
                            $eq['id'], $eq['rfid_tag_id'], $latestRecord['card_no'], $newTransit,
                            $dahuaIp, $building, $floor, $deptName, $room
                        ]);

                        $upStmt = $pdo->prepare("UPDATE equipments SET 
                            building = ?, floor = ?, room_number = ?, department_id = 2,
                            transit_status = ?, rfid_last_detected_at = NOW(),
                            rfid_reader_node = 'DHI-ASI1201M-MEP (192.168.8.108)'
                            WHERE id = ?");
                        $upStmt->execute([$building, $floor, $room, $newTransit, $eq['id']]);
                        $pdo->commit();

                        $syncedEvent = [
                            'asset_id' => $eq['asset_id'],
                            'name' => $eq['name'],
                            'card_no' => $latestRecord['card_no'],
                            'direction' => $newTransit,
                            'room' => $room,
                            'timestamp' => formatSystemDateTime(date('Y-m-d H:i:s'), true)
                        ];
                    }
                }
            }
        }

        jsonResponse([
            'status' => 'success',
            'reader_ip' => $dahuaIp,
            'records_found' => $totalFound,
            'latest_record' => $latestRecord,
            'synced_event' => $syncedEvent,
            'recent_swipes' => array_reverse(array_slice($records, -5))
        ]);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        jsonError("Failed to poll Dahua reader: " . $e->getMessage(), 500);
    }
}

// 3. ACTION: Device Status & Health Check
if ($action === 'status') {
    try {
        $sysInfoRes = callDahuaCgi("/cgi-bin/magicBox.cgi?action=getSystemInfo", 2);
        $isOnline = $sysInfoRes['ok'];
        $sysInfo = $isOnline ? parseDahuaKeyValue($sysInfoRes['response']) : [];

        // Fetch current status of BME-OT-ANES-008
        $eqStmt = $pdo->prepare("SELECT id, asset_id, name, rfid_tag_id, rfid_card_alias, rfid_card_hex, transit_status, building, floor, room_number, rfid_last_detected_at, rfid_reader_node FROM equipments WHERE asset_id = 'BME-OT-ANES-008' LIMIT 1");
        $eqStmt->execute();
        $equipment = $eqStmt->fetch();

        if ($equipment && !empty($equipment['rfid_last_detected_at'])) {
            $equipment['formatted_last_detected'] = formatSystemDateTime($equipment['rfid_last_detected_at'], true);
        }

        jsonResponse([
            'status' => 'success',
            'reader' => [
                'ip' => $dahuaIp,
                'port' => $dahuaPort,
                'model' => $sysInfo['deviceType'] ?? 'DHI-ASI1201M-MEP',
                'serial_number' => $sysInfo['serialNumber'] ?? 'Unknown',
                'processor' => $sysInfo['processor'] ?? 'SSD202',
                'hardware_version' => $sysInfo['hardwareVersion'] ?? '1.00',
                'is_online' => $isOnline,
                'configured_credentials' => 'admin:admin@123',
                'monitored_door' => 'Operating Theatre Complex - OT Gate'
            ],
            'tracked_asset' => $equipment,
            'target_rfid' => [
                'card_hex' => '6F4244DB',
                'card_alias' => 'BMEOTANES008',
                'card_decimal' => '1866613979'
            ]
        ]);
    } catch (Exception $e) {
        jsonError("Status check failed: " . $e->getMessage(), 500);
    }
}

// 4. Default POST Ingestion Webhook (Direct alarm or card punch from external source)
if ($method === 'POST') {
    $input = getJsonInput();
    if (empty($input)) {
        $input = $_POST;
    }
    
    // Process through rfid_scan logic
    $card = $input['CardNo'] ?? $input['card_no'] ?? $input['card_number'] ?? $input['rfid_tag_id'] ?? '6F4244DB';
    
    $_POST['card_number'] = $card;
    $_POST['action'] = 'test_swipe';
    require __FILE__;
    exit();
}

jsonError("Unknown action: {$action}", 400);
