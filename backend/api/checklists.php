<?php
require_once __DIR__ . '/../config/db.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    try {
        if (!empty($_GET['all_templates'])) {
            $stmt = $pdo->query("SELECT 
                ct.*, 
                et.name as equipment_type_name, et.category as equipment_category, et.risk_classification, et.asset_type_code, et.department_scope,
                COUNT(ci.id) as total_items
            FROM checklist_templates ct
            JOIN equipment_types et ON ct.equipment_type_id = et.id
            LEFT JOIN checklist_items ci ON ci.template_id = ct.id
            GROUP BY ct.id
            ORDER BY et.asset_type_code ASC, et.name ASC");
            $templates = $stmt->fetchAll();

            jsonResponse([
                'status' => 'success',
                'data' => $templates
            ]);
        }

        $typeId = !empty($_GET['equipment_type_id']) ? (int)$_GET['equipment_type_id'] : 0;
        $templateId = !empty($_GET['template_id']) ? (int)$_GET['template_id'] : 0;
        $phase = !empty($_GET['phase']) ? trim($_GET['phase']) : '';

        if ($typeId) {
            $stmt = $pdo->prepare("SELECT ct.*, et.name as equipment_type_name, et.risk_classification, et.asset_type_code, et.department_scope, et.common_complaints, et.suggested_pm_schedule, et.default_protection_class, et.default_applied_part_type
                FROM checklist_templates ct 
                JOIN equipment_types et ON ct.equipment_type_id = et.id 
                WHERE ct.equipment_type_id = ? LIMIT 1");
            $stmt->execute([$typeId]);
            $template = $stmt->fetch();
        } elseif ($templateId) {
            $stmt = $pdo->prepare("SELECT ct.*, et.name as equipment_type_name, et.risk_classification, et.asset_type_code, et.department_scope, et.common_complaints, et.suggested_pm_schedule, et.default_protection_class, et.default_applied_part_type
                FROM checklist_templates ct 
                JOIN equipment_types et ON ct.equipment_type_id = et.id 
                WHERE ct.id = ? LIMIT 1");
            $stmt->execute([$templateId]);
            $template = $stmt->fetch();
        } else {
            // Graceful fallback: Pick default WHO biomedical checklist template
            $stmt = $pdo->query("SELECT ct.*, et.name as equipment_type_name, et.risk_classification, et.asset_type_code, et.department_scope, et.common_complaints, et.suggested_pm_schedule, et.default_protection_class, et.default_applied_part_type
                FROM checklist_templates ct 
                JOIN equipment_types et ON ct.equipment_type_id = et.id 
                ORDER BY ct.id ASC LIMIT 1");
            $template = $stmt->fetch();
        }

        if (!$template) {
            jsonResponse([
                'status' => 'success',
                'template' => null,
                'items' => []
            ]);
        }

        $itemQuery = "SELECT * FROM checklist_items WHERE template_id = ?";
        $params = [$template['id']];
        if (!empty($phase)) {
            $itemQuery .= " AND checklist_phase = ?";
            $params[] = $phase;
        }
        $itemQuery .= " ORDER BY FIELD(checklist_phase, 'User pre-use / routine check', 'Preventive maintenance / technical inspection', 'Electrical Safety (IEC 62353)', 'Complaint / corrective maintenance'), step_number ASC, id ASC";

        $stmt = $pdo->prepare($itemQuery);
        $stmt->execute($params);
        $items = $stmt->fetchAll();

        jsonResponse([
            'status' => 'success',
            'template' => $template,
            'items' => $items
        ]);
    } catch (PDOException $e) {
        jsonError('Failed to fetch checklist: ' . $e->getMessage(), 500);
    }
} elseif ($method === 'POST') {
    try {
        $input = getJsonInput();
        if (empty($input['template_id']) || empty($input['title']) || empty($input['category'])) {
            jsonError('Required: template_id, title, category');
        }

        $stmt = $pdo->prepare("INSERT INTO checklist_items (template_id, category, step_number, title, instructions, check_type, unit, min_value, max_value, is_mandatory) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            (int)$input['template_id'],
            trim($input['category']),
            (int)($input['step_number'] ?? 1),
            trim($input['title']),
            $input['instructions'] ?? '',
            $input['check_type'] ?? 'pass_fail',
            $input['unit'] ?? null,
            isset($input['min_value']) ? (float)$input['min_value'] : null,
            isset($input['max_value']) ? (float)$input['max_value'] : null,
            !empty($input['is_mandatory']) ? 1 : 0
        ]);

        jsonResponse([
            'status' => 'success',
            'message' => 'Checklist item added successfully',
            'id' => $pdo->lastInsertId()
        ], 201);
    } catch (PDOException $e) {
        jsonError('Failed to save checklist item: ' . $e->getMessage(), 500);
    }
}
