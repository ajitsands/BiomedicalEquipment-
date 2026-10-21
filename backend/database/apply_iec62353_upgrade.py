import mysql.connector

db = mysql.connector.connect(
    host="127.0.0.1",
    user="root",
    password="S@nds1@b",
    database="biomedical_cmms"
)
cursor = db.cursor(dictionary=True)

# 1. Add columns to equipment_types if missing
cursor.execute("SHOW COLUMNS FROM equipment_types LIKE 'default_protection_class'")
if not cursor.fetchone():
    cursor.execute("ALTER TABLE equipment_types ADD COLUMN default_protection_class VARCHAR(30) DEFAULT 'Class I' AFTER standard_regulatory_code")
    print("Added default_protection_class to equipment_types")

cursor.execute("SHOW COLUMNS FROM equipment_types LIKE 'default_applied_part_type'")
if not cursor.fetchone():
    cursor.execute("ALTER TABLE equipment_types ADD COLUMN default_applied_part_type VARCHAR(20) DEFAULT 'None' AFTER default_protection_class")
    print("Added default_applied_part_type to equipment_types")

# 2. Add columns to equipments if missing
cursor.execute("SHOW COLUMNS FROM equipments LIKE 'protection_class'")
if not cursor.fetchone():
    cursor.execute("ALTER TABLE equipments ADD COLUMN protection_class VARCHAR(30) DEFAULT 'Class I' AFTER criticality")
    print("Added protection_class to equipments")

cursor.execute("SHOW COLUMNS FROM equipments LIKE 'applied_part_type'")
if not cursor.fetchone():
    cursor.execute("ALTER TABLE equipments ADD COLUMN applied_part_type VARCHAR(20) DEFAULT 'None' AFTER protection_class")
    print("Added applied_part_type to equipments")

db.commit()

# 3. Define Class and Applied Part Type mappings for the 63 WHO equipment types
# CF = Direct cardiac contact (ECG, Defibrillator, etc.)
# BF = Patient body contact (Monitors, Pumps, Ventilators, Incubators, Diathermy, Dialysis, Ultrasounds, etc.)
# None = No direct patient contact (Lab, Imaging gantry, Refrigeration, Plants, Sterilization)
cf_codes = {'BM-001', 'BM-002', 'BM-003', 'BM-015', 'BM-050'} # Patient Monitor, Defib, ECG, ESU/Diathermy, Holter
none_codes = {
    'BM-020', 'BM-021', 'BM-023', 'BM-024', 'BM-025', 'BM-026', # Imaging
    'BM-027', 'BM-028', 'BM-029', 'BM-030', 'BM-031', 'BM-032', 'BM-033', 'BM-034', 'BM-058', 'BM-059', 'BM-063', # Lab / Cold Chain
    'BM-035', 'BM-036', 'BM-037', 'BM-038', 'BM-040', # CSSD / Water
    'BM-016', 'BM-017', 'BM-052', 'BM-053', 'BM-054', 'BM-060', 'BM-061', 'BM-062' # Facility / Plant / Testers / Lights / Tables
}
class_ii_codes = {'BM-013', 'BM-042', 'BM-056'} # Nebuliser, Fetal Doppler, TENS

cursor.execute("SELECT id, asset_type_code, name FROM equipment_types")
types = cursor.fetchall()

for t in types:
    code = t['asset_type_code']
    prot_class = 'Class II' if code in class_ii_codes else 'Class I'
    if code in cf_codes:
        ap_type = 'CF'
    elif code in none_codes:
        ap_type = 'None'
    else:
        ap_type = 'BF'
    
    cursor.execute("""
        UPDATE equipment_types 
        SET default_protection_class = %s, default_applied_part_type = %s 
        WHERE id = %s
    """, (prot_class, ap_type, t['id']))

    # Update existing equipments of this type
    cursor.execute("""
        UPDATE equipments 
        SET protection_class = %s, applied_part_type = %s 
        WHERE equipment_type_id = %s AND (protection_class IS NULL OR protection_class = 'Class I')
    """, (prot_class, ap_type, t['id']))

