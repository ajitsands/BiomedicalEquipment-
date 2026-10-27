<?php
require_once __DIR__ . '/../config/db.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? $_POST['action'] ?? '';

if ($method === 'POST' && empty($action)) {
    $rawInput = json_decode(file_get_contents('php://input'), true);
    if ($rawInput && isset($rawInput['action'])) {
        $action = $rawInput['action'];
    }
}

try {
    // 1. Network Info for Phone QR Scanner
    if ($action === 'network_info') {
        // Detect server local LAN IP
        $serverIp = '127.0.0.1';
        $hostIp = gethostbyname(gethostname());
        if (!empty($hostIp) && $hostIp !== '127.0.0.1') {
            $serverIp = $hostIp;
        }
        
        // Try Windows route/ip detection if possible
        if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
            $output = shell_exec('powershell -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike \'*Loopback*\' -and $_.IPAddress -notlike \'169.254*\' } | Select-Object -ExpandProperty IPAddress)[0]" 2>nul');
            if ($output && trim($output)) {
                $serverIp = trim($output);
            }
        }

        jsonResponse([
            'status' => 'success',
            'data' => [
                'server_ip' => $serverIp,
                'port' => 2020,
                'portal_path' => '#mobile',
                'full_mobile_url' => "http://{$serverIp}:2020/#mobile"
            ]
        ]);
    }

    // Helper to get employee name from ID or Name
    function resolveEmployeeName($pdo, $empId, $defaultName = '') {
        if ($empId > 0) {
            $stmt = $pdo->prepare("SELECT full_name FROM employees WHERE id = ?");
            $stmt->execute([$empId]);
            $name = $stmt->fetchColumn();
            if ($name) return $name;
        }
        return $defaultName;
    }

    // 2. User Category Task Counts
    if ($action === 'user_categories' || $action === 'categories') {
        $empId = (int)($_GET['employee_id'] ?? 0);
        $empName = trim($_GET['employee_name'] ?? '');

        if ($empId > 0 && empty($empName)) {
            $empName = resolveEmployeeName($pdo, $empId, '');
        }

        // PM tasks assigned to this employee
        $pmSql = "SELECT COUNT(*) FROM pm_phase_assignments WHERE status != 'Completed'";
        $pmParams = [];
        if (!empty($empName) || $empId > 0) {
            $pmSql .= " AND (assigned_employee_id = ? OR assigned_employee_name LIKE ?)";
            $pmParams[] = $empId;
            $pmParams[] = "%{$empName}%";
        }
        $pmStmt = $pdo->prepare($pmSql);
        $pmStmt->execute($pmParams);
        $pmPending = (int)$pmStmt->fetchColumn();

        // If 0 direct phase assignments, check general PM drafts or overdue PMs
        if ($pmPending === 0) {
            $pmDrafts = (int)$pdo->query("SELECT COUNT(*) FROM pm_checklist_drafts")->fetchColumn();
            $pmPending = $pmDrafts > 0 ? $pmDrafts : (int)$pdo->query("SELECT COUNT(*) FROM equipments WHERE next_pm_due_date <= CURDATE()")->fetchColumn();
        }

        // Breakdown complaints assigned to this employee
        $bdSql = "SELECT COUNT(*) FROM complaints WHERE status NOT IN ('Resolved', 'Closed')";
        $bdParams = [];
        if (!empty($empName)) {
            $bdSql .= " AND assigned_engineer LIKE ?";
            $bdParams[] = "%{$empName}%";
        }
        $bdStmt = $pdo->prepare($bdSql);
        $bdStmt->execute($bdParams);
        $bdPending = (int)$bdStmt->fetchColumn();
        if ($bdPending === 0 && empty($empName)) {
            $bdPending = (int)$pdo->query("SELECT COUNT(*) FROM complaints WHERE status NOT IN ('Resolved', 'Closed')")->fetchColumn();
        }

        // Site Inspections assigned
        $siteSql = "SELECT COUNT(*) FROM site_inspections WHERE overall_status NOT IN ('Approved', 'Completed')";
        $siteParams = [];
        if (!empty($empName)) {
            $siteSql .= " AND lead_biomedical_engineer LIKE ?";
            $siteParams[] = "%{$empName}%";
        }
        $siteStmt = $pdo->prepare($siteSql);
        $siteStmt->execute($siteParams);
        $sitePending = (int)$siteStmt->fetchColumn();
        if ($sitePending === 0 && empty($empName)) {
            $sitePending = (int)$pdo->query("SELECT COUNT(*) FROM site_inspections WHERE overall_status NOT IN ('Approved', 'Completed')")->fetchColumn();
        }

        // Housekeeping Audits assigned
        $hkSql = "SELECT COUNT(*) FROM housekeeping_inspections WHERE status NOT IN ('Passed', 'Completed')";
        $hkParams = [];
        if (!empty($empName)) {
            $hkSql .= " AND (inspector_name LIKE ? OR inspector_role LIKE ?)";
            $hkParams[] = "%{$empName}%";
            $hkParams[] = "%{$empName}%";
        }
        $hkStmt = $pdo->prepare($hkSql);
        $hkStmt->execute($hkParams);
        $hkPending = (int)$hkStmt->fetchColumn();
        if ($hkPending === 0 && empty($empName)) {
            $hkPending = (int)$pdo->query("SELECT COUNT(*) FROM housekeeping_inspections WHERE status NOT IN ('Passed', 'Completed')")->fetchColumn();
        }

        jsonResponse([
            'status' => 'success',
            'data' => [
                'pm' => [
                    'key' => 'pm',
                    'title' => 'Preventive Maintenance (PM)',
                    'subtitle' => 'WHO & IEC 62353 Safety Protocols',
                    'icon' => 'ShieldCheck',
                    'color' => '#0284c7',
                    'pending_count' => $pmPending
                ],
                'breakdown' => [
                    'key' => 'breakdown',
                    'title' => 'Breakdowns & Work Orders',
                    'subtitle' => 'Emergency Hospital Equipment Tickets',
                    'icon' => 'AlertOctagon',
                    'color' => '#ef4444',
                    'pending_count' => $bdPending
                ],
                'site_prep' => [
                    'key' => 'site_prep',
                    'title' => 'Site Preparations & Infra',
                    'subtitle' => '130-Point Facility Commissioning',
                    'icon' => 'Building2',
                    'color' => '#f59e0b',
                    'pending_count' => $sitePending
                ],
                'housekeeping' => [
                    'key' => 'housekeeping',
                    'title' => 'Housekeeping & Infection Control',
                    'subtitle' => 'NHRA / WHO Cleanliness Audits',
                    'icon' => 'Sparkles',
                    'color' => '#10b981',
                    'pending_count' => $hkPending
                ]
            ]
        ]);
    }

    // 3. Category Jobs List
    if ($action === 'category_jobs') {
        $category = $_GET['category'] ?? 'pm';
        $empId = (int)($_GET['employee_id'] ?? 0);
        $empName = trim($_GET['employee_name'] ?? '');
        $statusFilter = $_GET['status'] ?? 'ALL'; // 'ALL', 'Pending', 'Completed'

        if ($empId > 0 && empty($empName)) {
            $empName = resolveEmployeeName($pdo, $empId, '');
        }

        $jobs = [];

        // --- PM JOBS ---
        if ($category === 'pm') {
            // First look for assigned PM phases grouped by equipment
            $sql = "SELECT 
                           e.id as equipment_id,
                           e.id as id,
                           e.asset_id, e.name as equipment_name, e.brand, e.model_number, e.serial_number,
                           e.department_id, e.building, e.floor, e.room_number, e.status as op_status,
                           d.name as department_name,
                           MIN(p.pm_due_date) as pm_due_date,
                           MAX(p.assigned_employee_id) as assigned_employee_id,
                           GROUP_CONCAT(DISTINCT p.assigned_employee_name SEPARATOR ', ') as assigned_employee_name,
                           IF(COUNT(CASE WHEN p.status != 'Completed' THEN 1 END) = 0, 'Completed', 'Pending') as status,
                           MAX(dr.completed_count) as completed_items_count, 
                           MAX(dr.total_items) as total_items_count, 
                           MAX(dr.progress_percent) as draft_percent,
                           'Full PM Checklist' as phase_name,
                           'ALL' as phase_key
                    FROM pm_phase_assignments p
                    JOIN equipments e ON p.equipment_id = e.id
                    LEFT JOIN departments d ON e.department_id = d.id
                    LEFT JOIN pm_checklist_drafts dr ON e.id = dr.equipment_id
                    WHERE 1=1";
            $params = [];
            if (!empty($empName)) {
                $sql .= " AND (p.assigned_employee_id = ? OR p.assigned_employee_name LIKE ?)";
                $params[] = $empId;
                $params[] = "%{$empName}%";
            }
            if ($statusFilter === 'Pending') {
                $sql .= " AND p.status != 'Completed'";
            } elseif ($statusFilter === 'Completed') {
                $sql .= " AND p.status = 'Completed'";
            }
            $sql .= " GROUP BY e.id, e.asset_id, e.name, e.brand, e.model_number, e.serial_number, e.department_id, e.building, e.floor, e.room_number, e.status, d.name";
            $sql .= " ORDER BY MIN(p.pm_due_date) ASC LIMIT 50";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $jobs = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // If empty, return equipments that have drafts or are overdue
            if (empty($jobs)) {
                $fallbackSql = "SELECT e.id as equipment_id, e.id as id, e.asset_id, e.name as equipment_name, e.brand, e.model_number,
                                       e.next_pm_due_date as pm_due_date, e.building, e.floor, e.room_number,
                                       d.name as department_name,
                                       MAX(dr.completed_count) as completed_items_count, 
                                       MAX(dr.total_items) as total_items_count, 
                                       MAX(dr.progress_percent) as draft_percent,
                                       IF(MAX(dr.id) IS NOT NULL, 'In Progress', IF(e.next_pm_due_date < CURDATE(), 'Overdue', 'Scheduled')) as status,
                                       'Full PM Checklist' as phase_name,
                                       'ALL' as phase_key
                                FROM equipments e
                                LEFT JOIN departments d ON e.department_id = d.id
                                LEFT JOIN pm_checklist_drafts dr ON e.id = dr.equipment_id
                                WHERE e.next_pm_due_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) OR dr.id IS NOT NULL
                                GROUP BY e.id, e.asset_id, e.name, e.brand, e.model_number, e.next_pm_due_date, e.building, e.floor, e.room_number, d.name
                                ORDER BY MAX(dr.id) DESC, e.next_pm_due_date ASC LIMIT 30";
                $jobs = $pdo->query($fallbackSql)->fetchAll(PDO::FETCH_ASSOC);
            }
        }

        // --- BREAKDOWN JOBS ---
        elseif ($category === 'breakdown' || $category === 'breakdowns') {
            $sql = "SELECT c.*, 
                           e.asset_id, e.name as equipment_name, e.brand, e.model_number, e.room_number as eq_room,
                           d.name as department_name
                    FROM complaints c
                    LEFT JOIN equipments e ON c.equipment_id = e.id
                    LEFT JOIN departments d ON c.department_id = d.id
                    WHERE 1=1";
            $params = [];
            if (!empty($empName)) {
                $sql .= " AND c.assigned_engineer LIKE ?";
                $params[] = "%{$empName}%";
            }
            if ($statusFilter === 'Pending') {
                $sql .= " AND c.status NOT IN ('Resolved', 'Closed')";
            } elseif ($statusFilter === 'Completed') {
                $sql .= " AND c.status IN ('Resolved', 'Closed')";
            }
            $sql .= " ORDER BY CASE c.priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END, c.reported_at DESC LIMIT 50";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $jobs = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Fallback if no specific assigned
            if (empty($jobs)) {
                $jobs = $pdo->query("SELECT c.*, e.asset_id, e.name as equipment_name, e.brand, e.model_number, d.name as department_name
                                     FROM complaints c
                                     LEFT JOIN equipments e ON c.equipment_id = e.id
                                     LEFT JOIN departments d ON c.department_id = d.id
                                     ORDER BY c.reported_at DESC LIMIT 20")->fetchAll(PDO::FETCH_ASSOC);
            }
        }

        // --- SITE PREP JOBS ---
        elseif ($category === 'site_prep') {
            $sql = "SELECT s.*, d.name as department_name,
                           (SELECT COUNT(*) FROM site_inspection_details d2 WHERE d2.inspection_id = s.id AND d2.result != 'Pending') as completed_items_count,
                           (SELECT COUNT(*) FROM site_checklist_master) as total_items_count,
                           s.readiness_percentage as draft_percent
                    FROM site_inspections s
                    LEFT JOIN departments d ON s.department_id = d.id
                    WHERE 1=1";
            $params = [];
            if (!empty($empName)) {
                $sql .= " AND s.lead_biomedical_engineer LIKE ?";
                $params[] = "%{$empName}%";
            }
            if ($statusFilter === 'Pending') {
                $sql .= " AND s.overall_status NOT IN ('Approved', 'Completed', 'Approved & Ready for Delivery')";
            } elseif ($statusFilter === 'Completed') {
                $sql .= " AND (s.overall_status IN ('Approved', 'Completed', 'Approved & Ready for Delivery') OR s.overall_status LIKE '%Approved%')";
            }
            $sql .= " ORDER BY s.inspection_date DESC LIMIT 50";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $jobs = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (empty($jobs)) {
                $jobs = $pdo->query("SELECT s.*, d.name as department_name,
                                           (SELECT COUNT(*) FROM site_inspection_details d2 WHERE d2.inspection_id = s.id AND d2.result != 'Pending') as completed_items_count,
                                           (SELECT COUNT(*) FROM site_checklist_master) as total_items_count,
                                           s.readiness_percentage as draft_percent
                                    FROM site_inspections s 
                                    LEFT JOIN departments d ON s.department_id = d.id 
                                    ORDER BY s.inspection_date DESC LIMIT 20")->fetchAll(PDO::FETCH_ASSOC);
            }
        }

        // --- HOUSEKEEPING JOBS ---
        elseif ($category === 'housekeeping') {
            $sql = "SELECT h.*, d.name as department_name
                    FROM housekeeping_inspections h
                    LEFT JOIN departments d ON h.department_id = d.id
                    WHERE 1=1";
            $params = [];
            if (!empty($empName)) {
                $sql .= " AND (h.inspector_name LIKE ? OR h.inspector_role LIKE ?)";
                $params[] = "%{$empName}%";
                $params[] = "%{$empName}%";
            }
            if ($statusFilter === 'Pending') {
                $sql .= " AND h.status NOT IN ('Passed', 'Completed')";
            } elseif ($statusFilter === 'Completed') {
                $sql .= " AND h.status IN ('Passed', 'Completed')";
            }
            $sql .= " ORDER BY h.conducted_at DESC LIMIT 50";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $jobs = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (empty($jobs)) {
                $jobs = $pdo->query("SELECT h.*, d.name as department_name FROM housekeeping_inspections h LEFT JOIN departments d ON h.department_id = d.id ORDER BY h.conducted_at DESC LIMIT 20")->fetchAll(PDO::FETCH_ASSOC);
            }
        }

        // Guarantee deduplication of jobs across all categories
        $uniqueJobs = [];
        $seenJobIds = [];
        foreach ($jobs as $j) {
            $jId = $j['id'] ?? $j['equipment_id'] ?? null;
            if ($jId !== null && !isset($seenJobIds[$jId])) {
                $seenJobIds[$jId] = true;
                $uniqueJobs[] = $j;
            }
        }
        $jobs = $uniqueJobs;

        jsonResponse([
            'status' => 'success',
            'data' => [
                'category' => $category,
                'jobs' => $jobs,
                'total_count' => count($jobs)
            ]
        ]);
    }

    // 4. Job Tasks / Checklist Detail
    if ($action === 'job_tasks') {
        $category = $_GET['category'] ?? 'pm';
        $jobId = (int)($_GET['job_id'] ?? 0);

        if ($jobId <= 0) {
            jsonError('Job ID is required');
        }

        $detail = null;
        $items = [];

        // PM Job Tasks
        if ($category === 'pm') {
            // Map jobId to equipment_id if passed as phase_assignment id
            $targetEqId = $jobId;
            $checkEq = $pdo->prepare("SELECT id FROM equipments WHERE id = ?");
            $checkEq->execute([$jobId]);
            if (!$checkEq->fetchColumn()) {
                $checkPhase = $pdo->prepare("SELECT equipment_id FROM pm_phase_assignments WHERE id = ?");
                $checkPhase->execute([$jobId]);
                $mappedEq = $checkPhase->fetchColumn();
                if ($mappedEq) {
                    $targetEqId = (int)$mappedEq;
                }
            }

            $eqStmt = $pdo->prepare("SELECT e.*, d.name as department_name FROM equipments e LEFT JOIN departments d ON e.department_id = d.id WHERE e.id = ?");
            $eqStmt->execute([$targetEqId]);
            $detail = $eqStmt->fetch(PDO::FETCH_ASSOC);

            if ($detail) {
                // Fetch draft if exists
                $draftStmt = $pdo->prepare("SELECT * FROM pm_checklist_drafts WHERE equipment_id = ? AND status = 'in_progress' ORDER BY updated_at DESC LIMIT 1");
                $draftStmt->execute([$targetEqId]);
                $draft = $draftStmt->fetch(PDO::FETCH_ASSOC);

                $items = [];
                // 1. If draft has template_id, use it
                if ($draft && !empty($draft['template_id'])) {
                    $itemStmt = $pdo->prepare("SELECT ci.*, ct.title as template_title
                                               FROM checklist_items ci
                                               JOIN checklist_templates ct ON ci.template_id = ct.id
                                               WHERE ct.id = ?
                                               ORDER BY ci.step_number ASC, ci.id ASC");
                    $itemStmt->execute([$draft['template_id']]);
                    $items = $itemStmt->fetchAll(PDO::FETCH_ASSOC);
                }

                // 2. If no items yet, try equipment_type_id
                if (empty($items) && !empty($detail['equipment_type_id'])) {
                    $itemStmt = $pdo->prepare("SELECT ci.*, ct.title as template_title
                                               FROM checklist_items ci
                                               JOIN checklist_templates ct ON ci.template_id = ct.id
                                               WHERE ct.equipment_type_id = ?
                                               ORDER BY ci.step_number ASC, ci.id ASC");
                    $itemStmt->execute([$detail['equipment_type_id']]);
                    $items = $itemStmt->fetchAll(PDO::FETCH_ASSOC);
                }

                // 3. Fallback to active template if still empty
                if (empty($items)) {
                    $itemStmt = $pdo->prepare("SELECT ci.*, ct.title as template_title
                                               FROM checklist_items ci
                                               JOIN checklist_templates ct ON ci.template_id = ct.id
                                               ORDER BY ct.id ASC, ci.step_number ASC, ci.id ASC LIMIT 40");
                    $itemStmt->execute();
                    $items = $itemStmt->fetchAll(PDO::FETCH_ASSOC);
                }

                $draftAnswers = [];
                if ($draft && !empty($draft['answers_json'])) {
                    $draftAnswers = json_decode($draft['answers_json'], true) ?: [];
                }

                // Merge status & findings
                foreach ($items as &$it) {
                    $itemId = $it['id'];
                    $ans = null;
                    if (isset($draftAnswers[$itemId])) {
                        $ans = $draftAnswers[$itemId];
                    } elseif (is_array($draftAnswers)) {
                        foreach ($draftAnswers as $key => $val) {
                            if ((isset($val['item_id']) && $val['item_id'] == $itemId) || $key == $itemId) {
                                $ans = $val;
                                break;
                            }
                        }
                    }

                    $it['status'] = (!empty($ans['status']) && $ans['status'] !== 'null') ? $ans['status'] : 'Pending';
                    $it['findings'] = $ans['findings'] ?? $ans['remarks'] ?? '';
                    $it['measured_value'] = $ans['measured_value'] ?? $ans['measuredValue'] ?? '';
                    $it['completed_at'] = $ans['completed_at'] ?? $ans['completedAt'] ?? null;
                    $it['completed_by'] = $ans['completed_by'] ?? $ans['completedBy'] ?? null;
                }
                unset($it);

                $detail['draft'] = $draft;
            }
        }

        // Breakdown Job Tasks
        elseif ($category === 'breakdown' || $category === 'breakdowns') {
            $stmt = $pdo->prepare("SELECT c.*, e.asset_id, e.name as equipment_name, e.brand, e.model_number, d.name as department_name
                                   FROM complaints c
                                   LEFT JOIN equipments e ON c.equipment_id = e.id
                                   LEFT JOIN departments d ON c.department_id = d.id
                                   WHERE c.id = ?");
            $stmt->execute([$jobId]);
            $detail = $stmt->fetch(PDO::FETCH_ASSOC);

            // 6 Standard Field Breakdown Investigation Steps
            $steps = [
                ['id' => 1, 'code' => 'BD-01', 'title' => 'Visual & Physical Examination', 'desc' => 'Inspect chassis, power cords, cables, switches, and fluid leaks.', 'status' => 'Pending'],
                ['id' => 2, 'code' => 'BD-02', 'title' => 'Power Supply & Electrical Safety Verification', 'desc' => 'Measure mains voltage, fuse continuity, and protective earth integrity.', 'status' => 'Pending'],
                ['id' => 3, 'code' => 'BD-03', 'title' => 'Error Code & Diagnostic Fault Isolation', 'desc' => 'Record equipment alarm logs, fault code, and verify reported symptom.', 'status' => 'Pending'],
                ['id' => 4, 'code' => 'BD-04', 'title' => 'Component Replacement / Sub-Assembly Repair', 'desc' => 'Replace defective sensors, boards, tubing, or mechanical parts with OEM spares.', 'status' => 'Pending'],
                ['id' => 5, 'code' => 'BD-05', 'title' => 'Calibration & Sensor Zero Verification', 'desc' => 'Calibrate output per service manual specification using certified analyzer.', 'status' => 'Pending'],
                ['id' => 6, 'code' => 'BD-06', 'title' => 'Post-Repair Clinical Functional Test Run', 'desc' => 'Run simulated test cycle at normal hospital operating parameters before clinical handover.', 'status' => 'Pending']
            ];

            if ($detail['status'] === 'Resolved' || $detail['status'] === 'Closed') {
                foreach ($steps as &$s) {
                    $s['status'] = 'Pass';
                }
                unset($s);
            }

            $items = $steps;
        }

        // Site Prep Tasks
        elseif ($category === 'site_prep') {
            $stmt = $pdo->prepare("SELECT s.*, d.name as department_name FROM site_inspections s LEFT JOIN departments d ON s.department_id = d.id WHERE s.id = ?");
            $stmt->execute([$jobId]);
            $detail = $stmt->fetch(PDO::FETCH_ASSOC);

            // Fetch inspection questions and results
            $qStmt = $pdo->prepare("SELECT 
                                        m.id as checklist_item_id,
                                        m.id as id,
                                        m.item_code,
                                        m.category_code,
                                        m.deficiency_title,
                                        m.deficiency_title as title,
                                        m.inspection_question,
                                        m.inspection_question as question,
                                        m.inspection_question as task_description,
                                        m.responsible_department,
                                        m.default_priority,
                                        m.specialist_department,
                                        m.standard_tolerance,
                                        m.standard_tolerance as standard_procedure,
                                        m.evidence_required,
                                        c.name as category_name,
                                        c.name as sub_category,
                                        c.icon as category_icon,
                                        COALESCE(d.result, 'Pending') as result,
                                        COALESCE(d.result, 'Pending') as status,
                                        d.measured_value,
                                        d.is_deficiency,
                                        COALESCE(d.inspector_remarks, '') as inspector_remarks,
                                        COALESCE(d.inspector_remarks, '') as notes,
                                        COALESCE(d.inspector_remarks, '') as findings
                                    FROM site_checklist_master m
                                    JOIN site_checklist_categories c ON m.category_code = c.code
                                    LEFT JOIN site_inspection_details d ON (d.checklist_item_id = m.id AND d.inspection_id = ?)
                                    ORDER BY m.sort_order ASC, m.id ASC");
            $qStmt->execute([$jobId]);
            $items = $qStmt->fetchAll(PDO::FETCH_ASSOC);
        }

        // Housekeeping Tasks
        elseif ($category === 'housekeeping') {
            $stmt = $pdo->prepare("SELECT h.*, d.name as department_name FROM housekeeping_inspections h LEFT JOIN departments d ON h.department_id = d.id WHERE h.id = ?");
            $stmt->execute([$jobId]);
            $detail = $stmt->fetch(PDO::FETCH_ASSOC);

            $qStmt = $pdo->prepare("SELECT r.id, r.checklist_item_id, r.status, r.notes, r.atp_reading_rlu, r.completed_at,
                                           m.item_code, m.inspection_item, m.acceptance_criteria AS cleaning_criteria, m.acceptance_criteria,
                                           m.verification_method, m.standard_layer, m.is_regulatory_mandate, m.category_code AS category_id, m.category_code
                                    FROM housekeeping_inspection_results r
                                    JOIN housekeeping_checklist_master m ON r.checklist_item_id = m.id
                                    WHERE r.inspection_id = ?
                                    ORDER BY m.sort_order ASC, m.id ASC");
            $qStmt->execute([$jobId]);
            $rawItems = $qStmt->fetchAll(PDO::FETCH_ASSOC);

            // Deduplicate items by checklist_item_id
            $deduped = [];
            $seenItems = [];
            foreach ($rawItems as $it) {
                $cId = (int)($it['checklist_item_id'] ?? $it['id'] ?? 0);
                if ($cId > 0 && !isset($seenItems[$cId])) {
                    $seenItems[$cId] = true;
                    $deduped[] = $it;
                }
            }
            $items = $deduped;

            // If empty, fetch master checklist for this area/facility
            if (empty($items) && $detail) {
                $areaMatch = $detail['area_type'] ?? 'Patient Rooms';
                $allQ = $pdo->prepare("SELECT DISTINCT m.id AS checklist_item_id, m.id AS id, m.item_code, m.inspection_item,
                                              m.acceptance_criteria AS cleaning_criteria, m.acceptance_criteria,
                                              m.verification_method, m.standard_layer, m.is_regulatory_mandate,
                                              m.category_code AS category_id, m.category_code,
                                              'Pending' AS status, '' AS notes, NULL AS atp_reading_rlu, NULL AS completed_at
                                       FROM housekeeping_checklist_master m
                                       WHERE m.area_type = ? OR m.area_type = 'Patient Rooms' OR m.is_regulatory_mandate = 1
                                       ORDER BY m.sort_order ASC, m.id ASC");
                $allQ->execute([$areaMatch]);
                $items = $allQ->fetchAll(PDO::FETCH_ASSOC);
            }
        }

        jsonResponse([
            'status' => 'success',
            'data' => [
                'category' => $category,
                'detail' => $detail,
                'items' => $items,
                'total_items' => count($items)
            ]
        ]);
    }

    // 5. Save Job Progress (Draft - One by One saving)
    if ($action === 'save_job_progress') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) $input = $_POST;

        $category = $input['category'] ?? 'pm';
        $jobId = (int)($input['job_id'] ?? 0);
        $results = $input['results'] ?? [];
        $technicianName = $input['technician_name'] ?? 'Mobile Field Engineer';
        $engineerNotes = $input['engineer_notes'] ?? '';

        if ($jobId <= 0) {
            jsonError('Job ID required');
        }

        // PM Draft Save
        if ($category === 'pm') {
            // Map jobId to equipment_id if passed as phase_assignment id
            $targetEqId = $jobId;
            $checkEq = $pdo->prepare("SELECT id FROM equipments WHERE id = ?");
            $checkEq->execute([$jobId]);
            if (!$checkEq->fetchColumn()) {
                $checkPhase = $pdo->prepare("SELECT equipment_id FROM pm_phase_assignments WHERE id = ?");
                $checkPhase->execute([$jobId]);
                $mappedEq = $checkPhase->fetchColumn();
                if ($mappedEq) {
                    $targetEqId = (int)$mappedEq;
                }
            }

            $totalCount = count($results);
            $completedCount = 0;
            $answersMap = [];

            foreach ($results as $res) {
                $itemId = $res['id'] ?? $res['checklist_item_id'] ?? 0;
                $status = $res['status'] ?? 'Pending';
                $isCompleted = ($status && $status !== 'Pending' && $status !== 'null');
                if ($isCompleted) {
                    $completedCount++;
                }
                $answersMap[$itemId] = [
                    'status' => $status,
                    'measuredValue' => $res['measured_value'] ?? $res['measuredValue'] ?? '',
                    'remarks' => $res['findings'] ?? $res['remarks'] ?? '',
                    'completedAt' => $res['completed_at'] ?? date('d/m/Y h:i A'),
                    'completedBy' => $technicianName
                ];
            }

            $progressPercent = $totalCount > 0 ? round(($completedCount / $totalCount) * 100) : 0;

            // Template ID resolution
            $templateId = (int)($input['template_id'] ?? 0);
            if ($templateId <= 0) {
                $eqTmpl = $pdo->prepare("SELECT ct.id FROM checklist_templates ct JOIN equipments e ON e.equipment_type_id = ct.equipment_type_id WHERE e.id = ? LIMIT 1");
                $eqTmpl->execute([$targetEqId]);
                $templateId = (int)$eqTmpl->fetchColumn();
            }

            $stmt = $pdo->prepare("INSERT INTO pm_checklist_drafts 
                (equipment_id, template_id, technician_name, inspection_date, engineer_notes, answers_json, completed_count, total_items, progress_percent, status, updated_at)
                VALUES (?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, 'in_progress', NOW())
                ON DUPLICATE KEY UPDATE 
                    template_id = IFNULL(VALUES(template_id), template_id),
                    technician_name = VALUES(technician_name),
                    engineer_notes = VALUES(engineer_notes),
                    answers_json = VALUES(answers_json),
                    completed_count = VALUES(completed_count),
                    total_items = VALUES(total_items),
                    progress_percent = VALUES(progress_percent),
                    status = 'in_progress',
                    updated_at = NOW()");
            $stmt->execute([
                $targetEqId,
                $templateId ?: null,
                $technicianName,
                $engineerNotes,
                json_encode($answersMap, JSON_UNESCAPED_UNICODE),
                $completedCount,
                $totalCount,
                $progressPercent
            ]);

            // Synchronize with pm_phase_assignments status
            if ($completedCount > 0) {
                $phaseStatus = ($completedCount >= $totalCount) ? 'Completed' : 'In Progress';
                $pdo->prepare("UPDATE pm_phase_assignments SET status = ? WHERE equipment_id = ? AND status != 'Completed'")
                    ->execute([$phaseStatus, $targetEqId]);
            }

            jsonResponse([
                'status' => 'success',
                'message' => "Progress saved! {$completedCount}/{$totalCount} items completed ({$progressPercent}%).",
                'data' => [
                    'completed_count' => $completedCount,
                    'total_count' => $totalCount,
                    'progress_percent' => $progressPercent
                ]
            ]);
        }

        // Housekeeping Draft Save
        elseif ($category === 'housekeeping') {
            $upsertItemStmt = $pdo->prepare("
                INSERT INTO housekeeping_inspection_results 
                    (inspection_id, checklist_item_id, status, notes, atp_reading_rlu, completed_at)
                VALUES (?, ?, ?, ?, ?, IF(? != 'Pending', NOW(), NULL))
                ON DUPLICATE KEY UPDATE 
                    status = VALUES(status), 
                    notes = VALUES(notes), 
                    atp_reading_rlu = VALUES(atp_reading_rlu),
                    completed_at = IF(VALUES(status) != 'Pending', NOW(), completed_at)
            ");
            $completedCount = 0;
            $passedCount = 0;
            $failedCount = 0;
            $naCount = 0;

            foreach ($results as $res) {
                $status = $res['status'] ?? 'Pending';
                $notes = $res['notes'] ?? '';
                $atp = isset($res['atp_reading_rlu']) && $res['atp_reading_rlu'] !== '' ? (int)$res['atp_reading_rlu'] : null;
                $itemId = (int)($res['checklist_item_id'] ?? $res['id'] ?? 0);

                if ($itemId > 0) {
                    $upsertItemStmt->execute([$jobId, $itemId, $status, $notes, $atp, $status]);
                }

                if ($status !== 'Pending') {
                    $completedCount++;
                    if ($status === 'Pass') $passedCount++;
                    if ($status === 'Fail') $failedCount++;
                    if ($status === 'N/A') $naCount++;
                }
            }

            // Recalculate based on actual distinct items in database
            $statsStmt = $pdo->prepare("SELECT 
                COUNT(*) as total_items,
                SUM(CASE WHEN status = 'Pass' THEN 1 ELSE 0 END) as passed_count,
                SUM(CASE WHEN status = 'Fail' THEN 1 ELSE 0 END) as failed_count,
                SUM(CASE WHEN status = 'N/A' THEN 1 ELSE 0 END) as na_count
            FROM housekeeping_inspection_results WHERE inspection_id = ?");
            $statsStmt->execute([$jobId]);
            $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);

            $tot = (int)($stats['total_items'] ?? 0);
            $pass = (int)($stats['passed_count'] ?? 0);
            $na = (int)($stats['na_count'] ?? 0);
            $fail = (int)($stats['failed_count'] ?? 0);
            $applicable = $tot - $na;
            $score = $applicable > 0 ? round(($pass / $applicable) * 100, 2) : 0;

            $pdo->prepare("UPDATE housekeeping_inspections 
                           SET total_items = ?, passed_items = ?, failed_items = ?, na_items = ?, score_percent = ?, notes = COALESCE(NULLIF(?, ''), notes)
                           WHERE id = ?")
                ->execute([$tot, $pass, $fail, $na, $score, $engineerNotes, $jobId]);

            jsonResponse([
                'status' => 'success',
                'message' => "Housekeeping progress saved ({$completedCount}/{$tot} verified, {$score}% score).",
                'data' => [
                    'completed_count' => $completedCount,
                    'total_count' => $tot,
                    'score_percent' => $score
                ]
            ]);
        }

        // Breakdown Progress Save
        elseif ($category === 'breakdown' || $category === 'breakdowns') {
            $actionTaken = $input['action_taken'] ?? $engineerNotes;
            $pdo->prepare("UPDATE complaints SET action_taken = ?, status = 'In Progress' WHERE id = ?")
                ->execute([$actionTaken, $jobId]);

            jsonResponse([
                'status' => 'success',
                'message' => 'Breakdown progress updated'
            ]);
        }

        // Site Prep Progress Save
        elseif ($category === 'site_prep') {
            $upsertStmt = $pdo->prepare("
                INSERT INTO site_inspection_details (inspection_id, checklist_item_id, result, inspector_remarks, verified_at)
                VALUES (?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE 
                    result = VALUES(result),
                    inspector_remarks = VALUES(inspector_remarks),
                    verified_at = NOW()
            ");
            $passed = 0;
            $total = count($results);
            foreach ($results as $res) {
                $status = $res['status'] ?? 'Pending';
                $notes = $res['notes'] ?? $res['findings'] ?? '';
                $itemId = (int)($res['checklist_item_id'] ?? $res['id'] ?? 0);
                if ($itemId > 0) {
                    $upsertStmt->execute([$jobId, $itemId, $status, $notes]);
                }
                if ($status === 'Pass' || $status === 'Compliant') $passed++;
            }

            // Recalculate Readiness Percentage based on all items
            $statsStmt = $pdo->prepare("SELECT 
                COUNT(*) as total_items,
                SUM(CASE WHEN result = 'Pass' THEN 1 ELSE 0 END) as passed_count,
                SUM(CASE WHEN result = 'N/A' THEN 1 ELSE 0 END) as na_count
            FROM site_inspection_details WHERE inspection_id = ?");
            $statsStmt->execute([$jobId]);
            $counts = $statsStmt->fetch(PDO::FETCH_ASSOC);

            $applicable = (int)($counts['total_items'] ?? 0) - (int)($counts['na_count'] ?? 0);
            $passedCount = (int)($counts['passed_count'] ?? 0);
            $pct = ($applicable > 0) ? round(($passedCount / $applicable) * 100, 2) : 0.00;

            $pdo->prepare("UPDATE site_inspections SET readiness_percentage = ?, notes = COALESCE(NULLIF(?, ''), notes) WHERE id = ?")
                ->execute([$pct, $engineerNotes, $jobId]);

            jsonResponse([
                'status' => 'success',
                'message' => "Site inspection progress saved ({$passed}/{$total} items updated, {$pct}% readiness)."
            ]);
        }
    }

    // 6. Submit Final Job
    if ($action === 'submit_job') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) $input = $_POST;

        $category = $input['category'] ?? 'pm';
        $jobId = (int)($input['job_id'] ?? 0);
        $technicianName = $input['technician_name'] ?? 'Mobile Field Engineer';
        $notes = $input['engineer_notes'] ?? '';

        if ($jobId <= 0) {
            jsonError('Job ID required');
        }

        // Finalize PM
        if ($category === 'pm') {
            // Map jobId to equipment_id if passed as phase_assignment id
            $targetEqId = $jobId;
            $checkEq = $pdo->prepare("SELECT id FROM equipments WHERE id = ?");
            $checkEq->execute([$jobId]);
            if (!$checkEq->fetchColumn()) {
                $checkPhase = $pdo->prepare("SELECT equipment_id FROM pm_phase_assignments WHERE id = ?");
                $checkPhase->execute([$jobId]);
                $mappedEq = $checkPhase->fetchColumn();
                if ($mappedEq) {
                    $targetEqId = (int)$mappedEq;
                }
            }

            // Delete draft
            $pdo->prepare("DELETE FROM pm_checklist_drafts WHERE equipment_id = ?")->execute([$targetEqId]);

            // Insert into maintenance_records
            $recStmt = $pdo->prepare("INSERT INTO maintenance_records 
                (equipment_id, maintenance_type, performed_by_type, technician_name, maintenance_date, overall_status, notes, created_at)
                VALUES (?, 'Preventive', 'In-House', ?, CURDATE(), 'Pass', ?, NOW())");
            $recStmt->execute([$targetEqId, $technicianName, $notes ?: 'PM completed via Mobile Field Portal']);

            // Update equipment next_pm_due_date (advance 90 days / Quarterly)
            $pdo->prepare("UPDATE equipments 
                           SET last_pm_date = CURDATE(), 
                               next_pm_due_date = DATE_ADD(CURDATE(), INTERVAL 90 DAY),
                               status = 'Operational'
                           WHERE id = ?")->execute([$targetEqId]);

            // Mark phase assignments completed if any
            $pdo->prepare("UPDATE pm_phase_assignments SET status = 'Completed', completed_at = NOW() WHERE equipment_id = ?")
                ->execute([$targetEqId]);

            jsonResponse([
                'status' => 'success',
                'message' => 'Preventive Maintenance completed and certified successfully! Asset status is now Operational.'
            ]);
        }

        // Finalize Breakdown
        elseif ($category === 'breakdown' || $category === 'breakdowns') {
            $actionTaken = $input['action_taken'] ?? 'Repaired and verified via Mobile Field Portal';
            $pdo->prepare("UPDATE complaints 
                           SET status = 'Resolved', 
                               action_taken = ?, 
                               resolved_at = NOW(),
                               closed_at = NOW()
                           WHERE id = ?")
                ->execute([$actionTaken, $jobId]);

            // Update equipment status to Operational
            $eqId = $pdo->query("SELECT equipment_id FROM complaints WHERE id = $jobId")->fetchColumn();
            if ($eqId) {
                $pdo->prepare("UPDATE equipments SET status = 'Operational' WHERE id = ?")->execute([$eqId]);
            }

            jsonResponse([
                'status' => 'success',
                'message' => 'Breakdown ticket resolved successfully. Equipment returned to active service!'
            ]);
        }

        // Finalize Site Prep
        elseif ($category === 'site_prep') {
            $pdo->prepare("UPDATE site_inspections 
                           SET overall_status = 'Approved & Ready for Delivery', 
                               inspection_date = CURDATE(),
                               readiness_percentage = 100.00,
                               notes = COALESCE(NULLIF(?, ''), notes)
                           WHERE id = ?")
                ->execute([$notes, $jobId]);

            jsonResponse([
                'status' => 'success',
                'message' => 'Site Preparation audit approved and certified!'
            ]);
        }

        // Finalize Housekeeping
        elseif ($category === 'housekeeping') {
            $pdo->prepare("UPDATE housekeeping_inspections 
                           SET status = 'Passed', 
                               conducted_at = NOW(),
                               certificate_issued = 1,
                               certificate_number = CONCAT('CERT-HK-', YEAR(NOW()), '-', LPAD(id, 4, '0'))
                           WHERE id = ?")
                ->execute([$jobId]);

            jsonResponse([
                'status' => 'success',
                'message' => 'Housekeeping terminal clearance passed! Certificate issued.'
            ]);
        }
    }

    // 7. Admin Assign Task
    if ($action === 'admin_assign') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) $input = $_POST;

        $category = $input['category'] ?? 'pm';
        $jobId = (int)($input['job_id'] ?? 0);
        $employeeId = (int)($input['employee_id'] ?? 0);
        $employeeName = $input['employee_name'] ?? resolveEmployeeName($pdo, $employeeId, 'Assigned Staff');
        $employeeBadge = $input['employee_badge'] ?? 'STAFF';

        if ($jobId <= 0) {
            jsonError('Job ID is required');
        }

        if ($category === 'pm') {
            // Assign in pm_phase_assignments
            $pdo->prepare("UPDATE pm_phase_assignments 
                           SET assigned_employee_id = ?, assigned_employee_name = ?, assigned_employee_badge = ?
                           WHERE equipment_id = ?")
                ->execute([$employeeId, $employeeName, $employeeBadge, $jobId]);
        } elseif ($category === 'breakdown' || $category === 'breakdowns') {
            $pdo->prepare("UPDATE complaints SET assigned_engineer = ?, assigned_at = NOW() WHERE id = ?")
                ->execute([$employeeName, $jobId]);
        } elseif ($category === 'site_prep') {
            $pdo->prepare("UPDATE site_inspections SET lead_biomedical_engineer = ? WHERE id = ?")
                ->execute([$employeeName, $jobId]);
        } elseif ($category === 'housekeeping') {
            $pdo->prepare("UPDATE housekeeping_inspections SET inspector_name = ? WHERE id = ?")
                ->execute([$employeeName, $jobId]);
        }

        jsonResponse([
            'status' => 'success',
            'message' => "Task successfully assigned to {$employeeName}!"
        ]);
    }

    jsonError("Invalid action: {$action}", 400);

} catch (Exception $e) {
    jsonError($e->getMessage(), 500);
}
