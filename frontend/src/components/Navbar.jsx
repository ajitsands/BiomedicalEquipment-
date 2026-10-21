import React, { useState, useRef, useEffect } from 'react';
import { 
  Activity, 
  LayoutDashboard, 
  Layers, 
  CheckSquare, 
  AlertOctagon, 
  Radio, 
  FileText, 
  Plus, 
  Sun, 
  Moon, 
  Headphones,
  Settings,
  Globe,
  Building2,
  Users,
  Handshake,
  UserCheck,
  ChevronDown,
  ChevronRight,
  Package
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';

export default function Navbar({
  currentView,
  setCurrentView,
  theme,
  toggleTheme,
  onOpenBookComplaint,
  onOpenNewEquipment,
  onOpenDepartments,
  onOpenPartners,
  onOpenEmployees,
  onOpenUserLogin,
  onOpenSandsSupport,
  onOpenSettings,
  activeComplaintsCount = 0,
  overduePmCount = 0
}) {
  const { settings, activeRegion } = useSettings();
  const { currentUser } = useAuth();
  const [isMastersOpen, setIsMastersOpen] = useState(false);
  const mastersRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (mastersRef.current && !mastersRef.current.contains(event.target)) {
        setIsMastersOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsMastersOpen(false);
      }
    }
    if (isMastersOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMastersOpen]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'equipments', label: 'Equipments Master', icon: Layers },
    { id: 'site_preparation', label: 'Site Preparation (v2.0)', icon: Building2 },
    { id: 'checklists', label: 'PM & Checklists', icon: CheckSquare },
    { 
      id: 'complaints', 
      label: 'Breakdowns & Tickets', 
      icon: AlertOctagon,
      badge: activeComplaintsCount > 0 ? activeComplaintsCount : null
    },
    { id: 'rfid', label: 'RFID Live Tracking', icon: Radio },
    { id: 'reports', label: 'Reports & PDF', icon: FileText }
  ];

  return (
    <header className="navbar-header app-header-2tier">
      {/* Top Tier: Brand, Identity & Primary Utility Actions */}
      <div className="header-top-bar">
        {/* Brand Identity */}
        <div className="navbar-brand-section">
          <img 
            src={settings?.company_logo || (theme === 'dark' ? '/sands_logo_white.png' : '/sands_logo.png')} 
            alt={`${settings?.company_name || 'SaNDS Lab'} Logo`} 
            className="brand-logo-img"
            onClick={onOpenSandsSupport}
            style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}
            title={`Click to view ${settings?.company_name || 'SaNDS Lab'} Vendor Support, WhatsApp & Products`}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <div className="brand-title-wrap">
            <div className="brand-main-title">
              <Activity size={21} style={{ color: '#0284c7' }} />
              <span>
                <span className="brand-text-blue">BioTrack</span>
                <span className="brand-text-pink">CMMS</span>
              </span>
            </div>
            <span className="brand-sub-badge">Biomedical Engineering System</span>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="navbar-actions">
          {/* Regional Settings Button with Live Flag & Currency Pill */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onOpenSettings}
            title={`Regional Settings: ${activeRegion?.name || 'Gulf & India'} | ${settings.currency} | ${settings.timezone}`}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              border: '1px solid rgba(2, 132, 199, 0.4)',
              background: 'rgba(2, 132, 199, 0.08)'
            }}
          >
            <Settings size={15} style={{ color: 'var(--color-primary)' }} />
            <span style={{ fontWeight: 600 }}>{activeRegion?.flag || '🌐'} {settings.currency}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({settings.date_format})</span>
          </button>

          {/* SaNDS Lab Help Line (+973 35078079) Button */}
          <button
            type="button"
            className="btn-hotline-pink"
            onClick={onOpenSandsSupport}
            title="SaNDS Lab Vendor Support & WhatsApp Hotline (+973 35078079)"
          >
            <Headphones size={15} />
            <span>Help Line (+973 35078079)</span>
          </button>

          {/* Unified Masters Dropdown Menu (Eng., Biomedical, Partners, Employees, Departments) */}
          <div className="masters-dropdown-wrapper" ref={mastersRef}>
            <button
              type="button"
              className={`btn-masters-menu ${isMastersOpen ? 'active' : ''}`}
              onClick={() => setIsMastersOpen(prev => !prev)}
              title="System Masters: Eng., Biomedical, Partners, Employees & Departments"
              aria-expanded={isMastersOpen}
            >
              <Package size={15} style={{ color: 'var(--color-primary)' }} />
              <span>Masters</span>
              <span className="masters-badge">5</span>
              <ChevronDown 
                size={14} 
                style={{ 
                  transform: isMastersOpen ? 'rotate(180deg)' : 'none', 
                  transition: 'transform 0.2s ease',
                  color: 'var(--text-muted)'
                }} 
              />
            </button>

            {isMastersOpen && (
              <div className="masters-dropdown-menu">
                {/* 1. Eng. / Biomedical Active Engineer Header & Switcher */}
                <div className="masters-user-header">
                  <div className="masters-user-info">
                    <div className="masters-user-avatar">
                      {currentUser?.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'E'}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {currentUser?.full_name || 'Biomedical Engineer'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-success)', fontWeight: 600 }}>
                        ● Active: {currentUser?.role || 'BME Staff'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '3px 8px', fontSize: '0.72rem', flexShrink: 0 }}
                    onClick={() => {
                      setIsMastersOpen(false);
                      onOpenUserLogin && onOpenUserLogin();
                    }}
                    title="Switch logged-in staff member or login"
                  >
                    Switch / Sign In
                  </button>
                </div>

                <div className="masters-section-title">Database Masters Directory</div>

                {/* 2. Biomedical Equipments Master */}
                <button
                  type="button"
                  className="masters-menu-item"
                  onClick={() => {
                    setIsMastersOpen(false);
                    setCurrentView('equipments');
                  }}
                >
                  <div className="masters-item-icon-box" style={{ background: 'rgba(2, 132, 199, 0.12)', color: '#0284c7' }}>
                    <Layers size={17} />
                  </div>
                  <div className="masters-item-content">
                    <div className="masters-item-title">
                      <span>Biomedical Equipments</span>
                      <ChevronRight size={13} color="var(--text-muted)" />
                    </div>
                    <div className="masters-item-desc">Asset inventory, technical specs, QR/RFID & passports</div>
                  </div>
                </button>

                {/* 2b. Shortcut: Add New Biomedical Asset */}
                <button
                  type="button"
                  className="masters-menu-item"
                  onClick={() => {
                    setIsMastersOpen(false);
                    onOpenNewEquipment && onOpenNewEquipment();
                  }}
                >
                  <div className="masters-item-icon-box" style={{ background: 'rgba(236, 72, 153, 0.12)', color: '#ec4899' }}>
                    <Plus size={17} />
                  </div>
                  <div className="masters-item-content">
                    <div className="masters-item-title">
                      <span>+ Register New Asset</span>
                      <ChevronRight size={13} color="var(--text-muted)" />
                    </div>
                    <div className="masters-item-desc">Commission medical device & assign RFID / QR code</div>
                  </div>
                </button>

                {/* 3. Partners Master (Vendors, Contractors, Suppliers) */}
                <button
                  type="button"
                  className="masters-menu-item"
                  onClick={() => {
                    setIsMastersOpen(false);
                    onOpenPartners && onOpenPartners();
                  }}
                >
                  <div className="masters-item-icon-box" style={{ background: 'rgba(217, 119, 6, 0.12)', color: '#d97706' }}>
                    <Handshake size={17} />
                  </div>
                  <div className="masters-item-content">
                    <div className="masters-item-title">
                      <span>Partners Master</span>
                      <ChevronRight size={13} color="var(--text-muted)" />
                    </div>
                    <div className="masters-item-desc">Vendors / OEMs, Contractors & Medical Suppliers</div>
                  </div>
                </button>

                {/* 4. Employees Master */}
                <button
                  type="button"
                  className="masters-menu-item"
                  onClick={() => {
                    setIsMastersOpen(false);
                    onOpenEmployees && onOpenEmployees();
                  }}
                >
                  <div className="masters-item-icon-box" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' }}>
                    <Users size={17} />
                  </div>
                  <div className="masters-item-content">
                    <div className="masters-item-title">
                      <span>Employees & Staff</span>
                      <ChevronRight size={13} color="var(--text-muted)" />
                    </div>
                    <div className="masters-item-desc">Hospital staff, usernames, passwords & auth credentials</div>
                  </div>
                </button>

                {/* 5. Departments Master */}
                <button
                  type="button"
                  className="masters-menu-item"
                  onClick={() => {
                    setIsMastersOpen(false);
                    onOpenDepartments && onOpenDepartments();
                  }}
                >
                  <div className="masters-item-icon-box" style={{ background: 'rgba(5, 150, 105, 0.12)', color: '#059669' }}>
                    <Building2 size={17} />
                  </div>
                  <div className="masters-item-content">
                    <div className="masters-item-title">
                      <span>Departments Master</span>
                      <ChevronRight size={13} color="var(--text-muted)" />
                    </div>
                    <div className="masters-item-desc">Hospital wards, floors, ICU, OT suites & room slots</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Instant Emergency Complaint Booking */}
          <button
            type="button"
            className="btn-book-complaint"
            onClick={onOpenBookComplaint}
            title="Instant Emergency Complaint Booking"
          >
            <AlertOctagon size={16} />
            <span>Book Complaint</span>
          </button>

          {/* Theme Toggle (Light / Dark) */}
          <button
            type="button"
            className="btn-theme-toggle"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      {/* Bottom Tier: Fixed Navigation Menu with Blue & Pink Combo */}
      <div className="header-menu-bar">
        <nav className="navbar-menu-horizontal">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                className={`nav-link-btn ${isActive ? 'active' : ''}`}
                onClick={() => setCurrentView(item.id)}
              >
                <Icon size={17} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="nav-badge-pink">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Settings Tab in Navigation */}
          <button
            type="button"
            className="nav-link-btn"
            onClick={onOpenSettings}
            title="Configure TimeZone, Date & Time Formats, and Currency for Gulf and India"
            style={{ marginLeft: 'auto' }}
          >
            <Settings size={16} />
            <span>Regional Settings</span>
          </button>
        </nav>
      </div>
    </header>
  );
}

