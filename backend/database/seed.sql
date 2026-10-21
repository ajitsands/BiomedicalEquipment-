-- Biomedical Equipment Maintenance Management System (BEMS / CMMS)
-- Seed Data: Real-world Hospital Biomedical Equipment, WHO-Aligned Checklists, Vendors, and Lifecycle Records
-- Powered and Engineered by SanDS Lab Middle East W.L.L

USE `biomedical_cmms`;

-- 1. Seed Departments
INSERT INTO `departments` (`id`, `name`, `code`, `building`, `floor`, `head_of_department`, `contact_phone`, `email`) VALUES
(1, 'Intensive Care Unit (ICU)', 'ICU', 'Critical Care Tower A', '3rd Floor', 'Dr. Tariq Al-Mansoor', '+973-1789-4001', 'icu.bme@hospital.bh'),
(2, 'Operation Theatre Complex (OT)', 'OT-CMPLX', 'Surgical Pavilion B', '2nd Floor', 'Dr. Sarah Jenkins', '+973-1789-4002', 'ot.bme@hospital.bh'),
(3, 'Neonatal Intensive Care (NICU)', 'NICU', 'Maternal & Child Wing', '1st Floor', 'Dr. Amina Qassim', '+973-1789-4003', 'nicu.bme@hospital.bh'),
(4, 'Emergency & Trauma Department', 'ER-TRAUMA', 'Main Hospital Block', 'Ground Floor', 'Dr. Robert Chen', '+973-1789-4004', 'er.bme@hospital.bh'),
(5, 'Hemodialysis Unit', 'DIALYSIS', 'Specialty Center C', '1st Floor', 'Dr. Khalid Al-Zayani', '+973-1789-4005', 'dialysis.bme@hospital.bh'),
(6, 'Radiology & Medical Imaging', 'RADIOLOGY', 'Main Hospital Block', 'Basement 1', 'Dr. Fatima Sayed', '+973-1789-4006', 'radiology.bme@hospital.bh'),
(7, 'Cardiology & Cath Lab', 'CATH-LAB', 'Critical Care Tower A', '4th Floor', 'Dr. Mark Reynolds', '+973-1789-4007', 'cardiology.bme@hospital.bh'),
(8, 'Central Sterile Supply Dept (CSSD)', 'CSSD', 'Surgical Pavilion B', 'Basement 1', 'Eng. Hassan Al-Majed', '+973-1789-4008', 'cssd.bme@hospital.bh');

-- 2. Seed Vendors & Manufacturers
INSERT INTO `vendors` (`id`, `name`, `vendor_code`, `contact_person`, `phone`, `emergency_hotline`, `email`, `address`, `service_manager`, `service_manager_phone`, `website`, `rating`) VALUES
(1, 'GE Healthcare Middle East', 'VEND-GE', 'Ahmed Al-Kindi', '+973-1720-5501', '+973-3990-1122', 'support.me@gehealthcare.com', 'Building 450, Road 2811, Seef District, Manama, Bahrain', 'Marcus Vance', '+973-3990-1123', 'www.gehealthcare.com', 4.9),
(2, 'Philips Medical Systems Gulf', 'VEND-PHILIPS', 'Rashid Mahfouz', '+973-1721-8833', '+973-3990-2244', 'service.gulf@philips.com', 'Diplomatic Area, Tower 14, Manama, Bahrain', 'Naveen Kumar', '+973-3990-2245', 'www.philips.com/healthcare', 4.8),
(3, 'Dräger Medical Middle East', 'VEND-DRAEGER', 'Sven Lindqvist', '+973-1733-9911', '+973-3990-3366', 'criticalcare.service@draeger.com', 'Al Seef Commercial Center, Flat 204, Bahrain', 'Dr. Omar Farooq', '+973-3990-3367', 'www.draeger.com', 4.9),
(4, 'Mindray Biomedical Solutions', 'VEND-MINDRAY', 'David Wang', '+973-1755-4422', '+973-3990-4488', 'me.service@mindray.com', 'Bahrain Financial Harbour, West Tower, Manama', 'Ali Al-Haddad', '+973-3990-4489', 'www.mindray.com', 4.7),
(5, 'Siemens Healthineers Gulf', 'VEND-SIEMENS', 'Bernhard Mueller', '+973-1770-1100', '+973-3990-5511', 'service.middleeast@siemens-healthineers.com', 'Sanabis Business Bay, Suite 801, Bahrain', 'Eng. Zainab Noor', '+973-3990-5512', 'www.siemens-healthineers.com', 4.9),
(6, 'Baxter Healthcare Corporation', 'VEND-BAXTER', 'Nora Al-Saleh', '+973-1766-3399', '+973-3990-6633', 'renal.support@baxter.com', 'Tubli Industrial Area, Warehousing Zone, Bahrain', 'Fahad Al-Qattan', '+973-3990-6634', 'www.baxter.com', 4.6),
(7, 'Stryker Surgical Middle East', 'VEND-STRYKER', 'Kevin Gallagher', '+973-1788-2211', '+973-3990-7755', 'surgical.emea@stryker.com', 'Al Moayyed Tower, 19th Floor, Seef, Bahrain', 'Sadiq Al-Mukhtar', '+973-3990-7756', 'www.stryker.com', 4.8);

