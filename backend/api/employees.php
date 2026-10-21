<?php
require_once __DIR__ . '/../config/db.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    try {
        $action = $_GET['action'] ?? '';

        // Authentication endpoint
        if ($action === 'login') {
            $username = trim($_GET['username'] ?? '');
            $password = $_GET['password'] ?? '';

            if (empty($username) || empty($password)) {
                jsonError('Username and password are required', 400);
            }

            $stmt = $pdo->prepare("SELECT e.*, d.name as department_name FROM employees e LEFT JOIN departments d ON e.department_id = d.id WHERE e.username = ? AND e.is_active = 1");
            $stmt->execute([$username]);
            $user = $stmt->fetch();

            if (!$user || !password_verify($password, $user['password_hash'])) {
                jsonError('Invalid username or password', 401);
            }

            // Exclude password hash from response
            unset($user['password_hash']);

            jsonResponse([
                'status' => 'success',
                'message' => 'Authentication successful',
                'employee' => $user
            ]);
        }

        // Standard GET list of employees
        $where = [];
        $params = [];

        if (!empty($_GET['role'])) {
            $where[] = "e.role = ?";
            $params[] = trim($_GET['role']);
        }

        if (!empty($_GET['department_id'])) {
            $where[] = "e.department_id = ?";
            $params[] = (int)$_GET['department_id'];
        }

        if (isset($_GET['is_active'])) {
            $where[] = "e.is_active = ?";
            $params[] = (int)$_GET['is_active'];
        }

        $sql = "SELECT 
            e.id,
            e.employee_code,
            e.full_name,
            e.username,
            e.role,
            e.department_id,
            e.designation,
            e.phone,
            e.email,
            e.plain_password_hint,
            e.is_active,
            e.created_at,
            e.updated_at,
            d.name as department_name,
            d.code as department_code,
            d.floor as department_floor,
            d.building as department_building,
            (SELECT COUNT(*) FROM complaints c WHERE c.booked_by_employee_id = e.id) as total_booked_complaints
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id";

        if (!empty($where)) {
            $sql .= " WHERE " . implode(" AND ", $where);
        }

        $sql .= " ORDER BY e.full_name ASC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $employees = $stmt->fetchAll();

        jsonResponse([
            'status' => 'success',
            'count' => count($employees),
            'data' => $employees
        ]);
    } catch (PDOException $e) {
        jsonError('Failed to fetch employees: ' . $e->getMessage(), 500);
    }
} elseif ($method === 'POST') {
    try {
        $input = getJsonInput();

        if (empty($input['full_name']) || empty($input['username']) || empty($input['password'])) {
            jsonError('Full Name, Username, and Password are required');
        }

        $username = trim(strtolower($input['username']));
        $password = $input['password'];

        // Verify username uniqueness
        $checkUser = $pdo->prepare("SELECT id FROM employees WHERE username = ?");
        $checkUser->execute([$username]);
        if ($checkUser->fetch()) {
            jsonError('Username already exists. Please choose a different username.');
        }

        // Auto-generate employee code if missing
        $rolePrefix = 'EMP';
        if (!empty($input['role'])) {
            if (stripos($input['role'], 'Biomedical') !== false || stripos($input['role'], 'Engineer') !== false) {
                $rolePrefix = 'BME';
            } elseif (stripos($input['role'], 'Nurse') !== false) {
                $rolePrefix = 'NUR';
            } elseif (stripos($input['role'], 'Tech') !== false) {
                $rolePrefix = 'TEC';
            } elseif (stripos($input['role'], 'Doctor') !== false || stripos($input['role'], 'Physician') !== false) {
                $rolePrefix = 'DOC';
            }
        }

        $empCode = !empty($input['employee_code']) ? trim($input['employee_code']) : 'EMP-' . $rolePrefix . '-' . str_pad(rand(10, 999), 3, '0', STR_PAD_LEFT);

        $checkCode = $pdo->prepare("SELECT id FROM employees WHERE employee_code = ?");
        $checkCode->execute([$empCode]);
        if ($checkCode->fetch()) {
            $empCode = $empCode . '-' . rand(10, 99);
        }

        $passwordHash = password_hash($password, PASSWORD_BCRYPT);
        $plainHint = $password; // Displayed to administrators for hospital credential onboarding

        $stmt = $pdo->prepare("INSERT INTO employees (
            employee_code, full_name, username, password_hash, plain_password_hint,
            role, department_id, designation, phone, email, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)");

        $stmt->execute([
            $empCode,
            trim($input['full_name']),
            $username,
            $passwordHash,
            $plainHint,
            $input['role'] ?? 'Biomedical Engineer',
            !empty($input['department_id']) ? (int)$input['department_id'] : null,
            $input['designation'] ?? ($input['role'] ?? 'Hospital Staff'),
            $input['phone'] ?? '',
            $input['email'] ?? ''
        ]);

        $newId = $pdo->lastInsertId();

        jsonResponse([
            'status' => 'success',
            'message' => 'Employee created successfully with secure credentials',
            'id' => $newId,
            'employee_code' => $empCode
        ], 201);
    } catch (PDOException $e) {
        jsonError('Failed to create employee: ' . $e->getMessage(), 500);
    }
} elseif ($method === 'PUT') {
    try {
        $input = getJsonInput();
        if (empty($input['id'])) {
            jsonError('Employee ID is required');
        }

        $id = (int)$input['id'];

        $fields = [
            'full_name', 'employee_code', 'role', 'department_id',
            'designation', 'phone', 'email', 'is_active'
        ];

        $updates = [];
        $params = [];

        foreach ($fields as $field) {
            if (isset($input[$field])) {
                $updates[] = "{$field} = ?";
                $params[] = $input[$field];
            }
        }

        // If password is being reset
        if (!empty($input['password'])) {
            $updates[] = "password_hash = ?";
            $params[] = password_hash($input['password'], PASSWORD_BCRYPT);
            $updates[] = "plain_password_hint = ?";
            $params[] = $input['password'];
        }

        if (empty($updates)) {
            jsonError('No fields to update');
        }

        $params[] = $id;

        $sql = "UPDATE employees SET " . implode(", ", $updates) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        jsonResponse([
            'status' => 'success',
            'message' => 'Employee details updated successfully',
            'id' => $id
        ]);
    } catch (PDOException $e) {
        jsonError('Failed to update employee: ' . $e->getMessage(), 500);
    }
} elseif ($method === 'DELETE') {
    try {
        $id = !empty($_GET['id']) ? (int)$_GET['id'] : 0;
        if (!$id) {
            jsonError('Employee ID is required');
        }

        // Soft delete / deactivate
        $stmt = $pdo->prepare("UPDATE employees SET is_active = 0 WHERE id = ?");
        $stmt->execute([$id]);

        jsonResponse([
            'status' => 'success',
            'message' => 'Employee deactivated successfully'
        ]);
    } catch (PDOException $e) {
        jsonError('Failed to deactivate employee: ' . $e->getMessage(), 500);
    }
}
