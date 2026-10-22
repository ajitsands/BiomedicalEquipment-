<?php
// Database Connection & Shared API Utilities
// Biomedical Equipment Maintenance Management System
// Powered and Engineered by SaNDS Lab Middle East W.L.L

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$db_host = '127.0.0.1';
$db_port = '3306';
$db_name = 'biomedical_cmms';
$db_user = 'root';
$db_pass = 'S@nds1@b';

try {
    $pdo = new PDO("mysql:host={$db_host};port={$db_port};dbname={$db_name};charset=utf8mb4", $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Database connection failed: ' . $e->getMessage()
    ]);
    exit();
}

function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit();
}

function jsonError($message, $statusCode = 400) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'status' => 'error',
        'message' => $message
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

function getJsonInput() {
    $raw = file_get_contents('php://input');
    if (empty($raw)) {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function getSystemSettings() {
    global $pdo;
    static $settingsCache = null;
    if ($settingsCache !== null) {
        return $settingsCache;
    }
    $settingsCache = [
        'timezone' => 'Asia/Bahrain',
        'date_format' => 'DD/MM/YYYY',
        'time_format' => '12h'
    ];
    try {
        $stmt = $pdo->query("SELECT setting_key, setting_value FROM system_settings");
        while ($row = $stmt->fetch()) {
            $settingsCache[$row['setting_key']] = $row['setting_value'];
        }
    } catch (Exception $e) {
        // Fallback
    }
    return $settingsCache;
}

function formatSystemDateTime($timestampStr, $withSeconds = true) {
    if (empty($timestampStr)) return 'N/A';
    $settings = getSystemSettings();
    $tzName = !empty($settings['timezone']) ? $settings['timezone'] : 'Asia/Bahrain';
    $dateFormat = !empty($settings['date_format']) ? $settings['date_format'] : 'DD/MM/YYYY';
    $timeFormat = !empty($settings['time_format']) ? $settings['time_format'] : '12h';

    try {
        $dt = new DateTime($timestampStr);
        // If timezone needs to be set
        $targetTz = new DateTimeZone($tzName);
        $dt->setTimezone($targetTz);
    } catch (Exception $e) {
        return $timestampStr;
    }

    $day = $dt->format('d');
    $month = $dt->format('m');
    $monthShort = $dt->format('M');
    $year = $dt->format('Y');

    switch ($dateFormat) {
        case 'DD-MMM-YYYY':
            $datePart = "{$day}-{$monthShort}-{$year}";
            break;
        case 'YYYY-MM-DD':
            $datePart = "{$year}-{$month}-{$day}";
            break;
        case 'MM/DD/YYYY':
            $datePart = "{$month}/{$day}/{$year}";
            break;
        case 'DD.MM.YYYY':
            $datePart = "{$day}.{$month}.{$year}";
            break;
        case 'DD/MM/YYYY':
        default:
            $datePart = "{$day}/{$month}/{$year}";
            break;
    }

    if ($timeFormat === '24h') {
        $timePart = $withSeconds ? $dt->format('H:i:s') : $dt->format('H:i');
    } else {
        $timePart = $withSeconds ? $dt->format('h:i:s A') : $dt->format('h:i A');
    }

    return "{$datePart}, {$timePart}";
}
