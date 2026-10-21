<?php
require_once __DIR__ . '/../config/db.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
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
            'count' => count($departments),
            'data' => $departments
        ]);
    } catch (PDOException $e) {
        jsonError('Failed to fetch departments: ' . $e->getMessage(), 500);
    }
} elseif ($method === 'POST') {
    try {
        $input = getJsonInput();
        $name = trim($input['name'] ?? '');
        $code = strtoupper(trim($input['code'] ?? ''));
        $building = trim($input['building'] ?? 'Main Hospital Block');
        $floor = trim($input['floor'] ?? 'Ground Floor');
        $head = trim($input['head_of_department'] ?? '');
        $phone = trim($input['contact_phone'] ?? '');
        $email = trim($input['email'] ?? '');

        if (empty($name)) {
            jsonError('Department name is required');
        }

        if (empty($code)) {
            // Auto-generate code from name
            $words = preg_split('/\s+/', preg_replace('/[^a-zA-Z0-9\s]/', '', $name));
            $code = '';
            foreach ($words as $w) {
                if (!empty($w)) $code .= strtoupper(substr($w, 0, 1));
            }
            if (strlen($code) < 3) $code = strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', $name), 0, 6));
            $code .= '-' . rand(10, 99);
        }

        // Check uniqueness of code
        $stmtCheck = $pdo->prepare("SELECT id FROM departments WHERE code = ?");
        $stmtCheck->execute([$code]);
        if ($stmtCheck->fetch()) {
            jsonError("Department code '{$code}' already exists. Please choose a unique code.", 409);
        }

        $stmt = $pdo->prepare("INSERT INTO departments (name, code, building, floor, head_of_department, contact_phone, email) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$name, $code, $building, $floor, $head, $phone, $email]);
        $newId = (int)$pdo->lastInsertId();

        $stmtNew = $pdo->prepare("SELECT * FROM departments WHERE id = ?");
        $stmtNew->execute([$newId]);
        $created = $stmtNew->fetch();

        jsonResponse([
            'status' => 'success',
            'message' => "Department '{$name}' created successfully.",
            'data' => $created
        ], 201);
    } catch (PDOException $e) {
        jsonError('Failed to create department: ' . $e->getMessage(), 500);
    }
} elseif ($method === 'PUT') {
    try {
        $input = getJsonInput();
        $id = (int)($input['id'] ?? 0);
        $name = trim($input['name'] ?? '');
        $code = strtoupper(trim($input['code'] ?? ''));
        $building = trim($input['building'] ?? '');
        $floor = trim($input['floor'] ?? '');
        $head = trim($input['head_of_department'] ?? '');
        $phone = trim($input['contact_phone'] ?? '');
        $email = trim($input['email'] ?? '');

        if ($id <= 0 || empty($name) || empty($code)) {
            jsonError('Department ID, name, and code are required');
        }

        // Check if code is taken by another department
        $stmtCheck = $pdo->prepare("SELECT id FROM departments WHERE code = ? AND id != ?");
        $stmtCheck->execute([$code, $id]);
        if ($stmtCheck->fetch()) {
            jsonError("Department code '{$code}' is already used by another department.", 409);
        }

        $stmt = $pdo->prepare("UPDATE departments SET name = ?, code = ?, building = ?, floor = ?, head_of_department = ?, contact_phone = ?, email = ? WHERE id = ?");
        $stmt->execute([$name, $code, $building, $floor, $head, $phone, $email, $id]);

        $stmtUpdated = $pdo->prepare("SELECT * FROM departments WHERE id = ?");
        $stmtUpdated->execute([$id]);
        $updated = $stmtUpdated->fetch();

        jsonResponse([
            'status' => 'success',
            'message' => "Department '{$name}' updated successfully.",
            'data' => $updated
        ]);
    } catch (PDOException $e) {
        jsonError('Failed to update department: ' . $e->getMessage(), 500);
    }
} elseif ($method === 'DELETE') {
    try {
        $input = getJsonInput();
        $id = (int)($_GET['id'] ?? $input['id'] ?? 0);

        if ($id <= 0) {
            jsonError('Valid Department ID is required');
        }

        // Check if any equipment is assigned
        $stmtEq = $pdo->prepare("SELECT COUNT(*) FROM equipments WHERE department_id = ?");
        $stmtEq->execute([$id]);
        $eqCount = (int)$stmtEq->fetchColumn();

        if ($eqCount > 0) {
            jsonError("Cannot delete department: {$eqCount} biomedical equipment assets are currently assigned here. Please reassign them first.", 400);
        }

        // Check if any complaints are linked
        $stmtCmp = $pdo->prepare("SELECT COUNT(*) FROM complaints WHERE department_id = ?");
        $stmtCmp->execute([$id]);
        $cmpCount = (int)$stmtCmp->fetchColumn();

        if ($cmpCount > 0) {
            jsonError("Cannot delete department: {$cmpCount} historical complaint ticket(s) are associated with this department.", 400);
        }

        $stmtDel = $pdo->prepare("DELETE FROM departments WHERE id = ?");
        $stmtDel->execute([$id]);

        jsonResponse([
            'status' => 'success',
            'message' => 'Department deleted successfully.'
        ]);
    } catch (PDOException $e) {
        jsonError('Failed to delete department: ' . $e->getMessage(), 500);
    }
} else {
    jsonError('Method not allowed', 405);
}
