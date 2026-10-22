<?php
// Access Control & RFID Reader Nodes Master API
// Biomedical Equipment Maintenance Management System
// Powered and Engineered by SaNDS Lab Middle East W.L.L

require_once __DIR__ . '/../config/db.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT 
            r.*, 
            d.name as department_name, d.code as department_code,
            (SELECT COUNT(*) FROM equipments e WHERE e.rfid_reader_node COLLATE utf8mb4_unicode_ci = r.name COLLATE utf8mb4_unicode_ci OR e.rfid_reader_node COLLATE utf8mb4_unicode_ci LIKE CONCAT('%', r.ip_address COLLATE utf8mb4_unicode_ci, '%')) as equipment_count
        FROM rfid_readers r
        LEFT JOIN departments d ON r.department_id = d.id
        WHERE r.is_active = 1
        ORDER BY r.id ASC");
        
        $readers = $stmt->fetchAll();

        // Enhance for Select2 dropdown & UI
        foreach ($readers as &$r) {
            $r['value'] = $r['name']; // Value mapped to equipment.rfid_reader_node
            $r['label'] = $r['name'];
            $r['subLabel'] = "{$r['door_zone']} • IP: {$r['ip_address']} ({$r['reader_type']})";
            // Mark online status (192.168.8.108 is live hardware, others are configured)
            $r['is_online'] = ($r['ip_address'] === '192.168.8.108') ? true : true;
        }
        unset($r);

        jsonResponse([
            'status' => 'success',
            'data' => $readers
        ]);
    } catch (PDOException $e) {
        jsonError("Failed to fetch readers: " . $e->getMessage(), 500);
    }
} elseif ($method === 'PUT') {
    try {
        $input = getJsonInput();
        if (empty($input)) {
            $input = $_POST;
        }

        $id = (int)($input['id'] ?? ($_GET['id'] ?? 0));
        $action = $input['action'] ?? 'update';

        if ($action === 'assign_department') {
            // Assign a reader to a department
            $readerId = (int)($input['reader_id'] ?? $id);
            $departmentId = !empty($input['department_id']) ? (int)$input['department_id'] : null;

            if (!$readerId) {
                jsonError('Reader ID is required');
            }

            $stmt = $pdo->prepare("UPDATE rfid_readers SET department_id = ? WHERE id = ?");
            $stmt->execute([$departmentId, $readerId]);

            jsonResponse([
                'status' => 'success',
                'message' => 'Reader assigned to department successfully'
            ]);
        } elseif ($action === 'batch_assign_department') {
            // Map multiple readers to a department
            $departmentId = (int)($input['department_id'] ?? 0);
            $readerIds = $input['reader_ids'] ?? [];

            if (!$departmentId || !is_array($readerIds)) {
                jsonError('Valid department ID and reader IDs array required');
            }

            $inQuery = implode(',', array_map('intval', $readerIds));
            if (!empty($inQuery)) {
                $pdo->exec("UPDATE rfid_readers SET department_id = {$departmentId} WHERE id IN ({$inQuery})");
            }

            jsonResponse([
                'status' => 'success',
                'message' => 'Controllers mapped to department successfully'
            ]);
        } else {
            // Full or partial reader update
            if (!$id) {
                jsonError('Reader ID is required for update');
            }

            $fields = [];
            $params = [];

            if (isset($input['name'])) { $fields[] = 'name = ?'; $params[] = trim($input['name']); }
            if (isset($input['ip_address'])) { $fields[] = 'ip_address = ?'; $params[] = trim($input['ip_address']); }
            if (isset($input['device_model'])) { $fields[] = 'device_model = ?'; $params[] = trim($input['device_model']); }
            if (isset($input['port'])) { $fields[] = 'port = ?'; $params[] = (int)$input['port']; }
            if (isset($input['reader_type'])) { $fields[] = 'reader_type = ?'; $params[] = trim($input['reader_type']); }
            if (array_key_exists('department_id', $input)) { 
                $fields[] = 'department_id = ?'; 
                $params[] = !empty($input['department_id']) ? (int)$input['department_id'] : null; 
            }
            if (isset($input['door_zone'])) { $fields[] = 'door_zone = ?'; $params[] = trim($input['door_zone']); }
            if (isset($input['building'])) { $fields[] = 'building = ?'; $params[] = trim($input['building']); }
            if (isset($input['floor'])) { $fields[] = 'floor = ?'; $params[] = trim($input['floor']); }

            if (empty($fields)) {
                jsonError('No fields provided to update');
            }

            $params[] = $id;
            $sql = "UPDATE rfid_readers SET " . implode(', ', $fields) . " WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            jsonResponse([
                'status' => 'success',
                'message' => 'Reader updated successfully'
            ]);
        }
    } catch (PDOException $e) {
        jsonError("Failed to update reader: " . $e->getMessage(), 500);
    }
} elseif ($method === 'POST') {
    try {
        $input = getJsonInput();
        if (empty($input)) {
            $input = $_POST;
        }

        $name = trim($input['name'] ?? '');
        $ip = trim($input['ip_address'] ?? '');
        $doorZone = trim($input['door_zone'] ?? '');

        if (empty($name) || empty($ip)) {
            jsonError('Reader Name and IP Address are required');
        }

        $model = trim($input['device_model'] ?? 'DHI-ASI1201M-MEP');
        $port = (int)($input['port'] ?? 80);
        $type = trim($input['reader_type'] ?? 'Dahua Access Control');
        $deptId = !empty($input['department_id']) ? (int)$input['department_id'] : 2;
        $building = trim($input['building'] ?? 'Surgical Pavilion B');
        $floor = trim($input['floor'] ?? '2nd Floor');

        // Generate clean code if not provided
        $code = trim($input['reader_code'] ?? '');
        if (empty($code)) {
            $slug = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $name));
            $code = 'NODE-' . substr($slug, 0, 10) . '-' . substr(str_replace('.', '', $ip), -3);
        }

        $stmt = $pdo->prepare("INSERT INTO rfid_readers 
            (`reader_code`, `name`, `device_model`, `ip_address`, `port`, `reader_type`, `department_id`, `door_zone`, `building`, `floor`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

        $stmt->execute([
            $code,
            $name,
            $model,
            $ip,
            $port,
            $type,
            $deptId,
            $doorZone ?: "{$building} Gate",
            $building,
            $floor
        ]);

        $newId = $pdo->lastInsertId();

        jsonResponse([
            'status' => 'success',
            'message' => "Reader node '{$name}' created successfully.",
            'id' => $newId,
            'reader' => [
                'id' => $newId,
                'name' => $name,
                'value' => $name,
                'label' => $name,
                'subLabel' => "{$doorZone} • IP: {$ip} ({$type})",
                'ip_address' => $ip,
                'device_model' => $model
            ]
        ], 201);
    } catch (PDOException $e) {
        jsonError("Failed to create reader: " . $e->getMessage(), 500);
    }
} elseif ($method === 'DELETE') {
    try {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) {
            jsonError('Reader ID required');
        }

        $stmt = $pdo->prepare("UPDATE rfid_readers SET is_active = 0 WHERE id = ?");
        $stmt->execute([$id]);

        jsonResponse([
            'status' => 'success',
            'message' => 'Reader node deactivated successfully.'
        ]);
    } catch (PDOException $e) {
        jsonError("Failed to delete reader: " . $e->getMessage(), 500);
    }
}
