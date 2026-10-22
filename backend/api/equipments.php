<?php
require_once __DIR__ . '/../config/db.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    try {
        $where = [];
        $params = [];

        if (!empty($_GET['search'])) {
            $q = '%' . trim($_GET['search']) . '%';
            $where[] = "(e.name LIKE ? OR e.asset_id LIKE ? OR e.brand LIKE ? OR e.model_number LIKE ? OR e.serial_number LIKE ? OR e.rfid_tag_id LIKE ?)";
            $params = array_merge($params, [$q, $q, $q, $q, $q, $q]);
        }

        if (!empty($_GET['department_id'])) {
            $where[] = "e.department_id = ?";
            $params[] = (int)$_GET['department_id'];
        }

        if (!empty($_GET['warranty_status'])) {
            $where[] = "e.warranty_status = ?";
            $params[] = trim($_GET['warranty_status']);
        }

        if (!empty($_GET['status'])) {
            $where[] = "e.status = ?";
            $params[] = trim($_GET['status']);
        }

        if (!empty($_GET['equipment_type_id'])) {
            $where[] = "e.equipment_type_id = ?";
            $params[] = (int)$_GET['equipment_type_id'];
        }

        if (!empty($_GET['pm_filter'])) {
            if ($_GET['pm_filter'] === 'overdue') {
                $where[] = "e.next_pm_due_date < CURDATE()";
            } elseif ($_GET['pm_filter'] === 'due_soon') {
                $where[] = "e.next_pm_due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)";
            }
        }

        $sql = "SELECT 
            e.*, 
            et.name as equipment_type_name, et.category as equipment_category, et.risk_classification, et.default_pm_frequency, et.icon_name,
            et.asset_type_code, et.department_scope, et.default_protection_class, et.default_applied_part_type,
            d.name as department_name, d.code as department_code, d.floor as department_floor, d.building as department_building,
            v.name as vendor_name, v.emergency_hotline as vendor_emergency_hotline, v.contact_person as vendor_contact_person, v.email as vendor_email,
            cv.name as contract_vendor_name
        FROM equipments e
        JOIN equipment_types et ON e.equipment_type_id = et.id
        JOIN departments d ON e.department_id = d.id
        JOIN vendors v ON e.vendor_id = v.id
        LEFT JOIN vendors cv ON e.contract_vendor_id = cv.id";

        if (!empty($where)) {
            $sql .= " WHERE " . implode(" AND ", $where);
        }

        $sql .= " ORDER BY e.id DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $equipments = $stmt->fetchAll();

        jsonResponse([
            'status' => 'success',
            'count' => count($equipments),
            'data' => $equipments
        ]);
    } catch (PDOException $e) {
        jsonError('Failed to fetch equipments: ' . $e->getMessage(), 500);
    }
} elseif ($method === 'POST') {
    try {
        $input = getJsonInput();

        // Validation
        if (empty($input['name']) || empty($input['brand']) || empty($input['model_number']) || empty($input['serial_number'])) {
            jsonError('Required fields: name, brand, model_number, serial_number');
        }

        // Auto-generate Asset ID if not provided
        $asset_id = !empty($input['asset_id']) ? trim($input['asset_id']) : 'BME-' . strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', $input['name']), 0, 3)) . '-' . rand(100, 999);
        
        // Auto-generate QR code token
        $qr_token = !empty($input['qr_code_token']) ? trim($input['qr_code_token']) : 'QR-' . $asset_id . '-' . strtoupper(bin2hex(random_bytes(3)));

        // Auto-generate RFID tag ID if not provided
        $rfid_tag = !empty($input['rfid_tag_id']) ? trim($input['rfid_tag_id']) : 'E280116060' . strtoupper(bin2hex(random_bytes(7)));

        // Determine warranty status based on warranty_end_date
        $warranty_end = !empty($input['warranty_end_date']) ? $input['warranty_end_date'] : date('Y-m-d', strtotime('+1 year'));
        $warranty_status = (strtotime($warranty_end) >= strtotime(date('Y-m-d'))) ? 'Under Warranty' : 'Out of Warranty';

        $sql = "INSERT INTO equipments (
            asset_id, equipment_type_id, name, brand, model_number, serial_number,
            qr_code_token, rfid_tag_id, department_id, building, floor, room_number, bed_slot,
            vendor_id, po_number, invoice_number, purchase_date, purchase_cost, currency,
            installation_date, commissioning_engineer, warranty_start_date, warranty_end_date,
            warranty_status, contract_type, contract_vendor_id, contract_start_date, contract_end_date,
            contract_value, maintenance_schedule_type, maintenance_schedule_notes, emergency_contact_name,
            emergency_phone, vendor_service_email, status, last_pm_date, next_pm_due_date,
            last_calibration_date, next_calibration_due_date, criticality, protection_class, applied_part_type,
            rfid_last_detected_at, rfid_reader_node
        ) VALUES (
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, NOW(), ?
        )";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $asset_id,
            (int)($input['equipment_type_id'] ?? 1),
            trim($input['name']),
            trim($input['brand']),
            trim($input['model_number']),
            trim($input['serial_number']),
            $qr_token,
            $rfid_tag,
            (int)($input['department_id'] ?? 1),
            $input['building'] ?? 'Main Hospital Block',
            $input['floor'] ?? 'Ground Floor',
            $input['room_number'] ?? 'General Ward',
            $input['bed_slot'] ?? '',
            (int)($input['vendor_id'] ?? 1),
            $input['po_number'] ?? '',
            $input['invoice_number'] ?? '',
            $input['purchase_date'] ?? date('Y-m-d'),
            (float)($input['purchase_cost'] ?? 0.0),
            $input['currency'] ?? 'USD',
            $input['installation_date'] ?? date('Y-m-d'),
            $input['commissioning_engineer'] ?? '',
            $input['warranty_start_date'] ?? date('Y-m-d'),
            $warranty_end,
            $warranty_status,
            $input['contract_type'] ?? 'Warranty Period',
            !empty($input['contract_vendor_id']) ? (int)$input['contract_vendor_id'] : (int)($input['vendor_id'] ?? 1),
            !empty($input['contract_start_date']) ? $input['contract_start_date'] : null,
            !empty($input['contract_end_date']) ? $input['contract_end_date'] : null,
            (float)($input['contract_value'] ?? 0.0),
            $input['maintenance_schedule_type'] ?? 'Quarterly',
            $input['maintenance_schedule_notes'] ?? '',
            $input['emergency_contact_name'] ?? '',
            $input['emergency_phone'] ?? '+973-1789-4099',
            $input['vendor_service_email'] ?? '',
            $input['status'] ?? 'Operational',
            !empty($input['last_pm_date']) ? $input['last_pm_date'] : date('Y-m-d'),
            !empty($input['next_pm_due_date']) ? $input['next_pm_due_date'] : date('Y-m-d', strtotime('+3 months')),
            !empty($input['last_calibration_date']) ? $input['last_calibration_date'] : date('Y-m-d'),
            !empty($input['next_calibration_due_date']) ? $input['next_calibration_due_date'] : date('Y-m-d', strtotime('+6 months')),
            $input['criticality'] ?? 'High Priority',
            $input['protection_class'] ?? 'Class I',
            $input['applied_part_type'] ?? 'BF',
            'GATEWAY-AUTO-INIT'
        ]);

        $newId = $pdo->lastInsertId();

        jsonResponse([
            'status' => 'success',
            'message' => 'Equipment registered successfully with QR code and RFID tracking token.',
            'id' => $newId,
            'asset_id' => $asset_id,
            'qr_code_token' => $qr_token,
            'rfid_tag_id' => $rfid_tag
        ], 201);
    } catch (PDOException $e) {
        jsonError('Failed to register equipment: ' . $e->getMessage(), 500);
    }
} elseif ($method === 'PUT') {
    try {
        $input = getJsonInput();
        if (empty($input['id'])) {
            jsonError('Equipment ID is required');
        }

        $id = (int)$input['id'];

        $fields = [
            'name', 'brand', 'model_number', 'serial_number', 'equipment_type_id',
            'department_id', 'building', 'floor', 'room_number', 'bed_slot',
            'rfid_tag_id', 'rfid_card_alias', 'rfid_card_hex', 'rfid_reader_node', 'transit_status',
            'vendor_id', 'po_number', 'invoice_number',
            'purchase_date', 'purchase_cost', 'currency', 'installation_date',
            'warranty_start_date', 'warranty_end_date', 'warranty_status',
            'contract_type', 'contract_vendor_id', 'contract_start_date', 'contract_end_date',
            'contract_value', 'maintenance_schedule_type', 'maintenance_schedule_notes',
            'emergency_contact_name', 'emergency_phone', 'vendor_service_email',
            'status', 'last_pm_date', 'next_pm_due_date', 'last_calibration_date',
            'next_calibration_due_date', 'criticality', 'protection_class', 'applied_part_type'
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
        $sql = "UPDATE equipments SET " . implode(", ", $updates) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        jsonResponse([
            'status' => 'success',
            'message' => 'Equipment updated successfully',
            'id' => $id
        ]);
    } catch (PDOException $e) {
        jsonError('Failed to update equipment: ' . $e->getMessage(), 500);
    }
} elseif ($method === 'DELETE') {
    try {
        $id = !empty($_GET['id']) ? (int)$_GET['id'] : 0;
        if (!$id) {
            jsonError('Equipment ID required');
        }

        $stmt = $pdo->prepare("DELETE FROM equipments WHERE id = ?");
        $stmt->execute([$id]);

        jsonResponse([
            'status' => 'success',
            'message' => 'Equipment deleted successfully'
        ]);
    } catch (PDOException $e) {
        jsonError('Failed to delete equipment: ' . $e->getMessage(), 500);
    }
}
