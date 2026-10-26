<?php
require_once __DIR__ . '/../config/db.php';

echo "Creating table pm_phase_assignments...\n";

$sql = "CREATE TABLE IF NOT EXISTS `pm_phase_assignments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `equipment_id` INT NOT NULL,
    `pm_due_date` DATE NOT NULL,
    `phase_key` VARCHAR(50) NOT NULL, -- 'PRE_USE', 'PM_TECH', 'ELECTRICAL', 'CORRECTIVE'
    `phase_name` VARCHAR(100) NOT NULL,
    `assigned_employee_id` INT NULL,
    `assigned_employee_name` VARCHAR(120) NULL,
    `assigned_employee_badge` VARCHAR(50) NULL,
    `status` ENUM('Pending', 'In Progress', 'Completed') NOT NULL DEFAULT 'Pending',
    `completed_at` DATETIME NULL,
    `completed_by` VARCHAR(120) NULL,
    `technician_badge` VARCHAR(50) NULL,
    `signature_data` TEXT NULL,
    `paper_scanned_photo_url` VARCHAR(255) NULL,
    `engineer_notes` TEXT NULL,
    `items_data` LONGTEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `unique_eq_date_phase` (`equipment_id`, `pm_due_date`, `phase_key`),
    INDEX `idx_assigned_emp` (`assigned_employee_id`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

$pdo->exec($sql);
echo "Table pm_phase_assignments created successfully!\n";
