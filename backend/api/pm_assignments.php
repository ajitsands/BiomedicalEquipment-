<?php
require_once __DIR__ . '/../config/db.php';

header('Content-Type: application/json');

$action = $_GET['action'] ?? $_POST['action'] ?? '';

// Default phase definitions for WHO / IEC 62353 PM
const DEFAULT_PHASES = [
    [
        'phase_key' => 'PRE_USE',
        'phase_name' => 'Phase 1: User Pre-Use / Routine Check',
        'default_role' => 'Department User / Junior Tech'
    ],
    [
        'phase_key' => 'PM_TECH',
        'phase_name' => 'Phase 2: Technical PM & Mechanical Inspection',
        'default_role' => 'Biomedical Service Engineer'
    ],
    [
        'phase_key' => 'ELECTRICAL',
        'phase_name' => 'Electrical Safety: IEC 62353 Standard',
        'default_role' => 'Electrical Safety Analyzer Specialist'
    ],
    [
        'phase_key' => 'CORRECTIVE',
        'phase_name' => 'Phase 3: Corrective Maintenance & Spares',
        'default_role' => 'Lead Biomedical Engineer'
    ]
];

try {
    // 1. Get Assignments for Equipment & Due Date
    if ($action === 'get_assignments') {
        $equipmentId = (int)($_GET['equipment_id'] ?? 0);
        $pmDate = $_GET['pm_due_date'] ?? date('Y-m-d');

        if ($equipmentId <= 0) {
            jsonError('Invalid equipment ID');
        }

        // Fetch equipment
        $eqStmt = $pdo->prepare("SELECT e.*, d.name as department_name, d.floor as department_floor, et.name as equipment_type_name
                                 FROM equipments e
                                 LEFT JOIN departments d ON e.department_id = d.id
                                 LEFT JOIN equipment_types et ON e.equipment_type_id = et.id
                                 WHERE e.id = ?");
        $eqStmt->execute([$equipmentId]);
        $equipment = $eqStmt->fetch();
        if (!$equipment) {
            jsonError('Equipment not found', 404);
        }

        if (empty($pmDate) || $pmDate === 'null') {
            $pmDate = $equipment['next_pm_due_date'] ?: date('Y-m-d');
        }

        // Check if assignments already exist for this eq and date
        $stmt = $pdo->prepare("SELECT * FROM pm_phase_assignments WHERE equipment_id = ? AND pm_due_date = ? ORDER BY id ASC");
        $stmt->execute([$equipmentId, $pmDate]);
        $existing = $stmt->fetchAll();

        // If none exist, auto-create the 4 default phases with smart assignment
        if (empty($existing)) {
            // Fetch default employees to auto-assign
            $emps = $pdo->query("SELECT id, full_name, employee_code, role FROM employees ORDER BY id ASC")->fetchAll();
            $defaultEmp = !empty($emps) ? $emps[0] : null;

            $insertStmt = $pdo->prepare("INSERT INTO pm_phase_assignments 
                (equipment_id, pm_due_date, phase_key, phase_name, assigned_employee_id, assigned_employee_name, assigned_employee_badge, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')
                ON DUPLICATE KEY UPDATE phase_name = VALUES(phase_name)");

            foreach (DEFAULT_PHASES as $idx => $p) {
                // Find best matching employee role
                $assignedEmp = $defaultEmp;
                foreach ($emps as $e) {
                    if ($p['phase_key'] === 'PRE_USE' && (str_contains($e['role'], 'Nurse') || str_contains($e['role'], 'User') || str_contains($e['role'], 'Tech'))) {
                        $assignedEmp = $e;
                        break;
                    } elseif ($p['phase_key'] === 'PM_TECH' && str_contains($e['role'], 'Biomedical Engineer')) {
                        $assignedEmp = $e;
                        break;
                    } elseif ($p['phase_key'] === 'ELECTRICAL' && (str_contains($e['role'], 'Safety') || str_contains($e['role'], 'Bio') || str_contains($e['role'], 'Engineer'))) {
                        $assignedEmp = $e;
                        break;
                    } elseif ($p['phase_key'] === 'CORRECTIVE' && (str_contains($e['role'], 'Lead') || str_contains($e['role'], 'Manager') || str_contains($e['role'], 'Engineer'))) {
                        $assignedEmp = $e;
                        break;
                    }
                }

                $insertStmt->execute([
                    $equipmentId,
                    $pmDate,
                    $p['phase_key'],
                    $p['phase_name'],
                    $assignedEmp ? $assignedEmp['id'] : null,
                    $assignedEmp ? $assignedEmp['full_name'] : $p['default_role'],
                    $assignedEmp ? $assignedEmp['employee_code'] : 'BME-STAFF',
                ]);
            }

            // Re-fetch created
            $stmt->execute([$equipmentId, $pmDate]);
            $existing = $stmt->fetchAll();
        }

        // Also fetch all employees list for admin assignment UI
        $employeesList = $pdo->query("SELECT id, full_name, employee_code, role, designation FROM employees ORDER BY full_name ASC")->fetchAll();

        jsonResponse([
            'status' => 'success',
            'data' => [
                'equipment' => $equipment,
                'pm_due_date' => $pmDate,
                'phases' => $existing,
                'employees' => $employeesList
            ]
        ]);
    }

    // 2. Save Phase Assignments (Admin delegation)
    if ($action === 'save_assignments') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            $input = $_POST;
        }

        $equipmentId = (int)($input['equipment_id'] ?? 0);
        $pmDate = $input['pm_due_date'] ?? date('Y-m-d');
        $assignments = $input['assignments'] ?? [];

        if ($equipmentId <= 0 || empty($assignments)) {
            jsonError('Invalid assignment payload');
        }

        $stmt = $pdo->prepare("INSERT INTO pm_phase_assignments 
            (equipment_id, pm_due_date, phase_key, phase_name, assigned_employee_id, assigned_employee_name, assigned_employee_badge, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')
            ON DUPLICATE KEY UPDATE 
                phase_name = VALUES(phase_name),
                assigned_employee_id = VALUES(assigned_employee_id),
                assigned_employee_name = VALUES(assigned_employee_name),
                assigned_employee_badge = VALUES(assigned_employee_badge)");

        foreach ($assignments as $a) {
            $stmt->execute([
                $equipmentId,
                $pmDate,
                $a['phase_key'],
                $a['phase_name'] ?? $a['phase_key'],
                !empty($a['assigned_employee_id']) ? (int)$a['assigned_employee_id'] : null,
                $a['assigned_employee_name'] ?? 'Assigned Staff',
                $a['assigned_employee_badge'] ?? 'STAFF-01'
            ]);
        }

        jsonResponse([
            'status' => 'success',
            'message' => 'PM phase assignments updated successfully'
        ]);
    }

    // 3. My Assigned Tasks (Technician Mobile View)
    if ($action === 'my_tasks') {
        $employeeId = (int)($_GET['employee_id'] ?? 0);
        $badge = trim($_GET['employee_badge'] ?? '');
        $statusFilter = $_GET['status'] ?? 'ALL'; // 'ALL', 'Pending', 'Completed'

        $sql = "SELECT p.*, 
                       e.asset_id, e.name as equipment_name, e.brand, e.model_number, e.serial_number,
                       e.qr_code_token, e.status as operational_status, e.criticality,
                       e.protection_class, e.applied_part_type, e.equipment_type_id,
                       d.name as department_name, d.floor as department_floor
                FROM pm_phase_assignments p
                JOIN equipments e ON p.equipment_id = e.id
                LEFT JOIN departments d ON e.department_id = d.id
                WHERE 1=1";
        $params = [];

        if ($employeeId > 0) {
            $sql .= " AND (p.assigned_employee_id = ? OR p.assigned_employee_badge = ?)";
            $params[] = $employeeId;
            $params[] = $badge;
        } elseif (!empty($badge)) {
            $sql .= " AND p.assigned_employee_badge = ?";
            $params[] = $badge;
        }

        if ($statusFilter !== 'ALL') {
            $sql .= " AND p.status = ?";
            $params[] = $statusFilter;
        }

        $sql .= " ORDER BY p.status ASC, p.pm_due_date ASC, p.id ASC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $tasks = $stmt->fetchAll();

        // Also fetch employee's profile info
        $empInfo = null;
        if ($employeeId > 0) {
            $empStmt = $pdo->prepare("SELECT id, full_name, employee_code, role, designation FROM employees WHERE id = ?");
            $empStmt->execute([$employeeId]);
            $empInfo = $empStmt->fetch();
        }

        jsonResponse([
            'status' => 'success',
            'data' => [
                'employee' => $empInfo,
                'tasks' => $tasks,
                'total_tasks' => count($tasks),
                'pending_count' => count(array_filter($tasks, fn($t) => $t['status'] !== 'Completed')),
                'completed_count' => count(array_filter($tasks, fn($t) => $t['status'] === 'Completed'))
            ]
        ]);
    }

    // 4. Resolve Equipment by QR Scan
    if ($action === 'scan_qr') {
        $token = trim($_GET['token'] ?? '');
        if (empty($token)) {
            jsonError('QR code token required');
        }

        // Try lookup by qr_code_token, asset_id, or serial_number
        $stmt = $pdo->prepare("SELECT e.*, d.name as department_name, d.floor as department_floor, et.name as equipment_type_name
                               FROM equipments e
                               LEFT JOIN departments d ON e.department_id = d.id
                               LEFT JOIN equipment_types et ON e.equipment_type_id = et.id
                               WHERE e.qr_code_token = ? OR e.asset_id = ? OR e.serial_number = ?
                               LIMIT 1");
        $stmt->execute([$token, $token, $token]);
        $eq = $stmt->fetch();
        if (!$eq) {
            jsonError('No equipment found matching QR tag: ' . $token, 404);
        }

        // Fetch today's or current active assignments
        $assignStmt = $pdo->prepare("SELECT * FROM pm_phase_assignments WHERE equipment_id = ? ORDER BY pm_due_date DESC, id ASC LIMIT 4");
        $assignStmt->execute([$eq['id']]);
        $phases = $assignStmt->fetchAll();

        jsonResponse([
            'status' => 'success',
            'data' => [
                'equipment' => $eq,
                'phases' => $phases
            ]
        ]);
    }

    // 5. Submit Completed Phase (Mobile or Web)
    if ($action === 'submit_phase') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            $input = $_POST;
        }

        $assignmentId = (int)($input['assignment_id'] ?? 0);
        $equipmentId = (int)($input['equipment_id'] ?? 0);
        $phaseKey = $input['phase_key'] ?? '';
        $completedBy = $input['completed_by'] ?? 'Biomedical Staff';
        $badge = $input['technician_badge'] ?? '';
        $signatureData = $input['signature_data'] ?? null;
        $paperPhotoUrl = $input['paper_scanned_photo_url'] ?? null;
        $notes = $input['engineer_notes'] ?? '';
        $itemsData = isset($input['items_answers']) ? json_encode($input['items_answers']) : null;

        if ($assignmentId <= 0 && ($equipmentId <= 0 || empty($phaseKey))) {
            jsonError('Invalid assignment or phase data');
        }

        if ($assignmentId > 0) {
            $updateStmt = $pdo->prepare("UPDATE pm_phase_assignments SET
                status = 'Completed',
                completed_at = NOW(),
                completed_by = ?,
                technician_badge = ?,
                signature_data = ?,
                paper_scanned_photo_url = COALESCE(?, paper_scanned_photo_url),
                engineer_notes = ?,
                items_data = ?
                WHERE id = ?");
            $updateStmt->execute([
                $completedBy,
                $badge,
                $signatureData,
                $paperPhotoUrl,
                $notes,
                $itemsData,
                $assignmentId
            ]);

            // Retrieve equipment_id & pm_due_date
            $row = $pdo->query("SELECT equipment_id, pm_due_date FROM pm_phase_assignments WHERE id = {$assignmentId}")->fetch();
            if ($row) {
                $equipmentId = $row['equipment_id'];
                $pmDate = $row['pm_due_date'];
            }
        }

        // Check if all 4 phases for this equipment are now completed
        $checkStmt = $pdo->prepare("SELECT COUNT(*) as total, 
                                           SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed_count
                                    FROM pm_phase_assignments
                                    WHERE equipment_id = ? AND pm_due_date = ?");
        $checkStmt->execute([$equipmentId, $pmDate ?? date('Y-m-d')]);
        $counts = $checkStmt->fetch();

        $allDone = ($counts['total'] >= 4 && $counts['total'] == $counts['completed_count']);

        // If all 4 phases are completed, auto-issue the master PM record
        $workOrderNo = null;
        if ($allDone) {
            $workOrderNo = sprintf('WO-PM-%s-%04d', date('Y'), $equipmentId);
            $nextDue = date('Y-m-d', strtotime('+3 months'));

            $recStmt = $pdo->prepare("INSERT INTO maintenance_records 
                (work_order_no, equipment_id, maintenance_type, performed_by, technician_badge, performed_date, overall_result, next_pm_due_date, engineer_notes)
                VALUES (?, ?, 'Preventive Maintenance (PM)', ?, ?, CURDATE(), 'Passed - Ready for Clinical Use', ?, ?)
                ON DUPLICATE KEY UPDATE overall_result = 'Passed - Ready for Clinical Use', next_pm_due_date = VALUES(next_pm_due_date)");
            
            $recStmt->execute([
                $workOrderNo,
                $equipmentId,
                $completedBy,
                $badge,
                $nextDue,
                "Multi-phase PM inspection completed and certified across all 4 clinical & electrical safety phases."
            ]);

            // Update equipment status & next PM due date
            $pdo->prepare("UPDATE equipments SET status = 'Operational', last_pm_date = CURDATE(), next_pm_due_date = ? WHERE id = ?")
                ->execute([$nextDue, $equipmentId]);
        }

        jsonResponse([
            'status' => 'success',
            'message' => 'Phase verified and submitted successfully!',
            'data' => [
                'assignment_id' => $assignmentId,
                'all_phases_completed' => $allDone,
                'completed_phases' => $counts['completed_count'] ?? 1,
                'total_phases' => $counts['total'] ?? 4,
                'work_order_no' => $workOrderNo
            ]
        ]);
    }

    jsonError('Invalid action request', 400);

} catch (PDOException $e) {
    jsonError('Database operation failed: ' . $e->getMessage(), 500);
}