-- 3. Seed Equipment Types & Classifications
INSERT INTO `equipment_types` (`id`, `name`, `category`, `risk_classification`, `default_pm_frequency`, `standard_regulatory_code`, `icon_name`, `description`) VALUES
(1, 'ICU Mechanical Ventilator', 'Life Support', 'High (Class III)', 'Quarterly', 'IEC 60601-1-2 / ISO 80601-2-12', 'Wind', 'Advanced invasive and non-invasive positive pressure mechanical ventilator for intensive care and resuscitation.'),
(2, 'Biphasic Defibrillator & Monitor', 'Life Support', 'High (Class III)', 'Monthly', 'IEC 60601-2-4 / AHA ECC Guidelines', 'HeartPulse', 'Defibrillator with ECG monitor, external pacing, synchronized cardioversion, and automated external defibrillator (AED) mode.'),
(3, 'Multi-Parameter Patient Monitor', 'Critical Care', 'Medium (Class IIb)', 'Quarterly', 'IEC 60601-2-49 / IEC 62353', 'Activity', 'Continuous monitoring of ECG, SpO2, NIBP, Respiration, IBP, End-Tidal CO2, and Temperature for bedside observation.'),
(4, 'Volumetric Infusion Pump', 'Therapeutic', 'Medium (Class IIb)', 'Quarterly', 'IEC 60601-2-24', 'Droplets', 'Programmable intravenous large-volume infusion pump with ultrasonic air-in-line sensor and pressure occlusion safety.'),
(5, 'Precision Syringe Infusion Pump', 'Therapeutic', 'Medium (Class IIb)', 'Quarterly', 'IEC 60601-2-24', 'Syringe', 'High-accuracy micro-infusion syringe driver for critical inotropes, vasoactive drugs, neonatal dosing, and anesthesia.'),
(6, '12-Lead Diagnostic ECG Machine', 'Diagnostic', 'Low (Class I)', 'Semi-Annually', 'IEC 60601-2-25 / AHA', 'FileHeart', 'Resting 12-lead electrocardiograph with Glasgow interpretation algorithm and thermal/digital printing capability.'),
(7, 'Hemodialysis Workstation', 'Therapeutic', 'High (Class III)', 'Monthly', 'IEC 60601-2-16 / ANSI AAMI RD52', 'Cpu', 'Extracorporeal blood purification system with dual-pump ultrafiltration, automated disinfection, and endotoxin filtering.'),
(8, 'Electrosurgical Unit (ESU) / Diathermy', 'Surgical', 'High (Class III)', 'Quarterly', 'IEC 60601-2-2 / IEC 62353', 'Zap', 'High-frequency surgical generator with monopolar cut, blend, coagulation, and bipolar vessel sealing with return electrode monitoring.'),
(9, 'Anesthesia Delivery Workstation', 'Life Support', 'High (Class III)', 'Quarterly', 'ISO 80601-2-13 / IEC 60601-1', 'Crosshair', 'Integrated anesthesia system with electronic gas mixing, hypoxic guard, integrated ventilator, vaporizer interlocks, and vapor scavenging.'),
(10, 'Infant Incubator & Radiant Warmer', 'Neonatal', 'High (Class III)', 'Quarterly', 'IEC 60601-2-19 / IEC 60601-2-21', 'Baby', 'Microprocessor-controlled neonatal microenvironment with servo skin temperature, humidity control, and sound attenuation.'),
(11, 'Mobile C-Arm Digital X-Ray System', 'Diagnostic', 'High (Class III)', 'Quarterly', 'IEC 60601-2-54 / IAEA Safety Series', 'Radio', 'Mobile fluoroscopy and radiography C-arm unit for intraoperative imaging in orthopedic, vascular, and general surgery.'),
(12, 'High-Pressure Steam Autoclave', 'Sterilization', 'Medium (Class IIb)', 'Monthly', 'EN 285 / ASME Boiler Code', 'ShieldCheck', 'Horizontal pre- and post-vacuum steam sterilizer for surgical instruments, textile packs, and porous hospital loads.');

