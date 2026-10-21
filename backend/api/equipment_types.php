<?php
require_once __DIR__ . '/../config/db.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT 
            et.*, 
            COUNT(e.id) as active_equipment_count,
            ct.id as checklist_template_id,
            ct.title as checklist_template_title,
            (SELECT COUNT(*) FROM checklist_items ci WHERE ci.template_id = ct.id) as checklist_items_count
        FROM equipment_types et
        LEFT JOIN equipments e ON e.equipment_type_id = et.id
        LEFT JOIN checklist_templates ct ON ct.equipment_type_id = et.id
        GROUP BY et.id
        ORDER BY et.name ASC");
        
        $types = $stmt->fetchAll();

        jsonResponse([
            'status' => 'success',
            'data' => $types
        ]);
    } catch (PDOException $e) {
        jsonError('Failed to fetch equipment types: ' . $e->getMessage(), 500);
    }
} elseif ($method === 'POST') {
    try {
        $input = getJsonInput();
        if (empty($input['name']) || empty($input['category'])) {
            jsonError('Name and category are required');
        }

        $stmt = $pdo->prepare("INSERT INTO equipment_types (name, category, risk_classification, default_pm_frequency, standard_regulatory_code, icon_name, description) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            trim($input['name']),
            trim($input['category']),
            $input['risk_classification'] ?? 'Medium (Class IIb)',
            $input['default_pm_frequency'] ?? 'Quarterly',
            $input['standard_regulatory_code'] ?? 'IEC 60601-1 / IEC 62353',
            $input['icon_name'] ?? 'Activity',
            $input['description'] ?? ''
        ]);

        $newId = $pdo->lastInsertId();
        jsonResponse([
            'status' => 'success',
            'message' => 'Equipment type created successfully',
            'id' => $newId
        ], 201);
    } catch (PDOException $e) {
        jsonError('Failed to create equipment type: ' . $e->getMessage(), 500);
    }
}
