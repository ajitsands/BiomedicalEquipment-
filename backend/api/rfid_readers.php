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
            d.name as department_name, d.code as department_code
        FROM rfid_readers r
        LEFT JOIN departments d ON r.department_id = d.id
        WHERE r.is_active = 1
        ORDER BY r.id ASC");
        
        $readers = $stmt->fetchAll();

        // Enhance for Select2 dropdown
        foreach ($readers as &$r) {
            $r['value'] = $r['name']; // Value mapped to equipment.rfid_reader_node
            $r['label'] = $r['name'];
            $r['subLabel'] = "{$r['door_zone']} • IP: {$r['ip_address']} ({$r['reader_type']})";
        }
        unset($r);

        jsonResponse([
            'status' => 'success',
            'data' => $readers
        ]);
    } catch (PDOException $e) {
        jsonError("Failed to fetch readers: " . $e->getMessage(), 500);
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
