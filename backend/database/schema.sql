-- Biomedical Equipment Maintenance Management System (BEMS / CMMS)
-- Database Schema for Hospital Asset Tracking, PM Checklists, RFID & QR Code Lifecycle Management
-- Powered and Engineered by SanDS Lab Middle East W.L.L

CREATE DATABASE IF NOT EXISTS `biomedical_cmms` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `biomedical_cmms`;

-- 1. Departments & Facility Locations
CREATE TABLE IF NOT EXISTS `departments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(120) NOT NULL,
    `code` VARCHAR(30) NOT NULL UNIQUE,
    `building` VARCHAR(100) NOT NULL,
    `floor` VARCHAR(50) NOT NULL,
    `head_of_department` VARCHAR(100),
    `contact_phone` VARCHAR(50),
    `email` VARCHAR(100),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Specific Rooms / Beds / Zones within Departments
CREATE TABLE IF NOT EXISTS `locations` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `department_id` INT NOT NULL,
    `room_number` VARCHAR(50) NOT NULL,
    `room_type` VARCHAR(50) DEFAULT 'General',
    `bed_slot` VARCHAR(50),
    `rfid_zone_tag` VARCHAR(60),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Vendors, Manufacturers & Authorized Service Providers
CREATE TABLE IF NOT EXISTS `vendors` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `vendor_code` VARCHAR(50) UNIQUE,
    `contact_person` VARCHAR(100),
    `phone` VARCHAR(50),
    `emergency_hotline` VARCHAR(50) NOT NULL,
    `email` VARCHAR(100),
    `address` TEXT,
    `service_manager` VARCHAR(100),
    `service_manager_phone` VARCHAR(50),
    `website` VARCHAR(150),
    `rating` DECIMAL(2,1) DEFAULT 4.5,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Equipment Types & Master Classifications (WHO Technical Series Aligned)
CREATE TABLE IF NOT EXISTS `equipment_types` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `category` VARCHAR(100) NOT NULL, -- Life Support, Critical Care, Diagnostic, Therapeutic, Surgical, Neonatal, Sterilization
    `risk_classification` VARCHAR(30) NOT NULL, -- High (Class III), Medium (Class IIb), Low (Class I)
    `default_pm_frequency` VARCHAR(50) DEFAULT 'Quarterly', -- Monthly, Bi-Monthly, Quarterly, Semi-Annually, Annually
    `standard_regulatory_code` VARCHAR(50) DEFAULT 'IEC 60601-1 / IEC 62353',
    `default_protection_class` VARCHAR(30) DEFAULT 'Class I', -- Class I, Class II, Internally Powered
    `default_applied_part_type` VARCHAR(20) DEFAULT 'None', -- None, B, BF, CF
    `icon_name` VARCHAR(50) DEFAULT 'Activity',
    `description` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Equipments Master Register (Asset Passport & Full Lifecycle)
CREATE TABLE IF NOT EXISTS `equipments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `asset_id` VARCHAR(50) NOT NULL UNIQUE,
    `equipment_type_id` INT NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `brand` VARCHAR(100) NOT NULL,
    `model_number` VARCHAR(100) NOT NULL,
    `serial_number` VARCHAR(100) NOT NULL,
    `qr_code_token` VARCHAR(100) NOT NULL UNIQUE,
    `rfid_tag_id` VARCHAR(100) NOT NULL,
    
    -- Location Tracking
    `department_id` INT NOT NULL,
    `building` VARCHAR(100) NOT NULL,
    `floor` VARCHAR(50) NOT NULL,
    `room_number` VARCHAR(50) NOT NULL,
    `bed_slot` VARCHAR(50),
    `rfid_last_detected_at` DATETIME,
    `rfid_reader_node` VARCHAR(50),

    -- Purchase & Financial Details
    `vendor_id` INT NOT NULL,
    `po_number` VARCHAR(80),
    `invoice_number` VARCHAR(80),
    `purchase_date` DATE NOT NULL,
    `purchase_cost` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `currency` VARCHAR(10) DEFAULT 'USD',
    `installation_date` DATE,
    `commissioning_engineer` VARCHAR(100),

    -- Warranty & Maintenance Contract
    `warranty_start_date` DATE NOT NULL,
    `warranty_end_date` DATE NOT NULL,
    `warranty_status` ENUM('Under Warranty', 'Out of Warranty') NOT NULL DEFAULT 'Under Warranty',
    `contract_type` ENUM('Warranty Period', 'Comprehensive AMC (CMC)', 'Non-Comprehensive AMC', 'In-House Maintenance') NOT NULL DEFAULT 'Warranty Period',
    `contract_vendor_id` INT,
    `contract_start_date` DATE,
    `contract_end_date` DATE,
    `contract_value` DECIMAL(12,2) DEFAULT 0.00,
    `maintenance_schedule_type` VARCHAR(50) DEFAULT 'Quarterly',
    `maintenance_schedule_notes` TEXT,

    -- Emergency Contacts
    `emergency_contact_name` VARCHAR(100),
    `emergency_phone` VARCHAR(50) NOT NULL,
    `vendor_service_email` VARCHAR(100),

    -- Status & Health
    `status` ENUM('Operational', 'In Use', 'Under Breakdown', 'Under Maintenance', 'Calibration Due', 'Decommissioned') NOT NULL DEFAULT 'Operational',
    `last_pm_date` DATE,
    `next_pm_due_date` DATE,
    `last_calibration_date` DATE,
    `next_calibration_due_date` DATE,
    `criticality` ENUM('Critical Life-Support', 'High Priority', 'Standard', 'Low') DEFAULT 'High Priority',
    `protection_class` VARCHAR(30) DEFAULT 'Class I', -- Class I, Class II, Internally Powered
    `applied_part_type` VARCHAR(20) DEFAULT 'None', -- None, B, BF, CF
    
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (`equipment_type_id`) REFERENCES `equipment_types`(`id`),
    FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`),
    FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`),
    FOREIGN KEY (`contract_vendor_id`) REFERENCES `vendors`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Checklist Templates (Associated with Equipment Types)
