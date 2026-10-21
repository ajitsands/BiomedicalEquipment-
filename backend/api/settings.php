<?php
// Settings API for Regional, Localization, Branding & Financial Configuration
// Powered and Engineered by SaNDS Lab Middle East W.L.L
require_once __DIR__ . '/../config/db.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT setting_key, setting_value, category, description, updated_at FROM system_settings");
        $rows = $stmt->fetchAll();
        
        $settings = [];
        foreach ($rows as $row) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }

        if (empty($settings['company_name'])) {
            $settings['company_name'] = 'SaNDS Lab Middle East W.L.L';
        }
        if (empty($settings['company_logo'])) {
            $settings['company_logo'] = '/sands_logo.png';
        }

        // Available regional configurations for Gulf countries and India
        $regions = [
            'bahrain' => [
                'name' => 'Bahrain',
                'flag' => '🇧🇭',
                'country_code' => 'BH',
                'timezone' => 'Asia/Bahrain',
                'gmt_offset' => 'GMT+3',
                'currency' => 'BHD',
                'currency_symbol' => 'BD',
                'currency_name' => 'Bahraini Dinar',
                'decimals' => 3,
                'date_format' => 'DD/MM/YYYY',
                'time_format' => '12h',
                'number_grouping' => 'standard'
            ],
            'saudi' => [
                'name' => 'Saudi Arabia (KSA)',
                'flag' => '🇸🇦',
                'country_code' => 'SA',
                'timezone' => 'Asia/Riyadh',
                'gmt_offset' => 'GMT+3',
                'currency' => 'SAR',
                'currency_symbol' => 'SAR',
                'currency_name' => 'Saudi Riyal (ر.س)',
                'decimals' => 2,
                'date_format' => 'DD/MM/YYYY',
                'time_format' => '12h',
                'number_grouping' => 'standard'
            ],
            'uae' => [
                'name' => 'United Arab Emirates',
                'flag' => '🇦🇪',
                'country_code' => 'AE',
                'timezone' => 'Asia/Dubai',
                'gmt_offset' => 'GMT+4',
                'currency' => 'AED',
                'currency_symbol' => 'AED',
                'currency_name' => 'UAE Dirham (د.إ)',
                'decimals' => 2,
                'date_format' => 'DD/MM/YYYY',
                'time_format' => '12h',
                'number_grouping' => 'standard'
            ],
            'kuwait' => [
                'name' => 'Kuwait',
                'flag' => '🇰🇼',
                'country_code' => 'KW',
                'timezone' => 'Asia/Kuwait',
                'gmt_offset' => 'GMT+3',
                'currency' => 'KWD',
                'currency_symbol' => 'KD',
                'currency_name' => 'Kuwaiti Dinar (د.ك)',
                'decimals' => 3,
                'date_format' => 'DD/MM/YYYY',
                'time_format' => '12h',
                'number_grouping' => 'standard'
            ],
            'qatar' => [
                'name' => 'Qatar',
                'flag' => '🇶🇦',
                'country_code' => 'QA',
                'timezone' => 'Asia/Qatar',
                'gmt_offset' => 'GMT+3',
                'currency' => 'QAR',
                'currency_symbol' => 'QR',
                'currency_name' => 'Qatari Riyal (ر.ق)',
                'decimals' => 2,
                'date_format' => 'DD/MM/YYYY',
                'time_format' => '12h',
                'number_grouping' => 'standard'
            ],
            'oman' => [
                'name' => 'Oman',
                'flag' => '🇴🇲',
                'country_code' => 'OM',
                'timezone' => 'Asia/Muscat',
                'gmt_offset' => 'GMT+4',
                'currency' => 'OMR',
                'currency_symbol' => 'OMR',
                'currency_name' => 'Omani Rial (ر.ع)',
                'decimals' => 3,
                'date_format' => 'DD/MM/YYYY',
                'time_format' => '12h',
                'number_grouping' => 'standard'
            ],
            'india' => [
                'name' => 'India',
                'flag' => '🇮🇳',
                'country_code' => 'IN',
                'timezone' => 'Asia/Kolkata',
                'gmt_offset' => 'GMT+5:30',
                'currency' => 'INR',
                'currency_symbol' => '₹',
                'currency_name' => 'Indian Rupee',
                'decimals' => 2,
                'date_format' => 'DD/MM/YYYY',
                'time_format' => '12h',
                'number_grouping' => 'indian' // e.g. 1,00,000 (Lakhs & Crores)
            ],
            'international' => [
                'name' => 'International (USD / UTC)',
                'flag' => '🌐',
                'country_code' => 'US',
                'timezone' => 'UTC',
                'gmt_offset' => 'GMT+0',
                'currency' => 'USD',
                'currency_symbol' => '$',
                'currency_name' => 'US Dollar',
                'decimals' => 2,
                'date_format' => 'YYYY-MM-DD',
                'time_format' => '24h',
                'number_grouping' => 'standard'
            ]
        ];

        // Supported options lists for custom selection
        $supportedTimezones = [
            ['id' => 'Asia/Bahrain', 'label' => 'Asia/Bahrain (GMT+3) — Manama, Bahrain', 'region' => 'Gulf'],
            ['id' => 'Asia/Riyadh', 'label' => 'Asia/Riyadh (GMT+3) — Riyadh, Saudi Arabia', 'region' => 'Gulf'],
            ['id' => 'Asia/Dubai', 'label' => 'Asia/Dubai (GMT+4) — Dubai / Abu Dhabi, UAE', 'region' => 'Gulf'],
            ['id' => 'Asia/Kuwait', 'label' => 'Asia/Kuwait (GMT+3) — Kuwait City, Kuwait', 'region' => 'Gulf'],
            ['id' => 'Asia/Qatar', 'label' => 'Asia/Qatar (GMT+3) — Doha, Qatar', 'region' => 'Gulf'],
            ['id' => 'Asia/Muscat', 'label' => 'Asia/Muscat (GMT+4) — Muscat, Oman', 'region' => 'Gulf'],
            ['id' => 'Asia/Kolkata', 'label' => 'Asia/Kolkata (GMT+5:30) — New Delhi / Mumbai, India', 'region' => 'India'],
            ['id' => 'UTC', 'label' => 'UTC (GMT+0) — Coordinated Universal Time', 'region' => 'International'],
            ['id' => 'Europe/London', 'label' => 'Europe/London (GMT+0/+1) — London, UK', 'region' => 'International'],
            ['id' => 'America/New_York', 'label' => 'America/New_York (GMT-5/-4) — Eastern Time, US', 'region' => 'International']
        ];

        $supportedCurrencies = [
            ['code' => 'BHD', 'name' => 'Bahraini Dinar', 'symbol' => 'BD', 'decimals' => 3, 'region' => 'Bahrain (GCC)'],
            ['code' => 'SAR', 'name' => 'Saudi Riyal (ر.س)', 'symbol' => 'SAR', 'decimals' => 2, 'region' => 'Saudi Arabia (GCC)'],
            ['code' => 'AED', 'name' => 'UAE Dirham (د.إ)', 'symbol' => 'AED', 'decimals' => 2, 'region' => 'United Arab Emirates (GCC)'],
            ['code' => 'KWD', 'name' => 'Kuwaiti Dinar (د.ك)', 'symbol' => 'KD', 'decimals' => 3, 'region' => 'Kuwait (GCC)'],
            ['code' => 'QAR', 'name' => 'Qatari Riyal (ر.ق)', 'symbol' => 'QR', 'decimals' => 2, 'region' => 'Qatar (GCC)'],
            ['code' => 'OMR', 'name' => 'Omani Rial (ر.ع)', 'symbol' => 'OMR', 'decimals' => 3, 'region' => 'Oman (GCC)'],
            ['code' => 'INR', 'name' => 'Indian Rupee (₹)', 'symbol' => '₹', 'decimals' => 2, 'region' => 'India'],
            ['code' => 'USD', 'name' => 'US Dollar ($)', 'symbol' => '$', 'decimals' => 2, 'region' => 'International'],
            ['code' => 'EUR', 'name' => 'Euro (€)', 'symbol' => '€', 'decimals' => 2, 'region' => 'Europe'],
            ['code' => 'GBP', 'name' => 'British Pound (£)', 'symbol' => '£', 'decimals' => 2, 'region' => 'United Kingdom']
        ];

        $supportedDateFormats = [
            ['id' => 'DD/MM/YYYY', 'label' => 'DD/MM/YYYY (e.g. 21/10/2026) — Gulf & India Standard'],
            ['id' => 'DD-MMM-YYYY', 'label' => 'DD-MMM-YYYY (e.g. 21-Oct-2026) — Clinical Engineering standard'],
            ['id' => 'YYYY-MM-DD', 'label' => 'YYYY-MM-DD (e.g. 2026-10-21) — ISO 8601 Database standard'],
            ['id' => 'MM/DD/YYYY', 'label' => 'MM/DD/YYYY (e.g. 10/21/2026) — US format'],
            ['id' => 'DD.MM.YYYY', 'label' => 'DD.MM.YYYY (e.g. 21.10.2026) — Dot notation']
        ];

        $supportedTimeFormats = [
            ['id' => '12h', 'label' => '12-Hour (e.g. 02:45 PM / 08:30 AM) with AM/PM'],
            ['id' => '24h', 'label' => '24-Hour Military (e.g. 14:45 / 08:30)']
        ];

        jsonResponse([
            'status' => 'success',
            'data' => [
                'settings' => $settings,
                'regions' => $regions,
                'supportedTimezones' => $supportedTimezones,
                'supportedCurrencies' => $supportedCurrencies,
                'supportedDateFormats' => $supportedDateFormats,
                'supportedTimeFormats' => $supportedTimeFormats,
                'server_time' => date('Y-m-d H:i:s')
            ]
        ]);
    } catch (PDOException $e) {
        jsonError('Failed to fetch settings: ' . $e->getMessage(), 500);
    }
}

