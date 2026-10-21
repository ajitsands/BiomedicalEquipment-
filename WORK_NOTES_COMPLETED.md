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
