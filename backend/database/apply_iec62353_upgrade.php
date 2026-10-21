<?php
require_once __DIR__ . '/../config/db.php';

echo "Starting IEC 62353 Database Schema & Checklist Upgrade...\n";

// 1. Add columns to equipment_types if missing
$colsET = $pdo->query("SHOW COLUMNS FROM equipment_types LIKE 'default_protection_class'")->fetchAll();
if (empty($colsET)) {
    $pdo->exec("ALTER TABLE equipment_types ADD COLUMN default_protection_class VARCHAR(30) DEFAULT 'Class I' AFTER standard_regulatory_code");
    echo "Added default_protection_class to equipment_types\n";
}

$colsET2 = $pdo->query("SHOW COLUMNS FROM equipment_types LIKE 'default_applied_part_type'")->fetchAll();
if (empty($colsET2)) {
    $pdo->exec("ALTER TABLE equipment_types ADD COLUMN default_applied_part_type VARCHAR(20) DEFAULT 'None' AFTER default_protection_class");
    echo "Added default_applied_part_type to equipment_types\n";
}

// 2. Add columns to equipments if missing
$colsEQ = $pdo->query("SHOW COLUMNS FROM equipments LIKE 'protection_class'")->fetchAll();
if (empty($colsEQ)) {
    $pdo->exec("ALTER TABLE equipments ADD COLUMN protection_class VARCHAR(30) DEFAULT 'Class I' AFTER criticality");
    echo "Added protection_class to equipments\n";
}

$colsEQ2 = $pdo->query("SHOW COLUMNS FROM equipments LIKE 'applied_part_type'")->fetchAll();
if (empty($colsEQ2)) {
    $pdo->exec("ALTER TABLE equipments ADD COLUMN applied_part_type VARCHAR(20) DEFAULT 'None' AFTER protection_class");
    echo "Added applied_part_type to equipments\n";
}

// 3. Define Class and Applied Part Type mappings for the 63 WHO equipment types
$cf_codes = ['BM-001', 'BM-002', 'BM-003', 'BM-015', 'BM-050'];
$none_codes = [
    'BM-020', 'BM-021', 'BM-023', 'BM-024', 'BM-025', 'BM-026',
    'BM-027', 'BM-028', 'BM-029', 'BM-030', 'BM-031', 'BM-032', 'BM-033', 'BM-034', 'BM-058', 'BM-059', 'BM-063',
    'BM-035', 'BM-036', 'BM-037', 'BM-038', 'BM-040',
    'BM-016', 'BM-017', 'BM-052', 'BM-053', 'BM-054', 'BM-060', 'BM-061', 'BM-062'
];
$class_ii_codes = ['BM-013', 'BM-042', 'BM-056'];

$types = $pdo->query("SELECT id, asset_type_code, name FROM equipment_types")->fetchAll();

foreach ($types as $t) {
    $code = $t['asset_type_code'];
    $prot_class = in_array($code, $class_ii_codes) ? 'Class II' : 'Class I';
    if (in_array($code, $cf_codes)) {
        $ap_type = 'CF';
    } elseif (in_array($code, $none_codes)) {
        $ap_type = 'None';
    } else {
        $ap_type = 'BF';
    }
    
    $stmt = $pdo->prepare("UPDATE equipment_types SET default_protection_class = ?, default_applied_part_type = ? WHERE id = ?");
    $stmt->execute([$prot_class, $ap_type, $t['id']]);

    $stmt2 = $pdo->prepare("UPDATE equipments SET protection_class = ?, applied_part_type = ? WHERE equipment_type_id = ? AND (protection_class IS NULL OR protection_class = 'Class I')");
    $stmt2->execute([$prot_class, $ap_type, $t['id']]);
}

echo "Updated all 63 equipment types and existing equipment records with IEC protection classes and applied part types.\n";

// 4. Standardize IEC 62353 Electrical Safety checklist items across all templates
$del = $pdo->exec("DELETE FROM checklist_items WHERE category = 'Electrical Safety Test'");
echo "Removed {$del} vague placeholder electrical items.\n";

