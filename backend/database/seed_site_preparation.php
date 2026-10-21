<?php
// Database Migration & Seeding for BioTrack CMMS Version 2.0
// GCC Biomedical Equipment Site Preparation — Master Checklist and Complaint Catalogue
// Saudi Arabia (MOH/SFDA), Bahrain (NHRA), UAE (MOHAP/DHA), Qatar (MOPH), Oman (MOH), Kuwait (MOH), India (AERB/NABH)
require_once __DIR__ . '/../config/db.php';

try {
    echo "[*] Initializing Version 2.0 Site Preparation Database Migration...\n";

    // 1. Table: site_checklist_categories (18 Master Categories SP-01 to SP-18)
    $pdo->exec("CREATE TABLE IF NOT EXISTS `site_checklist_categories` (
        `code` VARCHAR(20) PRIMARY KEY,
        `name` VARCHAR(150) NOT NULL,
        `responsible_department` VARCHAR(100) NOT NULL,
        `icon` VARCHAR(50) DEFAULT 'FolderCheck',
        `sort_order` INT NOT NULL DEFAULT 1,
        `description` TEXT,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // 2. Table: site_compliance_profiles (Country-wise regulatory frameworks)
    $pdo->exec("CREATE TABLE IF NOT EXISTS `site_compliance_profiles` (
        `country_code` VARCHAR(10) PRIMARY KEY,
        `country_name` VARCHAR(100) NOT NULL,
        `flag` VARCHAR(10) NOT NULL,
        `regulatory_authority` VARCHAR(200) NOT NULL,
        `primary_standard_doc` VARCHAR(255) NOT NULL,
        `guidelines_url` VARCHAR(255),
        `key_mandates` TEXT NOT NULL,
        `commissioning_authority` VARCHAR(150) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // 3. Table: site_checklist_master (130 Master Inspection Questions & Complaints SP001 to SP130)
    $pdo->exec("CREATE TABLE IF NOT EXISTS `site_checklist_master` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `item_code` VARCHAR(20) NOT NULL UNIQUE,
        `category_code` VARCHAR(20) NOT NULL,
        `deficiency_title` VARCHAR(255) NOT NULL,
        `inspection_question` TEXT NOT NULL,
        `responsible_department` VARCHAR(100) NOT NULL,
        `default_priority` ENUM('Critical', 'High', 'Medium', 'Low') NOT NULL DEFAULT 'High',
        `specialist_department` VARCHAR(100) DEFAULT 'General / All',
        `standard_tolerance` VARCHAR(255) DEFAULT '',
        `evidence_required` VARCHAR(255) DEFAULT 'Visual / Test report verification',
        `country_applicability` VARCHAR(255) DEFAULT 'ALL_GCC_INDIA',
        `sort_order` INT NOT NULL DEFAULT 1,
        FOREIGN KEY (`category_code`) REFERENCES `site_checklist_categories`(`code`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // 4. Table: site_inspections (Actual room site readiness audits)
    $pdo->exec("CREATE TABLE IF NOT EXISTS `site_inspections` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `audit_number` VARCHAR(50) NOT NULL UNIQUE,
        `country_code` VARCHAR(10) NOT NULL DEFAULT 'BH',
        `facility_name` VARCHAR(150) NOT NULL,
        `department_id` INT NOT NULL,
        `room_number` VARCHAR(80) NOT NULL,
        `building` VARCHAR(100) NOT NULL,
        `floor` VARCHAR(50) NOT NULL,
        `equipment_type_id` INT NOT NULL,
        `target_model` VARCHAR(150) NOT NULL,
        `vendor_id` INT,
        `vendor_project_manager` VARCHAR(100),
        `lead_biomedical_engineer` VARCHAR(100) NOT NULL,
        `contractor_representative` VARCHAR(100),
        `target_delivery_date` DATE,
        `target_installation_date` DATE,
        `inspection_date` DATE NOT NULL,
        `overall_status` ENUM('Approved & Ready for Delivery', 'Conditional Clearance', 'Remediation Required', 'Under Inspection', 'Draft') NOT NULL DEFAULT 'Under Inspection',
        `readiness_percentage` DECIMAL(5,2) DEFAULT 0.00,
        `critical_deficiencies_count` INT DEFAULT 0,
        `open_deficiencies_count` INT DEFAULT 0,
        `notes` TEXT,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE CASCADE,
        FOREIGN KEY (`equipment_type_id`) REFERENCES `equipment_types`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // 5. Table: site_inspection_details (Individual evaluations of the 130 items for an audit)
    $pdo->exec("CREATE TABLE IF NOT EXISTS `site_inspection_details` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `inspection_id` INT NOT NULL,
        `checklist_item_id` INT NOT NULL,
        `result` ENUM('Pass', 'Fail', 'Pending', 'N/A') NOT NULL DEFAULT 'Pending',
        `measured_value` VARCHAR(100),
        `is_deficiency` TINYINT(1) DEFAULT 0,
        `inspector_remarks` TEXT,
        `verified_at` DATETIME,
        FOREIGN KEY (`inspection_id`) REFERENCES `site_inspections`(`id`) ON DELETE CASCADE,
        FOREIGN KEY (`checklist_item_id`) REFERENCES `site_checklist_master`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // 6. Table: site_deficiencies (Active corrective complaints logged from site preparation)
    $pdo->exec("CREATE TABLE IF NOT EXISTS `site_deficiencies` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `deficiency_ticket` VARCHAR(50) NOT NULL UNIQUE,
        `inspection_id` INT NOT NULL,
        `checklist_item_id` INT NOT NULL,
        `category_code` VARCHAR(20) NOT NULL,
        `title` VARCHAR(255) NOT NULL,
        `description` TEXT NOT NULL,
        `assigned_department` VARCHAR(100) NOT NULL,
        `contractor_assigned` VARCHAR(120),
        `priority` ENUM('Critical', 'High', 'Medium', 'Low') NOT NULL DEFAULT 'High',
        `status` ENUM('Open', 'Assigned to department', 'In progress', 'Awaiting verification', 'Closed after verification') NOT NULL DEFAULT 'Open',
        `corrective_action_plan` TEXT,
        `evidence_attachment_url` VARCHAR(255),
        `due_date` DATE,
        `resolved_by` VARCHAR(100),
        `resolved_at` DATETIME,
        `verified_by` VARCHAR(100),
        `verified_at` DATETIME,
        `blocks_installation` TINYINT(1) DEFAULT 1,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`inspection_id`) REFERENCES `site_inspections`(`id`) ON DELETE CASCADE,
        FOREIGN KEY (`checklist_item_id`) REFERENCES `site_checklist_master`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // 7. Table: site_readiness_approvals (Official Handover & Delivery Release Sign-offs)
    $pdo->exec("CREATE TABLE IF NOT EXISTS `site_readiness_approvals` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `certificate_number` VARCHAR(60) NOT NULL UNIQUE,
        `inspection_id` INT NOT NULL UNIQUE,
        `approved_readiness_score` DECIMAL(5,2) NOT NULL,
        `biomedical_engineer_signature` VARCHAR(100) NOT NULL,
        `biomedical_signed_at` DATETIME NOT NULL,
        `facilities_director_signature` VARCHAR(100) NOT NULL,
        `facilities_signed_at` DATETIME NOT NULL,
        `vendor_pm_signature` VARCHAR(100) NOT NULL,
        `vendor_signed_at` DATETIME NOT NULL,
        `hospital_director_signature` VARCHAR(100),
        `hospital_director_signed_at` DATETIME,
        `dispatch_clearance_granted` TINYINT(1) DEFAULT 1,
        `special_operating_conditions` TEXT,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`inspection_id`) REFERENCES `site_inspections`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    echo "[+] All Site Preparation schema tables created successfully.\n";

    // ==========================================
    // SEED: 18 Master Complaint Categories
    // ==========================================
    $categories = [
        ['code' => 'SP-01', 'name' => 'Room dimensions and civil works', 'dept' => 'Civil / Projects', 'icon' => 'Maximize2', 'order' => 1, 'desc' => 'Doorway clearances, corridor widths, room layout drawings, equipment service clearances, and civil finishing.'],
        ['code' => 'SP-02', 'name' => 'Floor loading, foundations and vibration', 'dept' => 'Civil / Structural', 'icon' => 'Anchor', 'order' => 2, 'desc' => 'Floor structural load-bearing capacity, vibration isolation, equipment pedestals, anchor bolts, and ceiling supports.'],
        ['code' => 'SP-03', 'name' => 'Electrical supply and grounding', 'dept' => 'Electrical', 'icon' => 'Zap', 'order' => 3, 'desc' => 'Dedicated power circuits, correct phase distribution, isolated grounding pit resistance (<=1.0 ohm), and socket compatibility.'],
        ['code' => 'SP-04', 'name' => 'UPS, emergency power and isolation', 'dept' => 'Electrical / Facilities', 'icon' => 'BatteryCharging', 'order' => 4, 'desc' => 'On-line double conversion UPS capacity, automatic transfer switch (ATS) generator backup, and medical isolated power systems (IPS).'],
        ['code' => 'SP-05', 'name' => 'HVAC, temperature and humidity', 'dept' => 'HVAC / Facilities', 'icon' => 'Thermometer', 'order' => 5, 'desc' => 'Room climate control (18-22 deg C), relative humidity (30-60%), equipment heat rejection capacity, and air pressure differentials.'],
        ['code' => 'SP-06', 'name' => 'Medical gases and vacuum', 'dept' => 'Medical Gas / Facilities', 'icon' => 'Wind', 'order' => 6, 'desc' => 'MGPS pipeline terminal units: O2 (4 bar), Medical Air (4 bar), Surgical Air (7 bar), Vacuum (-60 kPa), and AGSS scavenging.'],
        ['code' => 'SP-07', 'name' => 'Water supply and drainage', 'dept' => 'Plumbing / Facilities', 'icon' => 'Droplets', 'order' => 7, 'desc' => 'Deionized/RO treated water purity, dynamic water pressure, chemical-resistant drainage, and backflow preventers.'],
        ['code' => 'SP-08', 'name' => 'IT, network and system integration', 'dept' => 'IT / Biomedical', 'icon' => 'Network', 'order' => 8, 'desc' => 'Dual Cat6/Fiber LAN drops, static IP/VLAN reservation, firewall port clearance, and HIS/PACS/DICOM/HL7 interface configuration.'],
        ['code' => 'SP-09', 'name' => 'Infection control and cleanliness', 'dept' => 'Infection Control / Housekeeping', 'icon' => 'Sparkles', 'order' => 9, 'desc' => 'Hospital infection-control sign-off, post-construction particulate cleaning, HEPA filtration, and pest-control clearance.'],
        ['code' => 'SP-10', 'name' => 'Radiation protection and imaging rooms', 'dept' => 'Radiation Safety / Projects', 'icon' => 'Radio', 'order' => 10, 'desc' => 'Lead lining thickness in walls/doors/glass, warning illuminated signs, door safety interlocks, and Radiation Safety Officer (RSO) approval.'],
        ['code' => 'SP-11', 'name' => 'MRI-specific safety and shielding', 'dept' => 'MRI Specialist / Projects', 'icon' => 'Magnet', 'order' => 11, 'desc' => 'RF Faraday cage attenuation (>100 dB), cryogen emergency quench pipe discharge, 5-gauss exclusion zone, and fringe magnetic interference checks.'],
        ['code' => 'SP-12', 'name' => 'Equipment mounting and installation provisions', 'dept' => 'Biomedical / Vendor', 'icon' => 'Wrench', 'order' => 12, 'desc' => 'Unistrut ceiling grids, articulating arm load ratings, cable raceways, floor plates, and OEM mounting bracket availability.'],
        ['code' => 'SP-13', 'name' => 'Fire safety and emergency access', 'dept' => 'Fire & Safety', 'icon' => 'ShieldAlert', 'order' => 13, 'desc' => 'Clean-agent gas fire suppression (FM-200 / Novec), optical smoke alarms, emergency exits, and emergency power-off (EPO) buttons.'],
        ['code' => 'SP-14', 'name' => 'Delivery, storage and access', 'dept' => 'Logistics / Biomedical', 'icon' => 'Truck', 'order' => 14, 'desc' => 'Hospital freight elevator capacity (kg/dimensions), delivery staging area, climate-controlled warehousing, and pathway floor protection.'],
        ['code' => 'SP-15', 'name' => 'Documentation, approvals and licenses', 'dept' => 'Biomedical / Quality', 'icon' => 'FileText', 'order' => 15, 'desc' => 'MOH/NHRA/SFDA medical device import approvals, OEM site planning drawings, calibration certificates, and facility commissioning dossiers.'],
        ['code' => 'SP-16', 'name' => 'Testing, commissioning and handover', 'dept' => 'Biomedical / Vendor', 'icon' => 'CheckCircle', 'order' => 16, 'desc' => 'Calibrated biomedical electrical safety analyzers, OEM factory testing protocols, performance qualification (PQ), and training schedules.'],
        ['code' => 'SP-17', 'name' => 'Department-specific utilities', 'dept' => 'Clinical Engineering / Facilities', 'icon' => 'Building', 'order' => 17, 'desc' => 'Tailored requirements for specialized departments: OT Laminar flow, ICU bed-head panels, Dialysis RO loops, and CSSD steam.'],
        ['code' => 'SP-18', 'name' => 'Site readiness approval and corrective actions', 'dept' => 'Project Manager / Biomedical', 'icon' => 'FileCheck2', 'order' => 18, 'desc' => 'Punch-list remediation tracking, deficiency verification, joint inspection sign-offs, and final Release for Delivery dispatch certificate.']
    ];

    $catStmt = $pdo->prepare("INSERT INTO `site_checklist_categories` (`code`, `name`, `responsible_department`, `icon`, `sort_order`, `description`) 
        VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `responsible_department`=VALUES(`responsible_department`), `description`=VALUES(`description`)");
    foreach ($categories as $c) {
        $catStmt->execute([$c['code'], $c['name'], $c['dept'], $c['icon'], $c['order'], $c['desc']]);
    }
    echo "[+] Seeded 18 Master Site Preparation Categories.\n";

    // ==========================================
    // SEED: GCC Country Compliance Profiles
    // ==========================================
    $profiles = [
        [
            'SA', 'Saudi Arabia (KSA)', '🇸🇦', 'Ministry of Health (MOH) & Saudi Food and Drug Authority (SFDA)',
            'MOH Hospital Commissioning Checklists & SFDA MDS-REQ-3 (Safe Use of Medical Devices)',
            'https://www.moh.gov.sa/documents/hospital-commissioning-checklists.pdf',
            'Mandatory pre-installation utility audit; SFDA medical device facility registration; SASO 3-phase 400V/230V 60Hz power verification; RSO approval for diagnostic imaging.',
            'General Directorate of Biomedical Engineering & Hospital Commissioning Unit (MOH KSA)'
        ],
        [
            'BH', 'Bahrain', '🇧🇭', 'National Health Regulatory Authority (NHRA)',
            'NHRA Healthcare Facilities Licensing Standards & Medical Device Regulations',
            'https://www.nhra.bh',
            'Mandatory NHRA facility engineering layout review; Civil Defense clean agent fire safety clearance; EWA electrical earthing <=1.0 ohm inspection; radiation license prior to equipment energization.',
            'NHRA Engineering & Medical Device Directorate (Kingdom of Bahrain)'
        ],
        [
            'AE', 'United Arab Emirates', '🇦🇪', 'Ministry of Health and Prevention (MOHAP), DHA & DoH Abu Dhabi',
            'MOHAP Healthcare Facility Guidelines & Federal Authority for Nuclear Regulation (FANR)',
            'https://mohap.gov.ae',
            'Emirate-level health authority facility permit; FANR radiation bunker shielding certification; 230V/400V 50Hz power stability test; isolated power systems (IPS) mandatory in all Category 1 patient locations.',
            'MOHAP / DHA Clinical Engineering & Hospital Licensing Division'
        ],
        [
            'QA', 'Qatar', '🇶🇦', 'Ministry of Public Health (MOPH)',
            'MOPH Healthcare Facilities Licensing & Medical Equipment Safety Code',
            'https://www.moph.gov.qa',
            'MOPH Department of Healthcare Professions inspection; Kahramaa electrical grounding audit; Hamad Medical Corporation (HMC) joint commissioning model; medical gas HTM 02-01 / NFPA 99 compliance.',
            'MOPH Healthcare Infrastructure & Facility Licensing Department'
        ],
        [
            'OM', 'Oman', '🇴🇲', 'Ministry of Health (MOH Oman)',
            'MOH Directorate General of Engineering Affairs & Radiation Protection Center',
            'https://www.moh.gov.om',
            'MOH engineering directorate health-facility project clearance; radiology acceptance testing; HTM medical gas pipeline testing; water treatment certification for dialysis and laboratory suites.',
            'Directorate General of Engineering Affairs, Ministry of Health Oman'
        ],
        [
            'KW', 'Kuwait', '🇰🇼', 'Ministry of Health (MOH Kuwait)',
            'MOH Hospital Engineering & Medical Devices Department Standards',
            'https://www.moh.gov.kw',
            'MOH Medical Engineering Department pre-installation site sign-off; Ministry of Electricity and Water (MEW) substation inspection; Kuwait Fire Force (KFF) hazardous gas permit; radiation safety verification.',
            'Biomedical Engineering Administration, Ministry of Health Kuwait'
        ],
        [
            'IN', 'India', '🇮🇳', 'Atomic Energy Regulatory Board (AERB) & NABH',
            'NABH Healthcare Facility Infrastructure Guidelines & AERB Safety Codes',
            'https://www.nabh.co',
            'AERB e-LORA layout and shielding approval for diagnostic and therapeutic radiation rooms; CEA earthing compliance; hospital emergency power backup; RO water validation for dialysis.',
            'Clinical Engineering / NABH Hospital Quality Directorate'
        ]
    ];

    $profStmt = $pdo->prepare("INSERT INTO `site_compliance_profiles` 
        (`country_code`, `country_name`, `flag`, `regulatory_authority`, `primary_standard_doc`, `guidelines_url`, `key_mandates`, `commissioning_authority`)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE `regulatory_authority`=VALUES(`regulatory_authority`), `primary_standard_doc`=VALUES(`primary_standard_doc`), `key_mandates`=VALUES(`key_mandates`)");
    foreach ($profiles as $p) {
        $profStmt->execute($p);
    }
    echo "[+] Seeded GCC + India Compliance Regulatory Profiles.\n";

    // ==========================================
    // SEED: 130 Master Checklist Questions & Complaints
    // ==========================================
    $items = [
        // A. Civil works and room readiness (SP001 - SP012)
        ['SP001', 'SP-01', 'Room dimensions insufficient', 'Does the room meet the approved equipment layout and minimum clearance requirements?', 'Civil / Projects', 'High', 'General / All', 'Tolerance: >= OEM minimum floor plan (sqm)', 'Architectural CAD drawing sign-off', 1],
        ['SP002', 'SP-01', 'Equipment delivery door too narrow', 'Can the equipment pass through external and internal doors and corridors without obstruction?', 'Civil / Projects', 'High', 'General / All', 'Clear width >= Equipment width + 200 mm', 'Physical clearance survey', 2],
        ['SP003', 'SP-01', 'Lift capacity insufficient', 'Can the hospital service/passenger lift safely transport the equipment dimensions and crated weight?', 'Civil / Projects', 'High', 'General / All', 'Weight capacity >= Crated gross weight + 30%', 'Lift load certificate', 3],
        ['SP004', 'SP-01', 'Equipment foundation incomplete', 'Is the required equipment base, inertia block, or reinforced floor foundation ready?', 'Civil / Structural', 'High', 'General / All', 'Curing period >= 14 days; level within 2 mm', 'Civil contractor completion report', 4],
        ['SP005', 'SP-02', 'Floor load capacity not verified', 'Has the structural floor loading capacity (kg/m2) been verified and approved by a structural engineer?', 'Civil / Structural', 'Critical', 'General / All', 'Point load >= OEM concentrated gantry weight', 'Structural engineer sign-off', 5],
        ['SP006', 'SP-02', 'Floor levelling incomplete', 'Is the finished floor level within the specified manufacturer tolerance across the installation area?', 'Civil / Structural', 'Medium', 'General / All', '<= 2 mm per meter; zero lippage', 'Laser spirit level report', 6],
        ['SP007', 'SP-02', 'Equipment anchoring provisions missing', 'Are required anchor bolts, embedment plates, and floor fixing points drilled and installed?', 'Civil / Structural', 'High', 'General / All', 'Epoxy anchor pull-out test certified', 'Structural anchor inspection', 7],
        ['SP008', 'SP-01', 'Wall reinforcement missing', 'Are reinforced wall backings or structural backing plates installed for wall-mounted medical equipment?', 'Civil / Projects', 'High', 'General / All', 'Weight capacity >= 4x fixture load', 'Wall stud inspection certificate', 8],
        ['SP009', 'SP-02', 'Ceiling supports incomplete', 'Are approved Unistrut ceiling suspension supports, brackets, and bracing installed for overhead fixtures?', 'Civil / Structural', 'High', 'General / All', 'Load tested to 2.5x suspended load', 'Ceiling load test report', 9],
        ['SP010', 'SP-01', 'Equipment service clearance inadequate', 'Is sufficient 360-degree perimeter access available for biomedical servicing, cooling airflow, and maintenance?', 'Civil / Projects', 'Medium', 'General / All', '>= 800 mm service perimeter per OEM', 'Room layout verification', 10],
        ['SP011', 'SP-01', 'Cable trenches or trunking incomplete', 'Are the required in-floor cable ducts, trenches, conduits, and perimeter trunking routes fully installed and deburred?', 'Civil / Projects', 'Medium', 'General / All', 'Separation of power and signal lines >= 150 mm', 'Cable pathway inspection', 11],
        ['SP012', 'SP-01', 'Equipment room construction incomplete', 'Are all architectural civil works, wall painting, ceiling tiles, and dust-generating construction activities finished?', 'Civil / Projects', 'High', 'General / All', '100% architectural finishing complete', 'Final civil handover permit', 12],

        // B. Electrical supply and safety (SP013 - SP025)
        ['SP013', 'SP-03', 'Electrical supply unavailable', 'Is the required permanent electrical power supply energised and available at the equipment room sub-panel?', 'Electrical', 'Critical', 'General / All', 'Voltage nominal: 230V / 400V (+- 5%)', 'Substation energization cert', 13],
        ['SP014', 'SP-03', 'Incorrect voltage or frequency', 'Does the electrical supply voltage and frequency match the equipment nameplate rating (e.g. 50Hz/60Hz)?', 'Electrical', 'Critical', 'General / All', 'Saudi: 60Hz (+-0.2Hz); UAE/BH/QA/OM/KW: 50Hz', 'Power analyzer log report', 14],
        ['SP015', 'SP-03', 'Incorrect phase configuration', 'Are the required single-phase (1P+N+E) or three-phase (3P+N+E) connections with proper phase rotation available?', 'Electrical', 'High', 'General / All', 'Clockwise phase rotation (R-Y-B)', 'Phase rotation meter test', 15],
        ['SP016', 'SP-03', 'Electrical circuit capacity insufficient', 'Can the circuit breaker rating and electrical feed cable sizing support the continuous and peak starting surge load?', 'Electrical', 'High', 'General / All', 'Breaker trip curve >= OEM inrush load', 'Electrical single-line diagram', 16],
        ['SP017', 'SP-03', 'Dedicated circuit not provided', 'Is a dedicated, unshared branch circuit provided exclusively for the medical equipment without common junction loads?', 'Electrical', 'High', 'General / All', 'Zero non-medical loads on circuit', 'Panel board schedule check', 17],
        ['SP018', 'SP-03', 'Electrical socket type incorrect', 'Do the wall and pendant outlets match the specified clinical plug standard (e.g. BS 1363, CEE, Schuko, or twist-lock)?', 'Electrical', 'Medium', 'General / All', 'Hospital-grade matching receptacle', 'Visual and pin socket check', 18],
        ['SP019', 'SP-03', 'Protective earth not verified', 'Has the dedicated equipment clean earthing pit and bonding loop resistance been tested and documented?', 'Electrical', 'Critical', 'General / All', 'Earth pit resistance <= 1.0 Ohm (Imaging <= 0.5 Ohm)', 'Earth tester calibration certificate', 19],
        ['SP020', 'SP-03', 'Earth leakage or protection requirements unresolved', 'Are the specified electrical protective devices (RCD Type B/Type A, 30mA, or insulation monitoring) installed?', 'Electrical', 'Critical', 'General / All', 'Trip time <= 300 ms at 30 mA leakage', 'RCD injection test record', 20],
        ['SP021', 'SP-04', 'UPS not available', 'Is the required online double-conversion UPS installed, battery capacity load-tested, and bypass verified?', 'Electrical / Facilities', 'Critical', 'General / All', 'Full load battery autonomy >= 15-30 minutes', 'UPS battery discharge test report', 21],
        ['SP022', 'SP-04', 'Emergency power not available', 'Is automatic emergency generator-backed power connected and transfer time within statutory medical limits?', 'Electrical / Facilities', 'Critical', 'General / All', 'ATS generator transfer time <= 10 seconds (Class 0.5/15)', 'Emergency ATS test record', 22],
        ['SP023', 'SP-04', 'Isolation transformer missing', 'Is the specified medical isolated power supply (IPS) and line insulation monitor (LIM) installed in critical areas?', 'Electrical / Facilities', 'Critical', 'General / All', 'LIM alarm threshold >= 50 kOhm / 2 mA', 'IPS commissioning certificate', 23],
        ['SP024', 'SP-03', 'Power quality outside specification', 'Have voltage stability, total harmonic distortion (THD < 5%), sag/swell, and neutral-to-earth voltage been certified?', 'Electrical', 'High', 'General / All', 'Neutral-to-Earth voltage <= 1.0 V', 'Power quality logger audit', 24],
        ['SP025', 'SP-03', 'Electrical safety test pending', 'Has the pre-installation electrical safety audit of building fixed infrastructure been signed off by the chief electrical engineer?', 'Electrical', 'High', 'General / All', '100% compliance with IEC 60364-7-710', 'Building electrical safety permit', 25],

        // C. HVAC and environmental conditions (SP026 - SP036)
        ['SP026', 'SP-05', 'Room temperature outside limits', 'Is the measured ambient room temperature stabilized within the manufacturer operating specification (e.g. 18-22 deg C)?', 'HVAC / Facilities', 'High', 'General / All', '19.0 to 22.0 deg C continuously', 'Continuous 24-hr temp log', 26],
        ['SP027', 'SP-05', 'Humidity outside limits', 'Is relative humidity stabilized within the manufacturer permitted range (e.g. 30% to 60% non-condensing)?', 'HVAC / Facilities', 'High', 'General / All', '35% to 55% RH; zero condensation', 'Calibrated hygrometer log', 27],
        ['SP028', 'SP-05', 'Air-conditioning capacity insufficient', 'Can the HVAC chiller and AHU system handle the maximum heat rejection load (BTU/hr or kW) of the equipment?', 'HVAC / Facilities', 'High', 'General / All', 'Cooling margin >= OEM rated heat dissipation + 25%', 'HVAC thermal balance report', 28],
        ['SP029', 'SP-05', 'Ventilation incomplete', 'Is the dedicated room ventilation, filtered supply, and exhaust air system fully balanced and operational?', 'HVAC / Facilities', 'High', 'General / All', 'Air changes per hour >= statutory standard', 'Airflow balancing (TAB) report', 29],
        ['SP030', 'SP-05', 'Room pressure differential incorrect', 'Have required positive (sterile/protective) or negative (isolation/hazardous) air pressure cascades been verified?', 'HVAC / Facilities', 'Critical', 'General / All', 'Differential >= +2.5 Pa to +5.0 Pa (Positive)', 'Magnahelic pressure gauge cert', 30],
        ['SP031', 'SP-05', 'Air cleanliness not approved', 'Has the applicable cleanroom ISO particle classification or HEPA filtration efficiency been certified by test?', 'HVAC / Facilities', 'High', 'General / All', 'ISO Class 5/7 (OTs) / HEPA 99.97% efficiency', 'Airborne particle count report', 31],
        ['SP032', 'SP-05', 'Above-ceiling cleanliness not approved', 'Has the above-ceiling space (plenum) been cleared of residual dust, loose insulation, and construction debris?', 'HVAC / Facilities', 'Medium', 'General / All', 'Sealed plenum; zero particulate fallout', 'Above-ceiling visual sign-off', 32],
        ['SP033', 'SP-09', 'Excessive dust or construction debris', 'Is the floor, wall, and work area completely free of airborne construction dust, grit, and masonry powder?', 'Infection Control / Housekeeping', 'High', 'General / All', 'Cleaned to clinical deep-clean level', 'Housekeeping inspection pass', 33],
        ['SP034', 'SP-05', 'Chilled-water supply unavailable', 'Are the closed-loop chilled-water supply and return lines (flow, pressure, and delta-T) available for water-cooled systems?', 'HVAC / Facilities', 'High', 'General / All', 'Chilled water temp: 7 to 12 deg C', 'Hydronic flow test certificate', 34],
        ['SP035', 'SP-05', 'Heat rejection or exhaust provision missing', 'Are required exhaust duct connections, dedicated heat extractors, or chiller bypass dampers installed?', 'HVAC / Facilities', 'High', 'General / All', 'Exhaust CFM >= OEM specification', 'Duct velocity test report', 35],
        ['SP036', 'SP-05', 'Temperature and humidity monitoring unavailable', 'Is an automated, calibrated continuous environmental monitoring and alerting sensor installed in the room?', 'HVAC / Facilities', 'Medium', 'General / All', 'BMS interface or digital datalogger operational', 'BMS sensor commissioning check', 36],

        // D. Medical gases, vacuum and plumbing (SP037 - SP050)
        ['SP037', 'SP-06', 'Oxygen outlet unavailable', 'Is Medical Oxygen (O2) pipeline connection available at the required clinical location and rated pressure?', 'Medical Gas / Facilities', 'Critical', 'General / All', 'Pressure: 4.0 bar +- 0.2 bar (400 kPa)', 'MGPS pressure gauge audit', 37],
        ['SP038', 'SP-06', 'Medical air unavailable', 'Is Medical Air (4 bar) available with calibrated gas purity (oil-free, moisture-free, particulate-free)?', 'Medical Gas / Facilities', 'Critical', 'General / All', 'Pressure: 4.0 bar +- 0.2 bar; Dew point <= -40 deg C', 'Medical air purity test cert', 38],
        ['SP039', 'SP-06', 'Medical vacuum unavailable', 'Is Medical Vacuum (suction) available with adequate continuous flow and negative pressure at terminal units?', 'Medical Gas / Facilities', 'Critical', 'General / All', 'Negative pressure <= -60 kPa (-450 mmHg)', 'Vacuum gauge test report', 39],
        ['SP040', 'SP-06', 'Nitrous oxide connection unavailable', 'Is Nitrous Oxide (N2O) pipeline terminal unit available, leak-tested, and secure where specified?', 'Medical Gas / Facilities', 'High', 'General / All', 'Pressure: 4.0 bar +- 0.2 bar', 'N2O pressure and leak test', 40],
        ['SP041', 'SP-06', 'Anaesthetic gas scavenging unavailable', 'Is an active Anaesthetic Gas Scavenging System (AGSS) installed, vented externally, and vacuum-verified?', 'Medical Gas / Facilities', 'Critical', 'General / All', 'Flow rate: 80 to 130 LPM per terminal', 'AGSS flow meter verification', 41],
        ['SP042', 'SP-06', 'Medical gas outlet type incorrect', 'Do the gas terminal outlets match national hospital standard quick-connect adapters (e.g. BS, DIN, Puritan, Chemetron)?', 'Medical Gas / Facilities', 'High', 'General / All', 'Matching standard probe engagement', 'Mechanical probe insertion check', 42],
        ['SP043', 'SP-06', 'Medical gas pipeline testing incomplete', 'Have statutory MGPS pipeline tests (cross-connection, particulate, pressure drop, and purity) been certified?', 'Medical Gas / Facilities', 'Critical', 'General / All', '100% HTM 02-01 / NFPA 99 certification', 'Authorised Person (MGPS) certificate', 43],
        ['SP044', 'SP-06', 'Medical gas identification or labelling incorrect', 'Are all medical gas pipework, area valve service units (AVSU), and alarm panels permanently labelled and color-coded?', 'Medical Gas / Facilities', 'High', 'General / All', 'ISO / National color-coding verified', 'AVSU visual audit', 44],
        ['SP045', 'SP-07', 'Water supply unavailable', 'Is the required permanent water supply connected with dual isolation shut-off valves?', 'Plumbing / Facilities', 'High', 'General / All', 'Continuous flow >= 15 LPM at terminal', 'Plumbing flow test record', 45],
        ['SP046', 'SP-07', 'Water quality unsuitable', 'Has required laboratory/dialysis water-quality testing (TDS, conductivity, microbial, endotoxin) been certified?', 'Plumbing / Facilities', 'Critical', 'General / All', 'Conductivity <= 1.1 uS/cm (RO Water)', 'Third-party water chemical lab test', 46],
        ['SP047', 'SP-07', 'Water pressure or temperature incorrect', 'Does dynamic incoming water pressure and temperature satisfy equipment specifications?', 'Plumbing / Facilities', 'Medium', 'General / All', 'Pressure: 2.0 to 4.0 bar; Temp: 15 to 25 deg C', 'Water pressure gauge measurement', 47],
        ['SP048', 'SP-07', 'Drainage unavailable', 'Is a dedicated, vented sanitary drain connection installed at the exact specified floor location?', 'Plumbing / Facilities', 'High', 'General / All', 'Gravity fall >= 1:50; chemical resistant trap', 'Plumbing drain layout sign-off', 48],
        ['SP049', 'SP-07', 'Drainage capacity insufficient', 'Can the drainage line handle the maximum instantaneous flush discharge volume of the equipment without backup?', 'Plumbing / Facilities', 'High', 'General / All', 'Discharge rate >= 30 LPM without overflow', 'Drain flow discharge stress test', 49],
        ['SP050', 'SP-07', 'Backflow prevention unresolved', 'Is an approved reduced-pressure zone (RPZ) backflow prevention assembly or physical air gap installed on supply lines?', 'Plumbing / Facilities', 'Critical', 'General / All', 'RPZ valve certified tested and tagged', 'Backflow preventer cert', 50],

        // E. IT and connectivity (SP051 - SP060)
        ['SP051', 'SP-08', 'LAN point unavailable', 'Are the required structured cabling RJ45 Ethernet network data outlets terminated, labelled, and live?', 'IT / Biomedical', 'High', 'General / All', 'Cat6/Cat6A gigabit throughput certified', 'Fluke cable certification report', 51],
        ['SP052', 'SP-08', 'Network coverage insufficient', 'Is enterprise hospital Wi-Fi / RFID IoT gateway wireless signal strength adequate across the equipment workspace?', 'IT / Biomedical', 'Medium', 'General / All', 'RSSI >= -65 dBm; SNR >= 25 dB', 'Wi-Fi/RFID RF survey heatmap', 52],
        ['SP053', 'SP-08', 'Static IP or VLAN not configured', 'Are reserved static IP addresses, subnet mask, default gateway, and medical equipment VLAN configured on switches?', 'IT / Biomedical', 'High', 'General / All', 'Ping response <= 2 ms; zero packet loss', 'Network switch port config sheet', 53],
        ['SP054', 'SP-08', 'Firewall blocks required communication', 'Have internal hospital firewall rules, outbound telemetry ports, and DICOM service ports been whitelisted?', 'IT / Biomedical', 'High', 'General / All', 'Required TCP/IP ports open (e.g. 104, 8042, 443)', 'Firewall rule verification log', 54],
        ['SP055', 'SP-08', 'HIS/LIS/RIS/PACS integration incomplete', 'Are clinical system interface broker endpoints, AE titles, and network connection parameters configured and tested?', 'IT / Biomedical', 'High', 'General / All', 'C-ECHO verification successful', 'PACS/HIS integration test record', 55],
        ['SP056', 'SP-08', 'DICOM or HL7 configuration pending', 'Have DICOM Conformance Statements, HL7 query templates, and modality worklist (MWL) profiles been finalized?', 'IT / Biomedical', 'Medium', 'General / All', 'DICOM conformance statement approved', 'HL7 broker connectivity log', 56],
        ['SP057', 'SP-08', 'Server or workstation unavailable', 'Are required dedicated medical imaging workstations, reconstruction nodes, or database servers in place and running?', 'IT / Biomedical', 'High', 'General / All', 'OS patched, antivirus active, dual NIC ready', 'IT hardware commissioning sign-off', 57],
        ['SP058', 'SP-08', 'Software license or activation missing', 'Are official clinical software licenses, feature dongles, and OEM operating system activation keys ready?', 'IT / Biomedical', 'High', 'General / All', '100% authorized software certificates present', 'Software license audit report', 58],
        ['SP059', 'SP-08', 'Cybersecurity approval pending', 'Has the medical device cybersecurity risk assessment and default credential hardening been completed per hospital policy?', 'IT / Biomedical', 'High', 'General / All', 'Zero default passwords; endpoint security signed', 'Cybersecurity clearance certificate', 59],
        ['SP060', 'SP-08', 'Time synchronization or data backup unresolved', 'Is NTP server synchronization (time zone alignment) and automatic clinical backup storage configured?', 'IT / Biomedical', 'Medium', 'General / All', 'NTP sync within +- 50 ms of hospital master', 'NTP sync & backup test log', 60],

        // F. Infection control, cleanliness and safety (SP061 - SP070)
        ['SP061', 'SP-09', 'Infection-control clearance pending', 'Has the Infection Prevention and Control (IPC) department officially approved room readiness for clinical equipment uncrating?', 'Infection Control / Housekeeping', 'High', 'General / All', 'IPC pre-commissioning sign-off granted', 'IPC inspection certificate', 61],
        ['SP062', 'SP-09', 'Final cleaning incomplete', 'Has terminal hospital-grade cleaning and surface disinfection been executed according to hospital protocol?', 'Infection Control / Housekeeping', 'High', 'General / All', 'ATP bioluminescence swab <= 50 RLU', 'Environmental cleaning log', 62],
        ['SP063', 'SP-09', 'Construction dust control inadequate', 'Are negative air machines, dust barrier zip-walls, and sticky walk-off mats still required and functioning?', 'Infection Control / Housekeeping', 'High', 'General / All', 'Zero particulate migration to patient corridors', 'ICRA (Risk Assessment) permit', 63],
        ['SP064', 'SP-09', 'Pest-control clearance missing', 'Has the required certified pest control inspection and treatment been executed and documented?', 'Infection Control / Housekeeping', 'Medium', 'General / All', 'Pest-free certification valid for 90 days', 'Pest control clearance certificate', 64],
        ['SP065', 'SP-13', 'Fire-safety approval pending', 'Has the local Civil Defense / Fire Department approved the room emergency egress and fire separation partitions?', 'Fire & Safety', 'Critical', 'General / All', '2-hour fire-rated walls where specified', 'Civil Defense inspection permit', 65],
        ['SP066', 'SP-13', 'Fire alarm or suppression provision incomplete', 'Are early-warning optical smoke detectors and automatic fire suppression (e.g. clean agent) installed and tested?', 'Fire & Safety', 'Critical', 'General / All', 'Clean agent concentration certified', 'Fire alarm interface test cert', 66],
        ['SP067', 'SP-13', 'Emergency access obstructed', 'Are fire exit corridors, crash carts pathways, emergency shut-off valves, and panels clear of construction materials?', 'Fire & Safety', 'Critical', 'General / All', 'Clear minimum corridor width >= 2.4 meters', 'Safety walk-through audit', 67],
        ['SP068', 'SP-14', 'Equipment movement creates patient-safety risk', 'Has the transport route risk assessment, patient flow diversion, and elevator scheduling been approved by clinical operations?', 'Logistics / Biomedical', 'High', 'General / All', 'Off-peak transit schedule approved', 'Logistics route risk assessment', 68],
        ['SP069', 'SP-13', 'Hazardous installation work not controlled', 'Are hot-work permits, electrical lock-out/tag-out (LOTO), and hazardous chemical handling controls enforced?', 'Fire & Safety', 'Critical', 'General / All', 'Signed safety work permit active', 'Safety permit to work (PTW)', 69],
        ['SP070', 'SP-10', 'Radiation safety approval missing', 'Has the hospital Radiation Safety Officer (RSO) and national nuclear regulatory body approved room designs?', 'Radiation Safety / Projects', 'Critical', 'General / All', 'National atomic/nuclear regulatory license', 'RSO statutory approval cert', 70],

        // G. Imaging, MRI and specialist rooms (SP071 - SP080)
        ['SP071', 'SP-10', 'Radiation shielding incomplete', 'Has lead shielding (specified mm lead equivalence) been fully installed in all walls, doors, view windows, and penetrations?', 'Radiation Safety / Projects', 'Critical', 'Radiology / Imaging', 'Lead equivalence >= OEM & RSO specification (e.g. 2.5 mm Pb)', 'Lead shielding density test report', 71],
        ['SP072', 'SP-10', 'Radiation shielding approval missing', 'Has an independent qualified medical physicist completed radiation scatter leakage and survey testing?', 'Radiation Safety / Projects', 'Critical', 'Radiology / Imaging', 'Scatter dose rate <= statutory public limit (< 1 mSv/year)', 'Medical Physicist survey cert', 72],
        ['SP073', 'SP-10', 'Radiation warning system unavailable', 'Are illuminated X-Ray warning signs ("X-RAY ON"), door magnetic safety interlocks, and emergency stops functional?', 'Radiation Safety / Projects', 'Critical', 'Radiology / Imaging', 'Interlock instantly halts exposure upon door opening', 'Interlock functional test cert', 73],
        ['SP074', 'SP-11', 'MRI RF shielding incomplete', 'Has the copper/aluminum RF shielding Faraday cage been constructed, sealed, and attenuation certified by test?', 'MRI Specialist / Projects', 'Critical', 'MRI Suite', 'RF Attenuation >= 100 dB across 10 MHz to 130 MHz', 'RF shielding attenuation test report', 74],
        ['SP075', 'SP-11', 'MRI magnetic-field safety zone not established', 'Are 4-Zone MRI safety signage, 5-gauss exclusion demarcation lines, and non-ferromagnetic access controls installed?', 'MRI Specialist / Projects', 'Critical', 'MRI Suite', 'Zone I to IV demarcated; ferromagnetic detector live', 'MRI safety audit checklist', 75],
        ['SP076', 'SP-11', 'MRI quench provisions incomplete', 'Is the non-magnetic stainless steel cryogen emergency quench pipe installed, insulated, and vented safely to the roof?', 'MRI Specialist / Projects', 'Critical', 'MRI Suite', 'Zero low spots; rupture disc inspected; external diffuser clear', 'Quench duct pressure test certificate', 76],
        ['SP077', 'SP-11', 'MRI electromagnetic interference unresolved', 'Have external AC/DC magnetic fringe interference checks (elevators, vehicle traffic, electrical risers) been verified?', 'MRI Specialist / Projects', 'High', 'MRI Suite', 'EMI fluctuation <= OEM maximum permissible limits (nT)', 'Site magnetic survey report', 77],
        ['SP078', 'SP-11', 'MRI vibration limits not verified', 'Have structural floor vibration levels been measured across 1 Hz to 100 Hz to ensure image artifact prevention?', 'MRI Specialist / Projects', 'High', 'MRI Suite', 'Vibration acceleration within OEM spec curve', 'Seismic / vibration spectrum report', 78],
        ['SP079', 'SP-10', 'CT scanner cooling inadequate', 'Is primary and secondary cooling (chiller / heat exchanger) verified under simulated maximum CT scan gantry workload?', 'HVAC / Facilities', 'High', 'Radiology / Imaging', 'Cooling water flow and delta-T maintained under peak heat load', 'CT chiller commissioning report', 79],
        ['SP080', 'SP-10', 'Imaging equipment acceptance testing pending', 'Have factory and site radiation output, image linearity, high-contrast resolution, and phantom QA protocols been approved?', 'Biomedical / Vendor', 'Critical', 'Radiology / Imaging', 'Phantom calibration within diagnostic limits', 'Radiology acceptance certificate', 80],

        // H. Installation provisions, delivery and documentation (SP081 - SP100)
        ['SP081', 'SP-12', 'Equipment layout not approved', 'Has the final coordinated MEP and architectural installation layout drawing been signed by hospital and vendor engineers?', 'Biomedical / Vendor', 'High', 'General / All', 'Approved for Construction (AFC) signed drawings', 'Signed equipment layout drawing', 81],
        ['SP082', 'SP-12', 'Mounting brackets or accessories missing', 'Are all pre-installation mounting brackets, seismic restraints, adapter plates, and hardware kits on-site?', 'Biomedical / Vendor', 'High', 'General / All', '100% mechanical hardware accounted for', 'Packing list BOM physical check', 82],
        ['SP083', 'SP-03', 'Equipment grounding or bonding provisions incomplete', 'Are equipment chassis grounding lugs, equipotential bonding (PE) studs, and copper ground busses verified?', 'Electrical', 'Critical', 'General / All', 'Bonding resistance <= 0.1 Ohm between frames', 'Equipotential continuity test', 83],
        ['SP084', 'SP-01', 'Cable routing incomplete', 'Are power cables, high-voltage conduits, control cables, and optical fibers pulled through raceways and protected?', 'Biomedical / Vendor', 'Medium', 'General / All', 'Bending radii compliant with fiber/copper specs', 'Cable pull verification check', 84],
        ['SP085', 'SP-14', 'Equipment storage conditions unsuitable', 'Is secure, climate-controlled warehousing available if equipment is delivered prior to room readiness?', 'Logistics / Biomedical', 'High', 'General / All', 'Warehouse temp: 15 to 28 deg C; RH <= 65%', 'Warehouse environmental log', 85],
        ['SP086', 'SP-14', 'Delivery route not cleared', 'Is the approved delivery pathway from hospital loading bay to installation room cleared of ramps, curbs, and tight turns?', 'Logistics / Biomedical', 'High', 'General / All', 'Zero unramped steps; floor protected with masonite', 'Delivery pathway physical walk', 86],
        ['SP087', 'SP-15', 'Manufacturer installation manual missing', 'Is the exact manufacturer installation, pre-installation, and technical service manual available in the project file?', 'Biomedical / Quality', 'Medium', 'General / All', 'Current OEM manual revision on file', 'Technical document repository check', 87],
        ['SP088', 'SP-15', 'Site planning document missing', 'Has the manufacturer equipment-specific site planning guide (Site Prep Manual) been obtained and cross-checked?', 'Biomedical / Quality', 'High', 'General / All', 'OEM site preparation checklist on file', 'Site planning guide review sign-off', 88],
        ['SP089', 'SP-15', 'Equipment approval or registration documentation missing', 'Are national medical device registration licenses (e.g. SFDA, NHRA, MOHAP) and import clearance certificates ready?', 'Biomedical / Quality', 'Critical', 'General / All', 'Valid device registration certificate', 'Regulatory registration dossier', 89],
        ['SP090', 'SP-16', 'Vendor installation team unavailable', 'Is a factory-certified, authorized vendor engineering installation team formally scheduled and security-badged?', 'Biomedical / Vendor', 'High', 'General / All', 'Vendor OEM certification badges verified', 'Installation schedule confirmation', 90],
        ['SP091', 'SP-16', 'Tools or test equipment unavailable', 'Are calibrated installation tools, torque wrenches, phantoms, and safety analyzers on-site with valid calibration?', 'Biomedical / Vendor', 'Medium', 'General / All', 'Calibration valid within 12 months', 'Test equipment calibration stickers', 91],
        ['SP092', 'SP-15', 'Calibration or test certificates missing', 'Are OEM factory calibration certificates, source test reports, and serial number verification documents present?', 'Biomedical / Quality', 'High', 'General / All', 'Factory birth certificate matching serial number', 'Certificate validation review', 92],
        ['SP093', 'SP-15', 'Warranty and technical support information missing', 'Are warranty terms, emergency 24/7 hotline numbers, authorized service escalation paths, and AMC terms on record?', 'Biomedical / Quality', 'Medium', 'General / All', 'Warranty contract countersigned by vendor', 'Warranty agreement copy', 93],
        ['SP094', 'SP-16', 'User or technical training not scheduled', 'Has operational user training for clinical staff and first-line technical maintenance training for biomedical engineers been set?', 'Biomedical / Vendor', 'Medium', 'General / All', 'Training syllabus & schedule approved', 'Training plan sign-off sheet', 94],
        ['SP095', 'SP-18', 'Site readiness certificate not signed', 'Has the formal Site Readiness Inspection Certificate been approved by Civil, Electrical, HVAC, IT, and Biomedical leads?', 'Project Manager / Biomedical', 'Critical', 'General / All', '100% stakeholder signatures completed', 'Multi-disciplinary sign-off cert', 95],
        ['SP096', 'SP-16', 'Commissioning documentation incomplete', 'Is the commissioning protocol dossier (Installation Qualification / Operational Qualification) assembled and ready?', 'Biomedical / Vendor', 'High', 'General / All', 'IQ / OQ templates approved', 'Commissioning binder check', 96],
        ['SP097', 'SP-16', 'Asset identification and labels missing', 'Are durable hospital barcode/QR-code asset tags, RFID UHF tags, and electrical safety test labels ready for affixing?', 'Biomedical / Vendor', 'Medium', 'General / All', 'Barcodes printed matching asset register', 'Physical asset tag verification', 97],
        ['SP098', 'SP-16', 'Preventive maintenance plan not configured', 'Has the recurrent preventive maintenance frequency, IEC 62353 safety battery, and calibration schedule been loaded into CMMS?', 'Biomedical / Vendor', 'Medium', 'General / All', 'PM schedule configured in BioTrack CMMS', 'CMMS record confirmation', 98],
        ['SP099', 'SP-16', 'Clinical acceptance pending', 'Has the clinical head of department, nursing supervisor, and biomedical engineer completed user acceptance protocols?', 'Biomedical / Vendor', 'High', 'General / All', 'Clinical acceptance form signed', 'Clinical user sign-off', 99],
        ['SP100', 'SP-18', 'Final approval for clinical use missing', 'Has the authorized Release-for-Clinical-Use handover approval been officially granted by the hospital commissioning committee?', 'Project Manager / Biomedical', 'Critical', 'General / All', 'Final hospital commissioning release granted', 'Release for Clinical Use certificate', 100],

        // 3. Additional specialist department complaints (SP101 - SP130)
        ['SP101', 'SP-17', 'Laminar airflow or required airflow validation incomplete', 'Is the ultra-clean laminar airflow velocity (0.36 to 0.54 m/s) and HEPA terminal filter certification complete?', 'HVAC / Facilities', 'Critical', 'Operation Theatre', 'Laminar velocity: 0.45 m/s +- 20%', 'OT HEPA & particle validation report', 101],
        ['SP102', 'SP-17', 'Medical gas pendants or service columns not ready', 'Are ceiling-mounted surgical and anesthetic pendants installed, articulated, load-tested, and gases gas-tight?', 'Medical Gas / Facilities', 'Critical', 'Operation Theatre', 'Braking system operational; zero gas leaks', 'Pendant load and gas test report', 102],
        ['SP103', 'SP-17', 'Surgical light ceiling mounting or load certification missing', 'Has the surgical light ceiling mounting plate undergone structural load testing and zero-drift counterbalance balancing?', 'Civil / Structural', 'Critical', 'Operation Theatre', 'Zero arm drift; certified to 4x suspended mass', 'Surgical light ceiling load cert', 103],
        ['SP104', 'SP-17', 'Operating table foundation or power provision incomplete', 'Is the motorized operating table floor base, IPS electrical connection, and equipotential ground socket ready?', 'Electrical / Facilities', 'High', 'Operation Theatre', 'IPS socket live; earth bond <= 0.1 Ohm', 'OT table installation sign-off', 104],
        ['SP105', 'SP-17', 'Bed-head panel services incomplete', 'Are ICU/NICU bed-head trunking units equipped with dual O2, dual Air, dual Vacuum, and minimum 8 IPS emergency electrical outlets?', 'Clinical Engineering / Facilities', 'Critical', 'ICU / NICU', 'All medical gas and power outlets energized', 'Bedhead panel commissioning audit', 105],
        ['SP106', 'SP-17', 'Central patient-monitoring network not ready', 'Is the isolated medical telemetry network, central station cabling, and arrhythmia alarm gateway fully functional?', 'IT / Biomedical', 'Critical', 'ICU / NICU', 'Telemetry drop verified; zero alarm latency', 'Central monitor network cert', 106],
        ['SP107', 'SP-17', 'Emergency power and equipment outlet verification pending', 'Have all ICU patient critical outlets undergone 100% emergency generator load-shedding and transfer testing?', 'Electrical / Facilities', 'Critical', 'ICU / NICU', 'Voltage drop < 5% during ATS transfer', 'Emergency circuit load test log', 107],
        ['SP108', 'SP-17', 'Required oxygen, medical air or other specified connections unavailable', 'Are high-pressure DISS/NIST connections for ICU ventilators verified for dynamic flow (minimum 120 LPM)?', 'Clinical Engineering / Facilities', 'Critical', 'Ventilator installation', 'Flow >= 120 LPM without pressure drop below 3.5 bar', 'Ventilator gas supply flow test', 108],
        ['SP109', 'SP-17', 'Reverse osmosis or water-treatment system not commissioned', 'Has the dedicated hemodialysis RO water plant and distribution loop been fully sanitized and validated?', 'Plumbing / Facilities', 'Critical', 'Dialysis', 'RO rejection rate >= 98%; permeate loop sanitized', 'Dialysis RO commissioning report', 109],
        ['SP110', 'SP-17', 'Dialysis water quality fails the applicable specification', 'Does the treated dialysis water satisfy ISO 23500 / AAMI standards for chemical purity, microbial count, and endotoxins?', 'Plumbing / Facilities', 'Critical', 'Dialysis', 'Microbial < 100 CFU/ml; Endotoxin < 0.25 EU/ml', 'Third-party water microbiology cert', 110],
        ['SP111', 'SP-17', 'Dialysis drainage and waste-disposal arrangements incomplete', 'Are indirect waste drain receptacles with atmospheric break (air gap) installed at each dialysis station?', 'Plumbing / Facilities', 'High', 'Dialysis', 'Minimum 50 mm air gap; zero back-siphonage risk', 'Plumbing sanitary audit check', 111],
        ['SP112', 'SP-17', 'Steam supply does not meet the sterilizer specification', 'Does clean medical steam supply meet EN 285 dryness fraction (0.95 to 1.05) and non-condensable gas limits (< 3.5%)?', 'Plumbing / Facilities', 'Critical', 'CSSD / Sterilization', 'Steam dryness >= 0.95; Non-condensable gases <= 3.5%', 'EN 285 steam physical quality test', 112],
        ['SP113', 'SP-17', 'Sterilizer exhaust or condensate drainage incomplete', 'Is high-temperature condensate drainage (piped in 316 stainless or CPVC) and autoclave exhaust vented safely?', 'Plumbing / Facilities', 'High', 'CSSD / Sterilization', 'Effluent temp cooled to < 60 deg C before sewer entry', 'CSSD drainage inspection report', 113],
        ['SP114', 'SP-17', 'Sterilizer utility and cycle-validation prerequisites incomplete', 'Are Bowie-Dick test packs, biological indicators (Geobacillus stearothermophilus), and data loggers ready?', 'Clinical Engineering / Facilities', 'Critical', 'CSSD / Sterilization', 'Bowie-Dick complete color change; zero vacuum leak', 'Sterilizer vacuum & cycle validation', 114],
        ['SP115', 'SP-17', 'Laboratory water quality or purity not verified', 'Is Clinical Laboratory Reagent Water (CLRW / Type I / Type II) validated with resistivity >= 10 MOhm-cm?', 'Plumbing / Facilities', 'High', 'Laboratory', 'Resistivity >= 10 MOhm-cm at 25 deg C', 'Lab water system analyzer test', 115],
        ['SP116', 'SP-17', 'Reagent storage or refrigeration provision unavailable', 'Are dedicated temperature-controlled reagent cold rooms and 2 to 8 deg C storage fridges commissioned and alarm-monitored?', 'Clinical Engineering / Facilities', 'High', 'Laboratory', 'Temp: 2.0 to 8.0 deg C with audio-visual alarms', 'Refrigeration temp qualification cert', 116],
        ['SP117', 'SP-17', 'Fume hood or local exhaust ventilation not validated where required', 'Has chemical fume hood face velocity (0.4 to 0.6 m/s) and biosafety cabinet containment been certified?', 'HVAC / Facilities', 'Critical', 'Laboratory', 'Face velocity: 0.5 m/s +- 10%; smoke pattern smooth', 'Biosafety cabinet certification cert', 117],
        ['SP118', 'SP-17', 'LIS connectivity or analyser interface not ready', 'Is the bidirectional ASTM/HL7 interface between automated clinical analyzers and the Laboratory Information System live?', 'IT / Biomedical', 'High', 'Laboratory', 'Automated bidirectional sample query verified', 'LIS interface validation sign-off', 118],
        ['SP119', 'SP-17', 'Blood storage refrigerator temperature monitoring unavailable', 'Is a calibrated continuous temperature logger (1 to 6 deg C) with 24/7 central hospital alerting operational?', 'Clinical Engineering / Facilities', 'Critical', 'Blood Bank', 'Strict temp: 2.0 to 6.0 deg C; dual probe verified', 'Blood bank temp monitoring audit', 119],
        ['SP120', 'SP-17', 'Temperature alarm or backup-power arrangements not verified', 'Have blood bank refrigerator high/low temperature alarms and emergency battery backup alarms been tested?', 'Electrical / Facilities', 'Critical', 'Blood Bank', 'High alarm trip at 5.5 deg C; Low alarm trip at 1.5 deg C', 'Alarm trigger test record', 120],
        ['SP121', 'SP-17', 'Endoscope reprocessing area utilities or workflow incomplete', 'Is the dedicated dirty-to-clean unidirectional flow, automated endoscope reprocessor (AER) hookup, and RO rinse ready?', 'Clinical Engineering / Facilities', 'Critical', 'Endoscopy', 'Unidirectional workflow; negative pressure dirty side', 'Endoscopy decontamination audit', 121],
        ['SP122', 'SP-17', 'Required drying, storage or reprocessing facilities unavailable', 'Are medical-grade HEPA-filtered endoscope drying cabinets with continuous positive pressure operational?', 'Clinical Engineering / Facilities', 'High', 'Endoscopy', 'Drying cabinet air circulation certified', 'Drying cabinet commissioning check', 122],
        ['SP123', 'SP-17', 'Required refrigerator or cold-storage temperature monitoring unavailable', 'Are hospital pharmacy vaccine and biological cold-chain refrigerators equipped with certified NIST-traceable loggers?', 'Clinical Engineering / Facilities', 'Critical', 'Pharmacy', 'Cold chain: 2.0 to 8.0 deg C; Freezer: -25 to -15 deg C', 'Pharmacy cold chain logger report', 123],
        ['SP124', 'SP-17', 'Backup power or alarm arrangements for critical cold storage not verified', 'Are pharmacy critical cold storage units connected to generator circuits with automated dial-out alarm notifications?', 'Electrical / Facilities', 'Critical', 'Pharmacy', 'SMS/Dial-out alert triggers within 3 minutes of deviation', 'Dial-out alarm notification test', 124],
        ['SP125', 'SP-17', 'Dental chair water, suction or compressed-air supply unavailable', 'Are dental utility box services (oil-free air at 6 bar, high-volume suction, and treated water) verified?', 'Plumbing / Facilities', 'High', 'Dental', 'Oil-free air: 5.5 to 6.5 bar; Suction: >= 250 LPM', 'Dental junction box utility test', 125],
        ['SP126', 'SP-17', 'Dental X-ray shielding or radiation-safety approval incomplete', 'Has intraoral / OPG dental panoramic X-ray lead shielding and operator remote exposure barrier been certified?', 'Radiation Safety / Projects', 'Critical', 'Dental', 'Lead acrylic barrier >= 1.5 mm Pb equivalence', 'Dental radiation survey sign-off', 126],
        ['SP127', 'SP-17', 'Required equipment mounting, power or patient access provisions incomplete', 'Are hydrotherapy, traction tables, or rehabilitation gym anchor points and RCD protected power ready?', 'Civil / Projects', 'Medium', 'Physiotherapy', 'Hoist anchors load tested to 250 kg; 30mA RCD', 'Rehab equipment safety check', 127],
        ['SP128', 'SP-17', 'Equipment locations obstruct emergency access or patient flow', 'Do proposed equipment footprints in resuscitation bays impede trauma stretcher docking or medical team movement?', 'Clinical Engineering / Facilities', 'Critical', 'Emergency Department', 'Clear resuscitation perimeter >= 1.2 m around trolley', 'Trauma bay ergonomics survey', 128],
        ['SP129', 'SP-17', 'Required refrigeration, drainage or ventilation not ready', 'Are mortuary body refrigeration units (2 to 4 deg C), body table drainage, and dedicated high-ACH exhaust active?', 'Clinical Engineering / Facilities', 'High', 'Mortuary', 'Exhaust: >= 12 ACH direct external exhaust', 'Mortuary environmental certification', 129],
        ['SP130', 'SP-17', 'Required plant capacity, alarms, redundancy or commissioning documentation incomplete', 'Is the central medical gas plant (compressors, vacuum pumps, manifold banks) operational with N+1 redundancy?', 'Medical Gas / Facilities', 'Critical', 'Medical gas plant', 'Full N+1 backup redundancy verified under full hospital load', 'Central MGPS plant commissioning cert', 130]
    ];

    $itemStmt = $pdo->prepare("INSERT INTO `site_checklist_master` 
        (`item_code`, `category_code`, `deficiency_title`, `inspection_question`, `responsible_department`, `default_priority`, `specialist_department`, `standard_tolerance`, `evidence_required`, `sort_order`)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
        `category_code`=VALUES(`category_code`),
        `deficiency_title`=VALUES(`deficiency_title`),
        `inspection_question`=VALUES(`inspection_question`),
        `responsible_department`=VALUES(`responsible_department`),
        `default_priority`=VALUES(`default_priority`),
        `specialist_department`=VALUES(`specialist_department`),
        `standard_tolerance`=VALUES(`standard_tolerance`),
        `evidence_required`=VALUES(`evidence_required`),
        `sort_order`=VALUES(`sort_order`)");

    foreach ($items as $item) {
        $itemStmt->execute($item);
    }
    echo "[+] Seeded all 130 Master Checklist Questions & Complaints (SP001 to SP130).\n";

    // ==========================================
    // SEED: Sample Real-World Hospital Inspections
    // ==========================================
    $sampleAudits = [
        [
            'SA-AUD-2026-001', 'SA', 'King Fahad Medical City — Riyadh', 6, 'MRI-Room-02', 'Radiology Building B', 'Basement 1', 36,
            'Magnetom Vida 3.0T MRI Scanner', 5, 'Eng. Tariq Al-Otaibi (Siemens Healthineers)', 'Eng. Faisal Al-Zahrani (Lead BioMed)',
            'Al-Bawani Contracting Co.', '2026-11-15', '2026-11-20', '2026-10-18', 'Remediation Required', 78.50, 1, 3,
            'Saudi MOH Hospital Commissioning Audit: RF Faraday cage completed and certified. Quench pipe emergency diffuser needs final external clearance. Chilled-water primary supply within tolerance.'
        ],
        [
            'BH-AUD-2026-002', 'BH', 'King Hamad University Hospital — Busaiteen', 2, 'OT-Suite-04', 'Surgical Pavilion Tower A', '2nd Floor', 38,
            'Artis pheno Robotic C-Arm Hybrid Operating Suite', 2, 'Eng. Marcus Weber (Getinge & Philips)', 'Eng. Hassan Al-Majed (SanDS Lab)',
            'Al-Moayyed Construction Group', '2026-11-05', '2026-11-10', '2026-10-20', 'Approved & Ready for Delivery', 98.20, 0, 0,
            'NHRA Bahrain Pre-Installation Clearance: 100% compliant. Lead shielding 2.5mm Pb verified, laminar airflow 0.45 m/s certified, clean agent suppression live, isolated power system tested.'
        ],
        [
            'AE-AUD-2026-003', 'AE', 'Mediclinic City Hospital — Dubai Healthcare City', 1, 'ICU-Bed-08', 'Critical Care Complex', '3rd Floor', 19,
            'Maquet SERVO-u Advanced ICU Ventilator Fleet', 1, 'Eng. Suresh Nair (Getinge Dubai)', 'Eng. Mariam Al-Baloushi (DHA Clinical Lead)',
            'Khansaheb Facilities Management', '2026-10-30', '2026-11-02', '2026-10-19', 'Conditional Clearance', 91.00, 0, 2,
            'MOHAP / DHA Audit: Medical Air and Oxygen pipeline pressure certified at 4.1 bar. Telemetry LAN drop port 4 needs switch activation and patch cord labelling.'
        ],
        [
            'QA-AUD-2026-004', 'QA', 'Hamad General Hospital — Doha', 5, 'Dialysis-Bay-12', 'Nephrology & Dialysis Center', '1st Floor', 51,
            'Fresenius 5008S CorDiax Hemodialysis System', 6, 'Eng. Nabil Mansour (Fresenius Medical Care)', 'Eng. Ahmed Al-Kuwari (HMC BioMed)',
            'Midmac Contracting', '2026-11-25', '2026-12-01', '2026-10-15', 'Remediation Required', 68.00, 2, 4,
            'MOPH Qatar Pre-Installation Audit: Dialysis RO water loop sanitization in progress; microbiological endotoxin testing pending third-party laboratory verification.'
        ]
    ];

    $auditInsert = $pdo->prepare("INSERT INTO `site_inspections` 
        (`audit_number`, `country_code`, `facility_name`, `department_id`, `room_number`, `building`, `floor`, `equipment_type_id`, `target_model`, `vendor_id`, `vendor_project_manager`, `lead_biomedical_engineer`, `contractor_representative`, `target_delivery_date`, `target_installation_date`, `inspection_date`, `overall_status`, `readiness_percentage`, `critical_deficiencies_count`, `open_deficiencies_count`, `notes`)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE `overall_status`=VALUES(`overall_status`), `readiness_percentage`=VALUES(`readiness_percentage`)");

    foreach ($sampleAudits as $a) {
        $auditInsert->execute($a);
    }
    echo "[+] Seeded sample site preparation inspection audits.\n";

    // ==========================================
    // SEED: Sample Real-World Deficiencies (Punch List)
    // ==========================================
    $auditMap = $pdo->query("SELECT audit_number, id FROM `site_inspections`")->fetchAll(PDO::FETCH_KEY_PAIR);
    $itemMap = $pdo->query("SELECT item_code, id FROM `site_checklist_master`")->fetchAll(PDO::FETCH_KEY_PAIR);

    $sampleDeficiencies = [
        [
            'DEF-2026-001', $auditMap['SA-AUD-2026-001'] ?? 1, $itemMap['SP076'] ?? 76, 'SP-11', 'MRI quench pipe emergency vent clearance blocked',
            'External cryogen emergency discharge diffuser on rooftop is within 4.5 meters of building air intake louver. Saudi MOH and Siemens specification requires minimum 6.0m separation.',
            'HVAC / Facilities', 'Al-Bawani Mechanical Div', 'Critical', 'In progress',
            'Rerouting quench discharge stainless steel pipe with 2 x 45-degree elbows to ensure 7.2 meter separation from AHU fresh air intake.',
            '2026-10-28', 1
        ],
        [
            'DEF-2026-002', $auditMap['SA-AUD-2026-001'] ?? 1, $itemMap['SP028'] ?? 28, 'SP-05', 'Chilled-water heat dissipation margin below specification',
            'Primary chilled-water differential pressure across magnet heat exchanger dropped to 1.1 bar under simulated full gradient ramp (spec requires 1.8 bar).',
            'HVAC / Facilities', 'Al-Bawani MEP Subcontractor', 'High', 'Open',
            'Clean inline strainers, balance hydronic circuit valves, and activate secondary booster pump.',
            '2026-10-26', 1
        ],
        [
            'DEF-2026-003', $auditMap['AE-AUD-2026-003'] ?? 3, $itemMap['SP053'] ?? 53, 'SP-08', 'VLAN medical isolation configuration pending on Switch-ICU-03',
            'Port 14 on switch stack designated for central ventilator monitoring is currently mapped to general admin VLAN instead of isolated Clinical VLAN 140.',
            'IT / Biomedical', 'Mediclinic Hospital IT Team', 'Medium', 'Assigned to department',
            'Reassign switchport access vlan 140 and configure QoS priority 6 for life-critical telemetry.',
            '2026-10-25', 0
        ],
        [
            'DEF-2026-004', $auditMap['QA-AUD-2026-004'] ?? 4, $itemMap['SP110'] ?? 110, 'SP-17', 'Dialysis RO water endotoxin level exceeds 0.25 EU/ml limit',
            'Water sample from Dialysis Loop Bay 12 tested at 0.38 EU/ml. Fails ISO 23500 threshold of < 0.25 EU/ml.',
            'Plumbing / Facilities', 'Midmac Water Treatment Specialists', 'Critical', 'In progress',
            'Execute thermal sanitization at 85 deg C for 4 hours followed by peracetic acid chemical flush; re-test on 23-Oct-2026.',
            '2026-10-27', 1
        ]
    ];

    $defStmt = $pdo->prepare("INSERT INTO `site_deficiencies`
        (`deficiency_ticket`, `inspection_id`, `checklist_item_id`, `category_code`, `title`, `description`, `assigned_department`, `contractor_assigned`, `priority`, `status`, `corrective_action_plan`, `due_date`, `blocks_installation`)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE `status`=VALUES(`status`), `priority`=VALUES(`priority`)");

    foreach ($sampleDeficiencies as $d) {
        if (!empty($d[1]) && !empty($d[2])) {
            $defStmt->execute($d);
        }
    }
    echo "[+] Seeded sample site preparation deficiencies and corrective punch-list.\n";

    // ==========================================
    // SEED: Official Handover Sign-off Certificate for Audit #2
    // ==========================================
    $certStmt = $pdo->prepare("INSERT INTO `site_readiness_approvals`
        (`certificate_number`, `inspection_id`, `approved_readiness_score`, `biomedical_engineer_signature`, `biomedical_signed_at`, `facilities_director_signature`, `facilities_signed_at`, `vendor_pm_signature`, `vendor_signed_at`, `hospital_director_signature`, `hospital_director_signed_at`, `dispatch_clearance_granted`, `special_operating_conditions`)
        VALUES (?, ?, ?, ?, NOW(), ?, NOW(), ?, NOW(), ?, NOW(), 1, ?)
        ON DUPLICATE KEY UPDATE `approved_readiness_score`=VALUES(`approved_readiness_score`)");

    $bhAuditId = $auditMap['BH-AUD-2026-002'] ?? null;
    if ($bhAuditId) {
        $certStmt->execute([
            'SRC-BH-2026-0089',
            $bhAuditId, // KHUH Hybrid OT
            98.20,
            'Eng. Hassan Al-Majed, Lead Biomedical Engineer (SanDS Lab Middle East)',
            'Eng. Abdulla Al-Khalifa, Director of Hospital Facilities & Engineering',
            'Marcus Weber, Project Director (Getinge & Philips Healthcare)',
            'Dr. Khalid Al-Dosari, Chief Executive Officer & Medical Director',
            'Official NHRA Pre-Installation Certificate: Room Suite 04 cleared for unconditional robotic C-Arm and Hybrid OT table delivery, rigging, uncrating, and clinical commissioning.'
        ]);
        echo "[+] Seeded official site readiness approval handover certificate.\n";
    }

    echo "======================================================================\n";
    echo "[+] VERSION 2.0 SITE PREPARATION PROCEDURES DATABASE READY!\n";
    echo "======================================================================\n";
} catch (PDOException $e) {
    echo "[-] Database Error: " . $e->getMessage() . "\n";
    exit(1);
}
