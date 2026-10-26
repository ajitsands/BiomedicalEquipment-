<?php
// BioTrack CMMS — Housekeeping & Infection Control REST API
// Bahrain NHRA, WHO Environmental Cleaning, and Hospital SOPs
// Powered and Engineered by SaNDS Lab Middle East W.L.L

require_once __DIR__ . '/../config/db.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? 'stats';

// -------------------------------------------------------------
// 1. GET Requests
// -------------------------------------------------------------
if ($method === 'GET') {
    // A. Master Standards (WHO, NHRA, WASH FIT, SOP)
    if ($action === 'standards') {
        try {
            $stmt = $pdo->query("SELECT * FROM housekeeping_standards ORDER BY standard_code ASC");
            jsonResponse(['status' => 'success', 'data' => $stmt->fetchAll()]);
        } catch (PDOException $e) {
            jsonError('Failed to fetch standards: ' . $e->getMessage(), 500);
        }
    }

    // B. Master Categories (HK-01 to HK-16) with Live Counts
    if ($action === 'categories') {
        try {
            $stmt = $pdo->query("SELECT 
                c.*,
                (SELECT COUNT(*) FROM housekeeping_checklist_master m WHERE m.category_code = c.code) AS total_checklist_items,
                (SELECT COUNT(*) FROM housekeeping_complaints comp WHERE comp.category_code = c.code AND comp.status != 'Closed') AS active_complaints_count,
                (SELECT COUNT(*) FROM housekeeping_complaints comp WHERE comp.category_code = c.code AND comp.risk_level = 'Critical' AND comp.status != 'Closed') AS critical_complaints_count
            FROM housekeeping_categories c
            ORDER BY c.sort_order ASC");
            jsonResponse(['status' => 'success', 'data' => $stmt->fetchAll()]);
        } catch (PDOException $e) {
            jsonError('Failed to fetch categories: ' . $e->getMessage(), 500);
        }
    }

    // C. Master Checklist Questions
    if ($action === 'checklist_master') {
        try {
            $category = $_GET['category_code'] ?? null;
            $layer = $_GET['standard_layer'] ?? null;
            $area = $_GET['area_type'] ?? null;
            $search = $_GET['search'] ?? null;

            $sql = "SELECT m.*, c.name AS category_name, c.icon AS category_icon, s.name AS standard_name, s.badge_color 
                    FROM housekeeping_checklist_master m
                    JOIN housekeeping_categories c ON m.category_code = c.code
                    LEFT JOIN housekeeping_standards s ON m.standard_layer = s.standard_code
                    WHERE 1=1";
            $params = [];

            if (!empty($category)) {
                $sql .= " AND m.category_code = ?";
                $params[] = $category;
            }
            if (!empty($layer)) {
                $sql .= " AND m.standard_layer = ?";
                $params[] = $layer;
            }
            if (!empty($area)) {
                $sql .= " AND m.area_type = ?";
                $params[] = $area;
            }
            if (!empty($search)) {
                $sql .= " AND (m.item_code LIKE ? OR m.inspection_item LIKE ? OR m.acceptance_criteria LIKE ?)";
                $params[] = "%{$search}%";
                $params[] = "%{$search}%";
                $params[] = "%{$search}%";
            }

            $sql .= " ORDER BY m.sort_order ASC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            jsonResponse(['status' => 'success', 'data' => $stmt->fetchAll()]);
        } catch (PDOException $e) {
            jsonError('Failed to fetch checklist master: ' . $e->getMessage(), 500);
        }
    }

    // D. Room Audits / Terminal Clearance Inspections List
    if ($action === 'inspections') {
        try {
            $status = $_GET['status'] ?? null;
            $cleaning_type = $_GET['cleaning_type'] ?? null;
            $area = $_GET['area_type'] ?? null;
            $search = $_GET['search'] ?? null;

            $sql = "SELECT i.*, d.name AS department_name 
                    FROM housekeeping_inspections i
                    LEFT JOIN departments d ON i.department_id = d.id
                    WHERE 1=1";
            $params = [];

            if (!empty($status)) {
                $sql .= " AND i.status = ?";
                $params[] = $status;
            }
            if (!empty($cleaning_type)) {
                $sql .= " AND i.cleaning_type = ?";
                $params[] = $cleaning_type;
            }
            if (!empty($area)) {
                $sql .= " AND i.area_type = ?";
                $params[] = $area;
            }
            if (!empty($search)) {
                $sql .= " AND (i.audit_number LIKE ? OR i.room_number LIKE ? OR i.building LIKE ? OR i.inspector_name LIKE ?)";
                $params[] = "%{$search}%";
                $params[] = "%{$search}%";
                $params[] = "%{$search}%";
                $params[] = "%{$search}%";
            }

            $sql .= " ORDER BY i.conducted_at DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            jsonResponse(['status' => 'success', 'data' => $stmt->fetchAll()]);
        } catch (PDOException $e) {
            jsonError('Failed to fetch inspections: ' . $e->getMessage(), 500);
        }
    }

    // E. Single Inspection Detail with Checklist Results
    if ($action === 'inspection_detail') {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            jsonError('Inspection ID is required', 400);
        }

        try {
            $stmt = $pdo->prepare("SELECT i.*, d.name AS department_name 
                                   FROM housekeeping_inspections i
                                   LEFT JOIN departments d ON i.department_id = d.id
                                   WHERE i.id = ?");
            $stmt->execute([$id]);
            $inspection = $stmt->fetch();

            if (!$inspection) {
                jsonError('Inspection record not found', 404);
            }

            // Fetch existing results joined with checklist questions
            $resultsStmt = $pdo->prepare("SELECT r.*, m.item_code, m.inspection_item, m.acceptance_criteria, m.verification_method, m.standard_layer, m.is_regulatory_mandate, m.category_code, c.name AS category_name
                                          FROM housekeeping_inspection_results r
                                          JOIN housekeeping_checklist_master m ON r.checklist_item_id = m.id
                                          JOIN housekeeping_categories c ON m.category_code = c.code
                                          WHERE r.inspection_id = ?
                                          ORDER BY m.sort_order ASC");
            $resultsStmt->execute([$id]);
            $inspection['results'] = $resultsStmt->fetchAll();

            // If inspection has no results yet, provide all questions applicable for this area
            if (empty($inspection['results'])) {
                $areaMatch = $inspection['area_type'];
                $allQuestionsStmt = $pdo->prepare("SELECT m.id AS checklist_item_id, m.item_code, m.inspection_item, m.acceptance_criteria, m.verification_method, m.standard_layer, m.is_regulatory_mandate, m.category_code, c.name AS category_name, 'Pending' AS status, '' AS notes, NULL AS photo_evidence, NULL AS completed_at
                                                  FROM housekeeping_checklist_master m
                                                  JOIN housekeeping_categories c ON m.category_code = c.code
                                                  WHERE m.area_type = ? OR m.area_type = 'Patient Rooms' OR m.is_regulatory_mandate = 1
                                                  ORDER BY m.sort_order ASC");
                $allQuestionsStmt->execute([$areaMatch]);
                $inspection['results'] = $allQuestionsStmt->fetchAll();
            }

            jsonResponse(['status' => 'success', 'data' => $inspection]);
        } catch (PDOException $e) {
            jsonError('Failed to fetch inspection details: ' . $e->getMessage(), 500);
        }
    }

    // F. Housekeeping Complaints & Work Orders List (HK-01 to HK-16)
    if ($action === 'complaints') {
        try {
            $status = $_GET['status'] ?? null;
            $category = $_GET['category_code'] ?? null;
            $risk = $_GET['risk_level'] ?? null;
            $cleaning_type = $_GET['cleaning_type'] ?? null;
            $is_repeat = isset($_GET['is_repeat']) ? (int)$_GET['is_repeat'] : null;
            $search = $_GET['search'] ?? null;

            $sql = "SELECT comp.*, c.name AS category_name, c.icon AS category_icon, d.name AS department_name
                    FROM housekeeping_complaints comp
                    JOIN housekeeping_categories c ON comp.category_code = c.code
                    LEFT JOIN departments d ON comp.department_id = d.id
                    WHERE 1=1";
            $params = [];

            if (!empty($status)) {
                $sql .= " AND comp.status = ?";
                $params[] = $status;
            }
            if (!empty($category)) {
                $sql .= " AND comp.category_code = ?";
                $params[] = $category;
            }
            if (!empty($risk)) {
                $sql .= " AND comp.risk_level = ?";
                $params[] = $risk;
            }
            if (!empty($cleaning_type)) {
                $sql .= " AND comp.cleaning_type = ?";
                $params[] = $cleaning_type;
            }
            if ($is_repeat !== null) {
                $sql .= " AND comp.is_repeat = ?";
                $params[] = $is_repeat;
            }
            if (!empty($search)) {
                $sql .= " AND (comp.complaint_number LIKE ? OR comp.title LIKE ? OR comp.description LIKE ? OR comp.room_number LIKE ? OR comp.building LIKE ? OR comp.assigned_team LIKE ?)";
                $params[] = "%{$search}%";
                $params[] = "%{$search}%";
                $params[] = "%{$search}%";
                $params[] = "%{$search}%";
                $params[] = "%{$search}%";
                $params[] = "%{$search}%";
            }

            $sql .= " ORDER BY CASE 
                        WHEN comp.status = 'Open' THEN 1 
                        WHEN comp.status = 'In Progress' THEN 2 
                        WHEN comp.status = 'Pending Verification' THEN 3 
                        WHEN comp.status = 'Escalated' THEN 0 
                        ELSE 4 
                     END, comp.reported_at DESC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $complaints = $stmt->fetchAll();

            // Calculate live SLA hours remaining / overdue
            $now = new DateTime();
            foreach ($complaints as &$c) {
                if ($c['target_completion_at']) {
                    $target = new DateTime($c['target_completion_at']);
                    $diff = $now->diff($target);
                    $isOverdue = ($now > $target && $c['status'] !== 'Closed');
                    $c['is_sla_overdue'] = $isOverdue;
                    $c['sla_time_text'] = $isOverdue 
                        ? 'Overdue by ' . ($diff->days > 0 ? "{$diff->days}d " : '') . "{$diff->h}h {$diff->i}m"
                        : ($diff->days > 0 ? "{$diff->days}d " : '') . "{$diff->h}h {$diff->i}m left";
                } else {
                    $c['is_sla_overdue'] = false;
                    $c['sla_time_text'] = 'SLA ' . $c['target_sla_hours'] . 'h';
                }
            }

            jsonResponse(['status' => 'success', 'data' => $complaints]);
        } catch (PDOException $e) {
            jsonError('Failed to fetch complaints: ' . $e->getMessage(), 500);
        }
    }

    // G. Single Complaint Detail
    if ($action === 'complaint_detail') {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            jsonError('Complaint ID is required', 400);
        }

        try {
            $stmt = $pdo->prepare("SELECT comp.*, c.name AS category_name, c.icon AS category_icon, c.example_deficiencies, d.name AS department_name
                                   FROM housekeeping_complaints comp
                                   JOIN housekeeping_categories c ON comp.category_code = c.code
                                   LEFT JOIN departments d ON comp.department_id = d.id
                                   WHERE comp.id = ?");
            $stmt->execute([$id]);
            $complaint = $stmt->fetch();

            if (!$complaint) {
                jsonError('Complaint not found', 404);
            }

            jsonResponse(['status' => 'success', 'data' => $complaint]);
        } catch (PDOException $e) {
            jsonError('Failed to fetch complaint: ' . $e->getMessage(), 500);
        }
    }

    // H. Module Summary & Analytics Stats
    if ($action === 'stats') {
        try {
            // Complaint KPI counts
            $openComplaints = (int)$pdo->query("SELECT COUNT(*) FROM housekeeping_complaints WHERE status IN ('Open', 'In Progress', 'Pending Verification', 'Escalated')")->fetchColumn();
            $criticalComplaints = (int)$pdo->query("SELECT COUNT(*) FROM housekeeping_complaints WHERE risk_level = 'Critical' AND status != 'Closed'")->fetchColumn();
            $repeatComplaints = (int)$pdo->query("SELECT COUNT(*) FROM housekeeping_complaints WHERE is_repeat = 1 AND status != 'Closed'")->fetchColumn();
            $closedComplaints = (int)$pdo->query("SELECT COUNT(*) FROM housekeeping_complaints WHERE status = 'Closed'")->fetchColumn();

            // SLA compliance
            $overdueComplaints = (int)$pdo->query("SELECT COUNT(*) FROM housekeeping_complaints WHERE status != 'Closed' AND target_completion_at < NOW()")->fetchColumn();

            // Inspections KPIs
            $totalInspections = (int)$pdo->query("SELECT COUNT(*) FROM housekeeping_inspections")->fetchColumn();
            $passedInspections = (int)$pdo->query("SELECT COUNT(*) FROM housekeeping_inspections WHERE status = 'Passed'")->fetchColumn();
            $terminalClearances = (int)$pdo->query("SELECT COUNT(*) FROM housekeeping_inspections WHERE cleaning_type = 'Discharge/Terminal' AND status = 'Passed'")->fetchColumn();
            $avgScore = (float)$pdo->query("SELECT AVG(score_percent) FROM housekeeping_inspections WHERE status != 'In Progress'")->fetchColumn();

            // Complaints by Category Breakdown
            $catBreakdown = $pdo->query("SELECT c.code, c.name, COUNT(comp.id) AS total_count,
                                                SUM(CASE WHEN comp.status != 'Closed' THEN 1 ELSE 0 END) AS active_count
                                         FROM housekeeping_categories c
                                         LEFT JOIN housekeeping_complaints comp ON c.code = comp.category_code
                                         GROUP BY c.code, c.name
                                         ORDER BY c.sort_order ASC")->fetchAll();

            // Regulatory vs SOP Breakdown
            $layerBreakdown = $pdo->query("SELECT standard_layer, COUNT(*) AS count 
                                           FROM housekeeping_complaints 
                                           GROUP BY standard_layer")->fetchAll();

            jsonResponse([
                'status' => 'success',
                'data' => [
                    'active_complaints' => $openComplaints,
                    'critical_complaints' => $criticalComplaints,
                    'repeat_complaints' => $repeatComplaints,
                    'closed_complaints' => $closedComplaints,
                    'overdue_complaints' => $overdueComplaints,
                    'total_inspections' => $totalInspections,
                    'passed_inspections' => $passedInspections,
                    'terminal_clearances' => $terminalClearances,
                    'average_score' => round($avgScore, 1) ?: 95.0,
                    'categories_breakdown' => $catBreakdown,
                    'layer_breakdown' => $layerBreakdown
                ]
            ]);
        } catch (PDOException $e) {
            jsonError('Failed to fetch housekeeping stats: ' . $e->getMessage(), 500);
        }
    }
}

// -------------------------------------------------------------
// 2. POST Requests (Create Inspection, Save Results, Create Complaint)
// -------------------------------------------------------------
if ($method === 'POST') {
    $input = getJsonInput();

    // A. Create New Room Audit / Inspection
    if ($action === 'create_inspection') {
        $facility = trim($input['facility_name'] ?? 'King Hamad University Hospital');
        $dept_id = !empty($input['department_id']) ? (int)$input['department_id'] : null;
        $room = trim($input['room_number'] ?? '');
        $building = trim($input['building'] ?? 'Main Clinical Tower');
        $floor = trim($input['floor'] ?? 'Floor 1');
        $area_type = trim($input['area_type'] ?? 'Patient Rooms');
        $cleaning_type = trim($input['cleaning_type'] ?? 'Routine');
        $inspector = trim($input['inspector_name'] ?? 'Infection Control Link Nurse');
        $role = trim($input['inspector_role'] ?? 'Housekeeping Supervisor');
        $notes = trim($input['notes'] ?? '');

        if (empty($room)) {
            jsonError('Room number or Area name is required', 400);
        }

        try {
            // Generate Audit Number e.g. HKA-2026-0045
            $year = date('Y');
            $countStmt = $pdo->query("SELECT COUNT(*) FROM housekeeping_inspections");
            $nextSeq = (int)$countStmt->fetchColumn() + 1;
            $audit_number = sprintf("HKA-%s-%04d", $year, $nextSeq);

            $stmt = $pdo->prepare("INSERT INTO housekeeping_inspections 
                (audit_number, facility_name, department_id, room_number, building, floor, area_type, cleaning_type, inspector_name, inspector_role, notes, status, score_percent) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'In Progress', 0.00)");
            
            $stmt->execute([
                $audit_number, $facility, $dept_id, $room, $building, $floor, $area_type, $cleaning_type, $inspector, $role, $notes
            ]);
            $inspectionId = $pdo->lastInsertId();

            // Automatically populate inspection results with questions matching this area_type or mandatory regulations
            $qStmt = $pdo->prepare("SELECT id FROM housekeeping_checklist_master 
                                    WHERE area_type = ? OR area_type = 'Patient Rooms' OR is_regulatory_mandate = 1 
                                    ORDER BY sort_order ASC");
            $qStmt->execute([$area_type]);
            $questions = $qStmt->fetchAll(PDO::FETCH_COLUMN);

            $insertResStmt = $pdo->prepare("INSERT INTO housekeeping_inspection_results (inspection_id, checklist_item_id, status) VALUES (?, ?, 'Pending')");
            foreach ($questions as $qId) {
                $insertResStmt->execute([$inspectionId, $qId]);
            }

            // Update total items count
            $pdo->prepare("UPDATE housekeeping_inspections SET total_items = ?, passed_items = 0, failed_items = 0, na_items = 0, score_percent = 0.00, status = 'In Progress' WHERE id = ?")->execute([count($questions), $inspectionId]);

            jsonResponse([
                'status' => 'success',
                'message' => 'Housekeeping room audit initialized successfully',
                'data' => [
                    'id' => $inspectionId,
                    'audit_number' => $audit_number
                ]
            ], 201);
        } catch (PDOException $e) {
            jsonError('Failed to initialize audit: ' . $e->getMessage(), 500);
        }
    }

    // B. Save Inspection Runner Results & Calculate Compliance Score (Supports Draft & Final)
    if ($action === 'save_inspection_results') {
        $inspectionId = (int)($input['inspection_id'] ?? 0);
        $results = $input['results'] ?? [];
        $supervisor = trim($input['supervisor_name'] ?? '');
        $notes = trim($input['notes'] ?? '');
        $isDraft = !empty($input['is_draft']) || !empty($input['is_progress_save']);

        if (!$inspectionId || empty($results)) {
            jsonError('Valid inspection ID and results array are required', 400);
        }

        try {
            $pdo->beginTransaction();

            $passed = 0;
            $failed = 0;
            $na = 0;
            $pending = 0;
            $criticalFails = 0;

            $updateResStmt = $pdo->prepare("INSERT INTO housekeeping_inspection_results 
                (inspection_id, checklist_item_id, status, notes, photo_evidence, completed_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    status = VALUES(status), 
                    notes = VALUES(notes), 
                    photo_evidence = VALUES(photo_evidence),
                    completed_at = VALUES(completed_at)");

            // Check details of checklist questions to count regulatory/critical fails
            $masterItemStmt = $pdo->prepare("SELECT is_regulatory_mandate, category_code, inspection_item FROM housekeeping_checklist_master WHERE id = ?");

            foreach ($results as $res) {
                $itemId = (int)$res['checklist_item_id'];
                $status = in_array($res['status'], ['Pending', 'Pass', 'Fail', 'N/A']) ? $res['status'] : 'Pending';
                $itemNotes = trim($res['notes'] ?? '');
                $photo = $res['photo_evidence'] ?? null;
                $completedAt = !empty($res['completed_at']) ? $res['completed_at'] : ($status !== 'Pending' ? date('d/m/Y H:i') : null);

                $updateResStmt->execute([$inspectionId, $itemId, $status, $itemNotes, $photo, $completedAt]);

                if ($status === 'Pass') {
                    $passed++;
                } elseif ($status === 'Fail') {
                    $failed++;
                    $masterItemStmt->execute([$itemId]);
                    $mItem = $masterItemStmt->fetch();
                    if ($mItem && $mItem['is_regulatory_mandate']) {
                        $criticalFails++;
                    }
                } elseif ($status === 'N/A') {
                    $na++;
                } else {
                    $pending++;
                }
            }

            $scorableTotal = $passed + $failed;
            $scorePercent = $scorableTotal > 0 ? round(($passed / $scorableTotal) * 100, 2) : 0.00;

            // If saving progress (draft) or items are still pending
            if ($isDraft || $pending > 0) {
                $auditStatus = 'In Progress';
                $certIssued = 0;
                $certNumber = null;
            } else {
                // All items completed: determine final audit status and issue certificate
                if ($criticalFails > 0 || $scorePercent < 75.00) {
                    $auditStatus = 'Failed';
                    $certIssued = 0;
                    $certNumber = null;
                } elseif ($scorePercent < 90.00) {
                    $auditStatus = 'Conditional';
                    $certIssued = 0;
                    $certNumber = null;
                } else {
                    $auditStatus = 'Passed';
                    $certIssued = 1;
                    $certNumber = sprintf("CERT-HK-%s-%04d", date('Y'), $inspectionId);
                }
            }

            $updateAuditStmt = $pdo->prepare("UPDATE housekeeping_inspections SET 
                total_items = ?,
                passed_items = ?,
                failed_items = ?,
                na_items = ?,
                critical_deficiencies_count = ?,
                score_percent = ?,
                status = ?,
                supervisor_name = ?,
                certificate_issued = ?,
                certificate_number = ?,
                notes = ?
                WHERE id = ?");

            $updateAuditStmt->execute([
                count($results), $passed, $failed, $na, $criticalFails, $scorePercent, $auditStatus,
                $supervisor, $certIssued, $certNumber, $notes, $inspectionId
            ]);

            $pdo->commit();

            jsonResponse([
                'status' => 'success',
                'message' => 'Inspection results submitted and scored successfully',
                'data' => [
                    'inspection_id' => $inspectionId,
                    'score_percent' => $scorePercent,
                    'status' => $auditStatus,
                    'passed_items' => $passed,
                    'failed_items' => $failed,
                    'critical_deficiencies_count' => $criticalFails,
                    'certificate_number' => $certNumber
                ]
            ]);
        } catch (PDOException $e) {
            $pdo->rollBack();
            jsonError('Failed to save inspection results: ' . $e->getMessage(), 500);
        }
    }

    // C. Create New Housekeeping Complaint / Work Order (HK-01 to HK-16)
    if ($action === 'create_complaint') {
        $category = trim($input['category_code'] ?? 'HK-01');
        $title = trim($input['title'] ?? '');
        $description = trim($input['description'] ?? '');
        $dept_id = !empty($input['department_id']) ? (int)$input['department_id'] : null;
        $building = trim($input['building'] ?? 'Main Clinical Tower');
        $floor = trim($input['floor'] ?? 'Floor 1');
        $room = trim($input['room_number'] ?? '');
        $specific_location = trim($input['specific_location'] ?? '');
        $cleaning_type = trim($input['cleaning_type'] ?? 'Routine');
        $risk = trim($input['risk_level'] ?? 'Medium');
        $standard_layer = trim($input['standard_layer'] ?? 'HOSPITAL_SOP');
        $is_repeat = !empty($input['is_repeat']) ? 1 : 0;
        $assigned_team = trim($input['assigned_team'] ?? 'Internal Housekeeping Team');
        $assigned_employee = trim($input['assigned_employee'] ?? '');
        $contractor = trim($input['contractor_name'] ?? 'Sanitary Services Co. W.L.L');
        $corrective_req = trim($input['corrective_action_required'] ?? '');
        $sla_hours = (int)($input['target_sla_hours'] ?? 4);
        $reported_by = trim($input['reported_by'] ?? 'Ward In-Charge');
        $photo_before = trim($input['photo_before'] ?? '');

        if (empty($title) || empty($room)) {
            jsonError('Complaint title and room number are mandatory', 400);
        }

        try {
            // Generate sequential complaint number e.g. HKC-2026-0042
            $year = date('Y');
            $countStmt = $pdo->query("SELECT COUNT(*) FROM housekeeping_complaints");
            $nextSeq = (int)$countStmt->fetchColumn() + 1;
            $complaint_number = sprintf("HKC-%s-%04d", $year, $nextSeq);

            // Compute target completion timestamp based on SLA hours
            $targetCompletion = date('Y-m-d H:i:s', strtotime("+{$sla_hours} hours"));

            $stmt = $pdo->prepare("INSERT INTO housekeeping_complaints 
                (complaint_number, category_code, title, description, department_id, building, floor, room_number, specific_location, cleaning_type, risk_level, standard_layer, status, is_repeat, assigned_team, assigned_employee, contractor_name, corrective_action_required, target_sla_hours, target_completion_at, reported_by, photo_before)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Open', ?, ?, ?, ?, ?, ?, ?, ?, ?)");

            $stmt->execute([
                $complaint_number, $category, $title, $description, $dept_id, $building, $floor, $room, $specific_location,
                $cleaning_type, $risk, $standard_layer, $is_repeat, $assigned_team, $assigned_employee, $contractor,
                $corrective_req, $sla_hours, $targetCompletion, $reported_by, $photo_before
            ]);

            $newId = $pdo->lastInsertId();

            jsonResponse([
                'status' => 'success',
                'message' => 'Housekeeping complaint ticket created successfully',
                'data' => [
                    'id' => $newId,
                    'complaint_number' => $complaint_number,
                    'target_completion_at' => $targetCompletion
                ]
            ], 201);
        } catch (PDOException $e) {
            jsonError('Failed to create complaint ticket: ' . $e->getMessage(), 500);
        }
    }
}

// -------------------------------------------------------------
// 3. PUT Requests (Update Complaint, Close Ticket, Verify)
// -------------------------------------------------------------
if ($method === 'PUT') {
    $input = getJsonInput();

    if ($action === 'update_complaint') {
        $id = (int)($input['id'] ?? 0);
        if (!$id) {
            jsonError('Complaint ID is required', 400);
        }

        try {
            // Check existing
            $checkStmt = $pdo->prepare("SELECT * FROM housekeeping_complaints WHERE id = ?");
            $checkStmt->execute([$id]);
            $existing = $checkStmt->fetch();

            if (!$existing) {
                jsonError('Complaint ticket not found', 404);
            }

            $status = trim($input['status'] ?? $existing['status']);
            $risk = trim($input['risk_level'] ?? $existing['risk_level']);
            $assigned_team = trim($input['assigned_team'] ?? $existing['assigned_team']);
            $assigned_employee = trim($input['assigned_employee'] ?? $existing['assigned_employee']);
            $corrective_taken = trim($input['corrective_action_taken'] ?? $existing['corrective_action_taken']);
            $verified_by = trim($input['verified_by'] ?? $existing['verified_by']);
            $closure_notes = trim($input['closure_notes'] ?? $existing['closure_notes']);
            $photo_after = trim($input['photo_after'] ?? $existing['photo_after']);

            $resolved_at = $existing['resolved_at'];
            $verified_at = $existing['verified_at'];

            if ($status === 'Pending Verification' && empty($existing['resolved_at'])) {
                $resolved_at = date('Y-m-d H:i:s');
            }

            if ($status === 'Closed' && empty($existing['verified_at'])) {
                $verified_at = date('Y-m-d H:i:s');
                if (empty($resolved_at)) {
                    $resolved_at = date('Y-m-d H:i:s');
                }
            }

            $stmt = $pdo->prepare("UPDATE housekeeping_complaints SET 
                status = ?,
                risk_level = ?,
                assigned_team = ?,
                assigned_employee = ?,
                corrective_action_taken = ?,
                verified_by = ?,
                verified_at = ?,
                resolved_at = ?,
                closure_notes = ?,
                photo_after = ?
                WHERE id = ?");

            $stmt->execute([
                $status, $risk, $assigned_team, $assigned_employee, $corrective_taken,
                $verified_by, $verified_at, $resolved_at, $closure_notes, $photo_after, $id
            ]);

            jsonResponse([
                'status' => 'success',
                'message' => 'Housekeeping complaint ticket updated successfully',
                'data' => [
                    'id' => $id,
                    'status' => $status,
                    'resolved_at' => $resolved_at,
                    'verified_at' => $verified_at
                ]
            ]);
        } catch (PDOException $e) {
            jsonError('Failed to update complaint: ' . $e->getMessage(), 500);
        }
    }
}

// -------------------------------------------------------------
// 4. DELETE Requests
// -------------------------------------------------------------
if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) {
        jsonError('ID is required for deletion', 400);
    }

    try {
        if ($action === 'delete_complaint') {
            $stmt = $pdo->prepare("DELETE FROM housekeeping_complaints WHERE id = ?");
            $stmt->execute([$id]);
            jsonResponse(['status' => 'success', 'message' => 'Housekeeping complaint deleted successfully']);
        } elseif ($action === 'delete_inspection') {
            $stmt = $pdo->prepare("DELETE FROM housekeeping_inspections WHERE id = ?");
            $stmt->execute([$id]);
            jsonResponse(['status' => 'success', 'message' => 'Inspection record deleted successfully']);
        } else {
            jsonError('Unknown deletion action', 400);
        }
    } catch (PDOException $e) {
        jsonError('Delete failed: ' . $e->getMessage(), 500);
    }
}
