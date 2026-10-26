<?php
// Migration: Create pm_checklist_drafts table
require_once __DIR__ . '/../config/db.php';

try {
    $sql = "CREATE TABLE IF NOT EXISTS `pm_checklist_drafts` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `equipment_id` INT NOT NULL UNIQUE,
        `template_id` INT NULL,
        `technician_name` VARCHAR(150) NULL,
        `technician_badge` VARCHAR(50) NULL,
        `inspection_date` DATE NULL,
        `time_spent_minutes` INT DEFAULT 0,
        `test_equipment_used` VARCHAR(255) NULL,
        `engineer_notes` TEXT NULL,
        `parts_replaced` TEXT NULL,
        `total_items` INT DEFAULT 0,
        `completed_count` INT DEFAULT 0,
        `progress_percent` INT DEFAULT 0,
        `answers_json` LONGTEXT NULL,
        `status` ENUM('in_progress', 'completed') NOT NULL DEFAULT 'in_progress',
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (`equipment_id`) REFERENCES `equipments`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

    $pdo->exec($sql);
    echo "SUCCESS: pm_checklist_drafts table is ready.\n";
} catch (PDOException $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
