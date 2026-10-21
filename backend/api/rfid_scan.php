<?php
require_once __DIR__ . '/../config/db.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT 
            r.*,
            e.asset_id, e.name as equipment_name, e.brand, e.model_number, e.status as equipment_status
        FROM rfid_scan_logs r
        JOIN equipments e ON r.equipment_id = e.id
        ORDER BY r.scan_timestamp DESC
        LIMIT 50");

        $logs = $stmt->fetchAll();

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
        if (empty($input['rfid_tag_id']) && empty($input['equipment_id'])) {
            jsonError('rfid_tag_id or equipment_id is required');
        }

        if (!empty($input['equipment_id'])) {
            $stmt = $pdo->prepare("SELECT id, rfid_tag_id, name FROM equipments WHERE id = ?");
            $stmt->execute([(int)$input['equipment_id']]);
        } else {
            $stmt = $pdo->prepare("SELECT id, rfid_tag_id, name FROM equipments WHERE rfid_tag_id = ?");
            $stmt->execute([trim($input['rfid_tag_id'])]);
        }

        $equipment = $stmt->fetch();
        if (!$equipment) {
            jsonError('No equipment registered with this RFID Tag', 404);
        }

        $eqId = (int)$equipment['id'];
        $rfidTag = $equipment['rfid_tag_id'];

        $readerId = $input['reader_id'] ?? 'RFID-GATEWAY-' . rand(1, 9);
        $building = $input['building'] ?? 'Critical Care Tower A';
        $floor = $input['floor'] ?? '3rd Floor';
        $departmentName = $input['department_name'] ?? 'Intensive Care Unit (ICU)';
        $room = $input['room_number'] ?? 'ICU Room 302';
        $rssi = (int)($input['signal_strength_rssi'] ?? -62);
        $departmentId = !empty($input['department_id']) ? (int)$input['department_id'] : null;

        $pdo->beginTransaction();

        // 1. Insert scan log
        $stmtLog = $pdo->prepare("INSERT INTO rfid_scan_logs (equipment_id, rfid_tag_id, reader_id, detected_building, detected_floor, detected_department, detected_room, signal_strength_rssi) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmtLog->execute([
            $eqId,
            $rfidTag,
            $readerId,
            $building,
            $floor,
            $departmentName,
            $room,
            $rssi
        ]);

        // 2. Update equipment live position
        $updateFields = "building = ?, floor = ?, room_number = ?, rfid_last_detected_at = NOW(), rfid_reader_node = ?";
        $params = [$building, $floor, $room, $readerId];

        if ($departmentId) {
            $updateFields .= ", department_id = ?";
            $params[] = $departmentId;
        }

        $params[] = $eqId;
        $stmtUpdate = $pdo->prepare("UPDATE equipments SET {$updateFields} WHERE id = ?");
        $stmtUpdate->execute($params);

        $pdo->commit();

        jsonResponse([
            'status' => 'success',
            'message' => 'RFID tag scanned and equipment location updated successfully',
            'equipment_id' => $eqId,
            'equipment_name' => $equipment['name'],
            'new_location' => [
                'building' => $building,
                'floor' => $floor,
                'room' => $room,
                'reader_id' => $readerId
            ]
        ]);
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        jsonError('Failed to process RFID scan: ' . $e->getMessage(), 500);
    }
}
