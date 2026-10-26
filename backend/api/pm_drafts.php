<?php
require_once __DIR__ . '/../config/db.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    try {
        $equipmentId = !empty($_GET['equipment_id']) ? (int)$_GET['equipment_id'] : 0;
        
        if ($equipmentId <= 0) {
            // Return all active drafts if no specific equipment requested
            $stmt = $pdo->query("SELECT d.*, e.asset_id, e.name as equipment_name, e.serial_number 
                                 FROM pm_checklist_drafts d
                                 JOIN equipments e ON d.equipment_id = e.id
                                 WHERE d.status = 'in_progress'
                                 ORDER BY d.updated_at DESC");
            $drafts = $stmt->fetchAll();
            jsonResponse([
                'status' => 'success',
                'count' => count($drafts),
                'data' => $drafts
            ]);
        }

        $stmt = $pdo->prepare("SELECT * FROM pm_checklist_drafts WHERE equipment_id = ? AND status = 'in_progress' LIMIT 1");
        $stmt->execute([$equipmentId]);
        $draft = $stmt->fetch();

        if (!$draft) {
            jsonResponse([
                'status' => 'success',
                'has_draft' => false,
                'draft' => null
            ]);
        }

        $answers = !empty($draft['answers_json']) ? json_decode($draft['answers_json'], true) : [];

        jsonResponse([
            'status' => 'success',
            'has_draft' => true,
            'draft' => [
                'id' => (int)$draft['id'],
                'equipment_id' => (int)$draft['equipment_id'],
                'template_id' => $draft['template_id'] ? (int)$draft['template_id'] : null,
                'technician_name' => $draft['technician_name'] ?? '',
                'technician_badge' => $draft['technician_badge'] ?? '',
                'inspection_date' => $draft['inspection_date'] ?? date('Y-m-d'),
                'time_spent_minutes' => (int)($draft['time_spent_minutes'] ?? 0),
                'test_equipment_used' => $draft['test_equipment_used'] ?? '',
                'engineer_notes' => $draft['engineer_notes'] ?? '',
                'parts_replaced' => $draft['parts_replaced'] ?? '',
                'total_items' => (int)($draft['total_items'] ?? 0),
                'completed_count' => (int)($draft['completed_count'] ?? 0),
                'progress_percent' => (int)($draft['progress_percent'] ?? 0),
                'answers' => $answers,
                'status' => $draft['status'],
                'created_at' => $draft['created_at'],
                'updated_at' => $draft['updated_at']
            ]
        ]);
    } catch (PDOException $e) {
        jsonError('Failed to fetch PM draft: ' . $e->getMessage(), 500);
    }
} elseif ($method === 'POST') {
    try {
        $input = getJsonInput();
        if (empty($input['equipment_id'])) {
            jsonError('Required field: equipment_id');
        }

        $equipmentId = (int)$input['equipment_id'];
        $templateId = !empty($input['template_id']) ? (int)$input['template_id'] : null;
        $techName = $input['technician_name'] ?? '';
        $techBadge = $input['technician_badge'] ?? '';
        $inspDate = !empty($input['inspection_date']) ? $input['inspection_date'] : date('Y-m-d');
        $timeSpent = (int)($input['time_spent_minutes'] ?? 0);
        $testEquip = $input['test_equipment_used'] ?? '';
        $notes = $input['engineer_notes'] ?? '';
        $parts = $input['parts_replaced'] ?? '';
        $totalItems = (int)($input['total_items'] ?? 0);
        $completedCount = (int)($input['completed_count'] ?? 0);
        $progressPercent = (int)($input['progress_percent'] ?? 0);
        
        $answers = $input['answers'] ?? [];
        $answersJson = is_string($answers) ? $answers : json_encode($answers, JSON_UNESCAPED_UNICODE);

        $sql = "INSERT INTO pm_checklist_drafts (
            equipment_id, template_id, technician_name, technician_badge,
            inspection_date, time_spent_minutes, test_equipment_used,
            engineer_notes, parts_replaced, total_items, completed_count,
            progress_percent, answers_json, status
        ) VALUES (
            ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, 'in_progress'
        ) ON DUPLICATE KEY UPDATE
            template_id = VALUES(template_id),
            technician_name = VALUES(technician_name),
            technician_badge = VALUES(technician_badge),
            inspection_date = VALUES(inspection_date),
            time_spent_minutes = VALUES(time_spent_minutes),
            test_equipment_used = VALUES(test_equipment_used),
            engineer_notes = VALUES(engineer_notes),
            parts_replaced = VALUES(parts_replaced),
            total_items = VALUES(total_items),
            completed_count = VALUES(completed_count),
            progress_percent = VALUES(progress_percent),
            answers_json = VALUES(answers_json),
            status = 'in_progress',
            updated_at = NOW()";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $equipmentId,
            $templateId,
            $techName,
            $techBadge,
            $inspDate,
            $timeSpent,
            $testEquip,
            $notes,
            $parts,
            $totalItems,
            $completedCount,
            $progressPercent,
            $answersJson
        ]);

        jsonResponse([
            'status' => 'success',
            'message' => 'PM checklist progress saved successfully',
            'equipment_id' => $equipmentId,
            'completed_count' => $completedCount,
            'total_items' => $totalItems,
            'progress_percent' => $progressPercent,
            'updated_at' => date('Y-m-d H:i:s')
        ]);
    } catch (PDOException $e) {
        jsonError('Failed to save PM draft: ' . $e->getMessage(), 500);
    }
} elseif ($method === 'DELETE') {
    try {
        $equipmentId = !empty($_GET['equipment_id']) ? (int)$_GET['equipment_id'] : 0;
        if ($equipmentId <= 0) {
            $input = getJsonInput();
            $equipmentId = (int)($input['equipment_id'] ?? 0);
        }

        if ($equipmentId <= 0) {
            jsonError('Required parameter: equipment_id');
        }

        $stmt = $pdo->prepare("DELETE FROM pm_checklist_drafts WHERE equipment_id = ?");
        $stmt->execute([$equipmentId]);

        jsonResponse([
            'status' => 'success',
            'message' => 'PM draft cleared successfully',
            'equipment_id' => $equipmentId
        ]);
    } catch (PDOException $e) {
        jsonError('Failed to delete PM draft: ' . $e->getMessage(), 500);
    }
} else {
    jsonError('Method not allowed', 405);
}