-- 4. Seed Checklist Templates
INSERT INTO `checklist_templates` (`id`, `equipment_type_id`, `title`, `frequency`, `standard_reference`, `estimated_minutes`, `description`) VALUES
(1, 1, 'ICU Ventilator Quarterly PM & Safety Inspection Checklist', 'Quarterly', 'WHO Medical Device Technical Series & IEC 62353', 50, 'Comprehensive preventive maintenance, flow sensor calibration, leak test, and battery autonomy verification.'),
(2, 2, 'Biphasic Defibrillator Monthly Preventive Maintenance & Energy Calibration', 'Monthly', 'WHO CMMS Standards / IEC 60601-2-4', 40, 'Pacing verification, discharge energy delivery accuracy across 50J to 360J, sync cardioversion timing, and battery discharge test.'),
(3, 3, 'Multi-Parameter Patient Monitor Comprehensive Maintenance Checklist', 'Quarterly', 'IEC 62353 / ECRI IPM Protocol', 35, 'NIBP transducer calibration, SpO2 sensor accuracy check, 5-lead ECG rhythm simulation, and electrical leakage currents.'),
(4, 4, 'Volumetric Infusion Pump Performance Verification & Safety Checklist', 'Quarterly', 'IEC 60601-2-24 / ECRI Standards', 30, 'Delivery accuracy test, upstream/downstream occlusion pressure, air bubble detector sensitivity, and battery endurance.'),
(5, 5, 'Precision Syringe Driver Quarterly Calibration & Safety Protocol', 'Quarterly', 'IEC 60601-2-24', 30, 'Plunger drive mechanism check, optical barrel sensor calibration, anti-bolus check, and occlusion pressure cutoff.'),
(6, 7, 'Hemodialysis System Monthly Comprehensive Preventive Maintenance', 'Monthly', 'IEC 60601-2-16 / AAMI RD52 Guidelines', 60, 'Dialysate conductivity calibration, temperature accuracy, blood leak optical detector, UF rate verification, and chemical disinfection.'),
(7, 8, 'Electrosurgical Generator (ESU) Safety & Output Power Calibration Checklist', 'Quarterly', 'IEC 60601-2-2 / IEC 62353', 45, 'HF output wattage verification into non-inductive dummy load, return electrode CQM alarm check, and HF leakage current measurement.'),
(8, 9, 'Anesthesia Workstation Comprehensive Quarterly Safety & PM Checklist', 'Quarterly', 'ISO 80601-2-13 / ASA Standards', 60, 'Low-pressure leak test, hypoxic guard 25% minimum O2 test, vaporizers concentration delivery, APL valve calibration, and scavenger vacuum.');

-- 5. Seed Checklist Items for Templates
-- Ventilator Items (Template 1)
INSERT INTO `checklist_items` (`template_id`, `category`, `step_number`, `title`, `instructions`, `check_type`, `unit`, `min_value`, `max_value`, `is_mandatory`) VALUES
(1, 'Physical & Visual Inspection', 1, 'Chassis, Mounts & Casters', 'Inspect enclosure for physical cracks, inspect mobile trolley brakes, and verify tight arm joints.', 'pass_fail', NULL, NULL, NULL, 1),
(1, 'Physical & Visual Inspection', 2, 'Inspiratory / Expiratory Ports & Flow Sensor', 'Verify flow sensor pins, check water traps, silicone seals, and diaphragm membrane for tears or warping.', 'pass_fail', NULL, NULL, NULL, 1),
(1, 'Electrical Safety Test', 3, 'Protective Earth Ground Continuity', 'Measure earth wire resistance between power plug earth pin and device metal chassis using Electrical Safety Analyzer.', 'numeric', 'Ohms', 0.00, 0.20, 1),
(1, 'Electrical Safety Test', 4, 'Enclosure Leakage Current (Normal & Single Fault)', 'Measure AC leakage current on ground disconnected / reversed polarity using IEC 62353 standard.', 'numeric', 'µA', 0.00, 100.00, 1),
(1, 'Functional Performance', 5, 'Pre-Use Automated System Self-Test', 'Execute manufacturer automated diagnostic self-test (tightness, compliance, valve resistance).', 'pass_fail', NULL, NULL, NULL, 1),
(1, 'Functional Performance', 6, 'Delivered Tidal Volume Accuracy (500 mL setpoint)', 'Connect calibrated Gas Flow Analyzer (VT Plus / CITREX). Set Vt = 500 mL, RR = 15. Measure delivered volume.', 'numeric', 'mL', 460.00, 540.00, 1),
(1, 'Functional Performance', 7, 'PEEP Pressure Accuracy (Set 10 cmH2O)', 'Set PEEP to 10 cmH2O. Read measured end-expiratory pressure on calibrated reference lung simulator.', 'numeric', 'cmH2O', 9.00, 11.00, 1),
(1, 'Calibration & Verification', 8, 'FiO2 Oxygen Sensor Calibration (21% and 100%)', 'Perform 2-point O2 cell calibration. Verify 21% ambient air reading and 100% pure medical O2 reading.', 'numeric', '%', 97.00, 103.00, 1),
(1, 'Alarms & Safety Cut-offs', 9, 'High Airway Pressure Alarm & Safety Relief Valve', 'Occlude patient wye. Verify high pressure alarm triggers within 0.5s and safety valve opens at set limit.', 'pass_fail', NULL, NULL, NULL, 1),
(1, 'Alarms & Safety Cut-offs', 10, 'Disconnect / Apnea Alarm Simulation', 'Disconnect test lung during active mandatory cycling. Confirm audible alarm (< 10 sec) and visual flasher.', 'pass_fail', NULL, NULL, NULL, 1),
(1, 'Battery & Power System', 11, 'Mains Disconnect & Internal Battery Autonomy', 'Unplug AC power cord while running. Confirm seamless handover to battery without ventilation interruption.', 'pass_fail', NULL, NULL, NULL, 1),
(1, 'Cleaning & Consumables', 12, 'Air Intake Dust Filter & HEPA Filter Replacement', 'Inspect rear cooling fan filter. Clean or replace HEPA intake filter according to running hours.', 'pass_fail', NULL, NULL, NULL, 1);

