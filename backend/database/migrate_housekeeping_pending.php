<?php
require_once __DIR__ . '/../config/db.php';

try {
    // 1. Alter status column in housekeeping_inspection_results to support 'Pending' as default
    $pdo->exec("ALTER TABLE `housekeeping_inspection_results` 
                MODIFY COLUMN `status` ENUM('Pending', 'Pass', 'Fail', 'N/A') NOT NULL DEFAULT 'Pending'");
    echo "1. Updated housekeeping_inspection_results status enum to default 'Pending'.\n";

    // 2. Add completed_at column if not exists
    $cols = $pdo->query("SHOW COLUMNS FROM `housekeeping_inspection_results` LIKE 'completed_at'")->fetchAll();
    if (empty($cols)) {
        $pdo->exec("ALTER TABLE `housekeeping_inspection_results` ADD COLUMN `completed_at` VARCHAR(60) NULL AFTER `photo_evidence`");
        echo "2. Added completed_at column.\n";
    }

    // 3. Update any in-progress audits (like HKA-2026-0005) whose results were previously auto-marked Pass to 'Pending'
    $pdo->exec("UPDATE housekeeping_inspection_results r
                JOIN housekeeping_inspections i ON r.inspection_id = i.id
                SET r.status = 'Pending'
                WHERE i.status = 'In Progress' AND (r.notes IS NULL OR r.notes = '')");
    echo "3. Reset unverified results in 'In Progress' audits to 'Pending'.\n";

    echo "SUCCESS: Migration completed successfully.\n";
} catch (PDOException $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
