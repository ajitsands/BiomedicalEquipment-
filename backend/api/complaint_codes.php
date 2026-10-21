<?php
require_once __DIR__ . '/../config/db.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM complaint_codes ORDER BY code ASC");
        $codes = $stmt->fetchAll();

        jsonResponse([
            'status' => 'success',
            'count' => count($codes),
            'data' => $codes
        ]);
    } catch (PDOException $e) {
        jsonError('Failed to fetch complaint codes: ' . $e->getMessage(), 500);
    }
}