-- Defibrillator Items (Template 2)
INSERT INTO `checklist_items` (`template_id`, `category`, `step_number`, `title`, `instructions`, `check_type`, `unit`, `min_value`, `max_value`, `is_mandatory`) VALUES
(2, 'Physical & Visual Inspection', 1, 'Paddles, Cables & Connector Integrity', 'Inspect apex/sternum hard paddles, test spring-loaded paddle buttons, check coiled cable for cuts or copper exposure.', 'pass_fail', NULL, NULL, NULL, 1),
(2, 'Electrical Safety Test', 2, 'Protective Earth Ground Resistance', 'Test earth pin to exposed metal parts using Calibrated Safety Analyzer.', 'numeric', 'Ohms', 0.00, 0.20, 1),
(2, 'Functional Performance', 3, 'Energy Delivery Accuracy at 50 Joules', 'Discharge into 50 Ohm Defibrillator Analyzer (Fluke Impulse 7000DP). Verify delivered energy.', 'numeric', 'Joules', 46.00, 54.00, 1),
(2, 'Functional Performance', 4, 'Energy Delivery Accuracy at 100 Joules', 'Discharge into 50 Ohm test load. Measure delivered biphasic energy.', 'numeric', 'Joules', 93.00, 107.00, 1),
(2, 'Functional Performance', 5, 'Energy Delivery Accuracy at 200 Joules (Max Biphasic)', 'Discharge 200 Joules into 50 Ohm test load. Verify delivered energy is within ±10% margin.', 'numeric', 'Joules', 184.00, 216.00, 1),
(2, 'Functional Performance', 6, 'Charge Time to Maximum Energy (200J)', 'Measure time from pressing Charge button until ready tone sounds using analyzer timer.', 'numeric', 'Seconds', 0.00, 5.00, 1),
(2, 'Calibration & Verification', 7, 'Synchronized Cardioversion R-Wave Sync Marker', 'Feed simulated ECG with R-wave spikes. Activate Sync mode. Verify discharge occurs within 30 ms of R-wave peak.', 'numeric', 'ms', 0.00, 30.00, 1),
(2, 'Functional Performance', 8, 'Non-Invasive Transcutaneous Pacemaker Output', 'Set Pacer Rate to 80 PPM, current to 60 mA. Measure output pulse width and current amplitude.', 'numeric', 'mA', 55.00, 65.00, 1),
(2, 'Alarms & Safety Cut-offs', 9, 'Audio Voice Prompts & Alarm Sound Level', 'Execute self-diagnostic voice prompt test. Verify speaker is clear and volume exceeds 70 dBA.', 'pass_fail', NULL, NULL, NULL, 1),
(2, 'Battery & Power System', 10, 'Lithium-ion Battery Fuel Gauge & Charge Cycle Test', 'Verify battery self-test LED fuel gauge shows 100% capacity. Confirm charging dock delivers float voltage.', 'pass_fail', NULL, NULL, NULL, 1);

-- Multi-Parameter Patient Monitor Items (Template 3)
INSERT INTO `checklist_items` (`template_id`, `category`, `step_number`, `title`, `instructions`, `check_type`, `unit`, `min_value`, `max_value`, `is_mandatory`) VALUES
(3, 'Physical & Visual Inspection', 1, 'Display Matrix, Enclosure & Accessories', 'Inspect LCD panel for dead pixels or cracks. Inspect NIBP air hose, ECG lead wires, SpO2 sensor finger clip.', 'pass_fail', NULL, NULL, NULL, 1),
(3, 'Electrical Safety Test', 2, 'Protective Earth Continuity & Chassis Leakage', 'Measure chassis ground resistance (< 0.2 Ω) and earth leakage current (< 100 µA).', 'numeric', 'Ohms', 0.00, 0.20, 1),
(3, 'Functional Performance', 3, 'ECG Heart Rate Simulation Test (60 & 120 BPM)', 'Connect Fluke ProSim simulator. Verify monitor reads 60 ± 1 BPM and 120 ± 1 BPM.', 'numeric', 'BPM', 59.00, 61.00, 1),
(3, 'Calibration & Verification', 4, 'NIBP Pressure Transducer Calibration (150 mmHg)', 'Perform pneumatic static pressure calibration check at 150 mmHg using digital manometer.', 'numeric', 'mmHg', 147.00, 153.00, 1),
(3, 'Functional Performance', 5, 'SpO2 Saturation & Pulse Measurement (98%)', 'Attach SpO2 finger probe to optical simulator calibrated at 98% saturation.', 'numeric', '%', 96.00, 100.00, 1),
(3, 'Calibration & Verification', 6, 'Body Temperature Channel Accuracy (37.0°C)', 'Connect YSI-400 calibrated temp simulator set to 37.0°C. Verify reading.', 'numeric', '°C', 36.80, 37.20, 1),
(3, 'Alarms & Safety Cut-offs', 7, 'Physiological & Technical Alarm Verification', 'Simulate Asystole and SpO2 probe disconnect. Verify red flashing banner and high-priority chime.', 'pass_fail', NULL, NULL, NULL, 1),
(3, 'Battery & Power System', 8, 'Battery Operating Autonomy (> 90 minutes)', 'Verify battery health percentage and minimum run-time on battery power.', 'pass_fail', NULL, NULL, NULL, 1);

