<?php
require_once __DIR__ . '/../config/db.php';

try {
    $id = !empty($_GET['id']) ? (int)$_GET['id'] : 0;
    $qr = !empty($_GET['qr']) ? trim($_GET['qr']) : '';
    $rfid = !empty($_GET['rfid']) ? trim($_GET['rfid']) : '';

    if (!$id && empty($qr) && empty($rfid)) {
        jsonError('Must provide equipment id, qr token, or rfid tag');
    }

    $whereClause = "e.id = ?";
    $param = $id;

    if (!empty($qr)) {
        $whereClause = "e.qr_code_token = ?";
        $param = $qr;
    } elseif (!empty($rfid)) {
        $whereClause = "e.rfid_tag_id = ?";
        $param = $rfid;
    }

    // 1. Fetch Master Equipment Info
    $sql = "SELECT 
        e.*, 
        et.name as equipment_type_name, et.category as equipment_category, et.risk_classification, 
        et.asset_type_code, et.department_scope, et.common_complaints, et.routine_user_inspection, et.technical_inspection_scope, et.suggested_pm_schedule,
        et.default_pm_frequency, et.standard_regulatory_code, et.icon_name, et.description as equipment_type_description,
        d.name as department_name, d.code as department_code, d.floor as department_floor, 
        d.building as department_building, d.head_of_department, d.contact_phone as department_phone,
        v.name as vendor_name, v.contact_person as vendor_contact_person, v.phone as vendor_phone, 
        v.emergency_hotline as vendor_emergency_hotline, v.email as vendor_email, v.address as vendor_address, 
        v.service_manager, v.service_manager_phone,
        cv.name as contract_vendor_name, cv.emergency_hotline as contract_vendor_hotline, cv.phone as contract_vendor_phone
    FROM equipments e
    JOIN equipment_types et ON e.equipment_type_id = et.id
    JOIN departments d ON e.department_id = d.id
    JOIN vendors v ON e.vendor_id = v.id
    LEFT JOIN vendors cv ON e.contract_vendor_id = cv.id
    WHERE {$whereClause} LIMIT 1";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$param]);
    $equipment = $stmt->fetch();

    if (!$equipment) {
        jsonError('Equipment not found', 404);
    }

    $equipmentId = (int)$equipment['id'];
    $typeId = (int)$equipment['equipment_type_id'];

    // 2. Fetch Attachments (Manuals, Warranty Cards, Certificates)
    $stmt = $pdo->prepare("SELECT * FROM equipment_attachments WHERE equipment_id = ? ORDER BY uploaded_at DESC");
    $stmt->execute([$equipmentId]);
    $attachments = $stmt->fetchAll();

    // 3. Fetch Maintenance History
    $stmt = $pdo->prepare("SELECT 
        m.*, 
        ct.title as template_title
    FROM maintenance_records m
    LEFT JOIN checklist_templates ct ON m.template_id = ct.id
    WHERE m.equipment_id = ?
    ORDER BY m.performed_date DESC");
    $stmt->execute([$equipmentId]);
    $maintenance_records = $stmt->fetchAll();

    // 4. Fetch Breakdown Complaints / Tickets
    $stmt = $pdo->prepare("SELECT 
        c.*, 
        d.name as department_name
    FROM complaints c
    JOIN departments d ON c.department_id = d.id
    WHERE c.equipment_id = ?
    ORDER BY c.reported_at DESC");
    $stmt->execute([$equipmentId]);
    $complaints = $stmt->fetchAll();

    // 5. Fetch Checklist Template and Items for this Equipment Type
    $stmt = $pdo->prepare("SELECT * FROM checklist_templates WHERE equipment_type_id = ? LIMIT 1");
    $stmt->execute([$typeId]);
    $template = $stmt->fetch();

    $checklist_items = [];
    if ($template) {
        $stmt = $pdo->prepare("SELECT * FROM checklist_items WHERE template_id = ? ORDER BY step_number ASC");
        $stmt->execute([$template['id']]);
        $checklist_items = $stmt->fetchAll();
    }

    // 6. Fetch RFID Live Movement Logs
    $stmt = $pdo->prepare("SELECT * FROM rfid_scan_logs WHERE equipment_id = ? ORDER BY scan_timestamp DESC LIMIT 15");
    $stmt->execute([$equipmentId]);
    $rfid_logs = $stmt->fetchAll();

    // 7. Fetch active PM Draft if any
    $stmt = $pdo->prepare("SELECT * FROM pm_checklist_drafts WHERE equipment_id = ? AND status = 'in_progress' LIMIT 1");
    $stmt->execute([$equipmentId]);
    $pmDraft = $stmt->fetch();
    if ($pmDraft) {
        $pmDraft['answers'] = !empty($pmDraft['answers_json']) ? json_decode($pmDraft['answers_json'], true) : [];
        unset($pmDraft['answers_json']);
    }

    jsonResponse([
        'status' => 'success',
        'data' => [
            'equipment' => $equipment,
            'attachments' => $attachments,
            'maintenance_records' => $maintenance_records,
            'complaints' => $complaints,
            'checklist_template' => $template,
            'checklist_items' => $checklist_items,
            'rfid_logs' => $rfid_logs,
            'pm_draft' => $pmDraft ?: null
        ]
    ]);
} catch (PDOException $e) {
    jsonError('Failed to fetch equipment details: ' . $e->getMessage(), 500);
}
