<?php
require_once __DIR__ . '/../config/db.php';

$newDepartments = [
    [
        'code' => 'LAB-PATH',
        'name' => 'Clinical Laboratory & Blood Bank',
        'building' => 'Main Hospital Block',
        'floor' => '1st Floor',
        'head_of_department' => 'Dr. Zainab Al-Hashimi',
        'contact_phone' => '+973-1789-4150',
        'email' => 'lab.pathology@hospital.bh'
    ],
    [
        'code' => 'ENDOSCOPY',
        'name' => 'Endoscopy & Bronchoscopy Suite',
        'building' => 'Surgical Pavilion B',
        'floor' => '3rd Floor',
        'head_of_department' => 'Dr. Tariq Al-Shehabi',
        'contact_phone' => '+973-1789-4160',
        'email' => 'endoscopy@hospital.bh'
    ],
    [
        'code' => 'LND-MAT',
        'name' => 'Labor & Delivery Suites (Maternity)',
        'building' => 'Maternal & Child Wing',
        'floor' => '2nd Floor',
        'head_of_department' => 'Dr. Mona Al-Kawari',
        'contact_phone' => '+973-1789-4170',
        'email' => 'maternity.lnd@hospital.bh'
    ],
    [
        'code' => 'INP-MEDSURG',
        'name' => 'General Medical & Surgical Inpatient Ward',
        'building' => 'Inpatient Tower C',
        'floor' => '4th Floor',
        'head_of_department' => 'Dr. Hussain Ebrahim',
        'contact_phone' => '+973-1789-4180',
        'email' => 'inpatient.wards@hospital.bh'
    ],
    [
        'code' => 'OPD-CLINIC',
        'name' => 'Outpatient Consultation Clinics (OPD)',
        'building' => 'Ambulatory Care Wing',
        'floor' => 'Ground Floor',
        'head_of_department' => 'Dr. Reem Al-Ghatam',
        'contact_phone' => '+973-1789-4190',
        'email' => 'opd.clinics@hospital.bh'
    ],
    [
        'code' => 'ONCOLOGY',
        'name' => 'Oncology & Day Chemotherapy Unit',
        'building' => 'Specialty Center C',
        'floor' => '3rd Floor',
        'head_of_department' => 'Dr. Salman Al-Nuaimi',
        'contact_phone' => '+973-1789-4200',
        'email' => 'oncology@hospital.bh'
    ],
    [
        'code' => 'BME-WORKSHOP',
        'name' => 'Biomedical Engineering Workshop & Calibration Lab',
        'building' => 'Engineering & Technical Services Block',
        'floor' => 'Basement 1',
        'head_of_department' => 'Eng. Hassan Al-Majed',
        'contact_phone' => '+973-1789-4210',
        'email' => 'bme.workshop@hospital.bh'
    ],
    [
        'code' => 'DAY-SURGERY',
        'name' => 'Day Surgery & Ambulatory Procedure Unit',
        'building' => 'Surgical Pavilion B',
        'floor' => '1st Floor',
        'head_of_department' => 'Dr. Ahmed Al-Doseri',
        'contact_phone' => '+973-1789-4220',
        'email' => 'daysurgery@hospital.bh'
    ],
    [
        'code' => 'PHYSIO-REHAB',
        'name' => 'Physical Medicine & Rehabilitation',
        'building' => 'Specialty Center C',
        'floor' => 'Ground Floor',
        'head_of_department' => 'Dr. Fatima Al-Haddad',
        'contact_phone' => '+973-1789-4230',
        'email' => 'rehab.physio@hospital.bh'
    ]
];

$stmtCheck = $pdo->prepare("SELECT id FROM departments WHERE code = ?");
$stmtInsert = $pdo->prepare("INSERT INTO departments (name, code, building, floor, head_of_department, contact_phone, email) VALUES (?, ?, ?, ?, ?, ?, ?)");

$added = 0;
$skipped = 0;

foreach ($newDepartments as $dept) {
    $stmtCheck->execute([$dept['code']]);
    if ($stmtCheck->fetch()) {
        $skipped++;
    } else {
        $stmtInsert->execute([
            $dept['name'],
            $dept['code'],
            $dept['building'],
            $dept['floor'],
            $dept['head_of_department'],
            $dept['contact_phone'],
            $dept['email']
        ]);
        $added++;
    }
}

echo "Added: {$added}, Existing/Skipped: {$skipped}\n";