$templates = $pdo->query("SELECT ct.id as template_id, et.asset_type_code, et.default_protection_class, et.default_applied_part_type, et.name
    FROM checklist_templates ct
    JOIN equipment_types et ON ct.equipment_type_id = et.id")->fetchAll();

$stmtInsert = $pdo->prepare("INSERT INTO checklist_items (
    template_id, category, checklist_phase, step_number, title, instructions, 
    expected_result, responsible_role, check_type, min_value, max_value, unit, is_mandatory, failure_action
) VALUES (?, 'Electrical Safety Test', 'Electrical Safety (IEC 62353)', ?, ?, ?, ?, 'Biomedical Engineer', ?, ?, ?, ?, 1, ?)");

$inserted = 0;
foreach ($templates as $tmpl) {
    $t_id = $tmpl['template_id'];
    $p_class = $tmpl['default_protection_class'];
    $ap_type = $tmpl['default_applied_part_type'];

    // 1. Visual Safety Inspection
    $stmtInsert->execute([
        $t_id, 1,
        'IEC 62353 Visual Safety Inspection (Mains Plug, Power Cord, Chassis, Fuses)',
        'Inspect mains plug pins, flexible power cable, strain reliefs, enclosure integrity, grounding stud, correct fuse ratings, and applied part connectors for damage, burns, or fluid ingress.',
        'No mechanical defects, fraying, loose earth contacts, or damaged casing. Fuses must match rated current.',
        'pass_fail', null, null, null,
        'Quarantine equipment, tag Out of Service, and replace damaged power cable, fuse, or cracked enclosure before electrical energization.'
    ]);
    $inserted++;

    // 2. Protective Earth Continuity (Only for Class I)
    if ($p_class === 'Class I') {
        $stmtInsert->execute([
            $t_id, 2,
            'IEC 62353 Protective Earth Resistance (PE Continuity)',
            'Measure resistance between the mains plug protective earth pin and all exposed accessible conductive metal parts with safety analyzer test current >= 200 mA. Flex the power cord throughout its length during testing.',
            'Resistance must not exceed 0.30 Ω (for detachable cord/appliance) or 0.50 Ω for ME systems.',
            'numeric', 0.00, 0.30, 'Ω',
            'FAILED EARTH CONTINUITY: Inspect and tighten internal chassis earth bonding lug. Replace power cord if cord resistance exceeds 0.10 Ω. Do not release for patient use.'
        ]);
        $inserted++;
    }

    // 3. Insulation Resistance (500V DC)
    $stmtInsert->execute([
        $t_id, 3,
        'IEC 62353 Insulation Resistance (500V DC Test)',
        'Apply 500V DC test voltage between mains live/neutral (shorted) and protective earth chassis / accessible parts to verify dielectric barrier condition.',
        'Insulation resistance must be >= 2.0 MΩ (Class I) or >= 7.0 MΩ (Class II).',
        'numeric', 2.00, 999.00, 'MΩ',
        'Investigate internal moisture, dust contamination, or breakdown of primary transformer insulation before retesting.'
    ]);
    $inserted++;

    // 4. Equipment Leakage Current
    $leak_limit = ($p_class === 'Class I') ? 500.00 : 100.00;
    $stmtInsert->execute([
        $t_id, 4,
        'IEC 62353 Equipment Leakage Current (Direct / Alternative Method)',
        'Measure total leakage current from mains circuits to accessible conductive enclosure parts under normal and single-fault conditions using calibrated analyzer.',
        'Direct/Differential limit: <= 500 µA (Class I) / <= 100 µA (Class II). Alternative method limit: <= 1000 µA.',
        'numeric', 0.00, $leak_limit, 'µA',
        'Isolate internal mains line filter, check suppressors and Y-capacitors for excessive capacitive coupling. Replace failing power supply module.'
    ]);
    $inserted++;

    // 5. Applied Part Leakage Current (for BF and CF equipment)
    if (in_array($ap_type, ['CF', 'BF'])) {
        $ap_limit = ($ap_type === 'CF') ? 50.00 : 5000.00;
        $desc_type = ($ap_type === 'CF') ? "Cardiac Floating (Type CF)" : "Body Floating (Type BF)";
        $stmtInsert->execute([
            $t_id, 5,
            "IEC 62353 Applied Part Leakage Current ({$desc_type})",
            "Connect all patient-contact electrodes/leads/transducers to the safety analyzer patient bus. Measure leakage current from patient circuit to ground under mains potential.",
            "Allowable limit: <= {$ap_limit} µA ({$desc_type} per IEC 62353 Table 2).",
            'numeric', 0.00, $ap_limit, 'µA',
            'CRITICAL PATIENT RISK: Patient isolation barrier breached! Replace patient trunk cable / ECG lead wires. If fault persists, replace isolated amplifier module.'
        ]);
        $inserted++;
    }

    // 6. Post-Safety Functional & Clinical Release Verification
    $stmtInsert->execute([
        $t_id, 6,
        'Post-Test Functional & Clinical Release Verification',
        'Power on device under rated hospital mains supply. Confirm self-test passes, status indicators illuminate, safety cut-offs trigger, and clinical displays read normal.',
        'Normal boot sequence without diagnostic errors or error codes. All clinical interlocks and alarms active.',
        'pass_fail', null, null, null,
        'Do not release for clinical patient use. Log corrective breakdown work order for circuit diagnosis.'
    ]);
    $inserted++;
}

echo "Successfully inserted {$inserted} standardized, limit-checked IEC 62353 items across all 63 templates!\n";
