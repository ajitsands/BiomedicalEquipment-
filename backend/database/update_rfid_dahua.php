<?php
// Migration: Enhance RFID schema for Dahua DHI-ASI1201M-MEP & IN/OUT Directional Telemetry
// Biomedical Equipment Maintenance Management System
// Powered and Engineered by SaNDS Lab Middle East W.L.L

require_once __DIR__ . '/../config/db.php';

echo "=== Starting Dahua RFID Migration ===\n";

try {
    // 1. Add transit columns to equipments if not exists
    $cols = array_column($pdo->query("DESCRIBE equipments")->fetchAll(PDO::FETCH_ASSOC), 'Field');

    if (!in_array('transit_status', $cols)) {
        $pdo->exec("ALTER TABLE `equipments` ADD COLUMN `transit_status` VARCHAR(20) NOT NULL DEFAULT 'IN' AFTER `rfid_reader_node`");
        echo "[+] Added `transit_status` to equipments table.\n";
    }

    if (!in_array('rfid_card_alias', $cols)) {
        $pdo->exec("ALTER TABLE `equipments` ADD COLUMN `rfid_card_alias` VARCHAR(100) NULL AFTER `rfid_tag_id`");
        echo "[+] Added `rfid_card_alias` to equipments table.\n";
    }

    if (!in_array('rfid_card_hex', $cols)) {
        $pdo->exec("ALTER TABLE `equipments` ADD COLUMN `rfid_card_hex` VARCHAR(50) NULL AFTER `rfid_card_alias`");
        echo "[+] Added `rfid_card_hex` to equipments table.\n";
    }

    // 2. Add directional and reader details to rfid_scan_logs if not exists
    $logCols = array_column($pdo->query("DESCRIBE rfid_scan_logs")->fetchAll(PDO::FETCH_ASSOC), 'Field');

    if (!in_array('movement_direction', $logCols)) {
        $pdo->exec("ALTER TABLE `rfid_scan_logs` ADD COLUMN `movement_direction` VARCHAR(10) NOT NULL DEFAULT 'IN' AFTER `rfid_tag_id`");
        echo "[+] Added `movement_direction` to rfid_scan_logs table.\n";
    }

    if (!in_array('reader_ip', $logCols)) {
        $pdo->exec("ALTER TABLE `rfid_scan_logs` ADD COLUMN `reader_ip` VARCHAR(45) NULL AFTER `reader_id`");
        echo "[+] Added `reader_ip` to rfid_scan_logs table.\n";
    }

    if (!in_array('raw_card_number', $logCols)) {
        $pdo->exec("ALTER TABLE `rfid_scan_logs` ADD COLUMN `raw_card_number` VARCHAR(100) NULL AFTER `rfid_tag_id`");
        echo "[+] Added `raw_card_number` to rfid_scan_logs table.\n";
    }

    // 3. Map BME-OT-ANES-008 to the Dahua RFID card
    // User requested:
    // RFID Number: BMEOTANES008
    // Actual Hex Number: 6F4244DB (Decimal: 1866613979)
    // Equipment: BME-OT-ANES-008, Anesthesia Workstation OT-2
    $stmt = $pdo->prepare("UPDATE equipments SET 
        rfid_tag_id = '6F4244DB',
        rfid_card_alias = 'BMEOTANES008',
        rfid_card_hex = '6F4244DB',
        transit_status = 'IN',
        department_id = 2,
        building = 'Surgical Pavilion B',
        floor = '2nd Floor',
        room_number = 'OT Suite 2',
        rfid_reader_node = 'DHI-ASI1201M-MEP (192.168.8.108)'
        WHERE asset_id = 'BME-OT-ANES-008'");
    $stmt->execute();
    echo "[+] Configured BME-OT-ANES-008 with RFID Tag: 6F4244DB / BMEOTANES008 in OT Suite 2 (IN).\n";

    echo "=== Migration Completed Successfully ===\n";
} catch (Exception $e) {
    echo "[-] Migration Failed: " . $e->getMessage() . "\n";
    exit(1);
}