db.commit()
print("Updated all 63 equipment types and existing equipment records with IEC protection classes and applied part types.")

# 4. Standardize IEC 62353 Electrical Safety checklist items across all templates
# First, remove old vague placeholder items in 'Electrical Safety Test' category
cursor.execute("DELETE FROM checklist_items WHERE category = 'Electrical Safety Test'")
deleted_count = cursor.rowcount
print(f"Removed {deleted_count} vague placeholder electrical items.")

# Now insert rigorous IEC 62353 standard items for each template
cursor.execute("""
    SELECT ct.id as template_id, et.asset_type_code, et.default_protection_class, et.default_applied_part_type, et.name
    FROM checklist_templates ct
    JOIN equipment_types et ON ct.equipment_type_id = et.id
""")
templates = cursor.fetchall()

inserted_items = 0
for tmpl in templates:
    t_id = tmpl['template_id']
    p_class = tmpl['default_protection_class']
    ap_type = tmpl['default_applied_part_type']
    
    # 1. Visual Inspection (Pass/Fail)
    cursor.execute("""
        INSERT INTO checklist_items (
            template_id, category, checklist_phase, step_number, title, instructions, 
            expected_result, responsible_role, check_type, min_value, max_value, unit, is_mandatory, failure_action
        ) VALUES (
            %s, 'Electrical Safety Test', 'Preventive maintenance / technical inspection', 1,
            'IEC 62353 Visual Safety Inspection (Mains Plug, Power Cord, Chassis, Fuses)',
            'Inspect mains plug pins, flexible power cable, strain reliefs, enclosure integrity, grounding stud, correct fuse ratings, and applied part connectors for damage, burns, or fluid ingress.',
            'No mechanical defects, fraying, loose earth contacts, or damaged casing. Fuses must match rated current.',
            'Biomedical Engineer', 'pass_fail', NULL, NULL, NULL, 1,
            'Quarantine equipment, tag Out of Service, and replace damaged power cable, fuse, or cracked enclosure before electrical energization.'
        )
    """, (t_id,))
    inserted_items += 1

    # 2. Protective Earth Continuity (Only for Class I)
    if p_class == 'Class I':
        cursor.execute("""
            INSERT INTO checklist_items (
                template_id, category, checklist_phase, step_number, title, instructions, 
                expected_result, responsible_role, check_type, min_value, max_value, unit, is_mandatory, failure_action
            ) VALUES (
                %s, 'Electrical Safety Test', 'Preventive maintenance / technical inspection', 2,
                'IEC 62353 Protective Earth Resistance (PE Continuity)',
                'Measure resistance between the mains plug protective earth pin and all exposed accessible conductive metal parts with safety analyzer test current >= 200 mA. Flex the power cord throughout its length during testing.',
                'Resistance must not exceed 0.30 Ω (for detachable cord/appliance) or 0.50 Ω for ME systems.',
                'Biomedical Engineer', 'numeric', 0.00, 0.30, 'Ω', 1,
                'FAILED EARTH CONTINUITY: Inspect and tighten internal chassis earth bonding lug. Replace power cord if cord resistance exceeds 0.10 Ω. Do not release for patient use.'
            )
        """, (t_id,))
        inserted_items += 1

    # 3. Insulation Resistance (500V DC)
    cursor.execute("""
        INSERT INTO checklist_items (
            template_id, category, checklist_phase, step_number, title, instructions, 
            expected_result, responsible_role, check_type, min_value, max_value, unit, is_mandatory, failure_action
        ) VALUES (
            %s, 'Electrical Safety Test', 'Preventive maintenance / technical inspection', 3,
            'IEC 62353 Insulation Resistance (500V DC Test)',
            'Apply 500V DC test voltage between mains live/neutral (shorted) and protective earth chassis / accessible parts to verify dielectric barrier condition.',
            'Insulation resistance must be >= 2.0 MΩ (Class I) or >= 7.0 MΩ (Class II).',
            'Biomedical Engineer', 'numeric', 2.00, 999.00, 'MΩ', 0,
            'Investigate internal moisture, dust contamination, or breakdown of primary transformer insulation before retesting.'
        )
    """, (t_id,))
    inserted_items += 1

    # 4. Equipment Leakage Current
    leak_limit = 500.00 if p_class == 'Class I' else 100.00
    cursor.execute("""
        INSERT INTO checklist_items (
            template_id, category, checklist_phase, step_number, title, instructions, 
            expected_result, responsible_role, check_type, min_value, max_value, unit, is_mandatory, failure_action
        ) VALUES (
            %s, 'Electrical Safety Test', 'Preventive maintenance / technical inspection', 4,
            'IEC 62353 Equipment Leakage Current (Direct / Alternative Method)',
            'Measure total leakage current from mains circuits to accessible conductive enclosure parts under normal and single-fault conditions using calibrated analyzer.',
            'Direct/Differential limit: <= 500 µA (Class I) / <= 100 µA (Class II). Alternative method limit: <= 1000 µA.',
            'Biomedical Engineer', 'numeric', 0.00, %s, 'µA', 1,
            'Isolate internal mains line filter, check suppressors and Y-capacitors for excessive capacitive coupling. Replace failing power supply module.'
        )
    """, (t_id, leak_limit))
    inserted_items += 1

    # 5. Applied Part Leakage Current (for BF and CF equipment)
    if ap_type in ('CF', 'BF'):
        ap_limit = 50.00 if ap_type == 'CF' else 5000.00
        desc_type = "Cardiac Floating (Type CF)" if ap_type == 'CF' else "Body Floating (Type BF)"
        cursor.execute("""
            INSERT INTO checklist_items (
                template_id, category, checklist_phase, step_number, title, instructions, 
                expected_result, responsible_role, check_type, min_value, max_value, unit, is_mandatory, failure_action
            ) VALUES (
                %s, 'Electrical Safety Test', 'Preventive maintenance / technical inspection', 5,
                'IEC 62353 Applied Part Leakage Current (%s)',
                'Connect all patient-contact electrodes/leads/transducers to the safety analyzer patient bus. Measure leakage current from patient circuit to ground under mains potential.',
                'Allowable limit: <= %s µA (%s per IEC 62353 Table 2).',
                'Biomedical Engineer', 'numeric', 0.00, %s, 'µA', 1,
                'CRITICAL PATIENT RISK: Patient isolation barrier breached! Replace patient trunk cable / ECG lead wires. If fault persists, replace isolated amplifier module.'
            )
        """ % ('%s', desc_type, ap_limit, desc_type, '%s'), (t_id, ap_limit))
        inserted_items += 1

    # 6. Post-Safety Functional Operational & Safety Cut-off Verification
    cursor.execute("""
        INSERT INTO checklist_items (
            template_id, category, checklist_phase, step_number, title, instructions, 
            expected_result, responsible_role, check_type, min_value, max_value, unit, is_mandatory, failure_action
        ) VALUES (
            %s, 'Electrical Safety Test', 'Preventive maintenance / technical inspection', 6,
            'Post-Test Functional & Clinical Release Verification',
            'Power on device under rated hospital mains supply. Confirm self-test passes, status indicators illuminate, safety cut-offs trigger, and clinical displays read normal.',
            'Normal boot sequence without diagnostic errors or error codes. All clinical interlocks and alarms active.',
            'Biomedical Engineer', 'pass_fail', NULL, NULL, NULL, 1,
            'Do not release for clinical patient use. Log corrective breakdown work order for circuit diagnosis.'
        )
    """, (t_id,))
    inserted_items += 1

db.commit()
print(f"Successfully inserted {inserted_items} standardized, limit-checked IEC 62353 items across all 63 templates!")
cursor.close()
db.close()
