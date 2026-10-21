<?php
require_once __DIR__ . '/../config/db.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    try {
        $where = [];
        $params = [];

        if (!empty($_GET['status'])) {
            $where[] = "c.status = ?";
            $params[] = trim($_GET['status']);
        }

        if (!empty($_GET['priority'])) {
            $where[] = "c.priority = ?";
            $params[] = trim($_GET['priority']);
        }

        if (!empty($_GET['department_id'])) {
            $where[] = "c.department_id = ?";
            $params[] = (int)$_GET['department_id'];
        }

        if (!empty($_GET['equipment_id'])) {
            $where[] = "c.equipment_id = ?";
            $params[] = (int)$_GET['equipment_id'];
        }

        $sql = "SELECT 
            c.*, 
            e.asset_id, e.name as equipment_name, e.brand, e.model_number, e.serial_number, e.rfid_tag_id, e.qr_code_token,
            d.name as department_name, d.code as department_code, d.floor as department_floor, d.building as department_building,
            v.name as vendor_name, v.emergency_hotline as vendor_emergency_hotline,
            emp.employee_code as booked_by_employee_code, emp.username as booked_by_username,
            sv.name as serviced_by_vendor_name, sv.vendor_type as serviced_by_vendor_type, sv.phone as serviced_by_vendor_phone
        FROM complaints c
        JOIN equipments e ON c.equipment_id = e.id
        JOIN departments d ON c.department_id = d.id
        JOIN vendors v ON e.vendor_id = v.id
        LEFT JOIN employees emp ON c.booked_by_employee_id = emp.id
        LEFT JOIN vendors sv ON c.serviced_by_vendor_id = sv.id";

        if (!empty($where)) {
            $sql .= " WHERE " . implode(" AND ", $where);
        }

        $sql .= " ORDER BY c.reported_at DESC, c.id DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $complaints = $stmt->fetchAll();

        jsonResponse([
            'status' => 'success',
            'count' => count($complaints),
            'data' => $complaints
        ]);
    } catch (PDOException $e) {
        jsonError('Failed to fetch complaints: ' . $e->getMessage(), 500);
    }
} elseif ($method === 'POST') {
    try {
        $input = getJsonInput();
        if (empty($input['equipment_id']) || empty($input['description']) || empty($input['booked_by_name'])) {
            jsonError('Required fields: equipment_id, booked_by_name, description');
        }

        $equipmentId = (int)$input['equipment_id'];

        // Retrieve equipment and department info
        $stmtEq = $pdo->prepare("SELECT department_id, room_number, bed_slot FROM equipments WHERE id = ?");
        $stmtEq->execute([$equipmentId]);
        $eq = $stmtEq->fetch();

        if (!$eq) {
            jsonError('Equipment not found', 404);
        }

        $departmentId = !empty($input['department_id']) ? (int)$input['department_id'] : (int)$eq['department_id'];
        $roomOrBed = !empty($input['room_or_bed']) ? trim($input['room_or_bed']) : trim(($eq['room_number'] ?? '') . ' ' . ($eq['bed_slot'] ?? ''));
        $priority = $input['priority'] ?? 'High Priority';
        $category = $input['complaint_category'] ?? 'Total Power Failure';

        // Auto-generate Ticket Number
        $ticketNo = 'TKT-' . date('Y') . '-' . str_pad(rand(10, 9999), 4, '0', STR_PAD_LEFT);

        $pdo->beginTransaction();

        $bookedByEmpId = !empty($input['booked_by_employee_id']) ? (int)$input['booked_by_employee_id'] : null;

        $sql = "INSERT INTO complaints (
            ticket_number, equipment_id, booked_by_name, booked_by_employee_id, booked_by_role, booked_by_phone,
            department_id, room_or_bed, complaint_category, priority, description,
            reported_at, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'Open')";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $ticketNo,
            $equipmentId,
            trim($input['booked_by_name']),
            $bookedByEmpId,
            $input['booked_by_role'] ?? 'Staff Nurse',
            $input['booked_by_phone'] ?? '+973-1789-4099',
            $departmentId,
            $roomOrBed,
            $category,
            $priority,
            trim($input['description'])
        ]);

        $ticketId = $pdo->lastInsertId();

        // If priority is Critical or High, immediately set equipment status to 'Under Breakdown'
        if (strpos($priority, 'Critical') !== false || strpos($priority, 'High') !== false) {
            $stmtUpdate = $pdo->prepare("UPDATE equipments SET status = 'Under Breakdown' WHERE id = ?");
            $stmtUpdate->execute([$equipmentId]);
        }

        $pdo->commit();

        jsonResponse([
            'status' => 'success',
            'message' => 'Complaint booked successfully. Work ticket dispatched to Biomedical Engineering team.',
            'ticket_number' => $ticketNo,
            'id' => $ticketId
        ], 201);
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        jsonError('Failed to book complaint: ' . $e->getMessage(), 500);
    }
} elseif ($method === 'PUT') {
    try {
        $input = getJsonInput();
        if (empty($input['id'])) {
            jsonError('Complaint ID is required');
        }

        $id = (int)$input['id'];

        $fields = [
            'status', 'assigned_engineer', 'assigned_at', 'action_taken',
            'root_cause', 'replaced_parts', 'repair_cost', 'downtime_hours',
            'resolved_at', 'closed_at', 'satisfaction_rating',
            'serviced_by_type', 'serviced_by_vendor_id',
            'service_attachment_url', 'service_attachment_name'
        ];

        $updates = [];
        $params = [];

        foreach ($fields as $field) {
            if (isset($input[$field])) {
                $updates[] = "{$field} = ?";
                $params[] = $input[$field];
            }
        }

        if (empty($updates)) {
            jsonError('No fields to update');
        }

        $params[] = $id;

        $pdo->beginTransaction();

        $sql = "UPDATE complaints SET " . implode(", ", $updates) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        // If status changed to 'Repaired & Verified' or 'Closed', return equipment back to 'Operational'
        if (!empty($input['status']) && in_array($input['status'], ['Repaired & Verified', 'Closed'])) {
            $stmtGetEq = $pdo->prepare("SELECT equipment_id FROM complaints WHERE id = ?");
            $stmtGetEq->execute([$id]);
            $comp = $stmtGetEq->fetch();
            if ($comp) {
                $stmtEqUp = $pdo->prepare("UPDATE equipments SET status = 'Operational' WHERE id = ?");
                $stmtEqUp->execute([(int)$comp['equipment_id']]);
            }
        }

        $pdo->commit();

        jsonResponse([
            'status' => 'success',
            'message' => 'Complaint ticket updated successfully',
            'id' => $id
        ]);
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        jsonError('Failed to update complaint: ' . $e->getMessage(), 500);
    }
}
