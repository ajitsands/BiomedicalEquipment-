<?php
require_once __DIR__ . '/../config/db.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT 
            v.*,
            COUNT(e.id) as supplied_equipment_count
        FROM vendors v
        LEFT JOIN equipments e ON e.vendor_id = v.id
        GROUP BY v.id
        ORDER BY v.name ASC");

        $vendors = $stmt->fetchAll();

        jsonResponse([
            'status' => 'success',
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

        $code = !empty($input['vendor_code']) ? $input['vendor_code'] : 'VEND-' . strtoupper(substr(preg_replace('/[^a-zA-Z]/', '', $input['name']), 0, 4)) . '-' . rand(10, 99);

        $stmt = $pdo->prepare("INSERT INTO vendors (name, vendor_code, contact_person, phone, emergency_hotline, email, address, service_manager, service_manager_phone, website) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            trim($input['name']),
            $code,
            $input['contact_person'] ?? '',
            $input['phone'] ?? '',
            trim($input['emergency_hotline']),
            $input['email'] ?? '',
            $input['address'] ?? '',
            $input['service_manager'] ?? '',
            $input['service_manager_phone'] ?? '',
            $input['website'] ?? ''
        ]);

        jsonResponse([
            'status' => 'success',
            'message' => 'Vendor created successfully',
            'id' => $pdo->lastInsertId()
        ], 201);
    } catch (PDOException $e) {
        jsonError('Failed to create vendor: ' . $e->getMessage(), 500);
    }
}