CREATE TABLE IF NOT EXISTS `checklist_templates` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `equipment_type_id` INT NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `frequency` VARCHAR(50) NOT NULL DEFAULT 'Quarterly',
    `standard_reference` VARCHAR(120) DEFAULT 'WHO Medical Device Technical Series / IEC 62353',
    `estimated_minutes` INT DEFAULT 45,
    `description` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`equipment_type_id`) REFERENCES `equipment_types`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Checklist Items (Detailed testing items per template)
CREATE TABLE IF NOT EXISTS `checklist_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `template_id` INT NOT NULL,
    `category` VARCHAR(100) NOT NULL, -- Physical & Visual Inspection, Electrical Safety Test, Functional Performance, Calibration & Verification, Alarms & Safety Cut-offs, Battery & Power System, Cleaning & Consumables
    `step_number` INT NOT NULL DEFAULT 1,
    `title` VARCHAR(255) NOT NULL,
    `instructions` TEXT,
    `check_type` ENUM('pass_fail', 'numeric', 'options', 'text') NOT NULL DEFAULT 'pass_fail',
    `unit` VARCHAR(30), -- Ohms, µA, Joules, BPM, mmHg, mL/hr, % etc.
    `min_value` DECIMAL(10,2),
    `max_value` DECIMAL(10,2),
    `is_mandatory` BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (`template_id`) REFERENCES `checklist_templates`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Maintenance Logs (Executed PM / Calibration / Inspection Records)
CREATE TABLE IF NOT EXISTS `maintenance_records` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `work_order_no` VARCHAR(60) NOT NULL UNIQUE,
    `equipment_id` INT NOT NULL,
    `template_id` INT,
    `maintenance_type` ENUM('Preventive Maintenance (PM)', 'Electrical Safety Analyzer Test', 'Annual Calibration', 'Post-Repair Verification', 'Routine Inspection') NOT NULL,
    `performed_by` VARCHAR(100) NOT NULL,
    `technician_badge` VARCHAR(50),
    `performed_date` DATE NOT NULL,
    `overall_result` ENUM('Passed - Ready for Clinical Use', 'Passed with Observation', 'Failed - Immediate Attention Required') NOT NULL,
    `next_pm_due_date` DATE NOT NULL,
    `time_spent_minutes` INT DEFAULT 45,
    `test_equipment_used` VARCHAR(200) DEFAULT 'Fluke ESA620 Electrical Safety Analyzer, Rigel 288+',
    `engineer_notes` TEXT,
    `parts_replaced` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`equipment_id`) REFERENCES `equipments`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`template_id`) REFERENCES `checklist_templates`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Maintenance Record Items (Individual checklist step results)
CREATE TABLE IF NOT EXISTS `maintenance_record_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `maintenance_record_id` INT NOT NULL,
    `checklist_item_id` INT,
    `category` VARCHAR(100) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `status` ENUM('Pass', 'Fail', 'N/A', 'Observation') NOT NULL DEFAULT 'Pass',
    `measured_value` VARCHAR(100),
    `remarks` TEXT,
    FOREIGN KEY (`maintenance_record_id`) REFERENCES `maintenance_records`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`checklist_item_id`) REFERENCES `checklist_items`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Complaints & Breakdown Tickets (Real-time Booking & Resolution)
