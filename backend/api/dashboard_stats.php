<?php
require_once __DIR__ . '/../config/db.php';

try {
    // 1. Overall Equipment Counts
    $stmt = $pdo->query("SELECT 
        COUNT(*) as total_equipments,
        SUM(CASE WHEN status = 'Operational' THEN 1 ELSE 0 END) as operational,
        SUM(CASE WHEN status = 'In Use' THEN 1 ELSE 0 END) as in_use,
        SUM(CASE WHEN status = 'Under Breakdown' THEN 1 ELSE 0 END) as under_breakdown,
        SUM(CASE WHEN status = 'Under Maintenance' THEN 1 ELSE 0 END) as under_maintenance,
        SUM(CASE WHEN status = 'Calibration Due' THEN 1 ELSE 0 END) as calibration_due,
        SUM(CASE WHEN warranty_status = 'Under Warranty' THEN 1 ELSE 0 END) as under_warranty,
        SUM(CASE WHEN warranty_status = 'Out of Warranty' THEN 1 ELSE 0 END) as out_of_warranty,
        SUM(CASE WHEN contract_type = 'Comprehensive AMC (CMC)' THEN 1 ELSE 0 END) as cmc_count,
        SUM(CASE WHEN contract_type = 'Non-Comprehensive AMC' THEN 1 ELSE 0 END) as amc_count,
        SUM(CASE WHEN contract_type = 'In-House Maintenance' THEN 1 ELSE 0 END) as in_house_count,
        SUM(purchase_cost) as total_asset_value
    FROM equipments");
    $equipment_counts = $stmt->fetch();

    // 2. Complaint Tickets Breakdown
    $stmt = $pdo->query("SELECT 
        COUNT(*) as total_complaints,
        SUM(CASE WHEN status IN ('Open', 'Acknowledged', 'Assigned', 'In Progress', 'Awaiting Spare Parts') THEN 1 ELSE 0 END) as active_complaints,
        SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) as open_complaints,
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_complaints,
        SUM(CASE WHEN status IN ('Repaired & Verified', 'Closed') THEN 1 ELSE 0 END) as resolved_complaints,
        SUM(CASE WHEN priority = 'Critical - Life Support' AND status NOT IN ('Repaired & Verified', 'Closed') THEN 1 ELSE 0 END) as critical_active_complaints,
        AVG(downtime_hours) as avg_downtime_hours
    FROM complaints");
    $complaint_counts = $stmt->fetch();

    // 3. Upcoming Maintenance Due (Within next 30 days) or Overdue
    $stmt = $pdo->query("SELECT 
        COUNT(*) as total_pm_records,
        SUM(CASE WHEN next_pm_due_date < CURDATE() THEN 1 ELSE 0 END) as pm_overdue,
        SUM(CASE WHEN next_pm_due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as pm_due_soon
    FROM equipments");
    $pm_schedule_counts = $stmt->fetch();

    // 4. Department Distribution
    $stmt = $pdo->query("SELECT 
        d.id, d.name, d.code, d.building, d.floor,
        COUNT(e.id) as total_devices,
        SUM(CASE WHEN e.status = 'Under Breakdown' THEN 1 ELSE 0 END) as breakdown_devices
    FROM departments d
    LEFT JOIN equipments e ON e.department_id = d.id
    GROUP BY d.id
    ORDER BY total_devices DESC");
    $department_stats = $stmt->fetchAll();

    // 5. Recent Breakdown Complaints
    $stmt = $pdo->query("SELECT 
        c.*, 
        e.asset_id, e.name as equipment_name, e.brand, e.model_number,
        d.name as department_name, d.floor
    FROM complaints c
    JOIN equipments e ON c.equipment_id = e.id
    JOIN departments d ON c.department_id = d.id
    ORDER BY c.reported_at DESC
    LIMIT 6");
    $recent_complaints = $stmt->fetchAll();

    // 6. Recent Maintenance Executions
    $stmt = $pdo->query("SELECT 
        m.*, 
        e.asset_id, e.name as equipment_name, e.brand, e.model_number,
        d.name as department_name
    FROM maintenance_records m
    JOIN equipments e ON m.equipment_id = e.id
    JOIN departments d ON e.department_id = d.id
    ORDER BY m.performed_date DESC
    LIMIT 6");
    $recent_maintenance = $stmt->fetchAll();

    // 7. Calculate Uptime Percentage
    $total = (int)($equipment_counts['total_equipments'] ?? 0);
    $breakdown = (int)($equipment_counts['under_breakdown'] ?? 0);
    $uptime_pct = $total > 0 ? round((($total - $breakdown) / $total) * 100, 1) : 100.0;

    jsonResponse([
        'status' => 'success',
        'data' => [
            'counts' => $equipment_counts,
            'complaints' => $complaint_counts,
            'pm_schedules' => $pm_schedule_counts,
            'uptime_percentage' => $uptime_pct,
            'departments' => $department_stats,
            'recent_complaints' => $recent_complaints,
            'recent_maintenance' => $recent_maintenance
        ]
    ]);
} catch (PDOException $e) {
    jsonError('Failed to fetch dashboard statistics: ' . $e->getMessage(), 500);
}
