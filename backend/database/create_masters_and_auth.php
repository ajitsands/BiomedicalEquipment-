<?php
// Database migration for Masters: Vendors, Contractors, Suppliers, and Employees with Credentials
// Powered by SaNDS Lab Middle East W.L.L

require_once __DIR__ . '/../config/db.php';

echo "=== BioTrack CMMS: Upgrading Masters (Vendors, Contractors, Suppliers & Employees) ===\n\n";

try {
    // 1. Update vendors table with vendor_type, tax_id, is_active
    echo "1. Checking and updating 'vendors' table structure...\n";
    
    // Check if vendor_type exists
    $cols = $pdo->query("SHOW COLUMNS FROM vendors LIKE 'vendor_type'")->fetchAll();
    if (empty($cols)) {
        $pdo->exec("ALTER TABLE vendors ADD COLUMN `vendor_type` ENUM('Vendor / OEM', 'Contractor', 'Supplier', 'Authorized Service Provider') NOT NULL DEFAULT 'Vendor / OEM' AFTER `name`");
        echo "   -> Added column `vendor_type` to `vendors`.\n";
    }

    $cols = $pdo->query("SHOW COLUMNS FROM vendors LIKE 'tax_id'")->fetchAll();
    if (empty($cols)) {
        $pdo->exec("ALTER TABLE vendors ADD COLUMN `tax_id` VARCHAR(80) NULL AFTER `address`");
        echo "   -> Added column `tax_id` to `vendors`.\n";
    }

    $cols = $pdo->query("SHOW COLUMNS FROM vendors LIKE 'is_active'")->fetchAll();
    if (empty($cols)) {
        $pdo->exec("ALTER TABLE vendors ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1 AFTER `rating`");
        echo "   -> Added column `is_active` to `vendors`.\n";
    }

    // Update existing vendors to appropriate types
    $pdo->exec("UPDATE vendors SET vendor_type = 'Vendor / OEM' WHERE vendor_type IS NULL OR vendor_type = ''");

    // Seed comprehensive Vendors, Contractors, and Suppliers if missing
    echo "2. Seeding comprehensive Masters for Contractors & Suppliers...\n";
    $partnerSeeds = [
        // Contractors
        [
            'name' => 'Gulf Biomedical Maintenance Contractors W.L.L',
            'vendor_type' => 'Contractor',
            'vendor_code' => 'CONT-GBMC-01',
            'contact_person' => 'Eng. Fahad Al-Bahrani',
            'phone' => '+973-1722-4488',
            'emergency_hotline' => '+973-3988-1122',
            'email' => 'service@gulfbiomedical.com',
            'address' => 'Building 402, Road 2805, Seef District, Manama, Kingdom of Bahrain',
            'tax_id' => 'BH-CR-984421-2',
            'service_manager' => 'Mansoor Al-Haddad',
            'service_manager_phone' => '+973-3665-2200',
            'website' => 'https://gulfbiomedical.com'
        ],
        [
            'name' => 'MedServe Clinical Calibration & Safety Contractors',
            'vendor_type' => 'Contractor',
            'vendor_code' => 'CONT-MSER-02',
            'contact_person' => 'Dr. Rajesh Nair',
            'phone' => '+973-1788-3355',
            'emergency_hotline' => '+973-3507-8079',
            'email' => 'calibration@medserve-gulf.com',
            'address' => 'Healthcare Tech Park, Block 328, Al Suqayyah, Bahrain',
            'tax_id' => 'BH-CR-554109-1',
            'service_manager' => 'Kareem Yousif',
            'service_manager_phone' => '+973-3944-1188',
            'website' => 'https://medserve-gulf.com'
        ],
        [
            'name' => 'Arabian Healthcare Facilities & Gas Contracting Co.',
            'vendor_type' => 'Contractor',
            'vendor_code' => 'CONT-AHFC-03',
            'contact_person' => 'Eng. Tariq Al-Otaibi',
            'phone' => '+966-11-482-9900',
            'emergency_hotline' => '+966-50-399-2211',
            'email' => 'contracts@arabian-hfc.com',
            'address' => 'King Fahd Road, Al Olaya, Riyadh, Saudi Arabia',
            'tax_id' => 'SA-VAT-300192837400003',
            'service_manager' => 'Sultan Al-Dosari',
            'service_manager_phone' => '+966-55-911-3322',
            'website' => 'https://arabian-hfc.com'
        ],
        // Suppliers
        [
            'name' => 'Al-Amal Medical & Surgical Consumables Supplier',
            'vendor_type' => 'Supplier',
            'vendor_code' => 'SUPP-AMAL-01',
            'contact_person' => 'Zahra Al-Musawi',
            'phone' => '+973-1766-9922',
            'emergency_hotline' => '+973-3882-9944',
            'email' => 'orders@alamal-medical.bh',
            'address' => 'Salmabad Industrial Zone, Warehouse 18, Bahrain',
            'tax_id' => 'BH-CR-112948-4',
            'service_manager' => 'Hussain Mirza',
            'service_manager_phone' => '+973-3321-4455',
            'website' => 'https://alamal-medical.bh'
        ],
        [
            'name' => 'Middle East Bio-Sensors & Spares Supply Ltd',
            'vendor_type' => 'Supplier',
            'vendor_code' => 'SUPP-MEBS-02',
            'contact_person' => 'George Verghese',
            'phone' => '+971-4-329-8800',
            'emergency_hotline' => '+971-50-449-3311',
            'email' => 'spares@me-biosensors.ae',
            'address' => 'Dubai Healthcare City, Building 64, UAE',
            'tax_id' => 'AE-TRN-100293847500003',
            'service_manager' => 'Arun Kumar',
            'service_manager_phone' => '+971-55-882-1144',
            'website' => 'https://me-biosensors.ae'
        ],
        [
            'name' => 'Bahrain Scientific & Laboratory Supply Co.',
            'vendor_type' => 'Supplier',
            'vendor_code' => 'SUPP-BSLS-03',
            'contact_person' => 'Fatima Al-Jowder',
            'phone' => '+973-1744-1100',
            'emergency_hotline' => '+973-3990-2277',
            'email' => 'labsales@bahrainscientific.com',
            'address' => 'Diplomatic Area, Tower 14, Manama, Bahrain',
            'tax_id' => 'BH-CR-882049-7',
            'service_manager' => 'Ali Al-Qassab',
            'service_manager_phone' => '+973-3661-8899',
            'website' => 'https://bahrainscientific.com'
        ]
    ];

    foreach ($partnerSeeds as $p) {
        $check = $pdo->prepare("SELECT id FROM vendors WHERE vendor_code = ? OR name = ?");
        $check->execute([$p['vendor_code'], $p['name']]);
        if (!$check->fetch()) {
            $stmt = $pdo->prepare("INSERT INTO vendors (name, vendor_type, vendor_code, contact_person, phone, emergency_hotline, email, address, tax_id, service_manager, service_manager_phone, website) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $p['name'],
                $p['vendor_type'],
                $p['vendor_code'],
                $p['contact_person'],
                $p['phone'],
                $p['emergency_hotline'],
                $p['email'],
                $p['address'],
                $p['tax_id'],
                $p['service_manager'],
                $p['service_manager_phone'],
                $p['website']
            ]);
            echo "   -> Created {$p['vendor_type']}: {$p['name']}\n";
        }
    }

    // 3. Create employees table
    echo "3. Creating 'employees' table for Staff, Engineers & Credentials...\n";
    $pdo->exec("CREATE TABLE IF NOT EXISTS `employees` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `employee_code` VARCHAR(50) NOT NULL UNIQUE,
        `full_name` VARCHAR(120) NOT NULL,
        `username` VARCHAR(60) NOT NULL UNIQUE,
        `password_hash` VARCHAR(255) NOT NULL,
        `plain_password_hint` VARCHAR(100) DEFAULT 'Hospital@123',
        `role` VARCHAR(80) NOT NULL DEFAULT 'Biomedical Engineer',
        `department_id` INT NULL,
        `designation` VARCHAR(100) NULL,
        `phone` VARCHAR(50) NULL,
        `email` VARCHAR(100) NULL,
        `is_active` TINYINT(1) NOT NULL DEFAULT 1,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "   -> Table `employees` verified.\n";

    // 4. Seed Hospital Employees with secure hashed credentials
    echo "4. Seeding Employees & Technicians...\n";
    $defaultPasswordHash = password_hash('Hospital@123', PASSWORD_BCRYPT);

    // Get ICU and OT department IDs
    $stmtDept = $pdo->query("SELECT id, name FROM departments LIMIT 10");
    $allDepts = $stmtDept->fetchAll(PDO::FETCH_KEY_PAIR); // id => name
    $firstDeptId = array_key_first($allDepts) ?: 1;

    $employeeSeeds = [
        [
            'code' => 'EMP-BME-001',
            'name' => 'Eng. Hassan Al-Majed',
            'username' => 'hassan.bme',
            'role' => 'Biomedical Engineer',
            'designation' => 'Lead Clinical Engineer',
            'phone' => '+973-3507-8079',
            'email' => 'hassan.almajed@sandslab.com'
        ],
        [
            'code' => 'EMP-BME-002',
            'name' => 'Eng. Reem Al-Kooheji',
            'username' => 'reem.bme',
            'role' => 'Senior Clinical Engineer',
            'designation' => 'Critical Care Technology Lead',
            'phone' => '+973-3988-4411',
            'email' => 'reem.kooheji@sandslab.com'
        ],
        [
            'code' => 'EMP-TEC-001',
            'name' => 'Tariq Mansoor',
            'username' => 'tariq.tech',
            'role' => 'Biomedical Technician',
            'designation' => 'Preventive Maintenance Specialist',
            'phone' => '+973-3344-9900',
            'email' => 'tariq.mansoor@sandslab.com'
        ],
        [
            'code' => 'EMP-NUR-101',
            'name' => 'Staff Nurse Layla Al-Ghatam',
            'username' => 'layla.nurse',
            'role' => 'Staff Nurse In-Charge',
            'designation' => 'Intensive Care Unit (ICU) Shift Lead',
            'phone' => '+973-3881-2299',
            'email' => 'layla.nurse@hospital.bh'
        ],
        [
            'code' => 'EMP-DOC-003',
            'name' => 'Dr. Sarah Al-Sayed',
            'username' => 'sarah.doc',
            'role' => 'Head of Department / ICU Lead',
            'designation' => 'Consultant Critical Care Physician',
            'phone' => '+973-3944-5566',
            'email' => 'dr.sarah@hospital.bh'
        ],
        [
            'code' => 'EMP-ADM-001',
            'name' => 'Eng. Ajit Kumar (SaNDS Lab)',
            'username' => 'admin',
            'role' => 'Biomedical Director / Administrator',
            'designation' => 'Director of Healthcare Engineering',
            'phone' => '+973-3507-8079',
            'email' => 'admin@sandslab.com'
        ]
    ];

    foreach ($employeeSeeds as $emp) {
        $check = $pdo->prepare("SELECT id FROM employees WHERE username = ? OR employee_code = ?");
        $check->execute([$emp['username'], $emp['code']]);
        if (!$check->fetch()) {
            $stmt = $pdo->prepare("INSERT INTO employees (employee_code, full_name, username, password_hash, plain_password_hint, role, department_id, designation, phone, email, is_active) VALUES (?, ?, ?, ?, 'Hospital@123', ?, ?, ?, ?, ?, 1)");
            $stmt->execute([
                $emp['code'],
                $emp['name'],
                $emp['username'],
                $defaultPasswordHash,
                $emp['role'],
                $firstDeptId,
                $emp['designation'],
                $emp['phone'],
                $emp['email']
            ]);
            echo "   -> Created Employee: {$emp['name']} (username: {$emp['username']})\n";
        }
    }

    // 5. Update complaints table to support employee logging & vendor service completion attachments
    echo "5. Updating 'complaints' table for Employee Booking & Vendor Service Completion...\n";
    
    $cols = $pdo->query("SHOW COLUMNS FROM complaints LIKE 'booked_by_employee_id'")->fetchAll();
    if (empty($cols)) {
        $pdo->exec("ALTER TABLE complaints ADD COLUMN `booked_by_employee_id` INT NULL AFTER `booked_by_name`");
        echo "   -> Added `booked_by_employee_id` to `complaints`.\n";
    }

    $cols = $pdo->query("SHOW COLUMNS FROM complaints LIKE 'serviced_by_type'")->fetchAll();
    if (empty($cols)) {
        $pdo->exec("ALTER TABLE complaints ADD COLUMN `serviced_by_type` ENUM('Internal Biomedical Team', 'External Contractor', 'OEM Vendor', 'Warranty Service Provider') NOT NULL DEFAULT 'Internal Biomedical Team' AFTER `assigned_engineer`");
        echo "   -> Added `serviced_by_type` to `complaints`.\n";
    }

    $cols = $pdo->query("SHOW COLUMNS FROM complaints LIKE 'serviced_by_vendor_id'")->fetchAll();
    if (empty($cols)) {
        $pdo->exec("ALTER TABLE complaints ADD COLUMN `serviced_by_vendor_id` INT NULL AFTER `serviced_by_type`");
        echo "   -> Added `serviced_by_vendor_id` to `complaints`.\n";
    }

    $cols = $pdo->query("SHOW COLUMNS FROM complaints LIKE 'service_attachment_url'")->fetchAll();
    if (empty($cols)) {
        $pdo->exec("ALTER TABLE complaints ADD COLUMN `service_attachment_url` VARCHAR(255) NULL AFTER `replaced_parts`");
        echo "   -> Added `service_attachment_url` to `complaints`.\n";
    }

    $cols = $pdo->query("SHOW COLUMNS FROM complaints LIKE 'service_attachment_name'")->fetchAll();
    if (empty($cols)) {
        $pdo->exec("ALTER TABLE complaints ADD COLUMN `service_attachment_name` VARCHAR(255) NULL AFTER `service_attachment_url`");
        echo "   -> Added `service_attachment_name` to `complaints`.\n";
    }

    echo "\n=== Migration Completed Successfully! ===\n";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
