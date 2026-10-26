# BioTrack CMMS — Completed Implementation Work Notes

**System:** BioTrack CMMS (Biomedical Engineering & Asset Lifecycle Management)  
**Engineering & Deployment:** SaNDS Lab Middle East W.L.L  
**Date of Completion:** October 21, 2026  
**Local Port:** `http://localhost:2020`  
**Git Repository:** [https://github.com/ajitsands/BiomedicalEquipment-](https://github.com/ajitsands/BiomedicalEquipment-) (`main` branch)  

---

## 1. Executive Summary
This document summarizes all architectural, clinical, standard-compliance, database, backend, and frontend engineering tasks completed in the **BioTrack CMMS** application. The system has been fully upgraded to integrate **WHO (World Health Organization) Medical Device Technical Series** lifecycle governance and **IEC 62353:2014** (Recurrent Test and Test After Repair of Medical Electrical Equipment) in-service electrical safety standards.

---

## 2. Infrastructure & Startup Automation

| Component | Port / Config | Description |
| :--- | :--- | :--- |
| **Vite React Frontend** | `http://localhost:2020` | Configured in `frontend/vite.config.js` with `port: 2020`, `host: true`, and `strictPort: true`. |
| **PHP REST API Backend** | `http://127.0.0.1:8000` | Built-in PHP 8.2 server serving JSON endpoints from `backend/api/`. |
| **MySQL Database** | `localhost:3306` (`biomedical_cmms`) | InnoDB UTF8MB4 relational database with full asset hierarchy, foreign keys, and audit logs. |
| **One-Click Startup Script** | [`run_localhost_2020.bat`](file:///e:/medical_equpments/run_localhost_2020.bat) & [`run.bat`](file:///e:/medical_equpments/run.bat) | Automated pre-flight checks (Node.js, PHP, MySQL), kills stale port listeners, starts PHP backend minimized, opens default browser at `http://localhost:2020`, and starts Vite dev server. |
| **One-Click Shutdown Script** | [`stop_localhost_2020.bat`](file:///e:/medical_equpments/stop_localhost_2020.bat) & [`stop.bat`](file:///e:/medical_equpments/stop.bat) | Gracefully cleans up processes listening on ports 8000 and 2020. |

---

## 3. WHO & IEC 62353 Standards Integration

### A. Distinction between Standards
- **WHO Guidelines (*WHO Medical Device Technical Series 9789241501392, 9789241501538, 9789241501415*)**: Defines inventory hierarchy, Equipment Management (EM) risk scoring, failure code categorization, and the 3-Phase inspection model (Pre-Use, Planned PM, and Corrective Acceptance). WHO does not publish electrical leakage limits.
- **IEC 62353:2014**: The authoritative international standard for medical electrical equipment **during its hospital operational lifespan** (routine periodic testing and post-repair testing).

### B. Medical Equipment Safety Classification
All 63 equipment types have been categorized by electrical hazard profile:
- **Protection Classes**:
  - `Class I`: Earthed conductive enclosure (e.g. Ventilators, Defibrillators, Autoclaves).
  - `Class II`: Double / reinforced insulation with 2-pole mains connection (e.g. Infusion pumps, Phototherapy).
  - `Internally Powered`: Battery/isolated DC operation.
- **Patient Applied Part Classifications**:
  - `Type CF (Cardiac Floating)`: Highest safety degree with direct heart contact (ECG monitors, Defibrillators, Pacemakers). Maximum allowable leakage: **$\le 50\,\mu\text{A}$** ($0.05\,\text{mA}$).
  - `Type BF (Body Floating)`: External patient contact with isolated circuit (Probes, Diathermy, Incubators). Maximum allowable leakage: **$\le 5000\,\mu\text{A}$** ($5.0\,\text{mA}$).
  - `Type B`: Non-isolated body contact parts.
  - `None`: Equipment with no direct patient physical contact circuit.

### C. IEC 62353 Standard Safety Test Battery & Limits
| Step | Safety Test Item | Target Equipment | Standard Acceptable Limit |
| :--- | :--- | :--- | :--- |
| **E1** | **Visual Safety Inspection** | All Devices | **Pass / Fail** (Mains plug pins, flexible cord, strain reliefs, casing, fuse ratings). |
| **E2** | **Protective Earth Continuity ($R_{PE}$)** | Class I only | **$\le 0.30\,\Omega$** ($\le 0.50\,\Omega$ for systems) with safety analyzer test current $\ge 200\,\text{mA}$. |
| **E3** | **Insulation Resistance ($R_{ISO}$)** | Class I & II | **$\ge 2.0\,\text{M}\Omega$** (Class I) / **$\ge 7.0\,\text{M}\Omega$** (Class II) applied at $500\,\text{V DC}$. |
| **E4** | **Equipment Leakage Current** | Class I & II | Direct/Differential: **$\le 500\,\mu\text{A}$** (Class I) / **$\le 100\,\mu\text{A}$** (Class II). Alternative method: $\le 1000\,\mu\text{A}$. |
| **E5** | **Applied Part Leakage Current** | Type CF / Type BF | **Type CF $\le 50\,\mu\text{A}$** / **Type BF $\le 5000\,\mu\text{A}$**. |
| **E6** | **Post-Safety Clinical Release** | All Devices | **Pass / Fail** (Functional boot, alarm audio-visuals, battery backup handover). |

### D. Testing Frequency Timetable
1. **Phase 1: Daily / Shift Pre-Use Verification**: Performed by clinical/nursing users prior to patient connection.
2. **Phase 2: Quarterly (Every 3 Months)**: Life-support critical equipment (ICU Ventilators, Defibrillators, Anaesthesia, Dialysis, Autoclaves).
3. **Phase 2: Semi-Annual (Every 6 Months)**: High-risk therapeutic & monitoring equipment (Infusion/Syringe pumps, Patient Monitors, Infant Incubators).
4. **Phase 2: Annual (Every 12 Months)**: Diagnostic and general medical devices (ECG, Suction, Centrifuges, Electric Beds, Lights).
5. **Phase 3: Post-Repair Acceptance Testing**: Mandatory immediate full electrical safety check whenever an enclosure is opened, power supply serviced, or circuit board replaced, prior to clinical release.

---

## 4. Database & Backend Engineering

1. **Schema Enhancements ([`backend/database/schema.sql`](file:///e:/medical_equpments/backend/database/schema.sql))**:
   - Added `default_protection_class` and `default_applied_part_type` to `equipment_types`.
   - Added `protection_class` and `applied_part_type` to `equipments`.
   - Added `checklist_phase` column to `checklist_items` to distinguish phases:
     - `'User pre-use / routine check'`
     - `'Preventive maintenance / technical inspection'`
     - `'Electrical Safety (IEC 62353)'`
     - `'Complaint / corrective maintenance'`
2. **Database Migration Script ([`backend/database/apply_iec62353_upgrade.php`](file:///e:/medical_equpments/backend/database/apply_iec62353_upgrade.php))**:
   - Inserted **345 rigorous IEC 62353 test items** with units ($\Omega$, $\text{M}\Omega$, $\mu\text{A}$), min/max acceptable numeric limits, and corrective failure action protocols across all 63 templates.
   - Cleaned obsolete static titles containing `(33-Point WHO Checklist)` to reflect live dynamic counts.
3. **Backend API Enhancements**:
   - **[`backend/api/equipments.php`](file:///e:/medical_equpments/backend/api/equipments.php)**: Added `protection_class` and `applied_part_type` to SELECT, INSERT, and PUT payloads.
   - **[`backend/api/checklists.php`](file:///e:/medical_equpments/backend/api/checklists.php)**: Updated queries to return `total_items`, `default_protection_class`, `default_applied_part_type`, and sort by phase sequence.
   - **[`backend/api/maintenance_records.php`](file:///e:/medical_equpments/backend/api/maintenance_records.php)**: Automatically schedules `next_pm_due_date` according to `maintenance_schedule_type` (Quarterly $\to +3$ months, Semi-Annual $\to +6$ months, Annual $\to +12$ months).

---

## 5. Frontend & User Interface Implementation

1. **Modal Architecture ([`frontend/src/components/Modal.jsx`](file:///e:/medical_equpments/frontend/src/components/Modal.jsx) & [`frontend/src/index.css`](file:///e:/medical_equpments/frontend/src/index.css))**:
   - Upgraded `Modal` component with dynamic `maxWidth`, custom `style`, and `size="xl"` (1450px / 95vw).
2. **Interactive WHO & IEC 62353 Compliance Modal ([`frontend/src/components/WhoIecComplianceModal.jsx`](file:///e:/medical_equpments/frontend/src/components/WhoIecComplianceModal.jsx))**:
   - Wired to the clickable footer badge in [`frontend/src/components/Footer.jsx`](file:///e:/medical_equpments/frontend/src/components/Footer.jsx).
   - Features 4 interactive tabs:
     - Tab 1: **IEC 62353 Electrical Safety Battery & Limits Table**.
     - Tab 2: **Testing Intervals & Clinical Frequency Timetable**.
     - Tab 3: **WHO 3-Phase Framework & Inventory Governance**.
     - Tab 4: **Live CMMS Implementation Architecture**.
3. **Checklist Runner Modal ([`frontend/src/components/ChecklistRunnerModal.jsx`](file:///e:/medical_equpments/frontend/src/components/ChecklistRunnerModal.jsx))**:
   - Structured into **5 distinct dynamic tabs**:
     - `All Steps (37)`
     - `Phase 1: Pre-Use (13)`
     - `Phase 2: Technical PM (9)`
     - `⚡ Electrical Safety: IEC 62353 (6)` *(Dedicated blue pill with lightning icon)*
     - `Phase 3: Corrective (9)`
   - Blank initial readings for numeric inputs (preventing fake auto-pass).
   - Real-time client-side out-of-tolerance flagging (e.g. entering $0.45\,\Omega$ for earth resistance triggers an instant failure alert).
   - Shows equipment protection class, applied part type, and recurrent PM frequency badges in runner header.
4. **Biomedical Checklists & Maintenance Library ([`frontend/src/views/ChecklistsView.jsx`](file:///e:/medical_equpments/frontend/src/views/ChecklistsView.jsx))**:
   - Upgraded to the same 5-phase structure with dynamic counts.
   - Real-time counter of total hospital protocols: **2,297+ Verified Protocols**.
   - Each card in the catalog shows actual step count (e.g. `37 Checklist Steps`).
   - Step items display `IEC 62353` badges and numeric tolerance ranges (e.g. `Tolerance: 0.00 to 0.30 Ω`).
5. **Asset Forms & Passport**:
   - [`NewEquipmentModal.jsx`](file:///e:/medical_equpments/frontend/src/components/NewEquipmentModal.jsx): Captures `protection_class` and `applied_part_type` on new asset creation with automatic defaults from equipment type.
   - [`EquipmentPassportModal.jsx`](file:///e:/medical_equpments/frontend/src/components/EquipmentPassportModal.jsx): Displays clinical electrical protection and patient contact ratings.

---

## 6. Version Control & Git Repository

- Initialized Git repository on `main` branch.
- Created root [`.gitignore`](file:///e:/medical_equpments/.gitignore) to exclude `node_modules/`, `dist/`, local logs, and temporary files.
- Staged, committed, and pushed 72 files to GitHub:
  - **URL:** `https://github.com/ajitsands/BiomedicalEquipment-.git`
  - **Commit:** `feat: complete biomedical CMMS with WHO & IEC 62353 compliance, interactive modals, and maintenance engine`

---

## 7. How to Run the Application

```cmd
:: To start both backend (port 8000) and frontend (port 2020) and launch browser:
run_localhost_2020.bat

:: To stop all running servers:
stop_localhost_2020.bat
```

---

## 8. Asset Passport Printing & QR Code Scanner Optimization

1. **Clean QR Code Payload (Asset ID Only)**:
   - Updated QR Code generation in [`EquipmentPassportModal.jsx`](file:///e:/medical_equpments/frontend/src/components/EquipmentPassportModal.jsx) and [`ReportsView.jsx`](file:///e:/medical_equpments/frontend/src/views/ReportsView.jsx) to encode **only the Asset ID** (`value={eq.asset_id}`).
   - Removed composite prefixes (`BIOTRACK:...`) so when hospital staff scan the equipment QR tag with any barcode reader, mobile camera, or scanner gun, it reads cleanly as the exact asset number (e.g. `BME-OT-ANES-008`).
   - Enables direct 1:1 barcode scanning into the equipment register search bar.

2. **Official Medical Equipment Asset Passport & QR Label Print Layout**:
   - Resolved print backdrop/overlay issue where browser print preview previously captured dark modal overlays, buttons, and misaligned tab panels across multiple pages.
   - Added comprehensive `@media print` CSS rules in [`index.css`](file:///e:/medical_equpments/frontend/src/index.css) to hide screen UI, flatten overlays to white backgrounds, and format sheets cleanly.
   - Provides two dedicated print options:
     - **Print Passport (A4)**: Formal WHO / IEC 62353 compliant single-page clinical dossier with hospital headers, safety classifications, PM/calibration timelines, vendor support hotlines, and engineering sign-off verification boxes.
     - **Print QR Label**: High-contrast, clean 3" x 2" equipment badge with high-resolution vector QR code, asset ID, serial number, and PM due date designed for thermal sticker printers.


---

## 9. SaNDS Lab Official Branding & Enterprise Customization

1. **Global Casing Correction ("SanDS Lab" -> "SaNDS Lab")**:
   - Audited the entire workspace and database for brand casing integrity.
   - Corrected all occurrences of `SanDS Lab` to **`SaNDS Lab`** across HTML page title, meta description, Navbar, Footer, ReportsView, ChecklistRunnerModal, ComplaintsView, NewEquipmentModal, EquipmentPassportModal, PHP configs, SQL schemas, and active MySQL database text rows.

2. **Company Name & Logo Upload in System Settings**:
   - Enhanced [`SettingsModal.jsx`](file:///e:/medical_equpments/frontend/src/components/SettingsModal.jsx) with a dedicated **"Company Name & Logo"** tab.
   - **Company / Hospital Name**: Text input to define the official hospital or vendor name (defaults to `SaNDS Lab Middle East W.L.L`, with 1-click reset).
   - **Logo Upload**: Image upload input supporting PNG (transparent), SVG, JPEG, and WebP files up to 4MB, with live multi-card previews (light & dark cards) and 1-click restore to the official SaNDS Lab vector logo.
   - **Backend Storage**: [`backend/api/settings.php`](file:///e:/medical_equpments/backend/api/settings.php) supports saving `company_name` and `company_logo` via JSON or `multipart/form-data` file upload into `backend/uploads/`.
   - **Reactive Dynamic Branding**: Once updated in Settings, the new Company Name and Logo instantly render across the top Navbar, Footer, official Asset Passports, and PDF reports.

---

## 10. Reports View Print Blank Screen Fix & Landscape Orientation Optimization

1. **Resolution of Print Blank Screen Bug**:
   - Investigated and resolved an issue where clicking the "Print" button on [`ReportsView.jsx`](file:///e:/medical_equpments/frontend/src/views/ReportsView.jsx) rendered a blank white page in browser print preview.
   - Root cause: CSS rule `.navbar-header { display: none !important; }` in `@media print` combined with unparented print wrappers caused elements to collapse.
   - Added dedicated `@media print` styling rules in [`index.css`](file:///e:/medical_equpments/frontend/src/index.css) ensuring `.reports-view`, tables, KPI summaries, and lifecycle cards remain fully visible with proper pagination during printing.

2. **Landscape Print Optimization (`@page { size: landscape; }`)**:
   - Upgraded `@page` orientation to **Landscape** (`A4 landscape`) with `margin: 12mm 15mm`.
   - Expanded table headers and data columns horizontally to display serial numbers, departments, compliance ratings, and inspection dates with zero line-wrapping or truncation.
   - Styled **Landscape Medical Equipment Lifecycle Dossier** (`.reports-certificate-landscape`) with formal dark clinical borders, institutional verification stamps, and dual sign-off blocks for the Lead Biomedical Engineer and Hospital Clinical Director.

---

## 11. Master Directories for Vendors, Contractors, Suppliers & Hospital Employees

1. **Database Schema Expansion ([`backend/database/create_masters_and_auth.php`](file:///e:/medical_equpments/backend/database/create_masters_and_auth.php))**:
   - **`vendors` Table**:
     - Added `vendor_type` ENUM (`'Vendor / OEM'`, `'Contractor'`, `'Supplier'`, `'Authorized Service Provider'`).
     - Added `tax_id` (CR / Commercial Registration / VAT Tax ID) and `is_active`.
     - Seeded contractors (e.g., *Gulf Biomedical Services*, *MedServe Technologies*, *Arabian Healthcare Logistics*) and suppliers (e.g., *Al-Amal Medical Supplies*, *Middle East Bio-Sensors*, *Bahrain Scientific Company*).
   - **`employees` Table**:
     - Created relational master table: `id`, `employee_code` (e.g. `EMP-1001`), `full_name`, `username` (unique), `password_hash`, `plain_password_hint`, `role`, `department_id`, `designation`, `phone`, `email`, `is_active`, `created_at`, `updated_at`.
     - Pre-seeded 6 clinical and engineering staff:
       - `hassan.bme` (Eng. Hassan Al-Majed, Lead Biomedical Engineer)
       - `reem.bme` (Eng. Reem Al-Khalifa, Senior Clinical Engineer)
       - `tariq.tech` (Tariq Mansoor, BME Maintenance Specialist)
       - `layla.nurse` (Staff Nurse Layla, ICU Charge Nurse)
       - `sarah.doc` (Dr. Sarah Al-Doseri, Head of Critical Care)
       - `admin` (System Administrator)
   - **`complaints` Table**:
     - Added `booked_by_employee_id`, `serviced_by_type`, `serviced_by_vendor_id`, `service_attachment_url`, and `service_attachment_name`.

2. **Backend REST APIs**:
   - **[`backend/api/vendors.php`](file:///e:/medical_equpments/backend/api/vendors.php)**: Enhanced with category filtering (`type=Contractor`, `type=Supplier`, `type=Vendor / OEM`, `type=ALL`), and full CRUD (Create, Read, Update, Delete).
   - **[`backend/api/employees.php`](file:///e:/medical_equpments/backend/api/employees.php)**: Full employee lifecycle management including BCrypt password encryption, credential authentication (`action=login`), and department joins.

3. **Master Directory UI Modals**:
   - **[`PartnersModal.jsx`](file:///e:/medical_equpments/frontend/src/components/PartnersModal.jsx)**: Full directory management for OEM Vendors, Maintenance Contractors, and Medical Suppliers with tabbed category filtering, search, hotline, and CR/Tax ID tracking.
   - **[`EmployeesModal.jsx`](file:///e:/medical_equpments/frontend/src/components/EmployeesModal.jsx)**: Comprehensive staff directory with username & password management, show/hide password toggle, auto-generated secure passwords, role assignments, and active complaint booking counters.

---

## 12. Select2-Style Searchable Dropdowns Across CMMS Forms

1. **Select2 Search Component ([`SelectSearch.jsx`](file:///e:/medical_equpments/frontend/src/components/SelectSearch.jsx))**:
   - Reusable search-as-you-type dropdown component with fuzzy search, multi-line sub-labels, keyboard navigation, clear buttons, and clean scroll containers.

2. **Integration Across Forms**:
   - **Rapid Complaint Booking ([`BookComplaintModal.jsx`](file:///e:/medical_equpments/frontend/src/components/BookComplaintModal.jsx))**:
     - Replaced text fields with Select2 searchable employee selector.
     - Searching by staff name, employee code, username, or role auto-fills full name, designation, extension phone, and department.
   - **Equipment Master Registration ([`NewEquipmentModal.jsx`](file:///e:/medical_equpments/frontend/src/components/NewEquipmentModal.jsx))**:
     - Converted vendor selection to Select2 searchable input with instant partner hotline preview and a shortcut button to manage partners.
   - **Corrective Maintenance Ticket Resolution ([`ComplaintsView.jsx`](file:///e:/medical_equpments/frontend/src/views/ComplaintsView.jsx))**:
     - Select2 searchable dropdown to select the assigned contractor, OEM vendor, or warranty service company upon completing repairs.

---

## 13. Employee Credentials, BCrypt Authentication & Complaint Booking Audit Log

1. **Authentication Context & User Switcher**:
   - Created **[`AuthContext.jsx`](file:///e:/medical_equpments/frontend/src/context/AuthContext.jsx)** providing `currentUser`, `loginWithCredentials`, and `switchUser` across the entire application.
   - Created **[`UserLoginModal.jsx`](file:///e:/medical_equpments/frontend/src/components/UserLoginModal.jsx)**: 1-click staff profile switcher and password login dialog.

2. **Booking Audit & Traceability**:
   - Complaints logged via `BookComplaintModal` save `booked_by_employee_id`.
   - In [`ComplaintsView.jsx`](file:///e:/medical_equpments/frontend/src/views/ComplaintsView.jsx), every work ticket displays who booked the complaint, timestamp, and a verified staff badge (`Staff #EMP-XXXX` or `@username`).

---

## 14. Contractor / Vendor Servicing & Service Report Document Attachments

1. **Servicing Responsibility Workflow**:
   - In [`ComplaintsView.jsx`](file:///e:/medical_equpments/frontend/src/views/ComplaintsView.jsx) resolution modal, added **Servicing Responsibility / Provider Type**:
     - `In-House Biomedical Engineering`
     - `External Contractor`
     - `OEM Vendor`
     - `Warranty Service Provider`
   - Dynamically loads contractor/vendor directory options from the Partners Master.

2. **Optional Service Document Attachment**:
   - Added document attachment upload supporting PDF service reports, calibration certificates, field service receipts, and vendor invoices.
   - Handled by [`backend/api/upload_attachment.php`](file:///e:/medical_equpments/backend/api/upload_attachment.php) and saved to `/uploads/`.
   - Displays uploaded file preview with view/download and removal options.
   - In the complaints table, tickets with attached service reports display a clickable green badge: `📎 Service Report`.

---

## 15. Unified "Masters" Space-Saving Dropdown Menu in Top Navigation

1. **Header Space Consolidation ([`Navbar.jsx`](file:///e:/medical_equpments/frontend/src/components/Navbar.jsx) & [`index.css`](file:///e:/medical_equpments/frontend/src/index.css))**:
   - Replaced 5 separate navbar buttons with a single unified, compact dropdown button: **`[ 📦 Masters (5) ▾ ]`**.
   - Drastically frees up horizontal top-bar space across standard and wide monitors.
   - Features outside-click detection and `Escape` key listeners for smooth auto-closing.

2. **Consolidated Dropdown Menu Contents**:
   - **Eng. / Biomedical Staff Session**: Active engineer status (`Eng. Hassan Al-Majed`), role badge, and 1-click **"Switch / Sign In"** action.
   - **Biomedical Equipments Master**: Direct link to the equipment register, specs, and QR/RFID inventory.
   - **+ Register New Asset**: Instant shortcut to register and commission a new medical device.
   - **Partners Master**: Directory for OEM Vendors, Maintenance Contractors, and Equipment Suppliers.
   - **Employees & Staff**: Hospital staff directory, usernames, passwords, and booking logs.
   - **Departments Master**: Hospital wards, floors, ICU, OT suites, and bed slots.

---

## 16. Git Repository & Locked Release Tag

- **Locked Version:** `v2.1.0` (Tagged and pushed to origin)
- **Previous Tag:** `v2.0.0`
- **Branch:** `v2.0`
- **Remote:** `https://github.com/ajitsands/BiomedicalEquipment-.git`
- **Feature Set:** Multi-Device RFID & Cross-Department Movement Engine, Database Duplicate Filtering, Zero-Phantom Offline Reader Immunity

---

## 17. Dahua DHI-ASI1201M-MEP Access Control & RFID Integration

1. **Hardware Reader & Network Setup:**
   - **Device Model:** Dahua DHI-ASI1201M-MEP Access Control Terminal
   - **Network IP:** `192.168.8.108` (Port 80 HTTP, Digest Auth: `admin` / `admin@123`)
   - **Monitored Gate:** Operation Theatre Complex (OT Exit Gate)
   - **Connectivity:** Direct LAN verified with 1ms round-trip ping and real-time CGI record polling.

2. **RFID Tag & Asset Linkage:**
   - **Target Biomedical Asset:** `BME-OT-ANES-008` (*Anesthesia Workstation OT-2*)
   - **Home Location:** Operation Theatre Complex (OT), Surgical Pavilion B, 2nd Floor, Room: `OT Suite 2`
   - **Card Hex UID:** `6F4244DB` (also supports Dahua enrolled card `FFCD3BDB`)
   - **Card Alias / Printed ID:** `BMEOTANES008`
   - **Wiegand 32/34 Decimal:** `1866613979`

3. **IN / OUT Door Toggle State Machine:**
   - **Moving OUT:** When card `6F4244DB` is swiped while device is IN $\rightarrow$ Asset relocates to `OT Exit Gate / Corridor Transit`, `transit_status = 'OUT'`, logged in `rfid_scan_logs` with direction `OUT`.
   - **Moving IN:** When swiped again after some time $\rightarrow$ Asset returns to `OT Suite 2 (Inside Department)`, `transit_status = 'IN'`, logged with direction `IN`.

4. **Timezone & System Setting DateTime Formatting:**
   - All scan logs and live movement records strictly format timestamps according to the active Regional Settings (`timezone` e.g. `Asia/Bahrain`, `date_format` e.g. `DD/MM/YYYY`, `time_format` e.g. `12h/24h`).
   - Helper functions: `formatSystemDateTime()` in backend [db.php](file:///e:/medical_equpments/backend/config/db.php) and `formatDateTime()` in frontend [SettingsContext.jsx](file:///e:/medical_equpments/frontend/src/context/SettingsContext.jsx).

5. **Real-time Live Tracking UI & Background Daemon:**
   - **UI (`RfidView.jsx`):** Real-time auto-polling every 3 seconds so physical reader card taps reflect instantly on screen.
   - **Interactive Hardware Gateway Card:** Live online ping status, card details, and 1-click test tap button.
   - **Background Daemon (`backend/scripts/dahua_listener.php`):** Continuous background service querying reader access records and streaming updates in real time.
   - **Ingestion & Sync API (`backend/api/dahua_rfid_receiver.php`):** Provides `/api/dahua_rfid_receiver.php?action=status`, `action=poll`, and `action=test_swipe`.

---

## 18. Access Control Reader Node Select2 & Dynamic Registration

1. **Database Master (`rfid_readers`):**
   - Table storing reader hardware nodes: `reader_code`, `name`, `device_model`, `ip_address`, `port`, `reader_type`, `department_id`, `door_zone`, `building`, `floor`, `is_active`.
   - Seeded nodes:
     - `DHI-ASI1201M-MEP (192.168.8.108)` — Operation Theatre Exit Gate
     - `READER-OT-HUB-02` — Surgical Pavilion B, 2nd Floor
     - `READER-ICU-NODE-3A` — Critical Care Tower A, 3rd Floor
     - `READER-ER-GATEWAY-1` — Emergency & Trauma Ground Floor

2. **Backend API (`backend/api/rfid_readers.php`):**
   - `GET /api/rfid_readers.php`: Returns reader list formatted for Select2 with `value`, `label`, and `subLabel` (`{door_zone} • IP: {ip_address}`).
   - `POST /api/rfid_readers.php`: Registers a new access control / RFID reader node into the master table.

3. **Frontend Select2 Component (`SelectSearch.jsx`):**
   - Filterable searchable dropdown with instant type-to-filter search input, clear button, and secondary sub-label badges.

4. **Dynamic New Reader Modal (`NewReaderModal.jsx`):**
   - Dedicated modal allowing users to register new access controllers by specifying:
     - Reader Name & Device Model (e.g. Dahua DHI-ASI1201M-MEP / UHF Gateway Antenna)
     - IP Address & HTTP/SDK Port
     - Department, Building, Floor & Monitored Door Zone
   - Instantly refreshes dropdown lists and auto-selects newly registered nodes.

5. **Integrated Across System:**
   - **Equipment Passport Modal (`EquipmentPassportModal.jsx` - Tab 6):** Select2 reader selector with `+ Add Reader Node` button.
   - **RFID Zone Relocator Modal (`RfidScanModal.jsx`):** Select2 reader selector with `+ Add Reader Node` button.
   - **New Equipment Master Modal (`NewEquipmentModal.jsx`):** Select2 reader selector with `+ Add Node` button.
   - **RFID Live Tracking View (`RfidView.jsx`):** `+ Add Reader Node` button in dashboard header.

---

## 19. Multi-Asset Dynamic RFID Card Resolution & Collision Prevention

1. **Root Cause Analysis:**
   - The initial prototype specifically linked the physical Dahua reader at `192.168.8.108` and Card `6F4244DB` to `BME-OT-ANES-008` (*Anesthesia Workstation OT-2*).
   - In `backend/scripts/dahua_listener.php` and `backend/api/dahua_rfid_receiver.php`, card events were querying `WHERE asset_id = 'BME-OT-ANES-008'`.
   - When the user assigned Card `6F4244DB` to `BME-OT-ESU-007` (*Electrosurgical Generator Unit (Diathermy)*), both equipments had `6F4244DB`, and the hardcoded asset ID prevented `BME-OT-ESU-007` from triggering.

2. **Resolution & Modern Multi-Asset Engine:**
   - **Fully Dynamic Equipment Resolution:**
     All Dahua swipe events (`dahua_listener.php`, `dahua_rfid_receiver.php`, `rfid_scan.php`) now resolve the target asset dynamically by looking up `rfid_tag_id`, `rfid_card_hex`, or `rfid_card_alias`, supporting both Hex and Decimal Wiegand representations.
   - **Unique Card Assignment & Collision Guard:**
     In `backend/api/equipments.php`, when updating an equipment's RFID tag, any previous equipment sharing that card is automatically cleared, ensuring clean 1:1 mapping between physical RFID tags and biomedical assets.
   - **Home Room Preservation:**
     When entering `IN`, the asset returns to its own designated room (e.g. `OT Suite 3` for Diathermy, `OT Suite 2` for Anesthesia), and relocates to `OT Exit Gate / Corridor` when exiting `OUT`.
   - **Dynamic Dahua Live Panel:**
     `RfidView.jsx` dynamically displays whichever asset is linked to the reader's active card, providing 1-click test toggling and instant live status reflection.
   - **5-Second Hardware Swipe Debounce:**
     Introduced a 5-second cooldown window preventing duplicate toggles when both the background listener daemon and the frontend web poller process the same physical card swipe simultaneously.
   - **Background Daemon Restart:**
     Restarted `dahua_listener.php` with the new dynamic engine and debounce filter.


---

## 20. Multi-Device RFID & Cross-Department Movement Engine

1. **Root Cause of Device Flip Bug Resolved:**
   - Historical Hardware Buffer Replay: When reader 192.168.8.108 went offline and 192.168.8.109 was online, reader 109 replayed historical records due to pointer resets and lack of timestamp staleness checks.
   - Fix: Added a 120-second timestamp freshness guard and monotonic pointer advancement.

2. **Cross-Department Transfer State Machine:**
   - Same Department: Toggles between IN and OUT.
   - Cross-Department Transfer: When scanned at another department reader, asset relocates to the new department and is marked as IN.
   - Subsequent Scans: Once relocated, subsequent scans at the new reader toggle between IN and OUT.

3. **Frontend UI Telemetry:**
   - RfidView.jsx displays IN/OUT asset count breakdown per department.
   - TestSwipeModal.jsx provides action preview for cross-department relocation.

---

## 21. Database-Level Swipe Verification & Zero-Phantom-Movement Architecture

1. **Logical Error Identified:**
   - When pulling access control records from Dahua readers, reader `192.168.8.109` had 30 historical records in its internal buffer (`found=30`, timestamps `1792700148` to `1792752042`).
   - In `rfid_scan_logs`, `device_timestamp` and `device_rec_no` were previously stored as `NULL`.
   - Consequently, when reader `192.168.8.108` went offline and `192.168.8.109` was polled, the query `SELECT id FROM rfid_scan_logs WHERE ... device_timestamp = ?` returned no match, causing reader 109's old records to be treated as brand new punches. This erroneously relocated assets to OPD (Department 13).
   - If both devices were online, unsynced historical logs from both readers competed, causing assets to bounce back and forth on every punch.

2. **Resolution Applied:**
   - **Direct Database Record Verification:**
     In `dahua_rfid_receiver.php`, `dahua_listener.php`, and `rfid_scan.php`, every single record fetched from any reader device is checked against `rfid_scan_logs` matching `reader_ip + raw_card_number + (device_timestamp OR device_rec_no)`. If an entry exists in the database, it is **immediately ignored**.
   - **Mandatory Device Timestamp & RecNo Indexing:**
     Updated all insert queries (`dahua_rfid_receiver.php`, `rfid_scan.php`, `dahua_listener.php`) to save `device_rec_no` and `device_timestamp`.
   - **Chronological Guard (`rfid_last_device_time`):**
     Each asset stores its latest verified punch timestamp (`rfid_last_device_time`). If an older record from another reader is received with a timestamp $\le$ `rfid_last_device_time`, it is ignored, preventing past records from pulling an asset backwards in time.
   - **Historical Database Synchronization:**
     All 30 existing records from reader `192.168.8.109` were seeded into `rfid_scan_logs`. All monitored assets were returned to Department 2 (OT Complex) with status `🟢 IN`. Future polls now recognize all 30 records as already processed.
   - **Full Offline Immunity:**
     Verified that with `192.168.8.108` offline and `192.168.8.109` online, zero phantom movements occur and assets remain in OT. Physical swipes on either reader trigger exactly once.

---

## 22. Progressive Multi-Session PM Execution & Physical A4 Print Engine

1. **Progressive PM Draft Persistence Architecture:**
   - **Clinical Challenge:** Complex hospital biomedical equipment (e.g., Hemodialysis Stations with 37+ IEC 62353 & WHO checkpoints) cannot always be completed in a single session. Clinical engineers frequently complete 10 items on day one, 20 items on day two, and finish remaining checks subsequently.
   - **Database Architecture (`pm_checklist_drafts`):**
     Created dedicated draft persistence table with `equipment_id`, `template_id`, `technician_name`, `technician_badge`, `inspection_date`, `time_spent_minutes`, `engineer_notes`, `parts_replaced`, `completed_count`, `total_items`, `progress_percent`, `answers_json`, and `status = 'in_progress'`.
   - **UI Feedback & State Restoration:**
     The Checklist Runner modal ([`ChecklistRunnerModal.jsx`](file:///e:/medical_equpments/frontend/src/components/ChecklistRunnerModal.jsx)) displays real-time progress percentages, completed count vs total count, and allows saving progressive drafts anytime without requiring 100% completion. Unfinished items remain marked as `Pending`.
   - **Seamless Resumption:**
     When reopening a checklist for any asset with an active draft, all previously entered answers, measured values, and remarks are instantly restored.

2. **Physical A4 Print Worksheet Engine:**
   - **Isolated Iframe Printing:**
     Replaced browser modal CSS print overrides with an isolated hidden print iframe in [`PrintablePhaseWorksheetModal.jsx`](file:///e:/medical_equpments/frontend/src/components/PrintablePhaseWorksheetModal.jsx) and [`PrintableHousekeepingWorksheetModal.jsx`](file:///e:/medical_equpments/frontend/src/components/PrintableHousekeepingWorksheetModal.jsx), eliminating blank screen print issues.
   - **Dynamic Organization Branding:**
     Company name and logo are retrieved dynamically from central Application Settings (`backend/api/settings.php`).
   - **Header Layout Compliance:**
     The company logo and name are aligned in a clean single header line, with department and facility details aligned to the left margin without outdated static hospital text.

---

## 23. Hospital Housekeeping & Infection Control Management Module

1. **Clinical & Regulatory Scope:**
   - Designed to meet NHRA (National Health Regulatory Authority) cleanliness standards and WHO infection control protocols for critical patient care areas.
2. **Master Inspection Framework (`housekeeping_checklist_master`):**
   - 28 standardized cleanliness checkpoints across high-touch patient contact surfaces, floor/wall sanitation, waste segregation (biohazard sharps), and environmental disinfection.
   - Incorporates ATP bioluminescence swab readings (Relative Light Units - RLU) with strict threshold limits ($\le 100$ RLU).
3. **Core Modules Implemented:**
   - **[`HousekeepingView.jsx`](file:///e:/medical_equpments/frontend/src/views/HousekeepingView.jsx)**: Central hospital housekeeping dashboard displaying active audits, compliance pass rates, department filtering, and overdue alerts.
   - **[`HousekeepingInspectionRunnerModal.jsx`](file:///e:/medical_equpments/frontend/src/components/HousekeepingInspectionRunnerModal.jsx)**: Interactive progressive audit runner supporting 1-by-1 point inspection, ATP logging, and progressive draft saving.
   - **[`BookHousekeepingComplaintModal.jsx`](file:///e:/medical_equpments/frontend/src/components/BookHousekeepingComplaintModal.jsx)**: Rapid complaint booking for environmental cleanliness deficiencies.
   - **[`HousekeepingCertificateModal.jsx`](file:///e:/medical_equpments/frontend/src/components/HousekeepingCertificateModal.jsx)**: Official A4 cleanliness audit certificates with verification QR codes and engineer signatures.

---

## 24. Mobile Field Staff Portal (`#mobile`) & Real-Time CMMS Synchronization

1. **System Architecture & Hardware Access:**
   - Built a dedicated mobile-first responsive web application accessible at `http://<SERVER_LAN_IP>:2020/#mobile`.
   - Desktop application includes a **Mobile Portal Launcher Modal** ([`MobilePortalLauncherModal.jsx`](file:///e:/medical_equpments/frontend/src/components/MobilePortalLauncherModal.jsx)) that dynamically detects the server's local IPv4 Wi-Fi LAN address and generates a QR code for smartphone camera scanning.
   - Pure mobile viewport experience: desktop navbars, footers, and complex multi-column grids are hidden when operating under `#mobile`.

2. **Categorized Field Work Streams:**
   - Mobile dashboard categorizes staff duties into 4 streams with live pending task counters:
     1. **Preventive Maintenance (PM)** (WHO & IEC 62353 safety checklists)
     2. **Breakdowns & Work Orders** (Emergency equipment repairs and corrective actions)
     3. **Site Preparations & Infra** (130-point facility pre-installation inspections)
     4. **Housekeeping & Infection Control** (NHRA sanitation audits)

3. **1-by-1 Mobile Task Runner & Incremental Progress Saving:**
   - Field engineers can execute tasks step-by-step directly from their smartphone.
   - Tapping **Save Progress** immediately updates `pm_checklist_drafts` and sets `pm_phase_assignments` to `In Progress` in real time.
   - When all steps are verified and signed, tapping **Submit Final Job** archives the draft, advances `next_pm_due_date`, restores equipment status to `Operational`, and logs the official maintenance record.

4. **Bug Diagnosis & Resolution (PM Category Load Error):**
   - **Error Identified:** When clicking *Preventive Maintenance (PM)* on mobile, a `500 Internal Server Error` ("Failed to load assigned jobs") occurred due to referencing `dr.completed_items_count` and `dr.total_items_count` instead of `dr.completed_count` and `dr.total_items`. Furthermore, checklist ordering queried `ci.item_order` instead of `ci.step_number`.
   - **Fix Applied:** Aligned column names in [mobile_portal.php](file:///e:/medical_equpments/backend/api/mobile_portal.php), mapped `job_id` dynamically between phase assignments and asset IDs, and normalized `answers_json` storage.
   - **Verification:** Verified all mobile portal endpoints return HTTP 200 with full 37-point checklists and real-time draft progress.



