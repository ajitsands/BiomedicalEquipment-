<?php
require_once __DIR__ . '/../config/db.php';

try {
    $stmt = $pdo->query("SELECT 
        d.*,
        COUNT(e.id) as total_equipments,
        SUM(CASE WHEN e.status = 'Operational' THEN 1 ELSE 0 END) as operational_count,
        SUM(CASE WHEN e.status = 'Under Breakdown' THEN 1 ELSE 0 END) as breakdown_count
    FROM departments d
    LEFT JOIN equipments e ON e.department_id = d.id
    GROUP BY d.id
    ORDER BY d.name ASC");

    $departments = $stmt->fetchAll();

    jsonResponse([
        'status' => 'success',
        'data' => $departments
    ]);
} catch (PDOException $e) {
    jsonError('Failed to fetch departments: ' . $e->getMessage(), 500);
}