-- 6. Seed Sample Equipments (Realistic Asset Registry with QR Codes, RFID, Warranty, Vendor)
INSERT INTO `equipments` (
    `id`, `asset_id`, `equipment_type_id`, `name`, `brand`, `model_number`, `serial_number`, 
    `qr_code_token`, `rfid_tag_id`, `department_id`, `building`, `floor`, `room_number`, `bed_slot`, 
    `rfid_last_detected_at`, `rfid_reader_node`, `vendor_id`, `po_number`, `invoice_number`, 
    `purchase_date`, `purchase_cost`, `currency`, `installation_date`, `commissioning_engineer`, 
    `warranty_start_date`, `warranty_end_date`, `warranty_status`, `contract_type`, `contract_vendor_id`, 
    `contract_start_date`, `contract_end_date`, `contract_value`, `maintenance_schedule_type`, 
    `maintenance_schedule_notes`, `emergency_contact_name`, `emergency_phone`, `vendor_service_email`, 
    `status`, `last_pm_date`, `next_pm_due_date`, `last_calibration_date`, `next_calibration_due_date`, `criticality`
) VALUES
(
    1, 'BME-ICU-VENT-001', 1, 'ICU Mechanical Ventilator - Bay 1', 'Dräger Medical', 'Evita V800', 'DRA-EV8-2023-9081',
    'QR-BME-ICU-VENT-001-9081', 'E28011606000021A5F90B101', 1, 'Critical Care Tower A', '3rd Floor', 'ICU Room 301', 'Bed 01',
    '2026-10-18 14:22:10', 'READER-ICU-NODE-3A', 3, 'PO-2023-MED-0419', 'INV-DRA-882190',
    '2023-11-15', 38500.00, 'USD', '2023-12-01', 'Eng. Sven Lindqvist',
    '2023-12-01', '2026-11-30', 'Under Warranty', 'Warranty Period', 3,
    '2023-12-01', '2026-11-30', 0.00, 'Quarterly',
    'Full OEM warranty covers all parts, turbine exchange, flow sensors and quarterly factory-certified PM visits.',
    'Dräger Critical Care Emergency Support', '+973-3990-3366', 'criticalcare.service@draeger.com',
    'Operational', '2026-08-10', '2026-11-10', '2026-08-10', '2026-11-10', 'Critical Life-Support'
),
(
    2, 'BME-ER-DEF-002', 2, 'Biphasic Defibrillator Crash Cart #1', 'Philips Healthcare', 'HeartStart XL+ ALS', 'PHI-HSX-2024-1142',
    'QR-BME-ER-DEF-002-1142', 'E28011606000021A5F90B102', 4, 'Main Hospital Block', 'Ground Floor', 'Trauma Bay 01', 'Crash Cart Red-A',
    '2026-10-18 16:05:44', 'READER-ER-GATEWAY-1', 2, 'PO-2024-MED-0112', 'INV-PHI-994320',
    '2024-02-10', 14200.00, 'USD', '2024-02-20', 'Eng. Rashid Mahfouz',
    '2024-02-20', '2027-02-19', 'Under Warranty', 'Warranty Period', 2,
    '2024-02-20', '2027-02-19', 0.00, 'Monthly',
    'Monthly discharge verification required. Free paddle cable replacement under manufacturer guarantee.',
    'Philips Rapid Response Team', '+973-3990-2244', 'service.gulf@philips.com',
    'Operational', '2026-09-18', '2026-10-18', '2026-09-18', '2026-10-18', 'Critical Life-Support'
),
(
    3, 'BME-OT-MON-003', 3, 'Multi-Parameter Patient Monitor OT-1', 'Mindray Biomedical', 'BeneVision N17', 'MIN-N17-2022-5509',
    'QR-BME-OT-MON-003-5509', 'E28011606000021A5F90B103', 2, 'Surgical Pavilion B', '2nd Floor', 'OT Suite 1', 'Ceiling Pendant East',
    '2026-10-18 11:30:00', 'READER-OT-HUB-02', 4, 'PO-2022-MED-0988', 'INV-MIN-441098',
    '2022-04-15', 18900.00, 'USD', '2022-05-01', 'Eng. David Wang',
    '2022-05-01', '2025-04-30', 'Out of Warranty', 'Comprehensive AMC (CMC)', 4,
    '2025-05-01', '2027-04-30', 2800.00, 'Quarterly',
    'Extended CMC contract with Mindray including display module, power supply board, and sensor cable replacements.',
    'Mindray 24/7 Field Engineering', '+973-3990-4488', 'me.service@mindray.com',
    'Operational', '2026-07-25', '2026-10-25', '2026-07-25', '2026-10-25', 'High Priority'
),
(
    4, 'BME-ICU-INFP-004', 4, 'Volumetric Infusion Pump ICU-4', 'Baxter Healthcare', 'Spectrum V8 System', 'BAX-SP8-2024-7711',
    'QR-BME-ICU-INFP-004-7711', 'E28011606000021A5F90B104', 1, 'Critical Care Tower A', '3rd Floor', 'ICU Room 304', 'Bed 04',
    '2026-10-18 15:45:12', 'READER-ICU-NODE-3B', 6, 'PO-2024-MED-0344', 'INV-BAX-553120',
    '2024-06-01', 3400.00, 'USD', '2024-06-15', 'Eng. Nora Al-Saleh',
    '2024-06-15', '2027-06-14', 'Under Warranty', 'Warranty Period', 6,
    '2024-06-15', '2027-06-14', 0.00, 'Quarterly',
    'Factory warranty. Annual calibration of pressure occlusion transducers and flow rate accuracy.',
    'Baxter Renal & Infusion Hotline', '+973-3990-6633', 'renal.support@baxter.com',
    'Operational', '2026-07-10', '2026-10-10', '2026-07-10', '2026-10-10', 'Standard'
),
(
    5, 'BME-NICU-SYRP-005', 5, 'Precision Syringe Driver NICU Incubator #2', 'Baxter Healthcare', 'AutoFuser Precision-50', 'BAX-AFP-2023-3390',
    'QR-BME-NICU-SYRP-005-3390', 'E28011606000021A5F90B105', 3, 'Maternal & Child Wing', '1st Floor', 'NICU Pod B', 'Station 02',
    '2026-10-18 13:10:05', 'READER-NICU-ZONE-1', 6, 'PO-2023-MED-0789', 'INV-BAX-998124',
    '2023-08-10', 2900.00, 'USD', '2023-08-25', 'Eng. Nora Al-Saleh',
    '2023-08-25', '2026-08-24', 'Out of Warranty', 'Non-Comprehensive AMC', 6,
    '2026-08-25', '2027-08-24', 650.00, 'Quarterly',
    'Post-warranty AMC for labor & calibration. Parts chargeable on approved quotation.',
    'Baxter Technical Support Desk', '+973-3990-6633', 'renal.support@baxter.com',
    'Under Breakdown', '2026-06-12', '2026-09-12', '2026-06-12', '2026-09-12', 'High Priority'
),
(
    6, 'BME-DIAL-006', 7, 'Hemodialysis Machine Station 3', 'Baxter Healthcare', 'Artis Dialysis System', 'BAX-ART-2022-8840',
    'QR-BME-DIAL-006-8840', 'E28011606000021A5F90B106', 5, 'Specialty Center C', '1st Floor', 'Hemodialysis Bay 3', 'Chair 03',
    '2026-10-18 10:15:20', 'READER-DIAL-ZONE-C', 6, 'PO-2022-MED-0551', 'INV-BAX-443399',
    '2022-03-20', 26500.00, 'USD', '2022-04-10', 'Eng. Nora Al-Saleh',
    '2022-04-10', '2024-04-09', 'Out of Warranty', 'Comprehensive AMC (CMC)', 6,
    '2024-04-10', '2027-04-09', 4200.00, 'Monthly',
    'Full CMC contract. Monthly chemical disinfection filter swap and blood leak detector recalibration.',
    'Baxter Renal Care Emergency Specialist', '+973-3990-6633', 'renal.support@baxter.com',
    'Operational', '2026-09-22', '2026-10-22', '2026-09-22', '2026-10-22', 'Critical Life-Support'
),
(
    7, 'BME-OT-ESU-007', 8, 'Electrosurgical Generator Unit (Diathermy)', 'Stryker Surgical', 'ForceTriad Advanced Energy', 'STR-FT-2023-6622',
    'QR-BME-OT-ESU-007-6622', 'E28011606000021A5F90B107', 2, 'Surgical Pavilion B', '2nd Floor', 'OT Suite 3', 'Boom System North',
    '2026-10-18 09:40:15', 'READER-OT-HUB-03', 7, 'PO-2023-MED-0665', 'INV-STR-772991',
    '2023-09-05', 21500.00, 'USD', '2023-09-20', 'Eng. Kevin Gallagher',
    '2023-09-20', '2026-09-19', 'Out of Warranty', 'In-House Maintenance', NULL,
    NULL, NULL, 0.00, 'Quarterly',
    'Maintained in-house by SanDS Lab Biomedical Engineering team with Fluke QA-ES III analyzer.',
    'SanDS Lab BME Engineering Duty Office', '+973-1789-4099', 'bme.service@sandslab.me',
    'Calibration Due', '2026-05-15', '2026-08-15', '2026-05-15', '2026-08-15', 'Critical Life-Support'
),
(
    8, 'BME-OT-ANES-008', 9, 'Anesthesia Workstation OT-2', 'GE Healthcare', 'Aespire 7900 SmartVent', 'GE-AES-2024-4419',
    'QR-BME-OT-ANES-008-4419', 'E28011606000021A5F90B108', 2, 'Surgical Pavilion B', '2nd Floor', 'OT Suite 2', 'Anesthesia Station',
    '2026-10-18 16:48:30', 'READER-OT-HUB-02', 1, 'PO-2024-MED-0220', 'INV-GE-339912',
    '2024-04-10', 44000.00, 'USD', '2024-04-28', 'Eng. Ahmed Al-Kindi',
    '2024-04-28', '2027-04-27', 'Under Warranty', 'Warranty Period', 1,
    '2024-04-28', '2027-04-27', 0.00, 'Quarterly',
    'Under GE 3-year full manufacturer warranty. Vaporizer concentration bench calibration included.',
    'GE Healthcare Rapid Response', '+973-3990-1122', 'support.me@gehealthcare.com',
    'Operational', '2026-07-28', '2026-10-28', '2026-07-28', '2026-10-28', 'Critical Life-Support'
);

