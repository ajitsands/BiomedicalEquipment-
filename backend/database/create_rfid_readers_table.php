<?php
// Migration: Create `rfid_readers` Table for Access Control & UHF Gateways
// Biomedical Equipment Maintenance Management System
// Powered and Engineered by SaNDS Lab Middle East W.L.L

require_once __DIR__ . '/../config/db.php';

echo "=== Creating rfid_readers Table ===\n";

try {
    $sql = "CREATE TABLE IF NOT EXISTS `rfid_readers` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `reader_code` VARCHAR(50) NOT NULL UNIQUE,
        `name` VARCHAR(150) NOT NULL,
        `device_model` VARCHAR(100) DEFAULT 'DHI-ASI1201M-MEP',
        `ip_address` VARCHAR(45) NOT NULL,
        `port` INT DEFAULT 80,
        `reader_type` VARCHAR(50) DEFAULT 'Dahua Access Control',
        `department_id` INT NULL,
        `door_zone` VARCHAR(120) NOT NULL,
        `building` VARCHAR(100) DEFAULT 'Surgical Pavilion B',
        `floor` VARCHAR(50) DEFAULT '2nd Floor',
        `is_active` TINYINT(1) DEFAULT 1,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ip (`ip_address`),
        INDEX idx_code (`reader_code`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

    $pdo->exec($sql);
    echo "[+] Table `rfid_readers` ready.\n";

    // Seed default readers if empty
    $count = $pdo->query("SELECT COUNT(*) FROM `rfid_readers`")->fetchColumn();
    if ($count == 0) {
        $insert = $pdo->prepare("INSERT INTO `rfid_readers` 
            (`reader_code`, `name`, `device_model`, `ip_address`, `port`, `reader_type`, `department_id`, `door_zone`, `building`, `floor`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

        $defaultReaders = [
            ['DAHUA-OT-GATE-108', 'DHI-ASI1201M-MEP (192.168.8.108)', 'Dahua DHI-ASI1201M-MEP', '192.168.8.108', 80, 'Dahua Access Control', 2, 'OT Complex Main Door Gate', 'Surgical Pavilion B', '2nd Floor'],
            ['UHF-OT-HUB-02', 'READER-OT-HUB-02 (OT Complex)', 'Alien ALR-F800 UHF', '192.168.8.110', 8080, 'UHF RFID Gateway', 2, 'OT Suite Corridor 2 & 3', 'Surgical Pavilion B', '2nd Floor'],
            ['UHF-ICU-NODE-3A', 'READER-ICU-NODE-3A (Tower A)', 'Impinj Speedway R420', '192.168.8.112', 8080, 'UHF RFID Gateway', 1, 'ICU Ward Entrance Gate', 'Critical Care Tower A', '3rd Floor'],
            ['UHF-ER-GATEWAY-1', 'READER-ER-GATEWAY-1 (Ground Floor)', 'Zebra FX9600 Enterprise', '192.168.8.115', 5084, 'UHF RFID Gateway', 4, 'Trauma Resuscitation Bay Door', 'Main Hospital Block', 'Ground Floor']
        ];

        foreach ($defaultReaders as $r) {
            $insert->execute($r);
            echo "  [+] Seeded Reader: {$r[1]}\n";
        }
    }

    echo "=== rfid_readers Setup Complete ===\n";
} catch (Exception $e) {
    echo "[-] Error creating rfid_readers: " . $e->getMessage() . "\n";
    exit(1);
}
