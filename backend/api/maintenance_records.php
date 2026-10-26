<?php
require_once __DIR__ . '/../config/db.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    try {
        $equipmentId = !empty($_GET['equipment_id']) ? (int)$_GET['equipment_id'] : 0;
        $params = [];
        $where = "";

        if ($equipmentId) {
            $where = "WHERE m.equipment_id = ?";
            $params[] = $equipmentId;
        }

        $sql = "SELECT 
            m.*, 
            e.asset_id, e.name as equipment_name, e.brand, e.model_number, e.serial_number,
            d.name as department_name, d.floor as department_floor,
            ct.title as template_title
        FROM maintenance_records m
        JOIN equipments e ON m.equipment_id = e.id
        JOIN departments d ON e.department_id = d.id
        LEFT JOIN checklist_templates ct ON m.template_id = ct.id
        {$where}
        ORDER BY m.performed_date DESC, m.id DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $records = $stmt->fetchAll();

        // Optionally fetch items if single record requested
        if (!empty($_GET['record_id'])) {
            $recId = (int)$_GET['record_id'];
            $stmt = $pdo->prepare("SELECT * FROM maintenance_record_items WHERE maintenance_record_id = ?");
            $stmt->execute([$recId]);
            $items = $stmt->fetchAll();

            jsonResponse([
                'status' => 'success',
                'record' => $records[0] ?? null,
                'items' => $items
            ]);
        }

        jsonResponse([
            'status' => 'success',
            'count' => count($records),
            'data' => $records
        ]);
    } catch (PDOException $e) {
        jsonError('Failed to fetch maintenance records: ' . $e->getMessage(), 500);
    }
} elseif ($method === 'POST') {
    try {
        $input = getJsonInput();
        if (empty($input['equipment_id']) || empty($input['performed_by'])) {
            jsonError('Required fields: equipment_id, performed_by');
        }

        $equipmentId = (int)$input['equipment_id'];
        $templateId = !empty($input['template_id']) ? (int)$input['template_id'] : null;
        $performedDate = !empty($input['performed_date']) ? $input['performed_date'] : date('Y-m-d');
        $overallResult = $input['overall_result'] ?? 'Passed - Ready for Clinical Use';
        $timeSpent = (int)($input['time_spent_minutes'] ?? 45);
        $testEquip = $input['test_equipment_used'] ?? 'Fluke ESA620 Electrical Safety Analyzer';
        $notes = $input['engineer_notes'] ?? '';
        $partsReplaced = $input['parts_replaced'] ?? '';

        // Calculate next PM due date
        // Check equipment's maintenance_schedule_type
        $stmt = $pdo->prepare("SELECT maintenance_schedule_type FROM equipments WHERE id = ?");
        $stmt->execute([$equipmentId]);
        $eq = $stmt->fetch();
        $scheduleType = $eq['maintenance_schedule_type'] ?? 'Quarterly';

        if (!empty($input['next_pm_due_date'])) {
            $nextPmDue = $input['next_pm_due_date'];
        } else {
            switch (strtolower($scheduleType)) {
                case 'monthly':
                    $nextPmDue = date('Y-m-d', strtotime('+1 month', strtotime($performedDate)));
                    break;
                case 'bi-monthly':
                    $nextPmDue = date('Y-m-d', strtotime('+2 months', strtotime($performedDate)));
                    break;
                case 'semi-annual':
                case 'semi-annually':
                    $nextPmDue = date('Y-m-d', strtotime('+6 months', strtotime($performedDate)));
                    break;
                case 'annual':
                case 'annually':
                    $nextPmDue = date('Y-m-d', strtotime('+1 year', strtotime($performedDate)));
                    break;
                case 'quarterly':
                default:
                    $nextPmDue = date('Y-m-d', strtotime('+3 months', strtotime($performedDate)));
                    break;
            }
        }

        // Generate Work Order No
        $workOrder = 'WO-PM-' . date('Y') . '-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);

        $pdo->beginTransaction();

        $stmt = $pdo->prepare("INSERT INTO maintenance_records (
            work_order_no, equipment_id, template_id, maintenance_type, performed_by,
            technician_badge, performed_date, overall_result, next_pm_due_date,
            time_spent_minutes, test_equipment_used, engineer_notes, parts_replaced
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

        $stmt->execute([
            $workOrder,
            $equipmentId,
            $templateId,
            $input['maintenance_type'] ?? 'Preventive Maintenance (PM)',
            trim($input['performed_by']),
            $input['technician_badge'] ?? 'SAND-BME-' . rand(10, 99),
            $performedDate,
            $overallResult,
            $nextPmDue,
            $timeSpent,
            $testEquip,
            $notes,
            $partsReplaced
        ]);

        $recordId = $pdo->lastInsertId();

        // Insert individual checklist item responses
        if (!empty($input['items']) && is_array($input['items'])) {
            $stmtItem = $pdo->prepare("INSERT INTO maintenance_record_items (
                maintenance_record_id, checklist_item_id, category, title, status, measured_value, remarks
            ) VALUES (?, ?, ?, ?, ?, ?, ?)");

            foreach ($input['items'] as $item) {
                $stmtItem->execute([
                    $recordId,
                    !empty($item['checklist_item_id']) ? (int)$item['checklist_item_id'] : null,
                    $item['category'] ?? 'Inspection',
                    $item['title'] ?? 'Checklist Item',
                    $item['status'] ?? 'Pass',
                    $item['measured_value'] ?? null,
                    $item['remarks'] ?? null
                ]);
            }
        }

        // Update Equipment's last_pm_date and next_pm_due_date
        $newEqStatus = ($overallResult === 'Failed - Immediate Attention Required') ? 'Under Maintenance' : 'Operational';
        $stmtUpdateEq = $pdo->prepare("UPDATE equipments SET 
            last_pm_date = ?, 
            next_pm_due_date = ?, 
            status = CASE WHEN status = 'Under Breakdown' THEN status ELSE ? END 
            WHERE id = ?");
        $stmtUpdateEq->execute([$performedDate, $nextPmDue, $newEqStatus, $equipmentId]);

        // Clean up any in-progress PM draft for this equipment
        $stmtDeleteDraft = $pdo->prepare("DELETE FROM pm_checklist_drafts WHERE equipment_id = ?");
        $stmtDeleteDraft->execute([$equipmentId]);

        $pdo->commit();

        jsonResponse([
            'status' => 'success',
            'message' => 'Preventive maintenance checklist recorded successfully',
            'work_order_no' => $workOrder,
            'record_id' => $recordId,
            'next_pm_due_date' => $nextPmDue
        ], 201);
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        jsonError('Failed to record maintenance: ' . $e->getMessage(), 500);
    }
}