-- 7. Seed Sample Complaints / Breakdown Tickets
INSERT INTO `complaints` (
    `id`, `ticket_number`, `equipment_id`, `booked_by_name`, `booked_by_role`, `booked_by_phone`,
    `department_id`, `room_or_bed`, `complaint_category`, `priority`, `description`, `reported_at`,
    `status`, `assigned_engineer`, `assigned_at`, `action_taken`, `root_cause`, `replaced_parts`,
    `repair_cost`, `downtime_hours`, `resolved_at`, `closed_at`, `satisfaction_rating`
) VALUES
(
    1, 'TKT-2026-0041', 5, 'Nurse Fatima Hassan', 'Charge Sister NICU', '+973-3881-2201',
    3, 'NICU Pod B, Station 02', 'Total Power Failure', 'Critical - Life Support',
    'Syringe pump shut down unexpectedly during dopamine infusion. Device does not turn on even when connected to AC mains wall socket.',
    '2026-10-18 12:15:00',
    'In Progress', 'Eng. Sadiq Al-Majed (SanDS Lab)', '2026-10-18 12:30:00',
    'Assessed device in NICU. Swapped patient onto backup infusion pump immediately. Found internal power switch-mode converter blown due to electrical surge.',
    'Internal SMPS power supply board failed (blown capacitor C14 and fuse F1).',
    'SMPS Power Supply Module Board (Part # BAX-9941-PS)',
    320.00, 5.5, NULL, NULL, NULL
),
(
    2, 'TKT-2026-0038', 2, 'Dr. Marcus Vance', 'ER Trauma Specialist', '+973-3881-4490',
    4, 'Trauma Bay 01', 'Alarm Malfunction', 'High Priority',
    'Defibrillator routine morning battery test showed flashing yellow service wrench code #12 (Apex paddle sense contact intermittent).',
    '2026-10-15 08:30:00',
    'Repaired & Verified', 'Eng. Marcus Vance (Philips)', '2026-10-15 09:00:00',
    'Replaced coiled paddle cable assembly and performed full 200J discharge calibration into Impulse 7000 analyzer. Unit passed all tests.',
    'Fatigue fracture in copper conductor inside apex coiled cable near strain relief.',
    'Philips Apex Paddle Coiled Cable Assembly (Part # M3535-60010)',
    0.00, 2.0, '2026-10-15 10:30:00', '2026-10-15 11:00:00', 5
),
(
    3, 'TKT-2026-0031', 7, 'Dr. Sarah Jenkins', 'Chief Surgeon OT', '+973-3881-6677',
    2, 'OT Suite 3', 'Inaccurate Reading / Calibration Error', 'Critical - Life Support',
    'Return electrode monitoring (REM/CQM) alarm triggered intermittently during laparoscopic procedure with patient plate well adhered.',
    '2026-10-10 14:00:00',
    'Closed', 'Eng. Hassan Al-Majed (SanDS Lab)', '2026-10-10 14:15:00',
    'Inspected REM connector pins on front panel. Detected oxidation and looseness on female socket pin 2. Tightened tension clip, cleaned with DeoxIT, calibrated return resistance threshold.',
    'Loose socket tension on REM plate receptacle caused false impedance spike > 135 Ohms.',
    'Connector Pin Assembly Reconditioned',
    0.00, 1.5, '2026-10-10 15:30:00', '2026-10-10 16:00:00', 5
);

