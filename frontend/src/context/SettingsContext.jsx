import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchSettings, updateSettings } from '../services/api';

const SettingsContext = createContext(null);

const DEFAULT_SETTINGS = {
  region_preset: 'bahrain',
  timezone: 'Asia/Bahrain',
  date_format: 'DD/MM/YYYY',
  time_format: '12h',
  currency: 'BHD',
  currency_symbol: 'BD',
  currency_position: 'prefix',
  currency_decimals: 3,
  number_grouping: 'standard',
  company_name: 'SaNDS Lab Middle East W.L.L',
  company_logo: '/sands_logo.png'
};

const REGIONS_CATALOG = {
  bahrain: {
    name: 'Bahrain (GCC)',
    flag: '🇧🇭',
    country_code: 'BH',
    timezone: 'Asia/Bahrain',
    gmt_offset: 'GMT+3',
    currency: 'BHD',
    currency_symbol: 'BD',
    currency_name: 'Bahraini Dinar',
    decimals: 3,
    date_format: 'DD/MM/YYYY',
    time_format: '12h',
    number_grouping: 'standard'
  },
  saudi: {
    name: 'Saudi Arabia (KSA)',
    flag: '🇸🇦',
    country_code: 'SA',
    timezone: 'Asia/Riyadh',
    gmt_offset: 'GMT+3',
    currency: 'SAR',
    currency_symbol: 'SAR',
    currency_name: 'Saudi Riyal (ر.س)',
    decimals: 2,
    date_format: 'DD/MM/YYYY',
    time_format: '12h',
    number_grouping: 'standard'
  },
  uae: {
    name: 'United Arab Emirates',
    flag: '🇦🇪',
    country_code: 'AE',
    timezone: 'Asia/Dubai',
    gmt_offset: 'GMT+4',
    currency: 'AED',
    currency_symbol: 'AED',
    currency_name: 'UAE Dirham (د.إ)',
    decimals: 2,
    date_format: 'DD/MM/YYYY',
    time_format: '12h',
    number_grouping: 'standard'
  },
  kuwait: {
    name: 'Kuwait (GCC)',
    flag: '🇰🇼',
    country_code: 'KW',
    timezone: 'Asia/Kuwait',
    gmt_offset: 'GMT+3',
    currency: 'KWD',
    currency_symbol: 'KD',
    currency_name: 'Kuwaiti Dinar (د.ك)',
    decimals: 3,
    date_format: 'DD/MM/YYYY',
    time_format: '12h',
    number_grouping: 'standard'
  },
  qatar: {
    name: 'Qatar (GCC)',
    flag: '🇶🇦',
    country_code: 'QA',
    timezone: 'Asia/Qatar',
    gmt_offset: 'GMT+3',
    currency: 'QAR',
    currency_symbol: 'QR',
    currency_name: 'Qatari Riyal (ر.ق)',
    decimals: 2,
    date_format: 'DD/MM/YYYY',
    time_format: '12h',
    number_grouping: 'standard'
  },
  oman: {
    name: 'Oman (GCC)',
    flag: '🇴🇲',
    country_code: 'OM',
    timezone: 'Asia/Muscat',
    gmt_offset: 'GMT+4',
    currency: 'OMR',
    currency_symbol: 'OMR',
    currency_name: 'Omani Rial (ر.ع)',
    decimals: 3,
    date_format: 'DD/MM/YYYY',
    time_format: '12h',
    number_grouping: 'standard'
  },
  india: {
    name: 'India',
    flag: '🇮🇳',
    country_code: 'IN',
    timezone: 'Asia/Kolkata',
    gmt_offset: 'GMT+5:30',
    currency: 'INR',
    currency_symbol: '₹',
    currency_name: 'Indian Rupee (INR)',
    decimals: 2,
    date_format: 'DD/MM/YYYY',
    time_format: '12h',
    number_grouping: 'indian'
  },
  international: {
    name: 'International (USD / UTC)',
    flag: '🌐',
    country_code: 'US',
    timezone: 'UTC',
    gmt_offset: 'GMT+0',
    currency: 'USD',
    currency_symbol: '$',
    currency_name: 'US Dollar',
    decimals: 2,
    date_format: 'YYYY-MM-DD',
    time_format: '24h',
    number_grouping: 'standard'
  }
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const cached = localStorage.getItem('biotrack_system_settings');
      if (cached) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(cached) };
      }
    } catch (e) {
      // ignore
    }
    return DEFAULT_SETTINGS;
  });

  const [meta, setMeta] = useState({
    regions: REGIONS_CATALOG,
    supportedTimezones: [],
    supportedCurrencies: [],
    supportedDateFormats: [],
    supportedTimeFormats: []
  });

  const [loading, setLoading] = useState(true);

  // Synchronize settings from backend on mount
  useEffect(() => {
    let isMounted = true;
    async function initSettings() {
      try {
        const res = await fetchSettings();
        if (res && res.data && isMounted) {
          if (res.data.settings) {
            setSettings(prev => {
              const merged = { ...prev, ...res.data.settings };
              localStorage.setItem('biotrack_system_settings', JSON.stringify(merged));
              return merged;
            });
          }
          setMeta({
            regions: res.data.regions || REGIONS_CATALOG,
            supportedTimezones: res.data.supportedTimezones || [],
            supportedCurrencies: res.data.supportedCurrencies || [],
            supportedDateFormats: res.data.supportedDateFormats || [],
            supportedTimeFormats: res.data.supportedTimeFormats || []
          });
        }
      } catch (err) {
        console.warn('Using cached or default settings due to network status:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    initSettings();
    return () => { isMounted = false; };
  }, []);

  // Safe Date & Time Parser
  const parseDateInput = useCallback((input) => {
    if (!input) return null;
    if (input instanceof Date && !isNaN(input.getTime())) return input;
    
    // If it's a date-only string like "YYYY-MM-DD", append time to prevent local midnight shift
    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return new Date(`${trimmed}T12:00:00Z`);
      }
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    
    const parsed = new Date(input);
    return isNaN(parsed.getTime()) ? null : parsed;
  }, []);

  /**
   * Format Date according to active Timezone & Date Format
   * Examples: '21/10/2026', '21-Oct-2026', '2026-10-21', etc.
   */
  const formatDate = useCallback((input, overrideFormat = null) => {
    const d = parseDateInput(input);
    if (!d) return input ? String(input) : 'N/A';

    const tz = settings.timezone || 'Asia/Bahrain';
    const activeFormat = overrideFormat || settings.date_format || 'DD/MM/YYYY';

    try {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: tz,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).formatToParts(d);

      let day = '01';
      let month = '01';
      let year = '2026';

      for (const p of parts) {
        if (p.type === 'day') day = p.value;
        if (p.type === 'month') month = p.value;
        if (p.type === 'year') year = p.value;
      }

      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      const monthIndex = parseInt(month, 10) - 1;
      const monthShort = monthNames[monthIndex] || month;

      switch (activeFormat) {
        case 'DD-MMM-YYYY':
          return `${day}-${monthShort}-${year}`;
        case 'YYYY-MM-DD':
          return `${year}-${month}-${day}`;
        case 'MM/DD/YYYY':
          return `${month}/${day}/${year}`;
        case 'DD.MM.YYYY':
          return `${day}.${month}.${year}`;
        case 'DD/MM/YYYY':
        default:
          return `${day}/${month}/${year}`;
      }
    } catch (e) {
      return d.toLocaleDateString();
    }
  }, [parseDateInput, settings.timezone, settings.date_format]);

  /**
   * Format Time according to active Timezone & Time Format (12h or 24h)
   * Examples: '02:45 PM' or '14:45'
   */
  const formatTime = useCallback((input, withSeconds = false) => {
    const d = parseDateInput(input);
    if (!d) return 'N/A';

    const tz = settings.timezone || 'Asia/Bahrain';
    const is12h = settings.time_format !== '24h';

    try {
      const options = {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: is12h
      };
      if (withSeconds) {
        options.second = '2-digit';
      }
      return new Intl.DateTimeFormat('en-US', options).format(d);
    } catch (e) {
      return d.toLocaleTimeString();
    }
  }, [parseDateInput, settings.timezone, settings.time_format]);

  /**
   * Format Date and Time combined
   * Examples: '21/10/2026, 02:45 PM'
   */
  const formatDateTime = useCallback((input, withSeconds = false) => {
    if (!input) return 'N/A';
    const dateStr = formatDate(input);
    const timeStr = formatTime(input, withSeconds);
    return `${dateStr}, ${timeStr}`;
  }, [formatDate, formatTime]);

  /**
   * Format Currency Amount
   * Formats numbers with correct decimal places, regional grouping (thousands vs Indian lakhs/crores),
   * and selected currency code or symbol (e.g. BHD 1,500.000 or ₹ 1,50,000.00).
   */
  const formatCurrency = useCallback((amount, overrideCurrency = null, options = {}) => {
    const num = Number(amount);
    if (isNaN(num)) return amount ? String(amount) : '0';

    const currCode = overrideCurrency || settings.currency || 'BHD';
    const currSymbol = settings.currency_symbol || currCode;
    const decimals = Number(settings.currency_decimals ?? (currCode === 'BHD' || currCode === 'KWD' || currCode === 'OMR' ? 3 : 2));
    const isIndian = settings.number_grouping === 'indian' || currCode === 'INR';
    const displayMode = options.displayMode || 'code'; // 'code' (e.g. BHD 100), 'symbol' (e.g. BD 100), 'both'

    let formattedNumber = '';
    try {
      if (isIndian) {
        // Indian grouping system (e.g. 1,00,000.00)
        formattedNumber = num.toLocaleString('en-IN', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        });
      } else {
        // Standard international thousands grouping (e.g. 100,000.000)
        formattedNumber = num.toLocaleString('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        });
      }
    } catch (e) {
      formattedNumber = num.toFixed(decimals);
    }

    let prefix = '';
    let suffix = '';

    if (displayMode === 'symbol') {
      if (settings.currency_position === 'suffix') {
        suffix = ` ${currSymbol}`;
      } else {
        prefix = `${currSymbol} `;
      }
    } else if (displayMode === 'both' && currSymbol !== currCode) {
      prefix = `${currCode} (${currSymbol}) `;
    } else {
      // Default standard code prefix
      prefix = `${currCode} `;
    }

    return `${prefix}${formattedNumber}${suffix}`.trim();
  }, [settings.currency, settings.currency_symbol, settings.currency_decimals, settings.currency_position, settings.number_grouping]);

  /**
   * Apply a predefined regional preset (Bahrain, Saudi, UAE, Kuwait, Qatar, Oman, India, International)
   */
  const applyRegionPreset = useCallback(async (presetKey, applyToAssets = false) => {
    const preset = (meta.regions && meta.regions[presetKey]) || REGIONS_CATALOG[presetKey];
    if (!preset) return false;

    const newSettings = {
      ...settings,
      region_preset: presetKey,
      timezone: preset.timezone,
      date_format: preset.date_format,
      time_format: preset.time_format,
      currency: preset.currency,
      currency_symbol: preset.currency_symbol,
      currency_decimals: preset.decimals,
      number_grouping: preset.number_grouping,
      apply_currency_to_equipments: applyToAssets
    };

    setSettings(newSettings);
    localStorage.setItem('biotrack_system_settings', JSON.stringify(newSettings));

    try {
      await updateSettings(newSettings);
      return true;
    } catch (e) {
      console.error('Failed to persist settings to server:', e);
      return false;
    }
  }, [meta.regions, settings]);

  /**
   * Save custom settings changes to server and local state
   */
  const saveCustomSettings = useCallback(async (customValues, applyToAssets = false) => {
    let payload;
    let newMerged = { ...settings };

    if (typeof FormData !== 'undefined' && customValues instanceof FormData) {
      if (applyToAssets) {
        customValues.append('apply_currency_to_equipments', '1');
      }
      payload = customValues;
      // Extract known text fields for optimistic local state update
      for (const [k, v] of customValues.entries()) {
        if (typeof v === 'string') {
          newMerged[k] = v;
        }
      }
    } else {
      newMerged = {
        ...settings,
        ...customValues,
        apply_currency_to_equipments: applyToAssets
      };
      payload = newMerged;
    }

    setSettings(newMerged);
    localStorage.setItem('biotrack_system_settings', JSON.stringify(newMerged));

    try {
      const res = await updateSettings(payload);
      if (res && res.data) {
        setSettings(prev => {
          const finalSettings = { ...prev, ...res.data };
          localStorage.setItem('biotrack_system_settings', JSON.stringify(finalSettings));
          return finalSettings;
        });
      }
      return { success: true };
    } catch (err) {
      console.error('Error saving settings:', err);
      return { success: false, error: err.message };
    }
  }, [settings]);

  const value = {
    settings,
    meta,
    loading,
    formatDate,
    formatTime,
    formatDateTime,
    formatCurrency,
    applyRegionPreset,
    saveCustomSettings,
    activeRegion: (meta.regions && meta.regions[settings.region_preset]) || REGIONS_CATALOG[settings.region_preset] || REGIONS_CATALOG.bahrain
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
