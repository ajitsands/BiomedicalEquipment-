import React from 'react';
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
  Building2
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export default function Navbar({
  currentView,
  setCurrentView,
  theme,
  toggleTheme,
  onOpenBookComplaint,
  onOpenNewEquipment,
  onOpenDepartments,
  onOpenSandsSupport,
  onOpenSettings,
  activeComplaintsCount = 0,
  overduePmCount = 0
}) {
  const { settings, activeRegion } = useSettings();

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
            src={theme === 'dark' ? '/sands_logo_white.png' : '/sands_logo.png'} 
            alt="SanDS Lab Logo" 
            className="brand-logo-img"
            onClick={onOpenSandsSupport}
            style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}
            title="Click to view SaNDS Lab Vendor Support, WhatsApp & Products"
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

          {/* Hospital Departments Management */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onOpenDepartments}
            title="Manage Hospital Departments & Facility Locations"
          >
            <Building2 size={15} />
            <span>Departments</span>
          </button>

          {/* New Asset Master */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onOpenNewEquipment}
            title="Add New Equipment Master"
          >
            <Plus size={15} />
            <span>New Asset</span>
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