-- 8. Seed Maintenance Execution Records (PM History)
INSERT INTO `maintenance_records` (
    `id`, `work_order_no`, `equipment_id`, `template_id`, `maintenance_type`, `performed_by`,
    `technician_badge`, `performed_date`, `overall_result`, `next_pm_due_date`, `time_spent_minutes`,
    `test_equipment_used`, `engineer_notes`, `parts_replaced`
) VALUES
(
    1, 'WO-PM-2026-0089', 1, 1, 'Preventive Maintenance (PM)', 'Eng. Sven Lindqvist (Dräger)',
    'DRA-TECH-771', '2026-08-10', 'Passed - Ready for Clinical Use', '2026-11-10', 55,
    'Fluke VT Plus Gas Flow Analyzer, Fluke ESA620 Electrical Safety Analyzer',
    'Ventilator executed all internal self-tests with zero leaks. Delivered volume at 500mL measured 496mL. FiO2 calibrated. Replaced bacterial filter.',
    'Expiratory Diaphragm Kit, Intake Dust Sponge'
),
(
    2, 'WO-PM-2026-0074', 2, 2, 'Preventive Maintenance (PM)', 'Eng. Rashid Mahfouz (Philips)',
    'PHI-SRV-902', '2026-09-18', 'Passed - Ready for Clinical Use', '2026-10-18', 40,
    'Fluke Impulse 7000DP Defibrillator Analyzer, Rigel 288+ Safety Analyzer',
    'Energy delivery tested at 50J (51J delivered), 100J (102J delivered), 200J (198J delivered). Sync cardioversion delay 18 ms. Passed all safety tests.',
    'Internal test discharge load resistor calibrated'
),
(
    3, 'WO-PM-2026-0062', 3, 3, 'Electrical Safety Analyzer Test', 'Eng. Hassan Al-Majed (SanDS Lab)',
    'SAND-BME-01', '2026-07-25', 'Passed - Ready for Clinical Use', '2026-10-25', 45,
    'Fluke ESA615 Electrical Safety Analyzer, ProSim 4 Vital Signs Simulator',
    'NIBP verified at 150 mmHg (measured 150.8 mmHg). Ground resistance 0.08 Ohms. Chassis leakage 42 µA.',
    'NIBP Cuff Hose Quick-connector O-ring'
);

