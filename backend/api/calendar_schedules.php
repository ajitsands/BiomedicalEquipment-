<?php
// BioTrack CMMS — Master Operations Calendar & Scheduling API
// Unified Scheduler for Biomedical Equipments, Site Preparation & Housekeeping (NHRA/WHO)
// Powered and Engineered by SaNDS Lab Middle East W.L.L

require_once __DIR__ . '/../config/db.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? 'month_schedule';

// -------------------------------------------------------------
// 1. GET Requests
// -------------------------------------------------------------
if ($method === 'GET') {
    // A. Month Schedule Overview (Aggregated daily counts for full calendar grid)
    if ($action === 'month_schedule') {
        $year = (int)($_GET['year'] ?? date('Y'));
        $month = (int)($_GET['month'] ?? date('m'));
        $module = $_GET['module'] ?? 'ALL'; // 'ALL', 'biomedical', 'site_prep', 'housekeeping'

        $startDate = sprintf('%04d-%02d-01', $year, $month);
        $daysInMonth = (int)date('t', strtotime($startDate));
        $endDate = sprintf('%04d-%02d-%02d', $year, $month, $daysInMonth);

        try {
            // Initialize day map
            $dayMap = [];
            for ($d = 1; $d <= $daysInMonth; $d++) {
                $curDate = sprintf('%04d-%02d-%02d', $year, $month, $d);
                $dayOfWeek = date('N', strtotime($curDate)); // 1 (Mon) to 7 (Sun)
                $dayMap[$curDate] = [
                    'date' => $curDate,
                    'day_number' => $d,
                    'day_of_week' => (int)$dayOfWeek,
                    'is_today' => ($curDate === date('Y-m-d')),
                    'bme_count' => 0,
                    'site_prep_count' => 0,
                    'housekeeping_count' => 0,
                    'total_jobs' => 0,
                    'critical_count' => 0,
                    'events' => []
                ];
            }

            // 1. Biomedical Equipment PM Due Dates & Complaints
            if ($module === 'ALL' || $module === 'biomedical') {
                $bmeStmt = $pdo->prepare("SELECT e.id, e.asset_id, e.name AS equipment_name, e.brand, e.model_number, 
                                                 e.serial_number, e.maintenance_schedule_type, e.next_pm_due_date, e.status, 
                                                 d.name AS department_name, d.floor AS department_floor
                                          FROM equipments e
                                          LEFT JOIN departments d ON e.department_id = d.id
                                          WHERE e.next_pm_due_date BETWEEN ? AND ?");
                $bmeStmt->execute([$startDate, $endDate]);
                $bmePms = $bmeStmt->fetchAll();

                foreach ($bmePms as $pm) {
                    $d = $pm['next_pm_due_date'];
                    if (isset($dayMap[$d])) {
                        $dayMap[$d]['bme_count']++;
                        $dayMap[$d]['total_jobs']++;
                        $dayMap[$d]['events'][] = [
                            'id' => 'BME-PM-' . $pm['id'],
                            'source_id' => $pm['id'],
                            'module' => 'biomedical',
                            'type' => 'PM Checklist (' . ($pm['maintenance_schedule_type'] ?: 'Quarterly') . ')',
                            'title' => $pm['equipment_name'] . ' [' . $pm['asset_id'] . ']',
                            'location' => ($pm['department_name'] ?: 'General') . ' (' . ($pm['department_floor'] ?: 'Floor 1') . ')',
                            'priority' => 'High',
                            'status' => ($pm['status'] === 'Operational') ? 'Scheduled' : 'Action Required',
                            'color' => '#0284c7'
                        ];
                    }
                }

                // Equipment Breakdown Complaints
                $compStmt = $pdo->prepare("SELECT c.id, c.ticket_number, c.description, c.priority, c.status, c.reported_at,
                                                  e.asset_id, e.name AS equipment_name, d.name AS department_name
                                           FROM complaints c
                                           JOIN equipments e ON c.equipment_id = e.id
                                           LEFT JOIN departments d ON c.department_id = d.id
                                           WHERE DATE(c.reported_at) BETWEEN ? AND ?");
                $compStmt->execute([$startDate, $endDate]);
                $complaints = $compStmt->fetchAll();

                foreach ($complaints as $c) {
                    $d = date('Y-m-d', strtotime($c['reported_at']));
                    if (isset($dayMap[$d])) {
                        $dayMap[$d]['bme_count']++;
                        $dayMap[$d]['total_jobs']++;
                        if (str_contains($c['priority'], 'Critical')) {
                            $dayMap[$d]['critical_count']++;
                        }
                        $dayMap[$d]['events'][] = [
                            'id' => 'BME-TICKET-' . $c['id'],
                            'source_id' => $c['id'],
                            'module' => 'biomedical',
                            'type' => 'Breakdown Ticket',
                            'title' => $c['ticket_number'] . ': ' . $c['equipment_name'],
                            'location' => $c['department_name'] ?: 'Clinical Ward',
                            'priority' => $c['priority'],
                            'status' => $c['status'],
                            'color' => '#0284c7'
                        ];
                    }
                }
            }

            // 2. Site Preparation Audits & Deficiencies
            if ($module === 'ALL' || $module === 'site_prep') {
                $siteStmt = $pdo->prepare("SELECT i.id, i.audit_number, i.facility_name, i.room_number, i.building, i.floor, i.overall_status, i.inspection_date
                                           FROM site_inspections i
                                           WHERE DATE(i.inspection_date) BETWEEN ? AND ?");
                $siteStmt->execute([$startDate, $endDate]);
                $siteAudits = $siteStmt->fetchAll();

                foreach ($siteAudits as $sa) {
                    $d = date('Y-m-d', strtotime($sa['inspection_date']));
                    if (isset($dayMap[$d])) {
                        $dayMap[$d]['site_prep_count']++;
                        $dayMap[$d]['total_jobs']++;
                        $dayMap[$d]['events'][] = [
                            'id' => 'SITE-AUDIT-' . $sa['id'],
                            'source_id' => $sa['id'],
                            'module' => 'site_prep',
                            'type' => 'Site Readiness Audit',
                            'title' => $sa['audit_number'] . ': ' . $sa['room_number'],
                            'location' => $sa['building'] . ' - ' . $sa['floor'],
                            'priority' => 'High',
                            'status' => $sa['overall_status'],
                            'color' => '#ea580c'
                        ];
                    }
                }

                // Site Punch-list Deficiencies
                $defStmt = $pdo->prepare("SELECT d.id, d.inspection_id, d.deficiency_ticket, d.title, d.priority, d.status, d.due_date,
                                                 i.room_number, i.building
                                          FROM site_deficiencies d
                                          JOIN site_inspections i ON d.inspection_id = i.id
                                          WHERE DATE(d.due_date) BETWEEN ? AND ?");
                $defStmt->execute([$startDate, $endDate]);
                $deficiencies = $defStmt->fetchAll();

                foreach ($deficiencies as $df) {
                    $d = date('Y-m-d', strtotime($df['due_date']));
                    if (isset($dayMap[$d])) {
                        $dayMap[$d]['site_prep_count']++;
                        $dayMap[$d]['total_jobs']++;
                        if ($df['priority'] === 'Critical') {
                            $dayMap[$d]['critical_count']++;
                        }
                        $dayMap[$d]['events'][] = [
                            'id' => 'SITE-DEF-' . $df['id'],
                            'source_id' => $df['id'],
                            'deficiency_id' => (int)$df['id'],
                            'inspection_id' => (int)$df['inspection_id'],
                            'module' => 'site_prep',
                            'type' => 'Site Deficiency Remediation',
                            'title' => $df['deficiency_ticket'] . ': ' . $df['title'],
                            'location' => $df['building'] . ' - ' . $df['room_number'],
                            'priority' => $df['priority'],
                            'status' => $df['status'],
                            'color' => '#ea580c'
                        ];
                    }
                }
            }

            // 3. Housekeeping Terminal Audits & HK Complaints (HK-01 to HK-16)
            if ($module === 'ALL' || $module === 'housekeeping') {
                $hkInspStmt = $pdo->prepare("SELECT i.id, i.audit_number, i.room_number, i.building, i.floor, i.area_type, i.cleaning_type, i.status, i.conducted_at
                                             FROM housekeeping_inspections i
                                             WHERE DATE(i.conducted_at) BETWEEN ? AND ?");
                $hkInspStmt->execute([$startDate, $endDate]);
                $hkAudits = $hkInspStmt->fetchAll();

                foreach ($hkAudits as $ha) {
                    $d = date('Y-m-d', strtotime($ha['conducted_at']));
                    if (isset($dayMap[$d])) {
                        $dayMap[$d]['housekeeping_count']++;
                        $dayMap[$d]['total_jobs']++;
                        $dayMap[$d]['events'][] = [
                            'id' => 'HK-AUDIT-' . $ha['id'],
                            'source_id' => $ha['id'],
                            'module' => 'housekeeping',
                            'type' => $ha['cleaning_type'] . ' Audit',
                            'title' => $ha['audit_number'] . ': ' . $ha['room_number'] . ' (' . $ha['area_type'] . ')',
                            'location' => $ha['building'] . ' - ' . $ha['floor'],
                            'priority' => 'Medium',
                            'status' => $ha['status'],
                            'color' => '#dc2626'
                        ];
                    }
                }

                // Housekeeping Complaints
                $hkCompStmt = $pdo->prepare("SELECT c.id, c.complaint_number, c.category_code, c.title, c.room_number, c.building, c.floor, c.risk_level, c.status, c.target_completion_at, c.reported_at
                                             FROM housekeeping_complaints c
                                             WHERE DATE(c.reported_at) BETWEEN ? AND ? OR DATE(c.target_completion_at) BETWEEN ? AND ?");
                $hkCompStmt->execute([$startDate, $endDate, $startDate, $endDate]);
                $hkComplaints = $hkCompStmt->fetchAll();

                foreach ($hkComplaints as $hc) {
                    $d = !empty($hc['target_completion_at']) ? date('Y-m-d', strtotime($hc['target_completion_at'])) : date('Y-m-d', strtotime($hc['reported_at']));
                    if (isset($dayMap[$d])) {
                        $dayMap[$d]['housekeeping_count']++;
                        $dayMap[$d]['total_jobs']++;
                        if ($hc['risk_level'] === 'Critical') {
                            $dayMap[$d]['critical_count']++;
                        }
                        $dayMap[$d]['events'][] = [
                            'id' => 'HK-TICKET-' . $hc['id'],
                            'source_id' => $hc['id'],
                            'module' => 'housekeeping',
                            'type' => $hc['category_code'] . ' Complaint',
                            'title' => $hc['complaint_number'] . ': ' . $hc['title'],
                            'location' => $hc['building'] . ' - ' . $hc['room_number'],
                            'priority' => $hc['risk_level'],
                            'status' => $hc['status'],
                            'color' => '#dc2626'
                        ];
                    }
                }

                // Daily clinical hygiene routine & Weekly OT protocols
                for ($d = 1; $d <= $daysInMonth; $d++) {
                    $curDate = sprintf('%04d-%02d-%02d', $year, $month, $d);
                    $dayMap[$curDate]['housekeeping_count'] += 1;
                    $dayMap[$curDate]['total_jobs'] += 1;
                    $dayMap[$curDate]['events'][] = [
                        'id' => 'HK-ROUTINE-' . $curDate,
                        'source_id' => 0,
                        'module' => 'housekeeping',
                        'type' => 'Daily Shift Routine Clean',
                        'title' => 'Daily High-Touch Surface Disinfection (1,000 PPM Chlorine)',
                        'location' => 'Inpatient Wards & Outpatient Public Restrooms',
                        'priority' => 'Medium',
                        'status' => ($curDate < date('Y-m-d')) ? 'Completed' : 'Pending',
                        'color' => '#dc2626'
                    ];

                    // Weekly Operating Theatre Deep Cleaning on Mondays
                    if (date('N', strtotime($curDate)) === '1') {
                        $dayMap[$curDate]['housekeeping_count'] += 1;
                        $dayMap[$curDate]['total_jobs'] += 1;
                        $dayMap[$curDate]['events'][] = [
                            'id' => 'HK-WEEKLY-OT-' . $curDate,
                            'source_id' => 0,
                            'module' => 'housekeeping',
                            'type' => 'Weekly OT Protocol',
                            'title' => 'Weekly Operating Theatre Terminal Scouring & Grille Clean',
                            'location' => 'Surgical Suite Complex (OT-1 to OT-6)',
                            'priority' => 'High',
                            'status' => ($curDate < date('Y-m-d')) ? 'Completed' : 'Pending',
                            'color' => '#dc2626'
                        ];
                    }
                }
            }

            // Compute monthly summary totals
            $totalJobs = 0;
            $bmeTotal = 0;
            $siteTotal = 0;
            $hkTotal = 0;
            $criticalTotal = 0;
            foreach ($dayMap as $day) {
                $totalJobs += $day['total_jobs'];
                $bmeTotal += $day['bme_count'];
                $siteTotal += $day['site_prep_count'];
                $hkTotal += $day['housekeeping_count'];
                $criticalTotal += $day['critical_count'];
            }

            jsonResponse([
                'status' => 'success',
                'data' => [
                    'year' => $year,
                    'month' => $month,
                    'month_name' => date('F Y', strtotime($startDate)),
                    'days_in_month' => $daysInMonth,
                    'first_day_of_week' => (int)date('N', strtotime($startDate)),
                    'days' => array_values($dayMap),
                    'schedule' => array_values($dayMap),
                    'summary' => [
                        'total_scheduled_jobs' => $totalJobs,
                        'biomedical_jobs' => $bmeTotal,
                        'site_prep_jobs' => $siteTotal,
                        'housekeeping_jobs' => $hkTotal,
                        'critical_urgent_jobs' => $criticalTotal
                    ]
                ]
            ]);

        } catch (PDOException $e) {
            jsonError('Failed to fetch calendar schedule: ' . $e->getMessage(), 500);
        }
    }


    // B. Granular Itemized Tasks for a Specific Day ("What do I have to do TODAY?")
    if ($action === 'day_tasks') {
        $date = $_GET['date'] ?? date('Y-m-d');
        try {
            $tasks = [];

            // 1. Biomedical PM Schedules due on this day
            $bmeStmt = $pdo->prepare("SELECT e.id AS asset_id_num, e.id AS equipment_id, e.asset_id, e.name AS asset_title, e.brand, e.model_number,
                                             e.serial_number, e.maintenance_schedule_type, e.status, e.room_number, e.equipment_type_id,
                                             et.name AS equipment_type_name,
                                             d.name AS department_name, d.floor AS department_floor
                                      FROM equipments e
                                      LEFT JOIN equipment_types et ON e.equipment_type_id = et.id
                                      LEFT JOIN departments d ON e.department_id = d.id
                                      WHERE e.next_pm_due_date = ?");
            $bmeStmt->execute([$date]);
            foreach ($bmeStmt->fetchAll() as $pm) {
                $tasks[] = [
                    'id' => 'BME-PM-' . $pm['asset_id_num'],
                    'source_id' => $pm['asset_id_num'],
                    'equipment_id' => $pm['equipment_id'],
                    'equipment_type_id' => $pm['equipment_type_id'],
                    'equipment_type_name' => $pm['equipment_type_name'],
                    'equipment_name' => $pm['asset_title'],
                    'asset_id' => $pm['asset_id'],
                    'brand' => $pm['brand'],
                    'model_number' => $pm['model_number'],
                    'serial_number' => $pm['serial_number'],
                    'maintenance_schedule_type' => $pm['maintenance_schedule_type'],
                    'module' => 'biomedical',
                    'module_name' => 'Biomedical Engineering',
                    'task_type' => 'Preventive Maintenance (' . ($pm['maintenance_schedule_type'] ?: 'Quarterly') . ')',
                    'title' => $pm['asset_title'] . ' [' . $pm['asset_id'] . ']',
                    'subtitle' => 'Brand: ' . $pm['brand'] . ' | Model: ' . $pm['model_number'] . ' | SN: ' . $pm['serial_number'],
                    'location' => ($pm['department_name'] ?: 'Clinical Ward') . ' · Room ' . ($pm['room_number'] ?: 'Clinical Bay'),
                    'priority' => 'High',
                    'status' => ($pm['status'] === 'Operational') ? 'Scheduled' : 'Action Required',
                    'certificate_eligible' => true,
                    'certificate_type' => 'IEC_62353_PM',
                    'assigned_to' => 'Biomedical Service Engineer'
                ];
            }

            // 1b. Biomedical Complaints
            $compStmt = $pdo->prepare("SELECT c.id AS task_id, c.equipment_id, c.ticket_number, c.description, c.priority, c.status,
                                              e.asset_id, e.name AS asset_title, e.brand, e.model_number, e.serial_number,
                                              e.equipment_type_id, et.name AS equipment_type_name, e.maintenance_schedule_type,
                                              d.name AS department_name
                                       FROM complaints c
                                       JOIN equipments e ON c.equipment_id = e.id
                                       LEFT JOIN equipment_types et ON e.equipment_type_id = et.id
                                       LEFT JOIN departments d ON c.department_id = d.id
                                       WHERE DATE(c.reported_at) = ?");
            $compStmt->execute([$date]);
            foreach ($compStmt->fetchAll() as $c) {
                $tasks[] = [
                    'id' => 'BME-COMP-' . $c['task_id'],
                    'source_id' => $c['task_id'],
                    'equipment_id' => $c['equipment_id'],
                    'equipment_type_id' => $c['equipment_type_id'],
                    'equipment_type_name' => $c['equipment_type_name'],
                    'equipment_name' => $c['asset_title'],
                    'asset_id' => $c['asset_id'],
                    'brand' => $c['brand'],
                    'model_number' => $c['model_number'],
                    'serial_number' => $c['serial_number'],
                    'maintenance_schedule_type' => $c['maintenance_schedule_type'],
                    'module' => 'biomedical',
                    'module_name' => 'Biomedical Engineering',
                    'task_type' => 'Breakdown Repair',
                    'title' => $c['ticket_number'] . ': ' . $c['asset_title'],
                    'subtitle' => $c['description'],
                    'location' => $c['department_name'] ?: 'Clinical Unit',
                    'priority' => $c['priority'],
                    'status' => $c['status'],
                    'certificate_eligible' => false,
                    'assigned_to' => 'On-Call BME Specialist'
                ];
            }

            // 2. Site Preparation Audits
            $siteStmt = $pdo->prepare("SELECT i.id AS task_id, i.audit_number, i.room_number, i.building, i.floor, i.overall_status, i.readiness_percentage
                                       FROM site_inspections i
                                       WHERE DATE(i.inspection_date) = ?");
            $siteStmt->execute([$date]);
            foreach ($siteStmt->fetchAll() as $sa) {
                $tasks[] = [
                    'id' => 'SITE-AUDIT-' . $sa['task_id'],
                    'source_id' => $sa['task_id'],
                    'module' => 'site_prep',
                    'module_name' => 'Site Preparation',
                    'task_type' => 'Site Readiness Inspection',
                    'title' => 'Room Readiness Audit (' . $sa['audit_number'] . ')',
                    'subtitle' => 'Readiness Score: ' . $sa['readiness_percentage'] . '% | ' . $sa['overall_status'],
                    'location' => $sa['building'] . ' · Floor ' . $sa['floor'] . ' · ' . $sa['room_number'],
                    'priority' => 'High',
                    'status' => $sa['overall_status'],
                    'certificate_eligible' => ($sa['overall_status'] === 'Approved'),
                    'certificate_type' => 'SITE_HANDOVER',
                    'assigned_to' => 'Facility Site Commissioning Engineer'
                ];
            }

            // 2b. Site Preparation Deficiencies Due
            $defStmt = $pdo->prepare("SELECT df.id AS task_id, df.inspection_id, df.deficiency_ticket, df.title, df.priority, df.status, df.due_date,
                                             df.category_code, df.description, df.contractor_assigned, df.corrective_action_plan,
                                             df.evidence_attachment_url, df.resolved_by, df.verified_by,
                                             i.room_number, i.building, i.audit_number
                                      FROM site_deficiencies df
                                      JOIN site_inspections i ON df.inspection_id = i.id
                                      WHERE DATE(df.due_date) = ?");
            $defStmt->execute([$date]);
            foreach ($defStmt->fetchAll() as $df) {
                $tasks[] = [
                    'id' => 'SITE-DEF-' . $df['task_id'],
                    'source_id' => (int)$df['task_id'],
                    'deficiency_id' => (int)$df['task_id'],
                    'inspection_id' => (int)$df['inspection_id'],
                    'module' => 'site_prep',
                    'module_name' => 'Site Preparation',
                    'task_type' => 'Civil / MEP Deficiency Rectification',
                    'title' => $df['deficiency_ticket'] . ': ' . $df['title'],
                    'subtitle' => 'Category: ' . ($df['category_code'] ?: 'General') . ' | ' . $df['description'],
                    'location' => $df['building'] . ' · Room ' . $df['room_number'],
                    'priority' => $df['priority'],
                    'status' => $df['status'],
                    'certificate_eligible' => false,
                    'assigned_to' => $df['contractor_assigned'] ?: 'Facility Contractor / Biomedical Project Lead',
                    'deficiency' => [
                        'id' => (int)$df['task_id'],
                        'inspection_id' => (int)$df['inspection_id'],
                        'deficiency_ticket' => $df['deficiency_ticket'],
                        'title' => $df['title'],
                        'description' => $df['description'],
                        'category_code' => $df['category_code'],
                        'priority' => $df['priority'],
                        'status' => $df['status'],
                        'contractor_assigned' => $df['contractor_assigned'],
                        'corrective_action_plan' => $df['corrective_action_plan'],
                        'evidence_attachment_url' => $df['evidence_attachment_url'],
                        'due_date' => $df['due_date'],
                        'resolved_by' => $df['resolved_by'],
                        'verified_by' => $df['verified_by'],
                        'room_number' => $df['room_number'],
                        'building' => $df['building'],
                        'audit_number' => $df['audit_number']
                    ]
                ];
            }

            // 3. Housekeeping Audits & Complaints
            $hkInspStmt = $pdo->prepare("SELECT i.id AS task_id, i.audit_number, i.room_number, i.building, i.floor, i.area_type, i.cleaning_type, i.status, i.score_percent
                                         FROM housekeeping_inspections i
                                         WHERE DATE(i.conducted_at) = ?");
            $hkInspStmt->execute([$date]);
            foreach ($hkInspStmt->fetchAll() as $ha) {
                $tasks[] = [
                    'id' => 'HK-AUDIT-' . $ha['task_id'],
                    'source_id' => $ha['task_id'],
                    'module' => 'housekeeping',
                    'module_name' => 'Housekeeping & Hygiene',
                    'task_type' => $ha['cleaning_type'] . ' Audit',
                    'title' => $ha['room_number'] . ' (' . $ha['area_type'] . ')',
                    'subtitle' => 'Cleanliness Score: ' . $ha['score_percent'] . '% | ' . $ha['audit_number'],
                    'location' => $ha['building'] . ' · ' . $ha['floor'],
                    'priority' => 'Medium',
                    'status' => $ha['status'],
                    'certificate_eligible' => ($ha['status'] === 'Passed'),
                    'certificate_type' => 'HK_TERMINAL_CLEARANCE',
                    'assigned_to' => 'Infection Control Link Nurse'
                ];
            }

            // Housekeeping Complaints
            $hkCompStmt = $pdo->prepare("SELECT c.id AS task_id, c.complaint_number, c.category_code, c.title, c.room_number, c.building, c.floor, c.risk_level, c.status, c.target_completion_at
                                         FROM housekeeping_complaints c
                                         WHERE DATE(c.reported_at) = ? OR DATE(c.target_completion_at) = ?");
            $hkCompStmt->execute([$date, $date]);
            foreach ($hkCompStmt->fetchAll() as $hc) {
                $tasks[] = [
                    'id' => 'HK-COMP-' . $hc['task_id'],
                    'source_id' => $hc['task_id'],
                    'module' => 'housekeeping',
                    'module_name' => 'Housekeeping & Hygiene',
                    'task_type' => $hc['category_code'] . ' Complaint Work Order',
                    'title' => $hc['title'],
                    'subtitle' => 'Ticket ' . $hc['complaint_number'] . ' | Target: ' . date('h:i A', strtotime($hc['target_completion_at'])),
                    'location' => $hc['building'] . ' · ' . $hc['floor'] . ' · ' . $hc['room_number'],
                    'priority' => $hc['risk_level'],
                    'status' => $hc['status'],
                    'certificate_eligible' => false,
                    'assigned_to' => 'Housekeeping Duty Supervisor'
                ];
            }

            // Daily recurring clinical hygiene protocol
            $tasks[] = [
                'id' => 'HK-ROUTINE-' . $date,
                'source_id' => 0,
                'module' => 'housekeeping',
                'module_name' => 'Housekeeping & Hygiene',
                'task_type' => 'Daily Shift Protocol',
                'title' => 'Daily Clinical Surface & Sanitary Disinfection (WHO / NHRA)',
                'subtitle' => '1,000 PPM Chlorine bleach dilution verification and washroom swab inspection',
                'location' => 'Inpatient Wards & Outpatient Public Restrooms',
                'priority' => 'Medium',
                'status' => ($date < date('Y-m-d')) ? 'Completed' : 'Pending',
                'certificate_eligible' => true,
                'certificate_type' => 'HK_TERMINAL_CLEARANCE',
                'assigned_to' => 'Shift Sanitary Team'
            ];

            jsonResponse([
                'status' => 'success',
                'data' => [
                    'date' => $date,
                    'formatted_date' => date('l, d F Y', strtotime($date)),
                    'total_tasks' => count($tasks),
                    'tasks' => $tasks
                ]
            ]);
        } catch (PDOException $e) {
            jsonError('Failed to fetch day tasks: ' . $e->getMessage(), 500);
        }
    }
}

// -------------------------------------------------------------
// 2. POST Requests (Complete Job / Mark Satisfied & Certify)
// -------------------------------------------------------------
if ($method === 'POST') {
    $input = getJsonInput();

    if ($action === 'complete_task') {
        $taskId = $input['task_id'] ?? '';
        $module = $input['module'] ?? '';
        $signOffName = trim($input['signoff_name'] ?? 'Authorized Inspector');
        $notes = trim($input['notes'] ?? 'Task verified and completed in accordance with hospital standards.');

        if (empty($taskId)) {
            jsonError('Task ID is required', 400);
        }

        try {
            $certNumber = null;

            if ($module === 'biomedical') {
                if (str_starts_with($taskId, 'BME-PM-')) {
                    $id = (int)str_replace('BME-PM-', '', $taskId);
                    $certNumber = sprintf('CERT-PM-%s-%04d', date('Y'), $id);
                    // Push next PM due date by 3 months or as per frequency
                    $pdo->prepare("UPDATE equipments SET next_pm_due_date = DATE_ADD(CURDATE(), INTERVAL 3 MONTH), status = 'Operational' WHERE id = ?")
                        ->execute([$id]);
                } elseif (str_starts_with($taskId, 'BME-COMP-')) {
                    $id = (int)str_replace('BME-COMP-', '', $taskId);
                    $pdo->prepare("UPDATE complaints SET status = 'Closed', resolved_at = NOW(), root_cause = ? WHERE id = ?")
                        ->execute([$notes, $id]);
                }
            } elseif ($module === 'site_prep') {
                if (str_starts_with($taskId, 'SITE-AUDIT-')) {
                    $id = (int)str_replace('SITE-AUDIT-', '', $taskId);
                    $certNumber = sprintf('CERT-SITE-%s-%04d', date('Y'), $id);
                    $pdo->prepare("UPDATE site_inspections SET overall_status = 'Approved' WHERE id = ?")
                        ->execute([$id]);
                } elseif (str_starts_with($taskId, 'SITE-DEF-')) {
                    $id = (int)str_replace('SITE-DEF-', '', $taskId);
                    $pdo->prepare("UPDATE site_deficiencies SET status = 'Closed after verification', corrective_action_plan = COALESCE(corrective_action_plan, ?), resolved_by = ?, resolved_at = NOW(), verified_by = ?, verified_at = NOW() WHERE id = ?")
                        ->execute([$notes, $signOffName, $signOffName, $id]);
                }
            } elseif ($module === 'housekeeping') {
                if (str_starts_with($taskId, 'HK-AUDIT-')) {
                    $id = (int)str_replace('HK-AUDIT-', '', $taskId);
                    $certNumber = sprintf('CERT-HK-%s-%04d', date('Y'), $id);
                    $pdo->prepare("UPDATE housekeeping_inspections SET status = 'Passed', certificate_issued = 1, certificate_number = ?, supervisor_name = ? WHERE id = ?")
                        ->execute([$certNumber, $signOffName, $id]);
                } elseif (str_starts_with($taskId, 'HK-COMP-')) {
                    $id = (int)str_replace('HK-COMP-', '', $taskId);
                    $pdo->prepare("UPDATE housekeeping_complaints SET status = 'Closed', verified_by = ?, verified_at = NOW(), closure_notes = ? WHERE id = ?")
                        ->execute([$signOffName, $notes, $id]);
                }
            }

            jsonResponse([
                'status' => 'success',
                'message' => 'Task marked as satisfied & completed successfully',
                'data' => [
                    'task_id' => $taskId,
                    'status' => 'Completed',
                    'certificate_number' => $certNumber
                ]
            ]);
        } catch (PDOException $e) {
            jsonError('Task completion failed: ' . $e->getMessage(), 500);
        }
    }
}
