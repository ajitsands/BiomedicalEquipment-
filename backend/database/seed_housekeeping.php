<?php
// BioTrack CMMS — Housekeeping & Infection Control Module
// Bahrain (NHRA) & WHO 3-Layer Environmental Cleaning & Complaint Management System
// Powered and Engineered by SaNDS Lab Middle East W.L.L

require_once __DIR__ . '/../config/db.php';

try {
    echo "[*] Initializing Housekeeping & Infection Prevention Database Migration...\n";

    // 1. Standards Master (Layer 1: WHO, Layer 2: NHRA Bahrain, Layer 3: Hospital SOP)
    $pdo->exec("CREATE TABLE IF NOT EXISTS `housekeeping_standards` (
        `standard_code` VARCHAR(30) PRIMARY KEY,
        `name` VARCHAR(150) NOT NULL,
        `authority` VARCHAR(150) NOT NULL,
        `badge_color` VARCHAR(30) DEFAULT '#0284c7',
        `description` TEXT,
        `reference_doc` VARCHAR(255)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // 2. Complaint Categories Master (HK-01 to HK-16)
    $pdo->exec("CREATE TABLE IF NOT EXISTS `housekeeping_categories` (
        `code` VARCHAR(20) PRIMARY KEY,
        `name` VARCHAR(150) NOT NULL,
        `risk_level` ENUM('Critical', 'High', 'Medium', 'Low') NOT NULL DEFAULT 'Medium',
        `default_sla_hours` INT NOT NULL DEFAULT 4,
        `icon` VARCHAR(50) DEFAULT 'Sparkles',
        `area_group` VARCHAR(100) DEFAULT 'General',
        `example_deficiencies` TEXT,
        `sort_order` INT NOT NULL DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // 3. Inspection Checklist Master Questions (Categorized by Area & Standard Layer)
    $pdo->exec("CREATE TABLE IF NOT EXISTS `housekeeping_checklist_master` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `item_code` VARCHAR(20) NOT NULL UNIQUE,
        `category_code` VARCHAR(20) NOT NULL,
        `standard_layer` ENUM('NHRA_BAHRAIN', 'WHO_2023', 'HOSPITAL_SOP') NOT NULL DEFAULT 'WHO_2023',
        `area_type` VARCHAR(80) NOT NULL,
        `inspection_item` TEXT NOT NULL,
        `acceptance_criteria` TEXT NOT NULL,
        `verification_method` VARCHAR(150) DEFAULT 'Visual Inspection & Surface Swab / Contact Check',
        `frequency` VARCHAR(50) DEFAULT 'Each Shift / Daily',
        `is_regulatory_mandate` TINYINT(1) NOT NULL DEFAULT 0,
        `sort_order` INT NOT NULL DEFAULT 1,
        FOREIGN KEY (`category_code`) REFERENCES `housekeeping_categories`(`code`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // 4. Housekeeping Inspections / Terminal Clearance Audits
    $pdo->exec("CREATE TABLE IF NOT EXISTS `housekeeping_inspections` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `audit_number` VARCHAR(50) NOT NULL UNIQUE,
        `facility_name` VARCHAR(150) NOT NULL DEFAULT 'King Hamad University Hospital / Salmaniya Medical Complex',
        `department_id` INT NULL,
        `room_number` VARCHAR(80) NOT NULL,
        `building` VARCHAR(100) NOT NULL DEFAULT 'Main Clinical Tower',
        `floor` VARCHAR(50) NOT NULL DEFAULT 'Floor 2',
        `area_type` VARCHAR(80) NOT NULL,
        `cleaning_type` ENUM('Routine', 'Scheduled', 'Discharge/Terminal', 'Spill Response', 'Deep Cleaning') NOT NULL DEFAULT 'Routine',
        `standard_framework` VARCHAR(50) NOT NULL DEFAULT 'WHO_NHRA_COMBINED',
        `inspector_name` VARCHAR(120) NOT NULL,
        `inspector_role` VARCHAR(100) DEFAULT 'Infection Control Link Nurse / Housekeeping Supervisor',
        `supervisor_name` VARCHAR(120) DEFAULT NULL,
        `status` ENUM('In Progress', 'Passed', 'Conditional', 'Failed') NOT NULL DEFAULT 'In Progress',
        `score_percent` DECIMAL(5,2) DEFAULT 0.00,
        `total_items` INT DEFAULT 0,
        `passed_items` INT DEFAULT 0,
        `failed_items` INT DEFAULT 0,
        `na_items` INT DEFAULT 0,
        `critical_deficiencies_count` INT DEFAULT 0,
        `certificate_issued` TINYINT(1) DEFAULT 0,
        `certificate_number` VARCHAR(60) DEFAULT NULL,
        `conducted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `notes` TEXT,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // 5. Housekeeping Inspection Item Results
    $pdo->exec("CREATE TABLE IF NOT EXISTS `housekeeping_inspection_results` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `inspection_id` INT NOT NULL,
        `checklist_item_id` INT NOT NULL,
        `status` ENUM('Pass', 'Fail', 'N/A') NOT NULL DEFAULT 'Pass',
        `notes` TEXT,
        `photo_evidence` VARCHAR(255) DEFAULT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`inspection_id`) REFERENCES `housekeeping_inspections`(`id`) ON DELETE CASCADE,
        FOREIGN KEY (`checklist_item_id`) REFERENCES `housekeeping_checklist_master`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // 6. Housekeeping Complaints & Deficiency Tickets (HK-01 to HK-16)
    $pdo->exec("CREATE TABLE IF NOT EXISTS `housekeeping_complaints` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `complaint_number` VARCHAR(50) NOT NULL UNIQUE,
        `category_code` VARCHAR(20) NOT NULL,
        `title` VARCHAR(255) NOT NULL,
        `description` TEXT NOT NULL,
        `department_id` INT NULL,
        `building` VARCHAR(100) NOT NULL DEFAULT 'Main Building',
        `floor` VARCHAR(50) NOT NULL DEFAULT 'Ground Floor',
        `room_number` VARCHAR(80) NOT NULL,
        `specific_location` VARCHAR(150) DEFAULT NULL,
        `cleaning_type` ENUM('Routine', 'Scheduled', 'Discharge/Terminal', 'Spill Response', 'Deep Cleaning') NOT NULL DEFAULT 'Routine',
        `risk_level` ENUM('Critical', 'High', 'Medium', 'Low') NOT NULL DEFAULT 'Medium',
        `standard_layer` ENUM('NHRA_BAHRAIN', 'WHO_2023', 'HOSPITAL_SOP') NOT NULL DEFAULT 'HOSPITAL_SOP',
        `status` ENUM('Open', 'In Progress', 'Pending Verification', 'Closed', 'Escalated') NOT NULL DEFAULT 'Open',
        `is_repeat` TINYINT(1) NOT NULL DEFAULT 0,
        `repeat_count` INT NOT NULL DEFAULT 0,
        `assigned_team` VARCHAR(120) DEFAULT 'Internal Housekeeping Team',
        `assigned_employee` VARCHAR(120) DEFAULT NULL,
        `contractor_name` VARCHAR(150) DEFAULT 'Sanitary Services Co. W.L.L',
        `corrective_action_required` TEXT,
        `corrective_action_taken` TEXT,
        `target_sla_hours` INT NOT NULL DEFAULT 4,
        `target_completion_at` DATETIME NULL,
        `reported_by` VARCHAR(120) NOT NULL,
        `reported_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `resolved_at` DATETIME NULL,
        `verified_by` VARCHAR(120) DEFAULT NULL,
        `verified_at` DATETIME NULL,
        `closure_notes` TEXT,
        `photo_before` VARCHAR(255) DEFAULT NULL,
        `photo_after` VARCHAR(255) DEFAULT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`category_code`) REFERENCES `housekeeping_categories`(`code`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    echo "[*] Tables created successfully. Seeding Master Standards & Categories...\n";

    // Seed Standards
    $pdo->exec("INSERT INTO `housekeeping_standards` (`standard_code`, `name`, `authority`, `badge_color`, `description`, `reference_doc`) VALUES
    ('NHRA_BAHRAIN', 'Bahrain NHRA Healthcare Facilities Inspection Standard', 'National Health Regulatory Authority (Bahrain)', '#dc2626', 'Official Bahrain healthcare-facility inspection standards addressing infection prevention, medical waste, spill response, laundry, and patient safety.', 'NHRA Quality Management, Safety & Medical Waste Checklist'),
    ('WHO_2023', 'WHO Environmental Cleaning & Infection Prevention', 'World Health Organization (WHO)', '#0284c7', 'WHO 2023 Training Package on Environmental Cleaning, high-touch surfaces, disinfectant dilution ratios, contact times, and competency checks.', 'WHO 2023 Healthcare Environmental Cleaning Guidelines'),
    ('WASH_FIT', 'WHO / UNICEF WASH FIT Facility Improvement', 'WHO & UNICEF', '#059669', 'Water, sanitation, hygiene, healthcare waste management and continuous facility improvement matrix for healthcare facilities.', 'WASH FIT Assessment Tool v2.0'),
    ('HOSPITAL_SOP', 'Hospital Approved Housekeeping SOPs', 'Hospital Infection Control Committee (HICC)', '#7c3aed', 'Hospital-specific cleaning frequencies, approved chemical brands, color-coded microfiber cloth coding, and operational SLAs.', 'Hospital Housekeeping Policy & Procedure Manual')
    ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `description`=VALUES(`description`);");

    // Seed 16 Complaint Categories (HK-01 to HK-16)
    $categories = [
        ['HK-01', 'Patient rooms', 'High', 2, 'Bed', 'Inpatient Care', 'Bedside table dirty, bed rails not disinfected, floor stains, call bell soiled'],
        ['HK-02', 'Toilets and bathrooms', 'High', 2, 'Droplets', 'Sanitary Facilities', 'Toilet unclean, foul odour, soap dispenser empty, wet slippery floor, exhaust fan dusty'],
        ['HK-03', 'ICU and critical care', 'Critical', 1, 'Activity', 'Critical Care', 'High-touch surfaces missed, ventilator exterior soiled, infusion pump stained, floor not disinfected'],
        ['HK-04', 'Operating theatres', 'Critical', 1, 'ShieldAlert', 'Surgical Suites', 'Terminal cleaning incomplete, surgical light soiled, required air-settle cleaning verification missing'],
        ['HK-05', 'Isolation rooms', 'Critical', 1, 'AlertTriangle', 'Infection Control', 'Required PPE or airborne/contact isolation cleaning procedure not followed, anteroom cluttered'],
        ['HK-06', 'Corridors and public areas', 'Medium', 4, 'DoorOpen', 'Public Areas', 'Dust on skirting boards, litter, liquid spills, obstructed emergency egress walkways'],
        ['HK-07', 'Waste management', 'Critical', 2, 'Trash2', 'Hazardous & Clinical Waste', 'Clinical waste bin overflowing, improper segregation (sharps in yellow bag), foot-pedal broken'],
        ['HK-08', 'Blood and body-fluid spills', 'Critical', 1, 'Biohazard', 'Emergency Response', 'Spill kit not deployed, blood spill not isolated with 10,000 PPM chlorine bleach granules'],
        ['HK-09', 'Cleaning materials', 'High', 3, 'Beaker', 'Chemical Storage', 'Disinfectant unavailable, dilution incorrect, expired sodium hypochlorite solution, unlabelled spray bottle'],
        ['HK-10', 'Cleaning equipment', 'Medium', 4, 'Wrench', 'Housekeeping Utilities', 'Dirty mop head, contaminated cleaning cloth reused across rooms, damaged cleaning trolley'],
        ['HK-11', 'Hand hygiene', 'High', 2, 'Hand', 'Hand Hygiene Stations', 'ABHR (Alcohol-Based Hand Rub) dispenser empty, paper towel run out, non-functional sensor tap'],
        ['HK-12', 'Laundry and linen', 'High', 3, 'Layers', 'Linen Services', 'Soiled linen left exposed in corridor, clean linen trolley uncovered, linen chute door unlatched'],
        ['HK-13', 'Staff compliance', 'High', 3, 'UserCheck', 'Personnel & Training', 'PPE not used correctly (gloves/apron missing), cleaning schedule sign-off sheet not signed'],
        ['HK-14', 'Pest control', 'High', 4, 'Bug', 'Environmental Health', 'Insects or pests observed, insect light trap (ILT) full, pest-control vendor scheduled visit overdue'],
        ['HK-15', 'Environmental safety', 'Critical', 2, 'ShieldCheck', 'Facility Safety', 'Wet floor without yellow caution cone, cleaning chemical stored in unlocked patient-accessible area'],
        ['HK-16', 'Cleaning audit', 'High', 6, 'ClipboardCheck', 'Quality Assurance', 'Internal inspection failed, repeat deficiency unresolved, corrective action overdue beyond SLA']
    ];

    $catStmt = $pdo->prepare("INSERT INTO `housekeeping_categories` 
        (`code`, `name`, `risk_level`, `default_sla_hours`, `icon`, `area_group`, `example_deficiencies`, `sort_order`) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
        `name`=VALUES(`name`), `risk_level`=VALUES(`risk_level`), `default_sla_hours`=VALUES(`default_sla_hours`), 
        `example_deficiencies`=VALUES(`example_deficiencies`), `area_group`=VALUES(`area_group`);");

    $sort = 1;
    foreach ($categories as $cat) {
        $catStmt->execute([$cat[0], $cat[1], $cat[2], $cat[3], $cat[4], $cat[5], $cat[6], $sort++]);
    }

    echo "[*] Seeding 50+ Master Checklist Questions across Areas & 3 Layers...\n";

    $checklistItems = [
        // Patient Rooms (HK-01)
        ['HKM-001', 'HK-01', 'WHO_2023', 'Patient Rooms', 'High-Touch Surface Disinfection (Bed rails, nurse call button, TV remote, over-bed table)', 'Clean and disinfected using 1,000 PPM sodium hypochlorite or approved quaternary ammonium with minimum 3-min contact time.', 'Visual & Fluorescent Gel / ATP Swab', 'Each Shift / Terminal', 1],
        ['HKM-002', 'HK-01', 'NHRA_BAHRAIN', 'Patient Rooms', 'Floor Cleaning and Disinfection', 'Damp dusting and two-bucket mopping system used. No sweeping or dry dusting permitted in clinical rooms.', 'Visual & Mopping Procedure Check', 'Daily & Discharge', 1],
        ['HKM-003', 'HK-01', 'HOSPITAL_SOP', 'Patient Rooms', 'Curtain Replacement & Terminal Dusting', 'Privacy curtains clean, unstained, and changed every 30 days or immediately upon discharge of infectious patient.', 'Curtain Date Tag Inspection', 'Terminal / Discharge', 0],

        // Toilets & Bathrooms (HK-02)
        ['HKM-004', 'HK-02', 'NHRA_BAHRAIN', 'Toilets and Bathrooms', 'Sanitary Ware Disinfection & Scale Removal', 'Toilet bowl, flush handle, grab bars, and sink disinfected with hospital-grade disinfectant. No lime scale or biofilm.', 'Visual & Swab Check', 'Twice Daily / As Needed', 1],
        ['HKM-005', 'HK-02', 'WHO_2023', 'Toilets and Bathrooms', 'Consumables Replenishment (Soap & Paper Towels)', 'Wall-mounted liquid soap dispenser filled, touchless paper towel dispenser operational, handwash poster displayed.', 'Visual Verification', 'Twice Daily', 0],
        ['HKM-006', 'HK-02', 'HOSPITAL_SOP', 'Toilets and Bathrooms', 'Floor Slip Resistance & Drainage Cleanliness', 'Floor dry, clean, drain cover in place with water trap primed to prevent sewer gas egress.', 'Physical & Odour Check', 'Each Shift', 0],

        // ICU and Critical Care (HK-03)
        ['HKM-007', 'HK-03', 'WHO_2023', 'ICU and Critical Care', 'Critical Medical Equipment Exterior Decontamination', 'Monitor bezels, ventilator exteriors, IV poles, and infusion pump housings wiped with compatible disinfectant wipes.', 'Supervised Visual & Swab', 'Each Shift & Terminal', 1],
        ['HKM-008', 'HK-03', 'NHRA_BAHRAIN', 'ICU and Critical Care', 'Terminal Cleaning Verification for Discharged / Transferred ICU Bed', 'Complete terminal clean performed. Environmental cleaning checklist signed by both housekeeping supervisor and ICU in-charge.', 'Signed Verification Log', 'Discharge / Terminal', 1],
        ['HKM-009', 'HK-03', 'WHO_2023', 'ICU and Critical Care', 'Dedicated Color-Coded Cleaning Materials in ICU', 'Red/Yellow microfiber cloths strictly dedicated to critical isolation cubicles and never transferred between patient bays.', 'Cart Audit', 'Continuous', 1],

        // Operating Theatres (HK-04)
        ['HKM-010', 'HK-04', 'NHRA_BAHRAIN', 'Operating Theatres', 'OT Morning Pre-Op Damp Dusting', 'All horizontal surfaces damp dusted with hospital disinfectant at least 1 hour prior to the first scheduled surgical case.', 'Pre-Op Checklist Log', 'Daily Pre-Op', 1],
        ['HKM-011', 'HK-04', 'NHRA_BAHRAIN', 'Operating Theatres', 'Between-Case Disinfection Protocol', 'Surgical table, anesthesia machine cart, mayo stands, floor perimeter disinfected; linen and waste bags removed.', 'Turnover Audit', 'Between Every Case', 1],
        ['HKM-012', 'HK-04', 'WHO_2023', 'Operating Theatres', 'OT End-of-Day Terminal Cleaning & Settle Period', 'Walls up to 2m, surgical lights, scrub sinks, and entire floor scrubbed; room left undisturbed for required air exchange.', 'Terminal Clean Sign-off', 'Daily Post-Op', 1],
        ['HKM-013', 'HK-04', 'HOSPITAL_SOP', 'Operating Theatres', 'Weekly OT Deep Cleaning and HEPA Return Grilles', 'Return air grilles vacuumed with HEPA filter, mobile equipment wheels cleaned and disinfected.', 'Weekly Facility Log', 'Weekly', 0],

        // Isolation Rooms (HK-05)
        ['HKM-014', 'HK-05', 'NHRA_BAHRAIN', 'Isolation Rooms', 'Airborne & Contact Isolation PPE Protocol', 'Staff donning designated PPE (N95/FFP2, gown, gloves, eye protection) before entry; doffing properly in anteroom.', 'Direct Observation', 'Every Entry', 1],
        ['HKM-015', 'HK-05', 'WHO_2023', 'Isolation Rooms', 'Negative Pressure Differential & Room Air Seal', 'Negative pressure monitor verified green (differential >= 2.5 Pa) prior to starting cleaning; door kept closed.', 'Digital Gauge Check', 'Daily & Terminal', 1],
        ['HKM-016', 'HK-05', 'WHO_2023', 'Isolation Rooms', 'Isolation Terminal Disinfection (Sporicidal / Chlorine 5,000 PPM)', 'Sporicidal agent or 5,000 PPM chlorine bleach used for terminal clean following C. diff or MDR pathogen discharge.', 'Dilution & Contact Log', 'Terminal Clearance', 1],

        // Corridors & Public Areas (HK-06)
        ['HKM-017', 'HK-06', 'HOSPITAL_SOP', 'Corridors and Public Areas', 'Corridor Handrail and High-Touch Surface Sanitation', 'Public handrails, elevator push buttons, and directory displays wiped every 4 hours.', 'Log Sheet Inspection', 'Every 4 Hours', 0],
        ['HKM-018', 'HK-06', 'NHRA_BAHRAIN', 'Corridors and Public Areas', 'Unobstructed Egress & Spill Free Floors', 'Corridors clear of excess trolleys, beds, and rubbish; wet cleaning signs clearly posted.', 'Walkthrough Audit', 'Continuous', 1],

        // Waste Management (HK-07)
        ['HKM-019', 'HK-07', 'NHRA_BAHRAIN', 'Waste Management', 'Biohazard & Clinical Waste Color-Coding (Yellow / Red / Black)', 'Yellow bags for clinical/infectious waste, Black for domestic waste; strictly segregated at point of generation.', 'Waste Audit Walkthrough', 'Daily Audit', 1],
        ['HKM-020', 'HK-07', 'NHRA_BAHRAIN', 'Waste Management', 'Sharps Container Safety and Fill Level', 'Puncture-proof yellow sharps containers mounted at safe height, replaced when 3/4 full, lid lock verified.', 'Physical Inspection', 'Daily', 1],
        ['HKM-021', 'HK-07', 'WHO_2023', 'Waste Management', 'Internal Waste Storage and Transportation Trolleys', 'Dedicated enclosed leak-proof waste carts used; carts washed and disinfected daily in sluice room.', 'Sluice Room Check', 'Daily', 0],

        // Blood and Body-Fluid Spills (HK-08)
        ['HKM-022', 'HK-08', 'NHRA_BAHRAIN', 'Blood and Body-Fluid Spills', 'Emergency Spill Kit Readiness & Accessibility', 'Spill kit present in every clinical department with granules/pads, gloves, apron, goggles, scoop, and yellow disposal bag.', 'Spill Kit Inventory Check', 'Monthly Verification', 1],
        ['HKM-023', 'HK-08', 'WHO_2023', 'Blood and Body-Fluid Spills', 'Spill Management Standard Operating Procedure', 'Large spills covered with absorbent granules / 10,000 PPM chlorine, left for 5-10 min contact before scoop disposal.', 'Staff Competency Drill', 'Quarterly Drill', 1],

        // Cleaning Materials & Chemicals (HK-09)
        ['HKM-024', 'HK-09', 'WHO_2023', 'Cleaning Materials', 'Disinfectant Preparation & Daily Dilution Verification', 'Chlorine / Sodium Hypochlorite solutions prepared daily in opaque containers; test strips used to verify PPM level.', 'Chlorine Test Strip Log', 'Daily Morning', 1],
        ['HKM-025', 'HK-09', 'NHRA_BAHRAIN', 'Cleaning Materials', 'Chemical Storage, Labelling & Safety Data Sheets (SDS)', 'All secondary chemical bottles clearly labeled with contents and expiry; SDS binders accessible in Janitor closet.', 'Janitor Closet Audit', 'Weekly', 1],

        // Cleaning Equipment & Trolleys (HK-10)
        ['HKM-026', 'HK-10', 'WHO_2023', 'Cleaning Equipment', 'Color-Coded Microfiber Cloth and Mop System', 'Red (Toilets), Yellow (Isolation/High Risk), Blue (General/Patient areas), Green (Kitchen/Pantry) strictly adhered to.', 'Trolley Inspection', 'Daily Audit', 1],
        ['HKM-027', 'HK-10', 'HOSPITAL_SOP', 'Cleaning Equipment', 'Housekeeping Trolley Cleanliness & Restocking', 'Trolleys sanitized at end of shift; mops hung inverted in drying racks; no soiled linen stored on top shelf.', 'End-of-Shift Check', 'End of Shift', 0],

        // Hand Hygiene Facilities (HK-11)
        ['HKM-028', 'HK-11', 'WHO_2023', 'Hand Hygiene', 'Alcohol-Based Hand Rub (ABHR) Point of Care Availability', 'ABHR dispensers installed at each patient bedside, entrance of room, and nursing stations; minimum 70% alcohol.', 'Facility Walkthrough', 'Daily Morning', 1],
        ['HKM-029', 'HK-11', 'NHRA_BAHRAIN', 'Hand Hygiene', 'Clinical Handwashing Sinks & Non-Touch Fixtures', 'Dedicated handwash sinks equipped with elbow-action or sensor taps, liquid antimicrobial soap, and paper towels.', 'Sink Audit', 'Weekly', 1],

        // Laundry & Linen Handling (HK-12)
        ['HKM-030', 'HK-12', 'NHRA_BAHRAIN', 'Laundry and Linen', 'Infectious Soiled Linen Segregation & Soluble Bags', 'Linen contaminated with blood/pathogens sealed in water-soluble alginate bags inside designated red infectious linen hamper.', 'Hamper Audit', 'Daily Walkthrough', 1],
        ['HKM-031', 'HK-12', 'HOSPITAL_SOP', 'Laundry and Linen', 'Clean Linen Storage and Transport Protection', 'Clean linen stored in dedicated enclosed cupboards minimum 20cm off floor; transported in fully covered carts.', 'Linen Store Check', 'Daily', 0],

        // Staff Compliance & Training (HK-13)
        ['HKM-032', 'HK-13', 'WHO_2023', 'Staff Compliance', 'Housekeeping Staff Infection Prevention Competency Certification', 'All staff completed WHO 2023 environmental cleaning training and hold valid MOH/NHRA occupational health card.', 'HR Training Records', 'Quarterly Review', 1],
        ['HKM-033', 'HK-13', 'HOSPITAL_SOP', 'Staff Compliance', 'Daily Cleaning Schedule & Supervisor Sign-off', 'Cleaning schedule logs posted outside each toilet and room; initialed by operator and verified by shift supervisor.', 'Physical Log Inspection', 'Daily Post-Shift', 0],

        // Pest Control (HK-14)
        ['HKM-034', 'HK-14', 'NHRA_BAHRAIN', 'Pest Control', 'Approved Pest Control Service & Insect Light Traps', 'Monthly pest control treatment by licensed vendor; electronic fly catchers operational with clean sticky boards.', 'Vendor Report Audit', 'Monthly', 1],

        // Environmental Safety (HK-15)
        ['HKM-035', 'HK-15', 'NHRA_BAHRAIN', 'Environmental Safety', 'Hazardous Chemical Lockout and Eye Wash Station', 'Housekeeping stores locked; eyewash station in sluice room inspected and tested weekly with flow tag intact.', 'Weekly Safety Check', 'Weekly', 1],
        ['HKM-036', 'HK-15', 'HOSPITAL_SOP', 'Environmental Safety', 'Wet Floor Warning Signs and Cable Safety', 'High-visibility bilingual (Arabic/English) wet floor warning cones deployed during any wet mopping operations.', 'Direct Observation', 'Continuous', 0],

        // Cleaning Audit & Quality Assurance (HK-16)
        ['HKM-037', 'HK-16', 'WHO_2023', 'Cleaning Audit', 'Fluorescent Marker / ATP Bioluminescence Cleanliness Verification', 'Random surface sampling conducted using fluorescent marker or ATP meter; cleanliness threshold >= 85% pass.', 'ATP Swab Report', 'Bi-weekly Audit', 0],
        ['HKM-038', 'HK-16', 'NHRA_BAHRAIN', 'Cleaning Audit', 'Root Cause Analysis for Repeat Housekeeping Complaints', 'Repeat complaints (>2 in same department within 30 days) investigated with formal Corrective and Preventive Action (CAPA).', 'CAPA Quality Log', 'Monthly Quality Review', 1]
    ];

    $itemStmt = $pdo->prepare("INSERT INTO `housekeeping_checklist_master` 
        (`item_code`, `category_code`, `standard_layer`, `area_type`, `inspection_item`, `acceptance_criteria`, `verification_method`, `frequency`, `is_regulatory_mandate`, `sort_order`) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
        `inspection_item`=VALUES(`inspection_item`), `acceptance_criteria`=VALUES(`acceptance_criteria`), 
        `standard_layer`=VALUES(`standard_layer`), `is_regulatory_mandate`=VALUES(`is_regulatory_mandate`);");

    $i = 1;
    foreach ($checklistItems as $item) {
        $itemStmt->execute([
            $item[0], $item[1], $item[2], $item[3], $item[4], $item[5], $item[6], $item[7], $item[8], $i++
        ]);
    }

    echo "[*] Seeding Sample Active Room Audits and Sample Complaints...\n";

    // Sample Audits
    $audits = [
        [
            'HKA-2026-0001', 'King Hamad University Hospital', 1, 'Room 204 - Inpatient Suite', 'Inpatient Ward B', 'Floor 2',
            'Patient Rooms', 'Discharge/Terminal', 'WHO_NHRA_COMBINED', 'Nurse Fatima Al-Doseri', 'Lead Infection Control Nurse',
            'Mr. Tariq Al-Mansoor', 'Passed', 96.50, 20, 19, 0, 1, 0, 1, 'CERT-HK-2026-0012',
            'Terminal clean completed following patient discharge. High-touch surfaces swabbed and certified ready for admission.'
        ],
        [
            'HKA-2026-0002', 'Salmaniya Medical Complex', 2, 'OT-3 Major Orthopedic Suite', 'Surgical Pavilion', 'Floor 1',
            'Operating Theatres', 'Discharge/Terminal', 'WHO_NHRA_COMBINED', 'Dr. Jasim Bu-Ali', 'OT Housekeeping Inspector',
            'Eng. Sara Khalil', 'Passed', 100.00, 24, 24, 0, 0, 0, 1, 'CERT-HK-2026-0013',
            'End of day terminal disinfection verified. HEPA air circulation and surgical lights sanitized.'
        ],
        [
            'HKA-2026-0003', 'King Hamad University Hospital', 3, 'Isolation Cubicle ISO-02', 'ICU & Critical Care', 'Floor 3',
            'Isolation Rooms', 'Discharge/Terminal', 'WHO_NHRA_COMBINED', 'Nurse Zainab Al-Qassim', 'Infection Control Specialist',
            'Dr. Nawaf Al-Haddad', 'Conditional', 84.00, 25, 21, 3, 1, 1, 0, null,
            'Chlorine solution contact time was insufficient (less than 5 minutes). Re-cleaning ordered before patient admission.'
        ]
    ];

    $auditStmt = $pdo->prepare("INSERT INTO `housekeeping_inspections`
        (`audit_number`, `facility_name`, `department_id`, `room_number`, `building`, `floor`, `area_type`, `cleaning_type`, `standard_framework`, `inspector_name`, `inspector_role`, `supervisor_name`, `status`, `score_percent`, `total_items`, `passed_items`, `failed_items`, `na_items`, `critical_deficiencies_count`, `certificate_issued`, `certificate_number`, `notes`)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE `status`=VALUES(`status`), `score_percent`=VALUES(`score_percent`);");

    foreach ($audits as $a) {
        $auditStmt->execute($a);
    }

    // Sample Complaints (HK-01 to HK-16)
    $complaints = [
        [
            'HKC-2026-0001', 'HK-04', 'OT-2 Terminal Clean Checklist Missing Sign-off',
            'Between-case disinfection completed but terminal cleaning log for OT-2 lacked supervisor sign-off before emergency case.',
            2, 'Surgical Pavilion', 'Floor 1', 'OT-2', 'Surgical suite entryway', 'Discharge/Terminal', 'Critical', 'NHRA_BAHRAIN',
            'Open', 0, 0, 'Surgical Housekeeping Team', 'Ammar Yusuf', 'Bahrain Cleaners W.L.L',
            'Inspect OT-2, re-verify surgical lights and table disinfection with quaternary solution, sign off supervisor log.',
            NULL, 1, date('Y-m-d H:i:s', strtotime('+1 hour')), 'Dr. Maryam Al-Saeed', NULL, NULL, NULL, NULL, NULL, NULL
        ],
        [
            'HKC-2026-0002', 'HK-08', 'Blood Spill in Emergency Triage Room 3',
            'Phlebotomy spill on floor not immediately cordoned off with caution cones. Spill kit granules required.',
            4, 'Emergency Department', 'Ground Floor', 'Triage Bay 3', 'Beside Phlebotomy Chair', 'Spill Response', 'Critical', 'NHRA_BAHRAIN',
            'In Progress', 0, 0, 'Rapid Spill Response Team', 'Ramesh Kumar', 'Sanitary Services Co. W.L.L',
            'Deploy biohazard spill kit, apply 10,000 PPM chlorine granules, absorb and bag in yellow clinical waste.',
            'Spill kit deployed, area cordoned with yellow tape.', 1, date('Y-m-d H:i:s', strtotime('+30 minutes')), 'Nurse Layla Ebrahim', NULL, NULL, NULL, NULL, NULL, NULL
        ],
        [
            'HKC-2026-0003', 'HK-07', 'Yellow Clinical Waste Bin Overflowing in Dialysis Unit',
            'Yellow biohazard bin exceeded 3/4 fill level during evening shift. Potential needle protrusion risk.',
            5, 'Nephrology & Dialysis', 'Floor 2', 'Dialysis Bay 6', 'Patient Station 6', 'Routine', 'High', 'NHRA_BAHRAIN',
            'Open', 1, 2, 'Waste Management Team', 'Mohammed Bilal', 'CleanCare Bahrain',
            'Tie off yellow clinical waste bag using swan-neck method, tag with ward code, replace with new yellow liner.',
            NULL, 2, date('Y-m-d H:i:s', strtotime('+2 hours')), 'Staff Nurse Noor Al-Ghatam', NULL, NULL, NULL, NULL, NULL, NULL
        ],
        [
            'HKC-2026-0004', 'HK-02', 'Public Toilet Soap Dispenser Empty & Water on Floor',
            'Main outpatient corridor toilet soap dispenser depleted; water pooled near hand wash sink without hazard sign.',
            1, 'Outpatient Department', 'Ground Floor', 'Public Restroom G-12', 'Sink Area & Cubicle 2', 'Routine', 'Medium', 'HOSPITAL_SOP',
            'Open', 0, 0, 'OPD Housekeeping Shift', 'Sunil Patel', 'Bahrain Cleaners W.L.L',
            'Mop and dry floor, deploy caution cone, refill anti-bacterial liquid soap dispenser.',
            NULL, 4, date('Y-m-d H:i:s', strtotime('+3 hours')), 'Patient Care Coordinator', NULL, NULL, NULL, NULL, NULL, NULL
        ],
        [
            'HKC-2026-0005', 'HK-09', 'Secondary Bleach Bottle Missing Dilution Date in Ward 3B',
            '500ml spray bottle with sodium hypochlorite lacked preparation date and PPM level. Risk of diminished efficacy.',
            1, 'Inpatient Medical Ward', 'Floor 3', 'Janitor Closet 3B', 'Shelf 2', 'Routine', 'High', 'WHO_2023',
            'Closed', 0, 0, 'Ward 3B Housekeeping', 'Rashid Al-Mahmood', 'Sanitary Services Co. W.L.L',
            'Discard unverified batch, freshly dilute 1,000 PPM chlorine, label container with prep date, time, and operator name.',
            'Batch discarded and fresh 1000 PPM solution prepared and labeled with batch sticker.',
            3, date('Y-m-d H:i:s', strtotime('-2 hours')), 'Quality Inspector Zahra', date('Y-m-d H:i:s', strtotime('-1 hour')),
            'Sister Anitha Jacob', date('Y-m-d H:i:s', strtotime('-30 minutes')), 'Verified compliant with WHO environmental cleaning guidelines.',
            NULL, NULL
        ]
    ];

    $compStmt = $pdo->prepare("INSERT INTO `housekeeping_complaints`
        (`complaint_number`, `category_code`, `title`, `description`, `department_id`, `building`, `floor`, `room_number`, `specific_location`, `cleaning_type`, `risk_level`, `standard_layer`, `status`, `is_repeat`, `repeat_count`, `assigned_team`, `assigned_employee`, `contractor_name`, `corrective_action_required`, `corrective_action_taken`, `target_sla_hours`, `target_completion_at`, `reported_by`, `resolved_at`, `verified_by`, `verified_at`, `closure_notes`, `photo_before`, `photo_after`)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE `status`=VALUES(`status`), `risk_level`=VALUES(`risk_level`);");

    foreach ($complaints as $c) {
        $compStmt->execute($c);
    }

    echo "[✓] Housekeeping & Infection Control migration and seeding successfully finished!\n";

} catch (PDOException $e) {
    echo "[!] Migration Error: " . $e->getMessage() . "\n";
    exit(1);
}
