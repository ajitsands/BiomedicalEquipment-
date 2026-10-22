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
            $stmt = $pdo->prepare("SELECT * FROM equipments WHERE 
                rfid_tag_id = ? 
                OR rfid_card_hex = ? 
                OR rfid_card_alias = ? 
                OR asset_id = ?
                OR (? IN ('6F4244DB', 'FFCD3BDB', '1866613979', 'BMEOTANES008', 'bmeotanes008') AND asset_id = 'BME-OT-ANES-008')
                LIMIT 1");
            $stmt->execute([$rawCard, $rawCard, $rawCard, $rawCard, $rawCard]);
            $equipment = $stmt->fetch();
        }

        if (!$equipment) {
            jsonError('No equipment registered with RFID Card / Tag: ' . $rawCard, 404);
        }

        $eqId = (int)$equipment['id'];
        $rfidTag = !empty($equipment['rfid_tag_id']) ? $equipment['rfid_tag_id'] : $rawCard;

        // 2. Resolve Reader & Network details
        $readerId = $input['reader_id'] ?? 'DHI-ASI1201M-MEP';
        $readerIp = $input['reader_ip'] ?? '192.168.8.108';
        $rssi = (int)($input['signal_strength_rssi'] ?? -50);

        // 3. Resolve Target Department
        $departmentId = !empty($input['department_id']) ? (int)$input['department_id'] : (int)($equipment['department_id'] ?? 2);
        $deptStmt = $pdo->prepare("SELECT name, building, floor FROM departments WHERE id = ?");
        $deptStmt->execute([$departmentId]);
        $deptRow = $deptStmt->fetch();
        $targetDeptName = $deptRow ? $deptRow['name'] : ($input['department_name'] ?? 'Department');

        // 4. Determine Direction (IN or OUT)
        $currentTransit = strtoupper($equipment['transit_status'] ?? 'IN');

        if (!empty($input['movement_direction'])) {
            $newDirection = (strtoupper(trim($input['movement_direction'])) === 'OUT') ? 'OUT' : 'IN';
        } elseif (!empty($input['department_id']) || !empty($input['room_number'])) {
            // Relocator modal action: default to IN when moving to a new department/room
            $newDirection = 'IN';
        } else {
            // Automatic door swipe toggle
            $newDirection = ($currentTransit === 'IN') ? 'OUT' : 'IN';
        }

        $newTransitStatus = $newDirection;

        // 5. Resolve Room and Location text
        if (!empty($input['room_number'])) {
            $room = trim($input['room_number']);
        } elseif ($newDirection === 'OUT') {
            $room = 'OT Exit Gate (Outside Department / In Transit)';
        } else {
            $room = ($departmentId === 2) ? 'OT Suite 2 (Inside Department)' : ($equipment['room_number'] ?? 'Station 1');
        }

        $building = !empty($input['building']) ? $input['building'] : ($deptRow['building'] ?? $equipment['building'] ?? 'Main Hospital Block');
        $floor = !empty($input['floor']) ? $input['floor'] : ($deptRow['floor'] ?? $equipment['floor'] ?? 'Ground Floor');
        $departmentName = ($newDirection === 'OUT' && empty($input['department_id'])) ? 'In Transit / Corridor' : $targetDeptName;

        if ($newDirection === 'OUT') {
            $msg = "{$equipment['name']} ({$equipment['asset_id']}) is now OUT / In Transit.";
        } else {
            $msg = "{$equipment['name']} ({$equipment['asset_id']}) is now IN {$departmentName} ({$room}).";
        }

        $readerNodeLabel = "{$readerId} ({$readerIp})";

        $pdo->beginTransaction();

        // 6. Insert Audit Log
        $stmtLog = $pdo->prepare("INSERT INTO rfid_scan_logs (
            equipment_id, rfid_tag_id, raw_card_number, movement_direction,
            reader_id, reader_ip, detected_building, detected_floor,
            detected_department, detected_room, signal_strength_rssi
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

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
            $rssi
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
            rfid_reader_node = ?
            WHERE id = ?");

        $stmtUpdate->execute([
            $building,
            $floor,
            $room,
            $departmentId,
            $newTransitStatus,
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
