<?php
// BioTrack CMMS — Version 2.0
// Site Preparation Procedures REST API (GCC & India Master Catalogue)
// Powered and Engineered by SanDS Lab Middle East W.L.L
require_once __DIR__ . '/../config/db.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? 'inspections';

// ==========================================
// 1. GET Requests
// ==========================================
if ($method === 'GET') {
    // A. 18 Master Categories
    if ($action === 'categories') {
        try {
            $stmt = $pdo->query("SELECT 
                c.*,
                (SELECT COUNT(*) FROM site_checklist_master m WHERE m.category_code = c.code) as total_checklist_items,
                (SELECT COUNT(*) FROM site_deficiencies d WHERE d.category_code = c.code AND d.status NOT IN ('Closed after verification')) as active_deficiencies_count
            FROM site_checklist_categories c
            ORDER BY c.sort_order ASC");
            jsonResponse(['status' => 'success', 'data' => $stmt->fetchAll()]);
        } catch (PDOException $e) {
            jsonError('Failed to fetch categories: ' . $e->getMessage(), 500);
        }
    }

    // B. Master 130 Inspection Questions & Complaints Catalogue
    if ($action === 'master_items') {
        try {
            $cat = $_GET['category_code'] ?? null;
            $dept = $_GET['specialist_department'] ?? null;
            $priority = $_GET['priority'] ?? null;
            $search = $_GET['search'] ?? null;

            $sql = "SELECT m.*, c.name as category_name, c.responsible_department as category_responsible_dept 
                    FROM site_checklist_master m 
                    JOIN site_checklist_categories c ON m.category_code = c.code 
                    WHERE 1=1";
            $params = [];

            if ($cat) {
                $sql .= " AND m.category_code = ?";
                $params[] = $cat;
            }
            if ($dept) {
                $sql .= " AND (m.specialist_department = ? OR m.specialist_department = 'General / All')";
                $params[] = $dept;
            }
            if ($priority) {
                $sql .= " AND m.default_priority = ?";
                $params[] = $priority;
            }
            if ($search) {
                $sql .= " AND (m.item_code LIKE ? OR m.deficiency_title LIKE ? OR m.inspection_question LIKE ?)";
                $params[] = "%{$search}%";
                $params[] = "%{$search}%";
                $params[] = "%{$search}%";
            }

            $sql .= " ORDER BY m.sort_order ASC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            jsonResponse(['status' => 'success', 'data' => $stmt->fetchAll()]);
        } catch (PDOException $e) {
            jsonError('Failed to fetch master checklist items: ' . $e->getMessage(), 500);
        }
    }

    // C. Country Regulatory Compliance Profiles
    if ($action === 'compliance_profiles') {
        try {
            $stmt = $pdo->query("SELECT * FROM site_compliance_profiles ORDER BY country_name ASC");
            jsonResponse(['status' => 'success', 'data' => $stmt->fetchAll()]);
        } catch (PDOException $e) {
            jsonError('Failed to fetch compliance profiles: ' . $e->getMessage(), 500);
        }
    }

    // D. Site Preparation Inspections List
    if ($action === 'inspections') {
        try {
            $country = $_GET['country'] ?? null;
            $status = $_GET['status'] ?? null;

            $sql = "SELECT 
                i.*,
                d.name as department_name,
                d.code as department_code,
                et.name as equipment_type_name,
                et.category as equipment_category,
                v.name as vendor_name,
                v.emergency_hotline as vendor_phone,
                p.country_name,
                p.flag as country_flag,
                p.regulatory_authority,
                (SELECT COUNT(*) FROM site_deficiencies def WHERE def.inspection_id = i.id AND def.status NOT IN ('Closed after verification')) as open_deficiencies_count,
                (SELECT COUNT(*) FROM site_deficiencies def WHERE def.inspection_id = i.id AND def.priority = 'Critical' AND def.status NOT IN ('Closed after verification')) as critical_deficiencies_count,
                (SELECT COUNT(*) FROM site_inspection_details det WHERE det.inspection_id = i.id AND det.result = 'Pass') as passed_count,
                (SELECT COUNT(*) FROM site_inspection_details det WHERE det.inspection_id = i.id AND det.result = 'Fail') as failed_count,
                (SELECT COUNT(*) FROM site_inspection_details det WHERE det.inspection_id = i.id AND det.result = 'Pending') as pending_count,
                (SELECT COUNT(*) FROM site_inspection_details det WHERE det.inspection_id = i.id AND det.result = 'N/A') as na_count
            FROM site_inspections i
            JOIN departments d ON i.department_id = d.id
            JOIN equipment_types et ON i.equipment_type_id = et.id
            LEFT JOIN vendors v ON i.vendor_id = v.id
            LEFT JOIN site_compliance_profiles p ON i.country_code = p.country_code
            WHERE 1=1";
            $params = [];

            if ($country && $country !== 'ALL') {
                $sql .= " AND i.country_code = ?";
                $params[] = $country;
            }
            if ($status && $status !== 'all') {
                $sql .= " AND i.overall_status = ?";
                $params[] = $status;
            }

            $sql .= " ORDER BY i.inspection_date DESC, i.id DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            jsonResponse(['status' => 'success', 'data' => $stmt->fetchAll()]);
        } catch (PDOException $e) {
            jsonError('Failed to fetch inspections: ' . $e->getMessage(), 500);
        }
    }

    // E. Single Site Inspection Detail (Full Audit & 130-Point Checklist)
    if ($action === 'inspection_detail') {
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) jsonError('Invalid inspection ID');

        try {
            // 1. Audit Header
            $stmt = $pdo->prepare("SELECT 
                i.*,
                d.name as department_name,
                d.building as dept_building,
                d.floor as dept_floor,
                et.name as equipment_type_name,
                et.category as equipment_category,
                v.name as vendor_name,
                v.contact_person as vendor_contact,
                v.phone as vendor_phone,
                p.country_name,
                p.flag as country_flag,
                p.regulatory_authority,
                p.primary_standard_doc
            FROM site_inspections i
            JOIN departments d ON i.department_id = d.id
            JOIN equipment_types et ON i.equipment_type_id = et.id
            LEFT JOIN vendors v ON i.vendor_id = v.id
            LEFT JOIN site_compliance_profiles p ON i.country_code = p.country_code
            WHERE i.id = ?");
            $stmt->execute([$id]);
            $inspection = $stmt->fetch();
            if (!$inspection) jsonError('Inspection audit not found', 404);

            // 2. Checklist Items & Existing Results
            $stmt = $pdo->prepare("SELECT 
                m.id as checklist_item_id,
                m.item_code,
                m.category_code,
                m.deficiency_title,
                m.inspection_question,
                m.responsible_department,
                m.default_priority,
                m.specialist_department,
                m.standard_tolerance,
                m.evidence_required,
                c.name as category_name,
                c.icon as category_icon,
                COALESCE(d.result, 'Pending') as result,
                d.measured_value,
                d.is_deficiency,
                d.inspector_remarks
            FROM site_checklist_master m
            JOIN site_checklist_categories c ON m.category_code = c.code
            LEFT JOIN site_inspection_details d ON (d.checklist_item_id = m.id AND d.inspection_id = ?)
            ORDER BY m.sort_order ASC");
            $stmt->execute([$id]);
            $checklistItems = $stmt->fetchAll();

            // 3. Logged Deficiencies for this audit
            $stmt = $pdo->prepare("SELECT def.*, m.item_code, m.inspection_question 
                                   FROM site_deficiencies def
                                   JOIN site_checklist_master m ON def.checklist_item_id = m.id
                                   WHERE def.inspection_id = ?
                                   ORDER BY 
                                      CASE def.priority 
                                          WHEN 'Critical' THEN 1 
                                          WHEN 'High' THEN 2 
                                          WHEN 'Medium' THEN 3 
                                          ELSE 4 
                                      END,
                                      def.created_at DESC");
            $stmt->execute([$id]);
            $deficiencies = $stmt->fetchAll();

            // 4. Official Sign-off Certificate (if approved)
            $stmt = $pdo->prepare("SELECT * FROM site_readiness_approvals WHERE inspection_id = ?");
            $stmt->execute([$id]);
            $certificate = $stmt->fetch();

            jsonResponse([
                'status' => 'success',
                'data' => [
                    'inspection' => $inspection,
                    'items' => $checklistItems,
                    'deficiencies' => $deficiencies,
                    'certificate' => $certificate
                ]
            ]);
        } catch (PDOException $e) {
            jsonError('Failed to fetch inspection details: ' . $e->getMessage(), 500);
        }
    }

    // F. List All Deficiencies Across Hospital Site Projects
    if ($action === 'deficiencies') {
        try {
            $priority = $_GET['priority'] ?? null;
            $status = $_GET['status'] ?? null;
            $cat = $_GET['category_code'] ?? null;
            $country = $_GET['country'] ?? null;

            $sql = "SELECT 
                def.*,
                i.audit_number,
                i.facility_name,
                i.room_number,
                i.country_code,
                d.name as department_name,
                et.name as equipment_type_name,
                m.item_code,
                m.inspection_question,
                m.standard_tolerance
            FROM site_deficiencies def
            JOIN site_inspections i ON def.inspection_id = i.id
            JOIN departments d ON i.department_id = d.id
            JOIN equipment_types et ON i.equipment_type_id = et.id
            JOIN site_checklist_master m ON def.checklist_item_id = m.id
            WHERE 1=1";
            $params = [];

            if ($priority) {
                $sql .= " AND def.priority = ?";
                $params[] = $priority;
            }
            if ($status && $status !== 'all') {
                $sql .= " AND def.status = ?";
                $params[] = $status;
            }
            if ($cat) {
                $sql .= " AND def.category_code = ?";
                $params[] = $cat;
            }
            if ($country && $country !== 'ALL') {
                $sql .= " AND i.country_code = ?";
                $params[] = $country;
            }

            $sql .= " ORDER BY 
                CASE def.priority 
                    WHEN 'Critical' THEN 1 
                    WHEN 'High' THEN 2 
                    WHEN 'Medium' THEN 3 
                    ELSE 4 
                END, 
                def.created_at DESC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            jsonResponse(['status' => 'success', 'data' => $stmt->fetchAll()]);
        } catch (PDOException $e) {
            jsonError('Failed to fetch deficiencies: ' . $e->getMessage(), 500);
        }
    }
}

// ==========================================
// 2. POST / PUT Requests (Mutations)
// ==========================================
if ($method === 'POST') {
    $input = getJsonInput();

    // A. Create New Site Inspection Audit
    if ($action === 'create_audit') {
        if (empty($input['facility_name']) || empty($input['room_number']) || empty($input['department_id']) || empty($input['equipment_type_id'])) {
            jsonError('Facility name, room number, department, and equipment type are required.');
        }

        try {
            $pdo->beginTransaction();

            // Auto-generate audit number (e.g. SA-AUD-2026-0042)
            $country = !empty($input['country_code']) ? strtoupper(substr($input['country_code'], 0, 2)) : 'BH';
            $auditNumber = $country . '-AUD-' . date('Y') . '-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);

            $stmt = $pdo->prepare("INSERT INTO `site_inspections` (
                `audit_number`, `country_code`, `facility_name`, `department_id`, `room_number`, 
                `building`, `floor`, `equipment_type_id`, `target_model`, `vendor_id`, 
                `vendor_project_manager`, `lead_biomedical_engineer`, `contractor_representative`, 
                `target_delivery_date`, `target_installation_date`, `inspection_date`, 
                `overall_status`, `readiness_percentage`, `notes`
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Under Inspection', 0.00, ?)");

            $stmt->execute([
                $auditNumber,
                $country,
                $input['facility_name'],
                (int)$input['department_id'],
                $input['room_number'],
                $input['building'] ?? 'Main Clinical Wing',
                $input['floor'] ?? 'Ground Floor',
                (int)$input['equipment_type_id'],
                $input['target_model'] ?? 'Medical Equipment Package',
                !empty($input['vendor_id']) ? (int)$input['vendor_id'] : null,
                $input['vendor_project_manager'] ?? 'Authorized Vendor Lead',
                $input['lead_biomedical_engineer'] ?? 'Biomedical Project Engineer',
                $input['contractor_representative'] ?? 'General Contractor MEP Lead',
                $input['target_delivery_date'] ?? null,
                $input['target_installation_date'] ?? null,
                $input['inspection_date'] ?? date('Y-m-d'),
                $input['notes'] ?? ''
            ]);

            $newId = $pdo->lastInsertId();

            // Initialize all 130 checklist items as 'Pending' for this audit
            $items = $pdo->query("SELECT id FROM site_checklist_master")->fetchAll(PDO::FETCH_COLUMN);
            $detailInsert = $pdo->prepare("INSERT INTO `site_inspection_details` (`inspection_id`, `checklist_item_id`, `result`) VALUES (?, ?, 'Pending')");
            foreach ($items as $itemId) {
                $detailInsert->execute([$newId, $itemId]);
            }

            $pdo->commit();

            jsonResponse([
                'status' => 'success',
                'message' => "Site Readiness Audit {$auditNumber} initiated with 130 standardized checks.",
                'data' => ['id' => $newId, 'audit_number' => $auditNumber]
            ], 201);
        } catch (PDOException $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            jsonError('Failed to create site audit: ' . $e->getMessage(), 500);
        }
    }

    // A2. Update Site Audit Metadata (Facility Name, Room, Lead Engineer, Model, etc.)
    if ($action === 'update_audit') {
        $id = (int)($input['id'] ?? 0);
        if ($id <= 0) jsonError('Invalid inspection audit ID.');

        try {
            $stmt = $pdo->prepare("UPDATE site_inspections SET
                facility_name = COALESCE(?, facility_name),
                room_number = COALESCE(?, room_number),
                department_id = COALESCE(?, department_id),
                equipment_type_id = COALESCE(?, equipment_type_id),
                vendor_id = ?,
                country_code = COALESCE(?, country_code),
                target_model = COALESCE(?, target_model),
                lead_biomedical_engineer = COALESCE(?, lead_biomedical_engineer),
                vendor_project_manager = COALESCE(?, vendor_project_manager),
                target_installation_date = COALESCE(?, target_installation_date),
                overall_status = COALESCE(?, overall_status),
                special_notes = COALESCE(?, special_notes)
                WHERE id = ?");

            $stmt->execute([
                $input['facility_name'] ?? null,
                $input['room_number'] ?? null,
                isset($input['department_id']) ? (int)$input['department_id'] : null,
                isset($input['equipment_type_id']) ? (int)$input['equipment_type_id'] : null,
                !empty($input['vendor_id']) ? (int)$input['vendor_id'] : null,
                $input['country_code'] ?? null,
                $input['target_model'] ?? null,
                $input['lead_biomedical_engineer'] ?? null,
                $input['vendor_project_manager'] ?? null,
                $input['target_installation_date'] ?? null,
                $input['overall_status'] ?? null,
                $input['special_notes'] ?? null,
                $id
            ]);

            jsonResponse([
                'status' => 'success',
                'message' => 'Site preparation audit information updated successfully.',
                'data' => ['id' => $id]
            ]);
        } catch (PDOException $e) {
            jsonError('Failed to update audit information: ' . $e->getMessage(), 500);
        }
    }

    // B. Save Evaluation for Inspection Items & Recalculate Readiness %
    if ($action === 'save_inspection_items') {
        $inspectionId = (int)($input['inspection_id'] ?? 0);
        $items = $input['items'] ?? [];

        if ($inspectionId <= 0 || empty($items)) {
            jsonError('Inspection ID and evaluated items array are required.');
        }

        try {
            $pdo->beginTransaction();

            $updateDetail = $pdo->prepare("INSERT INTO `site_inspection_details` 
                (`inspection_id`, `checklist_item_id`, `result`, `measured_value`, `is_deficiency`, `inspector_remarks`, `verified_at`)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE 
                `result`=VALUES(`result`), 
                `measured_value`=VALUES(`measured_value`), 
                `is_deficiency`=VALUES(`is_deficiency`), 
                `inspector_remarks`=VALUES(`inspector_remarks`),
                `verified_at`=NOW()");

            $createDeficiency = $pdo->prepare("INSERT INTO `site_deficiencies`
                (`deficiency_ticket`, `inspection_id`, `checklist_item_id`, `category_code`, `title`, `description`, `assigned_department`, `priority`, `status`, `corrective_action_plan`, `due_date`, `blocks_installation`, `resolved_by`, `resolved_at`, `verified_by`, `verified_at`)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Open', ?, DATE_ADD(CURDATE(), INTERVAL 7 DAY), ?, NULL, NULL, NULL, NULL)
                ON DUPLICATE KEY UPDATE 
                    `status` = 'Open',
                    `description` = VALUES(`description`), 
                    `priority` = VALUES(`priority`),
                    `blocks_installation` = VALUES(`blocks_installation`),
                    `resolved_by` = NULL,
                    `resolved_at` = NULL,
                    `verified_by` = NULL,
                    `verified_at` = NULL");

            foreach ($items as $it) {
                $itemId = (int)($it['checklist_item_id'] ?? 0);
                $result = $it['result'] ?? 'Pending';
                $measured = $it['measured_value'] ?? '';
                $remarks = $it['inspector_remarks'] ?? '';
                $isDef = ($result === 'Fail') ? 1 : 0;

                $updateDetail->execute([$inspectionId, $itemId, $result, $measured, $isDef, $remarks]);

                // If item is Pass or N/A, automatically close any prior open deficiency ticket for this item
                if ($result === 'Pass' || $result === 'N/A') {
                    $pdo->prepare("UPDATE `site_deficiencies` SET 
                        `status` = 'Closed after verification',
                        `resolved_by` = 'Biomedical Inspector (Audit Rectification)',
                        `resolved_at` = NOW(),
                        `verified_by` = 'Biomedical Inspector',
                        `verified_at` = NOW(),
                        `blocks_installation` = 0
                        WHERE `inspection_id` = ? AND `checklist_item_id` = ? AND `status` != 'Closed after verification'")
                        ->execute([$inspectionId, $itemId]);
                }

                // Auto-generate or re-open deficiency ticket if marked as Fail
                if ($result === 'Fail') {
                    $master = $pdo->query("SELECT * FROM site_checklist_master WHERE id = {$itemId}")->fetch();
                    if ($master) {
                        $ticketNumber = 'DEF-' . date('Y') . '-' . str_pad($inspectionId, 3, '0', STR_PAD_LEFT) . '-' . $master['item_code'];
                        $blocks = ($master['default_priority'] === 'Critical' || $master['default_priority'] === 'High') ? 1 : 0;
                        $createDeficiency->execute([
                            $ticketNumber,
                            $inspectionId,
                            $itemId,
                            $master['category_code'],
                            $master['deficiency_title'],
                            !empty($remarks) ? $remarks : $master['inspection_question'],
                            $master['responsible_department'],
                            $master['default_priority'],
                            'Remediation required: ' . $master['standard_tolerance'],
                            $blocks
                        ]);
                    }
                }
            }

            // Recalculate Readiness Percentage:
            // Score = (Pass / Total Applicable [Pass + Fail + Pending]) * 100
            $statsStmt = $pdo->prepare("SELECT 
                COUNT(*) as total_items,
                SUM(CASE WHEN result = 'Pass' THEN 1 ELSE 0 END) as passed_count,
                SUM(CASE WHEN result = 'Fail' THEN 1 ELSE 0 END) as failed_count,
                SUM(CASE WHEN result = 'Pending' THEN 1 ELSE 0 END) as pending_count,
                SUM(CASE WHEN result = 'N/A' THEN 1 ELSE 0 END) as na_count
            FROM site_inspection_details WHERE inspection_id = ?");
            $statsStmt->execute([$inspectionId]);
            $counts = $statsStmt->fetch();

            $applicable = (int)$counts['total_items'] - (int)$counts['na_count'];
            $passed = (int)$counts['passed_count'];
            $readiness = ($applicable > 0) ? round(($passed / $applicable) * 100, 2) : 0.00;

            // Check remaining critical and open deficiencies
            $defCheck = $pdo->prepare("SELECT 
                COUNT(*) as open_defs,
                SUM(CASE WHEN priority = 'Critical' THEN 1 ELSE 0 END) as critical_defs
            FROM site_deficiencies WHERE inspection_id = ? AND status NOT IN ('Closed after verification')");
            $defCheck->execute([$inspectionId]);
            $defStats = $defCheck->fetch();

            $openDefs = (int)($defStats['open_defs'] ?? 0);
            $critDefs = (int)($defStats['critical_defs'] ?? 0);
            $failedCount = (int)($counts['failed_count'] ?? 0);

            // Determine Overall Audit Status:
            // 1. Any open Critical deficiency STRICTLY forces 'Remediation Required' (Blocks Delivery!)
            // 2. To be 'Approved & Ready for Delivery': Must have >= 95% readiness, 0 open defs, 0 failed checks, 0 critical defs
            // 3. 'Conditional Clearance': >= 85% readiness, 0 critical defs, max 1-2 minor non-critical pending items
            // 4. Otherwise 'Remediation Required'
            $newStatus = 'Under Inspection';
            if ($critDefs > 0) {
                $newStatus = 'Remediation Required';
            } elseif ($failedCount > 2 || $openDefs > 2) {
                $newStatus = 'Remediation Required';
            } elseif ($readiness >= 95.0 && $openDefs === 0 && $failedCount === 0 && $critDefs === 0) {
                $newStatus = 'Approved & Ready for Delivery';
            } elseif ($readiness >= 85.0 && $critDefs === 0) {
                $newStatus = 'Conditional Clearance';
            } else {
                $newStatus = 'Remediation Required';
            }

            // Update site_inspections record
            $updAudit = $pdo->prepare("UPDATE site_inspections SET 
                `readiness_percentage` = ?, 
                `overall_status` = ?, 
                `critical_deficiencies_count` = ?, 
                `open_deficiencies_count` = ?
                WHERE `id` = ?");
            $updAudit->execute([$readiness, $newStatus, $critDefs, $openDefs, $inspectionId]);

            $pdo->commit();

            jsonResponse([
                'status' => 'success',
                'message' => "Inspection evaluations saved. Readiness Score: {$readiness}%. Status: {$newStatus}.",
                'data' => [
                    'readiness_percentage' => $readiness,
                    'overall_status' => $newStatus,
                    'counts' => $counts,
                    'open_deficiencies' => $openDefs,
                    'critical_deficiencies' => $critDefs
                ]
            ]);
        } catch (PDOException $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            jsonError('Failed to save inspection evaluations: ' . $e->getMessage(), 500);
        }
    }

    // C. Official Site Readiness & Delivery Dispatch Clearance Certificate Sign-off
    if ($action === 'approve_handover') {
        $inspectionId = (int)($input['inspection_id'] ?? 0);
        if ($inspectionId <= 0) jsonError('Invalid inspection ID');

        try {
            // Verify no open critical deficiencies
            $critCheck = $pdo->prepare("SELECT COUNT(*) FROM site_deficiencies WHERE inspection_id = ? AND priority = 'Critical' AND status NOT IN ('Closed after verification')");
            $critCheck->execute([$inspectionId]);
            if ($critCheck->fetchColumn() > 0) {
                jsonError('Cannot generate Handover Certificate: Critical safety deficiencies remain open!', 400);
            }

            // Fetch current audit
            $auditStmt = $pdo->prepare("SELECT * FROM site_inspections WHERE id = ?");
            $auditStmt->execute([$inspectionId]);
            $audit = $auditStmt->fetch();
            if (!$audit) jsonError('Audit not found', 404);

            $certNumber = 'SRC-' . $audit['country_code'] . '-' . date('Y') . '-' . str_pad($inspectionId, 4, '0', STR_PAD_LEFT);

            $certStmt = $pdo->prepare("INSERT INTO `site_readiness_approvals` (
                `certificate_number`, `inspection_id`, `approved_readiness_score`, 
                `biomedical_engineer_signature`, `biomedical_signed_at`, 
                `facilities_director_signature`, `facilities_signed_at`, 
                `vendor_pm_signature`, `vendor_signed_at`, 
                `hospital_director_signature`, `hospital_director_signed_at`, 
                `dispatch_clearance_granted`, `special_operating_conditions`
            ) VALUES (?, ?, ?, ?, NOW(), ?, NOW(), ?, NOW(), ?, NOW(), 1, ?)
            ON DUPLICATE KEY UPDATE 
                `approved_readiness_score` = VALUES(`approved_readiness_score`),
                `special_operating_conditions` = VALUES(`special_operating_conditions`)");

            $certStmt->execute([
                $certNumber,
                $inspectionId,
                $audit['readiness_percentage'] > 0 ? $audit['readiness_percentage'] : 100.0,
                $input['biomedical_engineer_signature'] ?? 'Lead Clinical Engineer (BioTrack CMMS)',
                $input['facilities_director_signature'] ?? 'Director of Hospital Facilities & Projects',
                $input['vendor_pm_signature'] ?? 'Equipment Manufacturer Project Manager',
                $input['hospital_director_signature'] ?? 'Chief Medical Officer / Commissioning Chair',
                $input['special_operating_conditions'] ?? 'Room infrastructure meets all applicable civil, electrical, HVAC, and medical gas requirements. Equipment delivery dispatch cleared.'
            ]);

            // Update inspection overall status to 'Approved & Ready for Delivery'
            $pdo->exec("UPDATE site_inspections SET `overall_status` = 'Approved & Ready for Delivery' WHERE `id` = {$inspectionId}");

            jsonResponse([
                'status' => 'success',
                'message' => "Site Readiness Certificate {$certNumber} issued successfully! Delivery clearance granted.",
                'data' => [
                    'certificate_number' => $certNumber,
                    'inspection_id' => $inspectionId,
                    'status' => 'Approved & Ready for Delivery'
                ]
            ]);
        } catch (PDOException $e) {
            jsonError('Failed to approve site readiness: ' . $e->getMessage(), 500);
        }
    }
}

// ==========================================
// 3. PUT Requests (Deficiency Update)
// ==========================================
if ($method === 'PUT') {
    $input = getJsonInput();

    // Update Site Deficiency / Punch-list item
    if ($action === 'update_deficiency') {
        $id = (int)($input['id'] ?? 0);
        if ($id <= 0) jsonError('Invalid deficiency ID');

        try {
            $status = $input['status'] ?? 'Open';
            $isResolved = ($status === 'Closed after verification');

            $stmt = $pdo->prepare("UPDATE `site_deficiencies` SET 
                `status` = ?,
                `contractor_assigned` = ?,
                `priority` = ?,
                `corrective_action_plan` = ?,
                `evidence_attachment_url` = ?,
                `resolved_by` = ?,
                `resolved_at` = ?,
                `verified_by` = ?,
                `verified_at` = ?
                WHERE `id` = ?");

            $stmt->execute([
                $status,
                $input['contractor_assigned'] ?? '',
                $input['priority'] ?? 'High',
                $input['corrective_action_plan'] ?? '',
                $input['evidence_attachment_url'] ?? '',
                $input['resolved_by'] ?? ($isResolved ? 'Remediation Contractor' : null),
                $isResolved ? date('Y-m-d H:i:s') : null,
                $input['verified_by'] ?? ($isResolved ? 'Lead Biomedical Engineer' : null),
                $isResolved ? date('Y-m-d H:i:s') : null,
                $id
            ]);

            // Fetch inspection ID and checklist item ID to sync audit counts and status
            $defRow = $pdo->query("SELECT inspection_id, checklist_item_id FROM site_deficiencies WHERE id = {$id}")->fetch(PDO::FETCH_ASSOC);
            if ($defRow) {
                $auditId = (int)$defRow['inspection_id'];
                $itemId = (int)$defRow['checklist_item_id'];

                // Sync site_inspection_details if closed
                if ($isResolved && $itemId > 0) {
                    $pdo->prepare("UPDATE site_inspection_details SET result = 'Pass', is_deficiency = 0, verified_at = NOW() WHERE inspection_id = ? AND checklist_item_id = ?")
                        ->execute([$auditId, $itemId]);
                }

                // Recalculate Readiness Percentage
                $statsStmt = $pdo->prepare("SELECT 
                    COUNT(*) as total_items,
                    SUM(CASE WHEN result = 'Pass' THEN 1 ELSE 0 END) as passed_count,
                    SUM(CASE WHEN result = 'Fail' THEN 1 ELSE 0 END) as failed_count,
                    SUM(CASE WHEN result = 'Pending' THEN 1 ELSE 0 END) as pending_count,
                    SUM(CASE WHEN result = 'N/A' THEN 1 ELSE 0 END) as na_count
                FROM site_inspection_details WHERE inspection_id = ?");
                $statsStmt->execute([$auditId]);
                $counts = $statsStmt->fetch(PDO::FETCH_ASSOC);

                $applicable = (int)$counts['total_items'] - (int)$counts['na_count'];
                $passed = (int)$counts['passed_count'];
                $readiness = ($applicable > 0) ? round(($passed / $applicable) * 100, 2) : 0.00;

                $openDefs = (int)$pdo->query("SELECT COUNT(*) FROM site_deficiencies WHERE inspection_id = {$auditId} AND status NOT IN ('Closed after verification')")->fetchColumn();
                $critDefs = (int)$pdo->query("SELECT COUNT(*) FROM site_deficiencies WHERE inspection_id = {$auditId} AND priority = 'Critical' AND status NOT IN ('Closed after verification')")->fetchColumn();

                $newStatus = 'Under Inspection';
                if ($critDefs > 0 || (int)$counts['failed_count'] > 2) {
                    $newStatus = 'Remediation Required';
                } elseif ($readiness >= 95.0 && $openDefs === 0) {
                    $newStatus = 'Approved & Ready for Delivery';
                } elseif ($readiness >= 85.0 && $critDefs === 0) {
                    $newStatus = 'Conditional Clearance';
                }

                $pdo->prepare("UPDATE site_inspections SET 
                    readiness_percentage = ?, 
                    overall_status = ?, 
                    open_deficiencies_count = ?, 
                    critical_deficiencies_count = ? 
                    WHERE id = ?")
                    ->execute([$readiness, $newStatus, $openDefs, $critDefs, $auditId]);
            }

            jsonResponse([
                'status' => 'success',
                'message' => "Deficiency ticket updated to '{$status}'.",
                'data' => ['id' => $id, 'status' => $status]
            ]);
        } catch (PDOException $e) {
            jsonError('Failed to update deficiency: ' . $e->getMessage(), 500);
        }
    }
}

jsonError('Method not allowed or unknown action', 405);
