<?php
require_once __DIR__ . '/../config/db.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    try {
        $where = [];
        $params = [];

        if (!empty($_GET['type'])) {
            $type = trim($_GET['type']);
            if ($type !== 'ALL') {
                $where[] = "v.vendor_type = ?";
                $params[] = $type;
            }
        }

        if (isset($_GET['is_active'])) {
            $where[] = "v.is_active = ?";
            $params[] = (int)$_GET['is_active'];
        }

        $sql = "SELECT 
            v.*,
            COUNT(e.id) as supplied_equipment_count
        FROM vendors v
        LEFT JOIN equipments e ON e.vendor_id = v.id";

        if (!empty($where)) {
            $sql .= " WHERE " . implode(" AND ", $where);
        }

        $sql .= " GROUP BY v.id ORDER BY v.vendor_type ASC, v.name ASC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $vendors = $stmt->fetchAll();

        jsonResponse([
            'status' => 'success',
            'count' => count($vendors),
            'data' => $vendors
        ]);
    } catch (PDOException $e) {
        jsonError('Failed to fetch vendors: ' . $e->getMessage(), 500);
    }
} elseif ($method === 'POST') {
    try {
        $input = getJsonInput();
        if (empty($input['name']) || empty($input['emergency_hotline'])) {
            jsonError('Name and Emergency Hotline are required');
        }

        $type = !empty($input['vendor_type']) ? $input['vendor_type'] : 'Vendor / OEM';
        $prefix = 'VEND';
        if ($type === 'Contractor') $prefix = 'CONT';
        if ($type === 'Supplier') $prefix = 'SUPP';

        $code = !empty($input['vendor_code']) ? $input['vendor_code'] : $prefix . '-' . strtoupper(substr(preg_replace('/[^a-zA-Z]/', '', $input['name']), 0, 4)) . '-' . rand(10, 99);

        $stmt = $pdo->prepare("INSERT INTO vendors (
            name, vendor_type, vendor_code, contact_person, phone, emergency_hotline,
            email, address, tax_id, service_manager, service_manager_phone, website, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)");

        $stmt->execute([
            trim($input['name']),
            $type,
            $code,
            $input['contact_person'] ?? '',
            $input['phone'] ?? '',
            trim($input['emergency_hotline']),
            $input['email'] ?? '',
            $input['address'] ?? '',
            $input['tax_id'] ?? '',
            $input['service_manager'] ?? '',
            $input['service_manager_phone'] ?? '',
            $input['website'] ?? ''
        ]);

        jsonResponse([
            'status' => 'success',
            'message' => "{$type} created successfully",
            'id' => $pdo->lastInsertId(),
            'vendor_code' => $code
        ], 201);
    } catch (PDOException $e) {
        jsonError('Failed to create partner: ' . $e->getMessage(), 500);
    }
} elseif ($method === 'PUT') {
    try {
        $input = getJsonInput();
        if (empty($input['id'])) {
            jsonError('Vendor ID is required');
        }

        $id = (int)$input['id'];

        $fields = [
            'name', 'vendor_type', 'vendor_code', 'contact_person',
            'phone', 'emergency_hotline', 'email', 'address', 'tax_id',
            'service_manager', 'service_manager_phone', 'website', 'is_active', 'rating'
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

        $sql = "UPDATE vendors SET " . implode(", ", $updates) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        jsonResponse([
            'status' => 'success',
            'message' => 'Partner details updated successfully',
            'id' => $id
        ]);
    } catch (PDOException $e) {
        jsonError('Failed to update partner: ' . $e->getMessage(), 500);
    }
} elseif ($method === 'DELETE') {
    try {
        $id = !empty($_GET['id']) ? (int)$_GET['id'] : 0;
        if (!$id) {
            jsonError('ID is required');
        }

        $stmt = $pdo->prepare("UPDATE vendors SET is_active = 0 WHERE id = ?");
        $stmt->execute([$id]);

        jsonResponse([
            'status' => 'success',
            'message' => 'Partner deactivated successfully'
        ]);
    } catch (PDOException $e) {
        jsonError('Failed to deactivate partner: ' . $e->getMessage(), 500);
    }
}