CREATE TABLE IF NOT EXISTS `complaints` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `ticket_number` VARCHAR(60) NOT NULL UNIQUE,
    `equipment_id` INT NOT NULL,
    `booked_by_name` VARCHAR(100) NOT NULL,
    `booked_by_role` VARCHAR(100) NOT NULL DEFAULT 'Staff Nurse',
    `booked_by_phone` VARCHAR(50) NOT NULL,
    `department_id` INT NOT NULL,
    `room_or_bed` VARCHAR(80),
    `complaint_category` VARCHAR(100) NOT NULL,
    `priority` ENUM('Critical - Life Support', 'High Priority', 'Medium', 'Low') NOT NULL DEFAULT 'High Priority',
    `description` TEXT NOT NULL,
    `reported_at` DATETIME NOT NULL,
    
    -- Resolution workflow
    `status` ENUM('Open', 'Acknowledged', 'Assigned', 'In Progress', 'Awaiting Spare Parts', 'Repaired & Verified', 'Closed') NOT NULL DEFAULT 'Open',
    `assigned_engineer` VARCHAR(100),
    `assigned_at` DATETIME,
    `action_taken` TEXT,
    `root_cause` TEXT,
    `replaced_parts` TEXT,
    `repair_cost` DECIMAL(10,2) DEFAULT 0.00,
    `downtime_hours` DECIMAL(6,2) DEFAULT 0.00,
    `resolved_at` DATETIME,
    `closed_at` DATETIME,
    `satisfaction_rating` INT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (`equipment_id`) REFERENCES `equipments`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Equipment Attachments (User Manuals, Warranty Cards, Calibration Certificates)
CREATE TABLE IF NOT EXISTS `equipment_attachments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `equipment_id` INT NOT NULL,
    `document_type` ENUM('User Manual', 'Service Manual', 'Warranty Card / Guarantee Certificate', 'Installation Report', 'Calibration Certificate', 'Process Manual / SOP', 'Purchase Invoice / PO') NOT NULL,
    `file_title` VARCHAR(200) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(255) NOT NULL,
    `file_size_kb` INT DEFAULT 0,
    `uploaded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`equipment_id`) REFERENCES `equipments`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. RFID Tag Live Tracking & Movement History
CREATE TABLE IF NOT EXISTS `rfid_scan_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `equipment_id` INT NOT NULL,
    `rfid_tag_id` VARCHAR(100) NOT NULL,
    `reader_id` VARCHAR(100) NOT NULL,
    `detected_building` VARCHAR(100) NOT NULL,
    `detected_floor` VARCHAR(50) NOT NULL,
    `detected_department` VARCHAR(100) NOT NULL,
    `detected_room` VARCHAR(50) NOT NULL,
    `scan_timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `signal_strength_rssi` INT DEFAULT -65,
    FOREIGN KEY (`equipment_id`) REFERENCES `equipments`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