if ($method === 'POST' || $method === 'PUT') {
    $input = getJsonInput();
    if (empty($input)) {
        $input = $_POST;
    }

    // Handle direct logo file upload via multipart/form-data
    if (isset($_FILES['logo']) && $_FILES['logo']['error'] === UPLOAD_ERR_OK) {
        $file = $_FILES['logo'];
        $uploadDir = __DIR__ . '/../uploads/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowedExts = ['png', 'jpg', 'jpeg', 'webp', 'svg'];
        if (in_array($ext, $allowedExts, true)) {
            $fileName = 'company_logo_' . time() . '.' . $ext;
            if (move_uploaded_file($file['tmp_name'], $uploadDir . $fileName)) {
                $input['company_logo'] = '/uploads/' . $fileName;
            }
        }
    }

    if (empty($input)) {
        jsonError('No settings payload received.');
    }

    try {
        $pdo->beginTransaction();

        $updateStmt = $pdo->prepare("INSERT INTO `system_settings` (`setting_key`, `setting_value`, `category`) VALUES (?, ?, 'branding') ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`)");

        $allowedKeys = [
            'region_preset',
            'timezone',
            'date_format',
            'time_format',
            'currency',
            'currency_symbol',
            'currency_position',
            'currency_decimals',
            'number_grouping',
            'company_name',
            'company_logo'
        ];

        $updatedCount = 0;
        foreach ($input as $key => $val) {
            if (in_array($key, $allowedKeys, true) && is_scalar($val)) {
                $updateStmt->execute([$key, (string)$val]);
                $updatedCount++;
            }
        }

        // Optional: Update all existing equipments with the new currency if requested
        if (!empty($input['apply_currency_to_equipments']) && !empty($input['currency'])) {
            $currencyCode = trim($input['currency']);
            $eqStmt = $pdo->prepare("UPDATE `equipments` SET `currency` = ?");
            $eqStmt->execute([$currencyCode]);
        }

        $pdo->commit();

        // Fetch refreshed settings
        $stmt = $pdo->query("SELECT setting_key, setting_value FROM system_settings");
        $refreshed = [];
        while ($row = $stmt->fetch()) {
            $refreshed[$row['setting_key']] = $row['setting_value'];
        }

        jsonResponse([
            'status' => 'success',
            'message' => "Settings successfully updated ({$updatedCount} keys modified).",
            'data' => $refreshed
        ]);
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        jsonError('Failed to save settings: ' . $e->getMessage(), 500);
    }
}

jsonError('Method not allowed', 405);
