<?php
// Migration script: Create system_settings table and seed regional defaults
require_once __DIR__ . '/../config/db.php';

try {
    $sql = "CREATE TABLE IF NOT EXISTS `system_settings` (
        `setting_key` VARCHAR(50) NOT NULL PRIMARY KEY,
        `setting_value` TEXT NOT NULL,
        `category` VARCHAR(50) DEFAULT 'general',
        `description` VARCHAR(255) DEFAULT '',
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    
    $pdo->exec($sql);
    echo "[+] Table `system_settings` created or already exists.\n";

    // Default settings for Gulf & India region (defaulting to Bahrain / GCC standard)
    $defaults = [
        'region_preset' => ['value' => 'bahrain', 'cat' => 'regional', 'desc' => 'Selected Country / Regional preset'],
        'timezone' => ['value' => 'Asia/Bahrain', 'cat' => 'regional', 'desc' => 'Active IANA TimeZone identifier'],
        'date_format' => ['value' => 'DD/MM/YYYY', 'cat' => 'regional', 'desc' => 'Display Date format (e.g. DD/MM/YYYY)'],
        'time_format' => ['value' => '12h', 'cat' => 'regional', 'desc' => 'Display Time format (12h or 24h)'],
        'currency' => ['value' => 'BHD', 'cat' => 'financial', 'desc' => 'ISO Currency Code (BHD, SAR, AED, KWD, QAR, OMR, INR, USD)'],
        'currency_symbol' => ['value' => 'BD', 'cat' => 'financial', 'desc' => 'Currency Symbol or localized abbreviation'],
        'currency_position' => ['value' => 'prefix', 'cat' => 'financial', 'desc' => 'Position of currency symbol (prefix or suffix)'],
        'currency_decimals' => ['value' => '3', 'cat' => 'financial', 'desc' => 'Number of decimal places for currency amounts'],
        'number_grouping' => ['value' => 'standard', 'cat' => 'regional', 'desc' => 'Number grouping system (standard thousands or lakh/crore for INR)']
    ];

    $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM `system_settings` WHERE `setting_key` = ?");
    $insertStmt = $pdo->prepare("INSERT INTO `system_settings` (`setting_key`, `setting_value`, `category`, `description`) VALUES (?, ?, ?, ?)");

    foreach ($defaults as $key => $item) {
        $checkStmt->execute([$key]);
        if ($checkStmt->fetchColumn() == 0) {
            $insertStmt->execute([$key, $item['value'], $item['cat'], $item['desc']]);
            echo "  [+] Seeded setting: {$key} = {$item['value']}\n";
        } else {
            echo "  [*] Setting already exists: {$key}\n";
        }
    }

    echo "[+] Settings database migration completed successfully!\n";
} catch (PDOException $e) {
    echo "[-] Error creating system_settings: " . $e->getMessage() . "\n";
    exit(1);
}
