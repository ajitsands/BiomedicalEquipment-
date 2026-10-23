<?php
// RFID Telemetry & Live Asset Tracking API with IN/OUT Door Toggle Logic
// Biomedical Equipment Maintenance Management System
// Powered and Engineered by SaNDS Lab Middle East W.L.L

require_once __DIR__ . '/../config/db.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT 
            r.*,
            e.asset_id, e.name as equipment_name, e.brand, e.model_number, e.status as equipment_status,
            e.transit_status, e.rfid_card_alias, e.rfid_card_hex
        FROM rfid_scan_logs r
        JOIN equipments e ON r.equipment_id = e.id
        ORDER BY r.scan_timestamp DESC
        LIMIT 60");

        $logs = $stmt->fetchAll();

        // Format timestamps according to active system settings timezone and format
        foreach ($logs as &$log) {
            $log['formatted_scan_timestamp'] = formatSystemDateTime($log['scan_timestamp'], true);
        }
        unset($log);

        jsonResponse([
            'status' => 'success',
            'data' => $logs
        ]);
    } catch (PDOException $e) {
        jsonError('Failed to fetch RFID logs: ' . $e->getMessage(), 500);
    }
} elseif ($method === 'POST') {
    try {
        $input = getJsonInput();
        if (empty($input)) {
            $input = $_POST;
        }

        $rawCard = trim($input['card_number'] ?? $input['rfid_tag_id'] ?? $input['raw_card_number'] ?? $input['card_no'] ?? '');
        $equipmentId = !empty($input['equipment_id']) ? (int)$input['equipment_id'] : null;
        $assetId = trim($input['asset_id'] ?? '');

        if (!$equipmentId && empty($rawCard) && empty($assetId)) {
            jsonError('rfid_tag_id, card_number, or equipment_id is required');
        }

        // 1. Locate Equipment
        $equipment = null;
        if ($equipmentId) {
            $stmt = $pdo->prepare("SELECT * FROM equipments WHERE id = ?");
            $stmt->execute([$equipmentId]);
            $equipment = $stmt->fetch();
        } elseif (!empty($assetId)) {
            $stmt = $pdo->prepare("SELECT * FROM equipments WHERE asset_id = ?");
            $stmt->execute([$assetId]);
            $equipment = $stmt->fetch();
        }

        if (!$equipment && !empty($rawCard)) {
            $hexCard = (is_numeric($rawCard) && (int)$rawCard > 100000) ? strtoupper(dechex((int)$rawCard)) : strtoupper($rawCard);
            $stmt = $pdo->prepare("SELECT * FROM equipments WHERE 
                rfid_tag_id = ? 
                OR rfid_card_hex = ? 
                OR rfid_card_alias = ? 
                OR rfid_tag_id = ?
                OR rfid_card_hex = ?
                OR asset_id = ?
                ORDER BY (rfid_tag_id = ? OR rfid_card_hex = ?) DESC, id DESC
                LIMIT 1");
            $stmt->execute([$rawCard, $rawCard, $rawCard, $hexCard, $hexCard, $rawCard, $rawCard, $rawCard]);
            $equipment = $stmt->fetch();
        }

        if (!$equipment) {
            jsonError('No equipment registered with RFID Card / Tag: ' . $rawCard, 404);
        }

        $eqId = (int)$equipment['id'];
        $rfidTag = !empty($equipment['rfid_tag_id']) ? $equipment['rfid_tag_id'] : $rawCard;

        // 2. Resolve Reader & Network details
        $readerId = $input['reader_id'] ?? '';
        $readerIp = $input['reader_ip'] ?? '';
        $rssi = (int)($input['signal_strength_rssi'] ?? -50);
        $deviceRecNo = (int)($input['device_rec_no'] ?? $input['rec_no'] ?? 0);
        $deviceTimestamp = (int)($input['device_timestamp'] ?? $input['create_time'] ?? time());

        // Resolve reader from database if IP or ID provided
        $reader = null;
        if (!empty($readerIp) || !empty($readerId)) {
            $rStmt = $pdo->prepare("SELECT r.*, d.name as department_name, d.building as dept_building, d.floor as dept_floor
                FROM rfid_readers r
                LEFT JOIN departments d ON r.department_id = d.id
                WHERE r.ip_address = ? OR r.id = ? OR r.reader_code = ? OR r.name = ?
                LIMIT 1");
            $rStmt->execute([$readerIp, $readerId, $readerId, $readerId]);
            $reader = $rStmt->fetch();
        }

        if (!empty($readerIp) && ($deviceTimestamp > 0 || $deviceRecNo > 0)) {
            $chkStmt = $pdo->prepare("SELECT id FROM rfid_scan_logs 
                WHERE reader_ip = ? 
                  AND (raw_card_number = ? OR rfid_tag_id = ? OR raw_card_number = ? OR rfid_tag_id = ?) 
                  AND (
                      (device_timestamp = ? AND device_timestamp > 0)
                      OR (device_rec_no = ? AND device_rec_no > 0)
                  )
                LIMIT 1");
            $chkStmt->execute([$readerIp, $rawCard, $rawCard, $hexCard, $hexCard, $deviceTimestamp, $deviceRecNo]);
            if ($chkStmt->fetchColumn()) {
                jsonResponse([
                    'status' => 'ignored',
                    'message' => 'Record already exists in database with this device timestamp / record number',
                    'equipment_id' => $eqId,
                    'asset_id' => $equipment['asset_id'],
                    'transit_status' => $equipment['transit_status']
                ]);
            }
        }

        $currentDeptId = (int)($equipment['department_id'] ?? 2);
        
        // 3. Resolve Target Department
        if (!empty($input['department_id'])) {
            $departmentId = (int)$input['department_id'];
        } elseif ($reader && !empty($reader['department_id'])) {
            $departmentId = (int)$reader['department_id'];
        } else {
            $departmentId = $currentDeptId;
        }

        $deptStmt = $pdo->prepare("SELECT name, building, floor FROM departments WHERE id = ?");
        $deptStmt->execute([$departmentId]);
        $deptRow = $deptStmt->fetch();
        $targetDeptName = $deptRow ? $deptRow['name'] : ($input['department_name'] ?? 'Department');

        // 4. Determine Direction (IN or OUT)
        $currentTransit = strtoupper($equipment['transit_status'] ?? 'IN');
        $isCrossDepartment = ($currentDeptId !== $departmentId);

        $lastAssetDeviceTime = (int)($equipment['rfid_last_device_time'] ?? 0);
        if ($isCrossDepartment && $deviceTimestamp > 0 && $lastAssetDeviceTime > 0 && $deviceTimestamp <= $lastAssetDeviceTime) {
            jsonResponse([
                'status' => 'ignored',
                'message' => 'Historical record from another department is older than the asset\'s last verified location',
                'equipment_id' => $eqId,
                'asset_id' => $equipment['asset_id'],
                'transit_status' => $equipment['transit_status']
            ]);
        }

        if (!empty($input['movement_direction'])) {
            $newDirection = (strtoupper(trim($input['movement_direction'])) === 'OUT') ? 'OUT' : 'IN';
        } elseif ($isCrossDepartment) {
            // Moving to a different department -> Always check IN
            $newDirection = 'IN';
        } else {
            // Same department toggle
            $newDirection = ($currentTransit === 'IN') ? 'OUT' : 'IN';
        }

        $newTransitStatus = $newDirection;
        $doorZone = !empty($reader['door_zone']) ? $reader['door_zone'] : "{$targetDeptName} Gate";

        // 5. Resolve Room and Location text
        if (!empty($input['room_number'])) {
            $room = trim($input['room_number']);
        } elseif ($isCrossDepartment) {
            $room = "{$doorZone} (Inside Department)";
        } elseif ($newDirection === 'OUT') {
            $room = "{$doorZone} (Outside Department / In Transit)";
        } else {
            $room = (!empty($equipment['room_number']) && !str_contains($equipment['room_number'], 'Gate') && !str_contains($equipment['room_number'], 'Outside'))
                ? $equipment['room_number']
                : "{$doorZone} (Inside Department)";
        }

        $building = !empty($input['building']) ? $input['building'] : ($reader['building'] ?? $deptRow['building'] ?? $equipment['building'] ?? 'Hospital Main Block');
        $floor = !empty($input['floor']) ? $input['floor'] : ($reader['floor'] ?? $deptRow['floor'] ?? $equipment['floor'] ?? 'Ground Floor');
        $departmentName = ($newDirection === 'OUT' && !$isCrossDepartment && empty($input['department_id'])) ? 'In Transit / Corridor' : $targetDeptName;

        if ($isCrossDepartment) {
            $msg = "{$equipment['name']} ({$equipment['asset_id']}) transferred from Department #{$currentDeptId} to {$targetDeptName} (🟢 IN Department).";
        } elseif ($newDirection === 'OUT') {
            $msg = "{$equipment['name']} ({$equipment['asset_id']}) has EXITED {$targetDeptName} (Status: 🟠 OUT / In Transit).";
        } else {
            $msg = "{$equipment['name']} ({$equipment['asset_id']}) has RETURNED to {$targetDeptName} (Status: 🟢 IN Department).";
        }

        $readerNodeLabel = $reader ? $reader['name'] : ($readerId ? "{$readerId} ({$readerIp})" : 'RFID Terminal');

        $pdo->beginTransaction();

        // 6. Insert Audit Log
        $stmtLog = $pdo->prepare("INSERT INTO rfid_scan_logs (
            equipment_id, rfid_tag_id, raw_card_number, movement_direction,
            reader_id, reader_ip, detected_building, detected_floor,
            detected_department, detected_room, signal_strength_rssi,
            device_rec_no, device_timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

        $stmtLog->execute([
            $eqId,
            $rfidTag,
            $rawCard,
            $newDirection,
            $readerId,
            $readerIp,
            $building,
            $floor,
            $departmentName,
            $room,
            $rssi,
            $deviceRecNo,
            $deviceTimestamp
        ]);

        $logId = $pdo->lastInsertId();

        // 7. Update Equipment Live Location & Transit Status
        $stmtUpdate = $pdo->prepare("UPDATE equipments SET 
            building = ?,
            floor = ?,
            room_number = ?,
            department_id = ?,
            transit_status = ?,
            rfid_last_detected_at = NOW(),
            rfid_last_device_time = ?,
            rfid_reader_node = ?
            WHERE id = ?");

        $stmtUpdate->execute([
            $building,
            $floor,
            $room,
            $departmentId,
            $newTransitStatus,
            $deviceTimestamp,
            $readerNodeLabel,
            $eqId
        ]);

        $pdo->commit();

        $formattedNow = formatSystemDateTime(date('Y-m-d H:i:s'), true);

        jsonResponse([
            'status' => 'success',
            'message' => $msg,
            'log_id' => $logId,
            'equipment_id' => $eqId,
            'asset_id' => $equipment['asset_id'],
            'equipment_name' => $equipment['name'],
            'raw_card_number' => $rawCard,
            'movement_direction' => $newDirection,
            'transit_status' => $newTransitStatus,
            'reader_node' => $readerNodeLabel,
            'reader_ip' => $readerIp,
            'detected_location' => [
                'building' => $building,
                'floor' => $floor,
                'department' => $departmentName,
                'room' => $room
            ],
            'formatted_timestamp' => $formattedNow
        ]);
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        jsonError('Failed to process RFID scan: ' . $e->getMessage(), 500);
    }
}
