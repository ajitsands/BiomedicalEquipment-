import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { useSettings } from '../context/SettingsContext';
import { 
  Settings, 
  Globe, 
  Clock, 
  Calendar, 
  Coins, 
  Check, 
  Sparkles, 
  RefreshCw, 
  Save, 
  AlertCircle,
  HelpCircle,
  Sliders,
  DollarSign
} from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, onShowToast }) {
  const { 
    settings, 
    meta, 
    applyRegionPreset, 
    saveCustomSettings, 
    formatDate, 
    formatTime, 
    formatCurrency 
  } = useSettings();

  const [formData, setFormData] = useState({ ...settings });
  const [applyToEquipments, setApplyToEquipments] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('presets'); // 'presets' | 'custom'
  const [liveNow, setLiveNow] = useState(new Date());

  // Keep a live 1-second ticking clock for preview
  useEffect(() => {
    const timer = setInterval(() => setLiveNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync internal state when settings change
  useEffect(() => {
    setFormData({ ...settings });
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const regions = meta.regions || {};

  const handleSelectPreset = async (presetKey) => {
    const preset = regions[presetKey];
    if (!preset) return;

    setFormData(prev => ({
      ...prev,
      region_preset: presetKey,
      timezone: preset.timezone,
      date_format: preset.date_format,
      time_format: preset.time_format,
      currency: preset.currency,
      currency_symbol: preset.currency_symbol,
      currency_decimals: preset.decimals,
      number_grouping: preset.number_grouping
    }));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const res = await saveCustomSettings(formData, applyToEquipments);
      if (res.success) {
        if (onShowToast) {
          onShowToast({
            type: 'success',
            title: 'Settings Applied',
            message: `Regional & currency settings updated (${formData.currency}, ${formData.timezone}, ${formData.date_format}).`
          });
        }
        onClose();
      } else {
        throw new Error(res.error || 'Failed to save settings');
      }
    } catch (err) {
      if (onShowToast) {
        onShowToast({
          type: 'error',
          title: 'Save Failed',
          message: err.message
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="System Regional & Localization Settings"
      subtitle="Configure TimeZone, Date/Time Formats & Currency across Bahrain, Gulf Countries, and India"
      icon={Settings}
      size="xl"
    >
      <div className="settings-modal-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Dynamic Live Preview Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(217, 70, 239, 0.08) 100%)',
          border: '1px solid rgba(2, 132, 199, 0.25)',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
              Live System Time ({formData.timezone})
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} />
              <span>{formatTime(liveNow, true)}</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Time Format: {formData.time_format === '24h' ? '24-Hour (Military)' : '12-Hour (AM/PM)'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
              Date Formatted ({formData.date_format})
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} style={{ color: 'var(--color-accent)' }} />
              <span>{formatDate(liveNow, formData.date_format)}</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Active Pattern: {formData.date_format}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
              Currency Sample (Asset / Cost)
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#16a34a', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Coins size={18} />
              <span>{formatCurrency(45250, formData.currency)}</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Decimals: {formData.currency_decimals} • Code: {formData.currency} ({formData.currency_symbol})
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'presets' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('presets')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Globe size={15} />
            <span>1-Click Gulf & India Regional Presets</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('custom')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Sliders size={15} />
            <span>Custom Detailed Configuration</span>
          </button>
        </div>

        {/* TAB 1: 1-Click Regional Presets */}
        {activeTab === 'presets' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
              Select your hospital's operational territory. Each preset immediately configures the official National TimeZone, Currency, Decimals, and Date format:
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '12px'
            }}>
              {Object.entries(regions).map(([key, reg]) => {
                const isSelected = formData.region_preset === key || 
                  (formData.currency === reg.currency && formData.timezone === reg.timezone);
                
                return (
                  <div
                    key={key}
                    onClick={() => handleSelectPreset(key)}
                    style={{
                      border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                      background: isSelected ? 'rgba(2, 132, 199, 0.06)' : 'var(--bg-card)',
                      borderRadius: '10px',
                      padding: '14px 16px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.borderColor = 'var(--color-primary)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.borderColor = 'var(--border-color)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.5rem' }}>{reg.flag}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                            {reg.name}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                            {reg.gmt_offset} • {reg.timezone}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <div style={{
                          background: 'var(--color-primary)',
                          color: '#fff',
                          borderRadius: '50%',
                          width: '22px',
                          height: '22px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Check size={14} />
                        </div>
                      )}
                    </div>

                    <div style={{ 
                      marginTop: '10px', 
                      paddingTop: '8px', 
                      borderTop: '1px dashed var(--border-color)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.8rem'
                    }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Currency: </span>
                        <strong style={{ color: 'var(--color-primary)' }}>{reg.currency} ({reg.currency_symbol})</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Decimals: </span>
                        <strong>{reg.decimals}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: Custom Configuration Form */}
        {activeTab === 'custom' && (
          <form id="settings-form" onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            {/* 1. Timezone Selector */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} style={{ color: 'var(--color-primary)' }} />
                <span>Hospital Operational TimeZone</span>
              </label>
              <select
                className="form-control"
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              >
                <optgroup label="Gulf Region (GCC)">
                  <option value="Asia/Bahrain">Asia/Bahrain (GMT+3) — Bahrain (Manama)</option>
                  <option value="Asia/Riyadh">Asia/Riyadh (GMT+3) — Saudi Arabia (Riyadh / Jeddah)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GMT+4) — UAE (Dubai / Abu Dhabi)</option>
                  <option value="Asia/Kuwait">Asia/Kuwait (GMT+3) — Kuwait (Kuwait City)</option>
                  <option value="Asia/Qatar">Asia/Qatar (GMT+3) — Qatar (Doha)</option>
                  <option value="Asia/Muscat">Asia/Muscat (GMT+4) — Oman (Muscat)</option>
                </optgroup>
                <optgroup label="India">
                  <option value="Asia/Kolkata">Asia/Kolkata (GMT+5:30) — India (New Delhi, Mumbai, Bangalore)</option>
                </optgroup>
                <optgroup label="International">
                  <option value="UTC">UTC (GMT+0) — Coordinated Universal Time</option>
                  <option value="Europe/London">Europe/London (GMT+0/+1) — London, UK</option>
                  <option value="America/New_York">America/New_York (GMT-5/-4) — Eastern US</option>
                </optgroup>
              </select>
              <span className="form-help" style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Affects all equipment inspection records, complaint logs, RFID scan detection timestamps, and PDF reports.
              </span>
            </div>

            {/* 2. Date & Time Format Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={16} style={{ color: 'var(--color-accent)' }} />
                  <span>Date Display Format</span>
                </label>
                <select
                  className="form-control"
                  value={formData.date_format}
                  onChange={(e) => setFormData({ ...formData, date_format: e.target.value })}
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 21/10/2026) — Gulf & India Standard</option>
                  <option value="DD-MMM-YYYY">DD-MMM-YYYY (e.g. 21-Oct-2026) — Biomedical Clinical Standard</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-10-21) — ISO Standard</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 10/21/2026) — US Standard</option>
                  <option value="DD.MM.YYYY">DD.MM.YYYY (e.g. 21.10.2026) — Dot notation</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={16} style={{ color: 'var(--color-primary)' }} />
                  <span>Time Display Format</span>
                </label>
                <select
                  className="form-control"
                  value={formData.time_format}
                  onChange={(e) => setFormData({ ...formData, time_format: e.target.value })}
                >
                  <option value="12h">12-Hour with AM/PM (e.g. 02:45 PM)</option>
                  <option value="24h">24-Hour Military / 24-hr (e.g. 14:45)</option>
                </select>
              </div>
            </div>

            {/* 3. Currency & Formatting Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <DollarSign size={16} style={{ color: '#16a34a' }} />
                  <span>Currency Code & Country</span>
                </label>
                <select
                  className="form-control"
                  value={formData.currency}
                  onChange={(e) => {
                    const code = e.target.value;
                    let sym = code;
                    let dec = 2;
                    let grouping = 'standard';

                    if (code === 'BHD') { sym = 'BD'; dec = 3; }
                    else if (code === 'SAR') { sym = 'SAR'; dec = 2; }
                    else if (code === 'AED') { sym = 'AED'; dec = 2; }
                    else if (code === 'KWD') { sym = 'KD'; dec = 3; }
                    else if (code === 'QAR') { sym = 'QR'; dec = 2; }
                    else if (code === 'OMR') { sym = 'OMR'; dec = 3; }
                    else if (code === 'INR') { sym = '₹'; dec = 2; grouping = 'indian'; }
                    else if (code === 'USD') { sym = '$'; dec = 2; }

                    setFormData(prev => ({
                      ...prev,
                      currency: code,
                      currency_symbol: sym,
                      currency_decimals: dec,
                      number_grouping: grouping
                    }));
                  }}
                >
                  <optgroup label="Gulf Currencies (GCC)">
                    <option value="BHD">BHD — Bahraini Dinar (BD)</option>
                    <option value="SAR">SAR — Saudi Riyal (ر.س)</option>
                    <option value="AED">AED — UAE Dirham (د.إ)</option>
                    <option value="KWD">KWD — Kuwaiti Dinar (KD)</option>
                    <option value="QAR">QAR — Qatari Riyal (QR)</option>
                    <option value="OMR">OMR — Omani Rial (OMR)</option>
                  </optgroup>
                  <optgroup label="India">
                    <option value="INR">INR — Indian Rupee (₹)</option>
                  </optgroup>
                  <optgroup label="International">
                    <option value="USD">USD — US Dollar ($)</option>
                    <option value="EUR">EUR — Euro (€)</option>
                    <option value="GBP">GBP — British Pound (£)</option>
                  </optgroup>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Currency Symbol / Abbreviation</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.currency_symbol}
                  onChange={(e) => setFormData({ ...formData, currency_symbol: e.target.value })}
                  placeholder="e.g. BD, SAR, AED, ₹, $"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Decimal Precision</label>
                <select
                  className="form-control"
                  value={formData.currency_decimals}
                  onChange={(e) => setFormData({ ...formData, currency_decimals: Number(e.target.value) })}
                >
                  <option value={3}>3 Decimals (Standard for BHD, KWD, OMR — e.g. 150.000)</option>
                  <option value={2}>2 Decimals (Standard for SAR, AED, QAR, INR, USD — e.g. 150.00)</option>
                  <option value={0}>0 Decimals (Whole amounts — e.g. 150)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Number Grouping System</label>
                <select
                  className="form-control"
                  value={formData.number_grouping}
                  onChange={(e) => setFormData({ ...formData, number_grouping: e.target.value })}
                >
                  <option value="standard">Standard International Thousands (100,000.00)</option>
                  <option value="indian">Indian Lakhs & Crores (1,00,000.00)</option>
                </select>
              </div>
            </div>
          </form>
        )}

        {/* Bulk Asset Currency Option */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <input
            type="checkbox"
            id="apply-to-equipments"
            checked={applyToEquipments}
            onChange={(e) => setApplyToEquipments(e.target.checked)}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <label htmlFor="apply-to-equipments" style={{ cursor: 'pointer', fontSize: '0.86rem', userSelect: 'none' }}>
            <strong>Synchronize existing assets in database:</strong> Update all existing registered equipment assets to use <strong>{formData.currency}</strong> as their active valuation currency.
          </label>
        </div>

        {/* Modal Footer Controls */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid var(--border-color)',
          paddingTop: '14px',
          marginTop: '6px'
        }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} style={{ color: 'var(--color-primary)' }} />
            <span>Changes persist to MySQL database and apply instantly across all views & reports.</span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {saving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />}
              <span>{saving ? 'Applying Settings...' : 'Save & Apply Settings'}</span>
            </button>
          </div>
        </div>

      </div>
    </Modal>
  );
}