-- 9. Seed Sample Equipment Attachments (Manuals, Warranty Cards, Certificates)
INSERT INTO `equipment_attachments` (`id`, `equipment_id`, `document_type`, `file_title`, `file_name`, `file_path`, `file_size_kb`) VALUES
(1, 1, 'User Manual', 'Dräger Evita V800 Operating Instructions Manual', 'Draeger_Evita_V800_User_Manual.pdf', '/uploads/manuals/Draeger_Evita_V800_User_Manual.pdf', 8450),
(2, 1, 'Warranty Card / Guarantee Certificate', 'Dräger 3-Year Comprehensive Warranty Certificate', 'Draeger_Warranty_Cert_V800.pdf', '/uploads/warranties/Draeger_Warranty_Cert_V800.pdf', 1240),
(3, 1, 'Calibration Certificate', 'Annual ISO/IEC 17025 Biomedical Calibration Certificate', 'Calib_Cert_V800_2026.pdf', '/uploads/certificates/Calib_Cert_V800_2026.pdf', 890),
(4, 2, 'User Manual', 'Philips HeartStart XL+ Instructions for Clinicians', 'Philips_HeartStart_XL_Manual.pdf', '/uploads/manuals/Philips_HeartStart_XL_Manual.pdf', 5620),
(5, 2, 'Warranty Card / Guarantee Certificate', 'Philips Medical Manufacturer Guarantee Bond', 'Philips_Guarantee_Bond_2024.pdf', '/uploads/warranties/Philips_Guarantee_Bond_2024.pdf', 980),
(6, 3, 'Service Manual', 'Mindray BeneVision N17 Technical Service Manual', 'Mindray_N17_Service_Manual.pdf', '/uploads/manuals/Mindray_N17_Service_Manual.pdf', 11200),
(7, 3, 'Warranty Card / Guarantee Certificate', 'Mindray CMC Maintenance Contract Agreement', 'Mindray_CMC_Agreement_2025.pdf', '/uploads/contracts/Mindray_CMC_Agreement_2025.pdf', 2100);

-- 10. Seed RFID Live Movement Scan Logs
INSERT INTO `rfid_scan_logs` (`equipment_id`, `rfid_tag_id`, `reader_id`, `detected_building`, `detected_floor`, `detected_department`, `detected_room`, `signal_strength_rssi`) VALUES
(1, 'E28011606000021A5F90B101', 'READER-ICU-NODE-3A', 'Critical Care Tower A', '3rd Floor', 'Intensive Care Unit (ICU)', 'ICU Room 301', -58),
(2, 'E28011606000021A5F90B102', 'READER-ER-GATEWAY-1', 'Main Hospital Block', 'Ground Floor', 'Emergency & Trauma Department', 'Trauma Bay 01', -62),
(3, 'E28011606000021A5F90B103', 'READER-OT-HUB-02', 'Surgical Pavilion B', '2nd Floor', 'Operation Theatre Complex (OT)', 'OT Suite 1', -54),
(4, 'E28011606000021A5F90B104', 'READER-ICU-NODE-3B', 'Critical Care Tower A', '3rd Floor', 'Intensive Care Unit (ICU)', 'ICU Room 304', -66),
(5, 'E28011606000021A5F90B105', 'READER-NICU-ZONE-1', 'Maternal & Child Wing', '1st Floor', 'Neonatal Intensive Care (NICU)', 'NICU Pod B', -61),
(6, 'E28011606000021A5F90B106', 'READER-DIAL-ZONE-C', 'Specialty Center C', '1st Floor', 'Hemodialysis Unit', 'Hemodialysis Bay 3', -59),
(7, 'E28011606000021A5F90B107', 'READER-OT-HUB-03', 'Surgical Pavilion B', '2nd Floor', 'Operation Theatre Complex (OT)', 'OT Suite 3', -51),
(8, 'E28011606000021A5F90B108', 'READER-OT-HUB-02', 'Surgical Pavilion B', '2nd Floor', 'Operation Theatre Complex (OT)', 'OT Suite 2', -56);
