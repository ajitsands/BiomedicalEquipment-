import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ToastContainer from './components/Toast';

// Views
import DashboardView from './views/DashboardView';
import EquipmentsView from './views/EquipmentsView';
import ChecklistsView from './views/ChecklistsView';
import ComplaintsView from './views/ComplaintsView';
import RfidView from './views/RfidView';
import ReportsView from './views/ReportsView';
import SitePreparationView from './views/SitePreparationView';

// Modals
import EquipmentPassportModal from './components/EquipmentPassportModal';
import ChecklistRunnerModal from './components/ChecklistRunnerModal';
import BookComplaintModal from './components/BookComplaintModal';
import NewEquipmentModal from './components/NewEquipmentModal';
import RfidScanModal from './components/RfidScanModal';
import SandsSupportModal from './components/SandsSupportModal';
import WhoIecComplianceModal from './components/WhoIecComplianceModal';
import SettingsModal from './components/SettingsModal';
import SiteInspectionRunnerModal from './components/SiteInspectionRunnerModal';
import NewSiteAuditModal from './components/NewSiteAuditModal';
import SiteDeficiencyModal from './components/SiteDeficiencyModal';
import SiteCertificateModal from './components/SiteCertificateModal';

import { fetchDashboardStats } from './services/api';

export default function App() {
  // Theme state: Default Light, can toggle to Dark
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('biotrack_theme') || 'light';
  });

  const [currentView, setCurrentView] = useState('dashboard');
  const [toasts, setToasts] = useState([]);

  // Active modal targets
  const [passportEquipmentId, setPassportEquipmentId] = useState(null);
  const [checklistEquipment, setChecklistEquipment] = useState(null);
  const [complaintEquipment, setComplaintEquipment] = useState(null);
  const [isBookComplaintOpen, setIsBookComplaintOpen] = useState(false);
  const [isNewEquipmentOpen, setIsNewEquipmentOpen] = useState(false);
  const [isRfidScanOpen, setIsRfidScanOpen] = useState(false);
  const [isSandsSupportOpen, setIsSandsSupportOpen] = useState(false);
  const [isComplianceOpen, setIsComplianceOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Version 2.0: Site Preparation State
  const [isNewSiteAuditOpen, setIsNewSiteAuditOpen] = useState(false);
  const [activeSiteInspectionId, setActiveSiteInspectionId] = useState(null);
  const [activeDeficiency, setActiveDeficiency] = useState(null);
  const [activeSiteCertificate, setActiveSiteCertificate] = useState(null);

  // Badge counters
  const [activeComplaintsCount, setActiveComplaintsCount] = useState(0);
  const [overduePmCount, setOverduePmCount] = useState(0);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('biotrack_theme', theme);
  }, [theme]);

  useEffect(() => {
    loadBadgeCounts();
  }, [currentView]);

  const loadBadgeCounts = async () => {
    try {
      const res = await fetchDashboardStats();
      const complaints = res.data?.complaints;
      const pm = res.data?.pm_schedules;
      setActiveComplaintsCount(complaints?.active_complaints || 0);
      setOverduePmCount(pm?.pm_overdue || 0);
    } catch (err) {
      console.error('Badge update error', err);
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const showToast = ({ type = 'success', title = '', message = '' }) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      dismissToast(id);
    }, 4500);
  };

  const dismissToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleOpenBookComplaint = (equipment = null) => {
    setComplaintEquipment(equipment);
    setIsBookComplaintOpen(true);
  };

  return (
    <div className="app-container">
      {/* Horizontal Top Navigation */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        theme={theme}
        toggleTheme={toggleTheme}
        onOpenBookComplaint={() => handleOpenBookComplaint(null)}
        onOpenNewEquipment={() => setIsNewEquipmentOpen(true)}
        onOpenSandsSupport={() => setIsSandsSupportOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        activeComplaintsCount={activeComplaintsCount}
        overduePmCount={overduePmCount}
      />

      {/* Main View Router */}
      <main className="main-content">
        {currentView === 'dashboard' && (
          <DashboardView
            onViewEquipmentPassport={(id) => setPassportEquipmentId(id)}
            onOpenChecklistRunner={(eq) => setChecklistEquipment(eq)}
            onOpenBookComplaint={(eq) => handleOpenBookComplaint(eq)}
            onOpenNewEquipment={() => setIsNewEquipmentOpen(true)}
            onOpenRfidScanner={() => setIsRfidScanOpen(true)}
            onShowToast={showToast}
          />
        )}

        {currentView === 'equipments' && (
          <EquipmentsView
            onViewPassport={(id) => setPassportEquipmentId(id)}
            onRunChecklist={(eq) => setChecklistEquipment(eq)}
            onBookComplaint={(eq) => handleOpenBookComplaint(eq)}
            onOpenNewEquipment={() => setIsNewEquipmentOpen(true)}
            onOpenRfidScanner={() => setIsRfidScanOpen(true)}
            onShowToast={showToast}
          />
        )}

        {currentView === 'checklists' && (
          <ChecklistsView
            onRunChecklist={(eq) => setChecklistEquipment(eq)}
            onViewPassport={(id) => setPassportEquipmentId(id)}
            onShowToast={showToast}
          />
        )}

        {currentView === 'complaints' && (
          <ComplaintsView
            onBookComplaint={(eq) => handleOpenBookComplaint(eq)}
            onViewPassport={(id) => setPassportEquipmentId(id)}
            onShowToast={showToast}
          />
        )}

        {currentView === 'rfid' && (
          <RfidView
            onViewPassport={(id) => setPassportEquipmentId(id)}
            onOpenRfidScanner={() => setIsRfidScanOpen(true)}
            onShowToast={showToast}
          />
        )}

        {currentView === 'reports' && (
          <ReportsView
            theme={theme}
            onShowToast={showToast}
            onOpenSandsSupport={() => setIsSandsSupportOpen(true)}
          />
        )}

        {/* Version 2.0: Site Preparation Procedures View */}
        {currentView === 'site_preparation' && (
          <SitePreparationView
            onOpenNewAudit={() => setIsNewSiteAuditOpen(true)}
            onRunAudit={(id) => setActiveSiteInspectionId(id)}
            onViewDeficiency={(def) => setActiveDeficiency(def)}
            onViewCertificate={(insp) => setActiveSiteCertificate(insp)}
            onShowToast={showToast}
          />
        )}
      </main>

      {/* Official SanDS Lab Footer */}
      <Footer 
        theme={theme} 
        onOpenSandsSupport={() => setIsSandsSupportOpen(true)}
        onOpenComplianceModal={() => setIsComplianceOpen(true)}
      />

      {/* Interactive Global Modals */}
      {passportEquipmentId && (
        <EquipmentPassportModal
          equipmentId={passportEquipmentId}
          isOpen={Boolean(passportEquipmentId)}
          onClose={() => setPassportEquipmentId(null)}
          onOpenChecklistRunner={(eq) => setChecklistEquipment(eq)}
          onOpenBookComplaint={(eq) => handleOpenBookComplaint(eq)}
          onShowToast={showToast}
        />
      )}

      {checklistEquipment && (
        <ChecklistRunnerModal
          equipment={checklistEquipment}
          isOpen={Boolean(checklistEquipment)}
          onClose={() => setChecklistEquipment(null)}
          onSuccess={() => {
            loadBadgeCounts();
          }}
          onShowToast={showToast}
        />
      )}

      {isBookComplaintOpen && (
        <BookComplaintModal
          isOpen={isBookComplaintOpen}
          onClose={() => setIsBookComplaintOpen(false)}
          preselectedEquipment={complaintEquipment}
          onSuccess={() => {
            loadBadgeCounts();
          }}
          onShowToast={showToast}
        />
      )}

      {isNewEquipmentOpen && (
        <NewEquipmentModal
          isOpen={isNewEquipmentOpen}
          onClose={() => setIsNewEquipmentOpen(false)}
          onSuccess={() => {
            loadBadgeCounts();
          }}
          onShowToast={showToast}
        />
      )}

      {isRfidScanOpen && (
        <RfidScanModal
          isOpen={isRfidScanOpen}
          onClose={() => setIsRfidScanOpen(false)}
          onSuccess={() => {
            loadBadgeCounts();
          }}
          onShowToast={showToast}
        />
      )}

      {/* SaNDS Lab Vendor Support & Hotline Modal */}
      {isSandsSupportOpen && (
        <SandsSupportModal
          isOpen={isSandsSupportOpen}
          onClose={() => setIsSandsSupportOpen(false)}
        />
      )}

      {/* WHO & IEC 62353 Compliance Details Modal */}
      {isComplianceOpen && (
        <WhoIecComplianceModal
          isOpen={isComplianceOpen}
          onClose={() => setIsComplianceOpen(false)}
        />
      )}

      {/* Regional & Localization Settings Modal (Gulf & India) */}
      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onShowToast={showToast}
        />
      )}

      {/* Version 2.0 Site Preparation Modals */}
      {isNewSiteAuditOpen && (
        <NewSiteAuditModal
          isOpen={isNewSiteAuditOpen}
          onClose={() => setIsNewSiteAuditOpen(false)}
          onSuccess={(newId) => {
            setIsNewSiteAuditOpen(false);
            if (newId) setActiveSiteInspectionId(newId);
          }}
          onShowToast={showToast}
        />
      )}

      {activeSiteInspectionId && (
        <SiteInspectionRunnerModal
          isOpen={Boolean(activeSiteInspectionId)}
          inspectionId={activeSiteInspectionId}
          onClose={() => setActiveSiteInspectionId(null)}
          onSuccess={() => {}}
          onShowToast={showToast}
          onOpenCertificate={(auditData) => setActiveSiteCertificate(auditData)}
        />
      )}

      {activeDeficiency && (
        <SiteDeficiencyModal
          isOpen={Boolean(activeDeficiency)}
          deficiency={activeDeficiency}
          onClose={() => setActiveDeficiency(null)}
          onSuccess={() => {}}
          onShowToast={showToast}
        />
      )}

      {activeSiteCertificate && (
        <SiteCertificateModal
          isOpen={Boolean(activeSiteCertificate)}
          inspection={activeSiteCertificate.inspection || activeSiteCertificate}
          certificate={activeSiteCertificate.certificate || null}
          onClose={() => setActiveSiteCertificate(null)}
        />
      )}

      {/* Toast Alert Popups */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
