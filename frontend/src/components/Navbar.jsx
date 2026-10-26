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
  Package,
  Sparkles,
  Calendar,
  Smartphone,
  Menu,
  X
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
  onOpenMobilePortal,
  activeComplaintsCount = 0,
  overduePmCount = 0,
  activeHousekeepingCount = 0
}) {
  const { settings, activeRegion } = useSettings();
  const { currentUser } = useAuth();
  const [isMastersOpen, setIsMastersOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileMastersOpen, setIsMobileMastersOpen] = useState(false);
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
        setIsMobileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Close mobile drawer when view changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [currentView]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Main horizontal navigation bar items (operational views)
  // Equipments Master, Site Preparation, and Housekeeping are accessed from the top Masters menu
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'calendar', label: 'Operations Calendar', icon: Calendar },
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
        {/* Desktop Action Controls (hidden on <= 992px) */}
        <div className="navbar-actions navbar-actions-desktop">
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

                <div className="masters-section-title">Operational & Database Masters</div>

                {/* 1. Equipment Master */}
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
                      <span>Equipment Master</span>
                      <ChevronRight size={13} color="var(--text-muted)" />
                    </div>
                    <div className="masters-item-desc">Asset inventory, technical specs, QR/RFID & passports</div>
                  </div>
                </button>

                {/* 2. Site Preperation */}
                <button
                  type="button"
                  className="masters-menu-item"
                  onClick={() => {
                    setIsMastersOpen(false);
                    setCurrentView('site_preparation');
                  }}
                >
                  <div className="masters-item-icon-box" style={{ background: 'rgba(234, 88, 12, 0.12)', color: '#ea580c' }}>
                    <Building2 size={17} />
                  </div>
                  <div className="masters-item-content">
                    <div className="masters-item-title">
                      <span>Site Preperation</span>
                      <ChevronRight size={13} color="var(--text-muted)" />
                    </div>
                    <div className="masters-item-desc">WHO pre-installation room audits, MEP & handover certificates</div>
                  </div>
                </button>

                {/* 3. House Keeping NHRA/WHO */}
                <button
                  type="button"
                  className="masters-menu-item"
                  onClick={() => {
                    setIsMastersOpen(false);
                    setCurrentView('housekeeping');
                  }}
                >
                  <div className="masters-item-icon-box" style={{ background: 'rgba(225, 29, 72, 0.12)', color: '#e11d48' }}>
                    <Sparkles size={17} />
                  </div>
                  <div className="masters-item-content">
                    <div className="masters-item-title">
                      <span>House Keeping NHRA/WHO</span>
                      {activeHousekeepingCount > 0 && (
                        <span className="nav-badge-pink" style={{ marginLeft: '6px' }}>{activeHousekeepingCount}</span>
                      )}
                      <ChevronRight size={13} color="var(--text-muted)" />
                    </div>
                    <div className="masters-item-desc">Bahrain NHRA environmental cleaning, checklists & complaints</div>
                  </div>
                </button>

                {/* Visual Divider after House Keeping */}
                <div style={{
                  height: '1px',
                  background: 'var(--border-color, rgba(0,0,0,0.18))',
                  margin: '10px 8px 8px 8px'
                }} />
                <div className="masters-section-title" style={{ marginTop: '2px', paddingLeft: '8px', color: 'var(--text-muted)', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Directories & Administrative Masters
                </div>

                {/* Shortcut: Add New Biomedical Asset */}
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

                {/* 4. Partners Master (Vendors, Contractors, Suppliers) */}
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

                {/* 5. Employees Master */}
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

                {/* 6. Departments Master */}
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

          {/* Mobile Field Tech Portal & Camera QR Scanner */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onOpenMobilePortal}
            title="Mobile Technician Field Portal, Camera QR Scanner & A4 Worksheets"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              border: '1px solid rgba(2, 132, 199, 0.4)',
              background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.12) 0%, rgba(236, 72, 153, 0.1) 100%)',
              fontWeight: 700,
              color: 'var(--text-primary)'
            }}
          >
            <Smartphone size={15} style={{ color: '#0284c7' }} />
            <span>Mobile Portal</span>
          </button>

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

        {/* Mobile Action Controls (visible only on screens <= 992px) */}
        <div className="navbar-actions-mobile">
          {/* Quick Mobile Portal Access */}
          <button
            type="button"
            className="btn-mobile-pill"
            onClick={onOpenMobilePortal}
            title="Mobile Field Tech Portal & Scanner"
          >
            <Smartphone size={14} color="#0284c7" />
            <span>Portal</span>
          </button>

          {/* Emergency Instant Complaint Booking */}
          <button
            type="button"
            className="btn-mobile-emergency"
            onClick={onOpenBookComplaint}
            title="Instant Breakdown Ticket"
            aria-label="Book Complaint"
          >
            <AlertOctagon size={16} />
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            className="btn-theme-toggle"
            onClick={toggleTheme}
            title="Toggle Light/Dark Theme"
            aria-label="Toggle Theme"
            style={{ width: '34px', height: '34px' }}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Hamburger Drawer Toggle */}
          <button
            type="button"
            className={`btn-hamburger-toggle ${isMobileMenuOpen ? 'active' : ''}`}
            onClick={() => setIsMobileMenuOpen(prev => !prev)}
            aria-label={isMobileMenuOpen ? "Close Navigation Menu" : "Open Navigation Menu"}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
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
                <Icon size={16} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="nav-badge-pink">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Settings Tab in Navigation - Hidden on mobile, accessible via drawer */}
          <button
            type="button"
            className="nav-link-btn nav-link-btn-desktop-only"
            onClick={onOpenSettings}
            title="Configure TimeZone, Date & Time Formats, and Currency for Gulf and India"
            style={{ marginLeft: 'auto' }}
          >
            <Settings size={16} />
            <span>Regional Settings</span>
          </button>
        </nav>
      </div>

      {/* Mobile Navigation Drawer Overlay & Content */}
      {isMobileMenuOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="mobile-drawer-content" onClick={(e) => e.stopPropagation()}>
            {/* Drawer Header */}
            <div className="mobile-drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={20} style={{ color: '#0284c7' }} />
                <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>
                  <span style={{ color: '#0284c7' }}>BioTrack</span>
                  <span style={{ color: '#ec4899' }}>CMMS</span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-icon"
                onClick={() => setIsMobileMenuOpen(false)}
                style={{ width: '32px', height: '32px', padding: 0 }}
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="mobile-drawer-body">
              {/* Active User Card & Switcher */}
              <div className="mobile-user-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="masters-user-avatar">
                    {currentUser?.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'E'}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {currentUser?.full_name || 'Biomedical Staff'}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--color-success)', fontWeight: 600 }}>
                      ● {currentUser?.role || 'Staff'} ({currentUser?.employee_code || 'BME'})
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', marginTop: '8px', fontSize: '0.76rem', padding: '5px 10px' }}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenUserLogin && onOpenUserLogin();
                  }}
                >
                  <Users size={13} style={{ marginRight: '6px' }} />
                  <span>Switch / Sign In Staff</span>
                </button>
              </div>

              {/* Emergency Action */}
              <button
                type="button"
                className="btn-book-complaint"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenBookComplaint && onOpenBookComplaint();
                }}
                style={{ width: '100%', justifyContent: 'center', padding: '10px 14px' }}
              >
                <AlertOctagon size={17} />
                <span>Emergency Breakdown Ticket</span>
              </button>

              {/* Main Operations Views */}
              <div>
                <div className="mobile-nav-group-title">Main Operations</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {navItems.map(item => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                        onClick={() => {
                          setCurrentView(item.id);
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <Icon size={18} style={{ color: isActive ? '#0284c7' : 'var(--text-secondary)' }} />
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {item.badge && (
                          <span className="nav-badge-pink">{item.badge}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* System Masters Section */}
              <div>
                <div 
                  className="mobile-nav-group-title" 
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 0' }}
                  onClick={() => setIsMobileMastersOpen(prev => !prev)}
                >
                  <span>System Masters & Directories</span>
                  <ChevronDown 
                    size={15} 
                    style={{ 
                      transform: isMobileMastersOpen ? 'rotate(180deg)' : 'none', 
                      transition: 'transform 0.2s ease' 
                    }} 
                  />
                </div>

                <div style={{ display: isMobileMastersOpen ? 'flex' : 'none', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  <button
                    type="button"
                    className={`mobile-nav-item ${currentView === 'equipments' ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentView('equipments');
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <Layers size={17} color="#0284c7" />
                    <span>Equipment Master</span>
                  </button>

                  <button
                    type="button"
                    className={`mobile-nav-item ${currentView === 'site_preparation' ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentView('site_preparation');
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <Building2 size={17} color="#ea580c" />
                    <span>Site Preperation (WHO)</span>
                  </button>

                  <button
                    type="button"
                    className={`mobile-nav-item ${currentView === 'housekeeping' ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentView('housekeeping');
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <Sparkles size={17} color="#e11d48" />
                    <span style={{ flex: 1 }}>House Keeping NHRA/WHO</span>
                    {activeHousekeepingCount > 0 && (
                      <span className="nav-badge-pink">{activeHousekeepingCount}</span>
                    )}
                  </button>

                  <button
                    type="button"
                    className="mobile-nav-item"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenNewEquipment && onOpenNewEquipment();
                    }}
                  >
                    <Plus size={17} color="#ec4899" />
                    <span>+ Register New Asset</span>
                  </button>

                  <button
                    type="button"
                    className="mobile-nav-item"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenPartners && onOpenPartners();
                    }}
                  >
                    <Handshake size={17} color="#d97706" />
                    <span>Partners Master</span>
                  </button>

                  <button
                    type="button"
                    className="mobile-nav-item"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenEmployees && onOpenEmployees();
                    }}
                  >
                    <Users size={17} color="#6366f1" />
                    <span>Employees & Staff</span>
                  </button>

                  <button
                    type="button"
                    className="mobile-nav-item"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenDepartments && onOpenDepartments();
                    }}
                  >
                    <Building2 size={17} color="#059669" />
                    <span>Departments Master</span>
                  </button>
                </div>
              </div>

              {/* Settings & Support Utilities */}
              <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 12px', fontSize: '0.82rem' }}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenSettings && onOpenSettings();
                  }}
                >
                  <Settings size={15} style={{ color: 'var(--color-primary)', marginRight: '6px' }} />
                  <span>Regional Settings ({activeRegion?.flag || '🌐'} {settings.currency} • {settings.date_format})</span>
                </button>

                <button
                  type="button"
                  className="btn-hotline-pink"
                  style={{ width: '100%', justifyContent: 'center', padding: '8px 12px', fontSize: '0.82rem' }}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenSandsSupport && onOpenSandsSupport();
                  }}
                >
                  <Headphones size={15} />
                  <span>Help Line (+973 35078079)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

