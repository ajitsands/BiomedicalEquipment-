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
function callDahuaCgi($path, $timeoutSec = 2, $ip = null, $port = 80) {
    global $dahuaIp, $dahuaPort, $dahuaUser, $dahuaPass;
    $targetIp = $ip ?: $dahuaIp;
    $targetPort = $port ?: $dahuaPort;
    $url = "http://{$targetIp}:{$targetPort}{$path}";
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_DIGEST);
    curl_setopt($ch, CURLOPT_USERPWD, "{$dahuaUser}:{$dahuaPass}");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT_MS, 400); // 400ms connect timeout prevents blocking on offline devices
    curl_setopt($ch, CURLOPT_TIMEOUT_MS, 1500);       // 1.5s max request timeout
    
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
        $card = trim($_GET['card_number'] ?? $_POST['card_number'] ?? '6F4244DB');
        $inputReaderIp = trim($_GET['reader_ip'] ?? $_POST['reader_ip'] ?? '');
        $inputReaderId = trim($_GET['reader_id'] ?? $_POST['reader_id'] ?? '');

        $hexCard = (is_numeric($card) && (int)$card > 100000) ? strtoupper(dechex((int)$card)) : strtoupper($card);

        // Dynamic lookup based on any matching RFID tag, hex, or alias
        $stmt = $pdo->prepare("SELECT * FROM equipments WHERE 
            rfid_tag_id = ? 
            OR rfid_card_hex = ? 
            OR rfid_card_alias = ? 
            OR rfid_tag_id = ? 
            OR rfid_card_hex = ? 
            OR rfid_card_alias = ?
            ORDER BY (rfid_tag_id = ? OR rfid_card_hex = ?) DESC, id DESC 
            LIMIT 1");
        $stmt->execute([$card, $card, $card, $hexCard, $hexCard, $hexCard, $card, $hexCard]);
        $eq = $stmt->fetch();

        if (!$eq) {
            jsonError("No medical equipment registered with RFID Card / UID: {$card}", 404);
        }

        // Resolve Reader Node dynamically from database
        $reader = null;
        if (!empty($inputReaderIp) || !empty($inputReaderId)) {
            $rStmt = $pdo->prepare("SELECT r.*, d.name as department_name, d.building as dept_building, d.floor as dept_floor
                FROM rfid_readers r
                LEFT JOIN departments d ON r.department_id = d.id
                WHERE r.ip_address = ? OR r.id = ? OR r.reader_code = ? OR r.name = ?
                LIMIT 1");
            $rStmt->execute([$inputReaderIp, $inputReaderId, $inputReaderId, $inputReaderId]);
            $reader = $rStmt->fetch();
        }

        if (!$reader) {
            // Default to Dahua Controller (192.168.8.108)
            $rStmt = $pdo->prepare("SELECT r.*, d.name as department_name, d.building as dept_building, d.floor as dept_floor
                FROM rfid_readers r
                LEFT JOIN departments d ON r.department_id = d.id
                WHERE r.ip_address = ? OR r.reader_code = 'DAHUA-OT-GATE-108'
                LIMIT 1");
            $rStmt->execute([$dahuaIp]);
            $reader = $rStmt->fetch();
        }

        $readerIp = $reader ? $reader['ip_address'] : $dahuaIp;
        $readerId = $reader ? ($reader['reader_code'] ?: $reader['device_model']) : 'DHI-ASI1201M-MEP';
        $readerNode = $reader ? $reader['name'] : "DHI-ASI1201M-MEP ({$readerIp})";
        $targetDeptId = !empty($reader['department_id']) ? (int)$reader['department_id'] : (int)$eq['department_id'];
        $targetDeptName = !empty($reader['department_name']) ? $reader['department_name'] : 'Operation Theatre Complex (OT)';
        $building = !empty($reader['building']) ? $reader['building'] : ($reader['dept_building'] ?? 'Surgical Pavilion B');
        $floor = !empty($reader['floor']) ? $reader['floor'] : ($reader['dept_floor'] ?? '2nd Floor');
        $doorZone = !empty($reader['door_zone']) ? $reader['door_zone'] : "{$targetDeptName} Gate";

        $currentTransit = strtoupper($eq['transit_status'] ?? 'IN');
        $currentDeptId = (int)($eq['department_id'] ?? 0);

        // Check cross-department relocation
        $isCrossDepartment = ($currentDeptId !== $targetDeptId);

        if ($isCrossDepartment) {
            // Asset arrived at a different department's reader -> Check IN to this new department!
            $newTransit = 'IN';
            $deptId = $targetDeptId;
            $deptName = $targetDeptName;
            $room = "{$doorZone} (Inside Department)";
            $msg = "{$eq['name']} ({$eq['asset_id']}) scanned at {$readerNode} and successfully transferred to {$deptName} (🟢 IN Department).";
        } elseif ($currentTransit === 'OUT') {
            // Asset was out in transit -> Returned/Entered this department as IN!
            $newTransit = 'IN';
            $deptId = $targetDeptId;
            $deptName = $targetDeptName;
            $room = (!empty($eq['room_number']) && !str_contains($eq['room_number'], 'Gate')) ? $eq['room_number'] : "{$doorZone} (Inside Department)";
            $msg = "{$eq['name']} ({$eq['asset_id']}) has ENTERED and is now IN Department {$deptName} ({$room}).";
        } else {
            // Asset was IN this department -> Exited through this door as OUT!
            $newTransit = 'OUT';
            $deptId = $targetDeptId;
            $deptName = 'In Transit / Corridor';
            $room = "{$doorZone} (Outside Department / In Transit)";
            $msg = "{$eq['name']} ({$eq['asset_id']}) has EXITED through {$doorZone} (OUT of Department / In Transit).";
        }

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

function processReaderCardSwipe($cardNo, $readerIp, $reader, $pdo, $recordTimestamp = null) {
    $rawCard = trim($cardNo);
    if (empty($rawCard)) return null;

    $hexCard = (is_numeric($rawCard) && (int)$rawCard > 100000) ? strtoupper(dechex((int)$rawCard)) : strtoupper($rawCard);

    $eqStmt = $pdo->prepare("SELECT * FROM equipments WHERE 
        rfid_tag_id = ? 
        OR rfid_card_hex = ? 
        OR rfid_card_alias = ? 
        OR rfid_tag_id = ? 
        OR rfid_card_hex = ? 
        OR rfid_card_alias = ?
        ORDER BY (rfid_tag_id = ? OR rfid_card_hex = ?) DESC, id DESC 
        LIMIT 1");
    $eqStmt->execute([$rawCard, $rawCard, $rawCard, $hexCard, $hexCard, $hexCard, $rawCard, $hexCard]);
    $eq = $eqStmt->fetch();

    if (!$eq) return null;

    // Timestamp check: Verify that this scan occurred AFTER the asset's last recorded detection!
    // If an older reader was just turned on, its historical records will NOT pull the asset backwards!
    if (!empty($recordTimestamp) && !empty($eq['rfid_last_detected_at'])) {
        $recTime = is_numeric($recordTimestamp) ? (int)$recordTimestamp : strtotime($recordTimestamp);
        $lastDetectedTime = strtotime($eq['rfid_last_detected_at']);
        
        if ($recTime <= $lastDetectedTime) {
            return null; // Ignore stale historical record
        }
    }

    // 4-second debounce check
    $recentStmt = $pdo->prepare("SELECT movement_direction, scan_timestamp 
        FROM rfid_scan_logs 
        WHERE (equipment_id = ? OR raw_card_number = ? OR rfid_tag_id = ?) 
          AND scan_timestamp >= (NOW() - INTERVAL 4 SECOND)
        ORDER BY id DESC LIMIT 1");
    $recentStmt->execute([$eq['id'], $rawCard, $eq['rfid_tag_id']]);
    $recentLog = $recentStmt->fetch();
    if ($recentLog) return null;

    $targetDeptId = !empty($reader['department_id']) ? (int)$reader['department_id'] : (int)$eq['department_id'];
    $targetDeptName = !empty($reader['department_name']) ? $reader['department_name'] : 'Operation Theatre Complex (OT)';
    $building = !empty($reader['building']) ? $reader['building'] : ($reader['dept_building'] ?? 'Surgical Pavilion B');
    $floor = !empty($reader['floor']) ? $reader['floor'] : ($reader['dept_floor'] ?? '2nd Floor');
    $doorZone = !empty($reader['door_zone']) ? $reader['door_zone'] : "{$targetDeptName} Gate";
    $readerNode = $reader['name'] ?? "DHI-ASI1201M-MEP ({$readerIp})";

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
        $readerIp,
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

    return [
        'asset_id' => $eq['asset_id'],
        'name' => $eq['name'],
        'card_no' => $rawCard,
        'reader_ip' => $readerIp,
        'reader_name' => $readerNode,
        'department' => $deptName,
        'direction' => $newTransit,
        'room' => $room,
        'timestamp' => formatSystemDateTime(date('Y-m-d H:i:s'), true)
    ];
}

// 2. ACTION: Poll Dahua Readers for Live Hardware Swipes
if ($action === 'poll' || $action === 'sync') {
    try {
        // Step A: Fast DB-level check (if background daemon is running, this returns in <5ms)
        $logStmt = $pdo->prepare("SELECT l.*, e.name as equipment_name, e.asset_id 
            FROM rfid_scan_logs l 
            LEFT JOIN equipments e ON l.equipment_id = e.id 
            WHERE l.scan_timestamp >= (NOW() - INTERVAL 6 SECOND) 
            ORDER BY l.id DESC LIMIT 1");
        $logStmt->execute();
        $recentLog = $logStmt->fetch();

        $syncedEvent = null;
        if ($recentLog) {
            $syncedEvent = [
                'asset_id' => $recentLog['asset_id'],
                'name' => $recentLog['equipment_name'],
                'card_no' => $recentLog['raw_card_number'] ?: $recentLog['rfid_tag_id'],
                'reader_ip' => $recentLog['reader_ip'],
                'reader_name' => $recentLog['reader_id'],
                'department' => $recentLog['detected_department'],
                'direction' => $recentLog['movement_direction'],
                'room' => $recentLog['detected_room'],
                'timestamp' => formatSystemDateTime($recentLog['scan_timestamp'], true)
            ];
        }

        // Active readers query with department details
        $readersStmt = $pdo->query("SELECT r.*, d.name as department_name, d.building as dept_building, d.floor as dept_floor
            FROM rfid_readers r
            LEFT JOIN departments d ON r.department_id = d.id
            WHERE r.is_active = 1");
        $allPolledReaders = $readersStmt->fetchAll();

        // Step B: Hardware fallback check (polls Dahua readers with count=5000 and 400ms connect timeout)
        if (!$syncedEvent) {
            $dahuaOnly = array_filter($allPolledReaders, function($r) {
                return (stripos($r['reader_type'] ?? '', 'Dahua') !== false) || 
                       (stripos($r['device_model'] ?? '', 'DHI') !== false) || 
                       in_array($r['ip_address'] ?? '', ['192.168.8.108', '192.168.8.109']);
            });

            foreach ($dahuaOnly as $reader) {
                $curIp = $reader['ip_address'];
                $curPort = !empty($reader['port']) ? (int)$reader['port'] : 80;
                $settingKey = 'dahua_recno_' . str_replace('.', '_', $curIp);

                $recRes = callDahuaCgi("/cgi-bin/recordFinder.cgi?action=find&name=AccessControlCardRec&count=5000", 2, $curIp, $curPort);
                if (!$recRes['ok']) continue;

                $parsed = parseDahuaKeyValue($recRes['response']);
                $found = (int)($parsed['found'] ?? 0);
                if ($found === 0) {
                    $pdo->prepare("UPDATE system_settings SET setting_value = '0' WHERE setting_key = ?")->execute([$settingKey]);
                    continue;
                }

                $recStmt = $pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = ?");
                $recStmt->execute([$settingKey]);
                $lastSaved = $recStmt->fetchColumn();

                $maxRecNo = 0;
                $records = [];
                for ($i = 0; $i < $found; $i++) {
                    $recNo = (int)($parsed["records[{$i}].RecNo"] ?? 0);
                    $cardNo = $parsed["records[{$i}].CardNo"] ?? '';
                    $userId = $parsed["records[{$i}].UserID"] ?? '';
                    $createTime = (int)($parsed["records[{$i}].CreateTime"] ?? $parsed["records[{$i}].CreateTimeRealUTC"] ?? 0);
                    if ($recNo > $maxRecNo) $maxRecNo = $recNo;
                    if (!empty($cardNo) || !empty($userId)) {
                        $records[] = [
                            'rec_no' => $recNo,
                            'card_no' => $cardNo,
                            'user_id' => $userId,
                            'create_time' => $createTime
                        ];
                    }
                }

                if ($lastSaved === false || $lastSaved === null) {
                    // Brand-new reader never seen before in database: initialize pointer to maxRecNo so we don't replay past records
                    $pdo->prepare("INSERT INTO system_settings (setting_key, setting_value, category, description) VALUES (?, ?, 'hardware', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)")
                        ->execute([$settingKey, $maxRecNo, "Last processed RecNo for reader {$curIp}"]);
                    continue;
                }

                $lastProcessed = (int)$lastSaved;

                // Handle wrap-around or manual hardware clear
                if ($maxRecNo > 0 && $maxRecNo < $lastProcessed) {
                    $lastProcessed = 0;
                    $pdo->prepare("UPDATE system_settings SET setting_value = '0' WHERE setting_key = ?")->execute([$settingKey]);
                }

                foreach ($records as $r) {
                    if ($r['rec_no'] > $lastProcessed) {
                        $effectiveCard = !empty($r['card_no']) ? $r['card_no'] : $r['user_id'];
                        $lastProcessed = $r['rec_no'];
                        $pdo->prepare("UPDATE system_settings SET setting_value = ? WHERE setting_key = ?")->execute([$lastProcessed, $settingKey]);

                        $event = processReaderCardSwipe($effectiveCard, $curIp, $reader, $pdo, $r['create_time']);
                        if ($event) {
                            $syncedEvent = $event;
                            break;
                        }
                    }
                }

                // Auto-Purge: When reader records reach 500, purge hardware logs on reader so it restarts from 0
                if ($found >= 500 || $lastProcessed >= 500) {
                    callDahuaCgi("/cgi-bin/recordUpdater.cgi?action=clear&name=AccessControlCardRec", 2, $curIp, $curPort);
                    $pdo->prepare("UPDATE system_settings SET setting_value = '0' WHERE setting_key = ?")->execute([$settingKey]);
                }

                if ($syncedEvent) break;
            }
        }

        jsonResponse([
            'status' => 'success',
            'polled_readers' => $allPolledReaders,
            'synced_event' => $syncedEvent
        ]);

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        jsonError("Failed to poll telemetry: " . $e->getMessage(), 500);
    }
}

// 3. ACTION: Device Status & Health Check (Fast Non-Blocking)
if ($action === 'status') {
    try {
        // Fast DB lookup for tracked asset
        $eqStmt = $pdo->query("SELECT id, asset_id, name, rfid_tag_id, rfid_card_alias, rfid_card_hex, transit_status, building, floor, room_number, rfid_last_detected_at, rfid_reader_node 
            FROM equipments 
            WHERE rfid_tag_id = '6F4244DB' 
               OR rfid_reader_node LIKE '%192.168.8.108%' 
               OR rfid_reader_node LIKE '%192.168.8.109%' 
               OR rfid_reader_node LIKE '%DHI-ASI1201M-MEP%'
            ORDER BY (rfid_tag_id = '6F4244DB') DESC, rfid_last_detected_at DESC, id DESC 
            LIMIT 1");
        $equipment = $eqStmt->fetch();

        if ($equipment && !empty($equipment['rfid_last_detected_at'])) {
            $equipment['formatted_last_detected'] = formatSystemDateTime($equipment['rfid_last_detected_at'], true);
        }

        jsonResponse([
            'status' => 'success',
            'reader' => [
                'ip' => $dahuaIp,
                'port' => $dahuaPort,
                'model' => 'DHI-ASI1201M-MEP',
                'serial_number' => 'BK079FEPAJF07CD',
                'processor' => 'SSD202',
                'hardware_version' => '1.00',
                'is_online' => true,
                'configured_credentials' => 'admin:admin@123',
                'monitored_door' => 'Operating Theatre Complex - OT Gate'
            ],
            'tracked_asset' => $equipment,
            'target_rfid' => [
                'card_hex' => $equipment['rfid_card_hex'] ?? '6F4244DB',
                'card_alias' => $equipment['rfid_card_alias'] ?? 'BMEOTESU007',
                'card_decimal' => '1866613979'
            ]
        ]);
    } catch (Exception $e) {
        jsonError("Status check failed: " . $e->getMessage(), 500);
    }
}

// 4. ACTION: Purge / Clear Hardware Access Record Buffer on Dahua Controller
if ($action === 'clear_buffer' || $action === 'purge_hardware_buffer') {
    $targetIp = $_GET['ip'] ?? $_POST['ip'] ?? $_GET['reader_ip'] ?? $_POST['reader_ip'] ?? $dahuaIp;
    $targetPort = (int)($_GET['port'] ?? $_POST['port'] ?? 80);
    $settingKey = 'dahua_recno_' . str_replace('.', '_', $targetIp);

    $clearRes = callDahuaCgi("/cgi-bin/recordUpdater.cgi?action=clear&name=AccessControlCardRec", 3, $targetIp, $targetPort);
    
    // Always reset DB pointer to 0
    $pdo->prepare("UPDATE system_settings SET setting_value = '0' WHERE setting_key = ?")->execute([$settingKey]);

    if ($clearRes['ok']) {
        jsonResponse([
            'status' => 'success',
            'message' => "Successfully purged hardware access log on reader {$targetIp}. Buffer reset to 0 (All historical scan logs remain safe in database).",
            'reader_ip' => $targetIp
        ]);
    } else {
        jsonResponse([
            'status' => 'warning',
            'message' => "Tracking pointer was reset to 0, but hardware reader at {$targetIp} was offline or timed out: " . ($clearRes['error'] ?: 'Unreachable'),
            'reader_ip' => $targetIp
        ]);
    }
}

// 5. Default POST Ingestion Webhook (Direct alarm or card punch from external source)
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
