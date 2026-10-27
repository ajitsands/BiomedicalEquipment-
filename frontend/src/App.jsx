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
import HousekeepingView from './views/HousekeepingView';
import CalendarView from './views/CalendarView';

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
import EditSiteAuditModal from './components/EditSiteAuditModal';
import DepartmentsModal from './components/DepartmentsModal';
import PartnersModal from './components/PartnersModal';
import EmployeesModal from './components/EmployeesModal';
import UserLoginModal from './components/UserLoginModal';

// Housekeeping Modals
import BookHousekeepingComplaintModal from './components/BookHousekeepingComplaintModal';
import HousekeepingInspectionRunnerModal from './components/HousekeepingInspectionRunnerModal';
import HousekeepingCertificateModal from './components/HousekeepingCertificateModal';
import HousekeepingComplaintDetailModal from './components/HousekeepingComplaintDetailModal';

// Mobile Field Portal & Printable A4 Worksheets
import PrintablePhaseWorksheetModal from './components/PrintablePhaseWorksheetModal';
import AssignPhasesModal from './components/AssignPhasesModal';
import MobileTechPortalModal from './components/MobileTechPortalModal';
import MobilePortalLauncherModal from './components/MobilePortalLauncherModal';
import MobilePortalView from './views/MobilePortalView';

import { fetchDashboardStats, fetchHousekeepingStats } from './services/api';

const VALID_VIEWS = ['dashboard', 'equipments', 'site_preparation', 'housekeeping', 'calendar', 'checklists', 'complaints', 'rfid', 'reports', 'mobile'];

function resolveViewFromHash(rawHash) {
  if (!rawHash) return null;
  const cleaned = rawHash.replace(/^#\/?/, '').trim().toLowerCase();
  if (VALID_VIEWS.includes(cleaned)) {
    return cleaned;
  }
  // Support mobile view aliases and common typos (e.g. #mobie, #mobi, #field)
  if (cleaned === 'mobie' || cleaned.startsWith('mobi') || cleaned === 'field' || cleaned === 'mobileview' || cleaned === 'portal') {
    return 'mobile';
  }
  return null;
}

export default function App() {
  // Theme state: Default Light, can toggle to Dark
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('biotrack_theme') || 'light';
  });

  // Preserve active view state via URL hash and localStorage so refreshing does NOT reset to dashboard
  const [currentView, setCurrentView] = useState(() => {
    const fromHash = resolveViewFromHash(window.location.hash);
    if (fromHash) {
      return fromHash;
    }
    const saved = localStorage.getItem('biotrack_current_view');
    if (saved && VALID_VIEWS.includes(saved)) {
      return saved;
    }
    return 'dashboard';
  });

  const [toasts, setToasts] = useState([]);
  const [dataRefreshKey, setDataRefreshKey] = useState(0);

  // Active modal targets
  const [passportEquipmentId, setPassportEquipmentId] = useState(null);
  const [checklistEquipment, setChecklistEquipment] = useState(null);
  const [complaintEquipment, setComplaintEquipment] = useState(null);
  const [isBookComplaintOpen, setIsBookComplaintOpen] = useState(false);
  const [isNewEquipmentOpen, setIsNewEquipmentOpen] = useState(false);
  const [isDepartmentsOpen, setIsDepartmentsOpen] = useState(false);
  const [isPartnersOpen, setIsPartnersOpen] = useState(false);
  const [isEmployeesOpen, setIsEmployeesOpen] = useState(false);
  const [isUserLoginOpen, setIsUserLoginOpen] = useState(false);
  const [isRfidScanOpen, setIsRfidScanOpen] = useState(false);
  const [isSandsSupportOpen, setIsSandsSupportOpen] = useState(false);
  const [isComplianceOpen, setIsComplianceOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Mobile Field Portal & Printable A4 Worksheets State
  const [isMobilePortalOpen, setIsMobilePortalOpen] = useState(false);
  const [assignPhasesTarget, setAssignPhasesTarget] = useState(null);
  const [printWorksheetTarget, setPrintWorksheetTarget] = useState(null);

  // Version 2.0: Site Preparation State
  const [isNewSiteAuditOpen, setIsNewSiteAuditOpen] = useState(false);
  const [activeSiteInspectionId, setActiveSiteInspectionId] = useState(null);
  const [activeDeficiency, setActiveDeficiency] = useState(null);
  const [activeSiteCertificate, setActiveSiteCertificate] = useState(null);
  const [activeEditAudit, setActiveEditAudit] = useState(null);
  const [sitePrepRefreshKey, setSitePrepRefreshKey] = useState(0);

  // Housekeeping & Infection Control State (Bahrain NHRA & WHO)
  const [isBookHkComplaintOpen, setIsBookHkComplaintOpen] = useState(false);
  const [activeHkInspectionId, setActiveHkInspectionId] = useState(null);
  const [activeHkCertificate, setActiveHkCertificate] = useState(null);
  const [activeHkComplaintId, setActiveHkComplaintId] = useState(null);
  const [hkRefreshKey, setHkRefreshKey] = useState(0);
  const [activeHousekeepingCount, setActiveHousekeepingCount] = useState(0);

  // Badge counters
  const [activeComplaintsCount, setActiveComplaintsCount] = useState(0);
  const [overduePmCount, setOverduePmCount] = useState(0);

  // Keep URL hash and localStorage in sync with active view
  useEffect(() => {
    if (window.location.hash !== `#${currentView}`) {
      window.location.hash = currentView;
    }
    localStorage.setItem('biotrack_current_view', currentView);
  }, [currentView]);

  // Support browser back/forward buttons and hash navigation
  useEffect(() => {
    const handleHashChange = () => {
      const resolved = resolveViewFromHash(window.location.hash);
      if (resolved) {
        setCurrentView(resolved);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('biotrack_theme', theme);
  }, [theme]);

  useEffect(() => {
    loadBadgeCounts();
  }, [currentView]);

  const loadBadgeCounts = async () => {
    try {
      const [res, hkRes] = await Promise.all([
        fetchDashboardStats(),
        fetchHousekeepingStats().catch(() => ({ data: { active_complaints: 0 } }))
      ]);
      const complaints = res.data?.complaints;
      const pm = res.data?.pm_schedules;
      setActiveComplaintsCount(complaints?.active_complaints || 0);
      setOverduePmCount(pm?.pm_overdue || 0);
      setActiveHousekeepingCount(hkRes.data?.active_complaints || 0);
    } catch (err) {
      console.error('Badge update error', err);
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const showToast = (toastOrMessage, maybeType = 'success') => {
    let type = 'success';
    let title = '';
    let message = '';
    if (typeof toastOrMessage === 'string') {
      message = toastOrMessage;
      type = maybeType;
      title = type === 'error' ? 'Error' : type === 'warning' ? 'Notice' : 'Success';
    } else if (toastOrMessage && typeof toastOrMessage === 'object') {
      type = toastOrMessage.type || 'success';
      title = toastOrMessage.title || (type === 'error' ? 'Error' : type === 'warning' ? 'Notice' : 'Success');
      message = toastOrMessage.message || '';
    }
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
      {/* Horizontal Top Navigation (Hidden in Pure Mobile View) */}
      {currentView !== 'mobile' && (
        <Navbar
          currentView={currentView}
          setCurrentView={setCurrentView}
          theme={theme}
          toggleTheme={toggleTheme}
          onOpenBookComplaint={() => handleOpenBookComplaint(null)}
          onOpenNewEquipment={() => setIsNewEquipmentOpen(true)}
          onOpenDepartments={() => setIsDepartmentsOpen(true)}
          onOpenPartners={() => setIsPartnersOpen(true)}
          onOpenEmployees={() => setIsEmployeesOpen(true)}
          onOpenUserLogin={() => setIsUserLoginOpen(true)}
          onOpenSandsSupport={() => setIsSandsSupportOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenMobilePortal={() => setIsMobilePortalOpen(true)}
          activeComplaintsCount={activeComplaintsCount}
          overduePmCount={overduePmCount}
          activeHousekeepingCount={activeHousekeepingCount}
        />
      )}

      {/* Main View Router */}
      <main 
        className={`main-content ${currentView === 'mobile' ? 'mobile-active' : ''}`}
        style={currentView === 'mobile' ? { padding: 0, margin: 0, maxWidth: '100%' } : {}}
      >
        {currentView === 'dashboard' && (
          <DashboardView
            onViewEquipmentPassport={(id) => setPassportEquipmentId(id)}
            onOpenChecklistRunner={(eq) => setChecklistEquipment(eq)}
            onOpenBookComplaint={(eq) => handleOpenBookComplaint(eq)}
            onOpenNewEquipment={() => setIsNewEquipmentOpen(true)}
            onOpenRfidScanner={() => setIsRfidScanOpen(true)}
            onShowToast={showToast}
            refreshKey={dataRefreshKey}
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
            refreshKey={dataRefreshKey}
          />
        )}

        {currentView === 'checklists' && (
          <ChecklistsView
            onRunChecklist={(eq) => setChecklistEquipment(eq)}
            onViewPassport={(id) => setPassportEquipmentId(id)}
            onShowToast={showToast}
            refreshKey={dataRefreshKey}
          />
        )}

        {currentView === 'complaints' && (
          <ComplaintsView
            onBookComplaint={(eq) => handleOpenBookComplaint(eq)}
            onViewPassport={(id) => setPassportEquipmentId(id)}
            onShowToast={showToast}
            refreshKey={dataRefreshKey}
          />
        )}

        {currentView === 'rfid' && (
          <RfidView
            onViewPassport={(id) => setPassportEquipmentId(id)}
            onOpenRfidScanner={() => setIsRfidScanOpen(true)}
            onShowToast={showToast}
            refreshKey={dataRefreshKey}
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
            onEditAudit={(insp) => setActiveEditAudit(insp)}
            onViewDeficiency={(def) => setActiveDeficiency(def)}
            onViewCertificate={(insp) => setActiveSiteCertificate(insp)}
            onShowToast={showToast}
            refreshKey={sitePrepRefreshKey}
          />
        )}

        {/* Housekeeping & Infection Control View */}
        {currentView === 'housekeeping' && (
          <HousekeepingView
            onOpenBookComplaint={() => setIsBookHkComplaintOpen(true)}
            onRunInspection={(id) => setActiveHkInspectionId(id)}
            onViewCertificate={(insp) => setActiveHkCertificate(insp)}
            onViewComplaintDetail={(id) => setActiveHkComplaintId(id)}
            onShowToast={showToast}
            refreshKey={hkRefreshKey}
          />
        )}

        {/* Master Operations & Jobs Calendar View */}
        {currentView === 'calendar' && (
          <CalendarView
            onRunChecklist={(eq) => setChecklistEquipment(eq)}
            onRunSiteAudit={(id) => setActiveSiteInspectionId(id)}
            onRunHkInspection={(id) => setActiveHkInspectionId(id)}
            onViewSiteCertificate={(insp) => setActiveSiteCertificate(insp)}
            onViewHkCertificate={(insp) => setActiveHkCertificate(insp)}
            onViewDeficiency={(def) => setActiveDeficiency(def)}
            onAssignPhases={(eq, dueDate) => setAssignPhasesTarget({ equipment: eq, pmDueDate: dueDate })}
            onPrintWorksheet={(eq, dueDate, phase, tech) => {
              setPrintWorksheetTarget({ equipment: eq, pmDueDate: dueDate, initialPhase: phase, assignedTechnician: tech });
            }}
            onShowToast={showToast}
          />
        )}

        {/* Dedicated Mobile Field Staff Portal */}
        {currentView === 'mobile' && (
          <MobilePortalView
            onShowToast={showToast}
            onExitMobile={() => setCurrentView('dashboard')}
          />
        )}
      </main>

      {/* Official SaNDS Lab Footer (Hidden in Pure Mobile View) */}
      {currentView !== 'mobile' && (
        <Footer 
          theme={theme} 
          onOpenSandsSupport={() => setIsSandsSupportOpen(true)}
          onOpenComplianceModal={() => setIsComplianceOpen(true)}
        />
      )}

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
            setDataRefreshKey(prev => prev + 1);
          }}
          onShowToast={showToast}
          onOpenPrintWorksheet={(eq, dueDate, phase) => {
            setPrintWorksheetTarget({ equipment: eq, pmDueDate: dueDate, initialPhase: phase });
          }}
        />
      )}

      {isBookComplaintOpen && (
        <BookComplaintModal
          isOpen={isBookComplaintOpen}
          onClose={() => setIsBookComplaintOpen(false)}
          preselectedEquipment={complaintEquipment}
          onSuccess={() => {
            loadBadgeCounts();
            setDataRefreshKey(prev => prev + 1);
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
            setDataRefreshKey(prev => prev + 1);
          }}
          onOpenDepartments={() => setIsDepartmentsOpen(true)}
          onOpenPartners={() => setIsPartnersOpen(true)}
          onShowToast={showToast}
        />
      )}

      {isDepartmentsOpen && (
        <DepartmentsModal
          isOpen={isDepartmentsOpen}
          onClose={() => setIsDepartmentsOpen(false)}
          onShowToast={showToast}
          onDepartmentChanged={() => {
            setDataRefreshKey(prev => prev + 1);
          }}
        />
      )}

      {/* Master Directory: Vendors, Contractors, and Suppliers */}
      {isPartnersOpen && (
        <PartnersModal
          isOpen={isPartnersOpen}
          onClose={() => setIsPartnersOpen(false)}
          onShowToast={showToast}
          onPartnerChanged={() => {
            setDataRefreshKey(prev => prev + 1);
          }}
        />
      )}

      {/* Master Directory: Employees, Roles, Usernames & Passwords */}
      {isEmployeesOpen && (
        <EmployeesModal
          isOpen={isEmployeesOpen}
          onClose={() => setIsEmployeesOpen(false)}
          onShowToast={showToast}
          onEmployeeChanged={() => {
            setDataRefreshKey(prev => prev + 1);
          }}
        />
      )}

      {/* Staff Switcher & Quick Password Login Dialog */}
      {isUserLoginOpen && (
        <UserLoginModal
          isOpen={isUserLoginOpen}
          onClose={() => setIsUserLoginOpen(false)}
          onShowToast={showToast}
          onOpenEmployeesMaster={() => {
            setIsUserLoginOpen(false);
            setIsEmployeesOpen(true);
          }}
        />
      )}

      {isRfidScanOpen && (
        <RfidScanModal
          isOpen={isRfidScanOpen}
          onClose={() => setIsRfidScanOpen(false)}
          onSuccess={() => {
            loadBadgeCounts();
            setDataRefreshKey(prev => prev + 1);
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
            setSitePrepRefreshKey(k => k + 1);
            if (newId) setActiveSiteInspectionId(newId);
          }}
          onShowToast={showToast}
        />
      )}

      {activeSiteInspectionId && (
        <SiteInspectionRunnerModal
          isOpen={Boolean(activeSiteInspectionId)}
          inspectionId={activeSiteInspectionId}
          onClose={() => {
            setActiveSiteInspectionId(null);
            setSitePrepRefreshKey(k => k + 1);
          }}
          onSuccess={() => {
            setSitePrepRefreshKey(k => k + 1);
          }}
          onShowToast={showToast}
          onOpenCertificate={(auditData) => setActiveSiteCertificate(auditData)}
          onOpenEditAudit={(auditData) => setActiveEditAudit(auditData)}
        />
      )}

      {activeDeficiency && (
        <SiteDeficiencyModal
          isOpen={Boolean(activeDeficiency)}
          deficiency={activeDeficiency}
          onClose={() => setActiveDeficiency(null)}
          onSuccess={() => {
            setSitePrepRefreshKey(k => k + 1);
          }}
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

      {activeEditAudit && (
        <EditSiteAuditModal
          isOpen={Boolean(activeEditAudit)}
          audit={activeEditAudit}
          onClose={() => setActiveEditAudit(null)}
          onSuccess={() => {
            setSitePrepRefreshKey(k => k + 1);
            setActiveEditAudit(null);
          }}
          onShowToast={showToast}
        />
      )}

      {/* Housekeeping & Infection Control Modals */}
      {isBookHkComplaintOpen && (
        <BookHousekeepingComplaintModal
          isOpen={isBookHkComplaintOpen}
          onClose={() => setIsBookHkComplaintOpen(false)}
          onSuccess={() => {
            setHkRefreshKey(k => k + 1);
            loadBadgeCounts();
          }}
          onShowToast={showToast}
        />
      )}

      {activeHkInspectionId && (
        <HousekeepingInspectionRunnerModal
          inspectionId={activeHkInspectionId}
          isOpen={Boolean(activeHkInspectionId)}
          onClose={() => setActiveHkInspectionId(null)}
          onSuccess={() => {
            setHkRefreshKey(k => k + 1);
            loadBadgeCounts();
          }}
          onShowToast={showToast}
          onViewCertificate={(insp) => setActiveHkCertificate(insp)}
        />
      )}

      {activeHkCertificate && (
        <HousekeepingCertificateModal
          inspection={activeHkCertificate}
          isOpen={Boolean(activeHkCertificate)}
          onClose={() => setActiveHkCertificate(null)}
        />
      )}

      {activeHkComplaintId && (
        <HousekeepingComplaintDetailModal
          complaintId={activeHkComplaintId}
          isOpen={Boolean(activeHkComplaintId)}
          onClose={() => setActiveHkComplaintId(null)}
          onSuccess={() => {
            setHkRefreshKey(k => k + 1);
            loadBadgeCounts();
          }}
          onShowToast={showToast}
        />
      )}

      {/* Mobile Field Staff Portal Launcher & QR Scanner Modal */}
      {isMobilePortalOpen && (
        <MobilePortalLauncherModal
          isOpen={isMobilePortalOpen}
          onClose={() => {
            setIsMobilePortalOpen(false);
            setDataRefreshKey(k => k + 1);
          }}
          onLaunchMobileView={() => {
            setIsMobilePortalOpen(false);
            setCurrentView('mobile');
          }}
          onShowToast={showToast}
        />
      )}

      {/* Multi-Technician Phase Delegation Modal */}
      {assignPhasesTarget && (
        <AssignPhasesModal
          isOpen={Boolean(assignPhasesTarget)}
          equipment={assignPhasesTarget.equipment}
          pmDueDate={assignPhasesTarget.pmDueDate}
          onClose={() => {
            setAssignPhasesTarget(null);
            setDataRefreshKey(k => k + 1);
          }}
          onOpenPrintWorksheet={(eq, dueDate, phase, tech) => {
            setPrintWorksheetTarget({ equipment: eq, pmDueDate: dueDate, initialPhase: phase, assignedTechnician: tech });
          }}
          onShowToast={showToast}
        />
      )}

      {/* Printable A4 Phase Worksheet Modal (Sterile Zone Fallback) */}
      {printWorksheetTarget && (
        <PrintablePhaseWorksheetModal
          isOpen={Boolean(printWorksheetTarget)}
          equipment={printWorksheetTarget.equipment}
          pmDueDate={printWorksheetTarget.pmDueDate}
          initialPhase={printWorksheetTarget.initialPhase || 'ALL'}
          assignedTechnician={printWorksheetTarget.assignedTechnician}
          onClose={() => setPrintWorksheetTarget(null)}
          onShowToast={showToast}
        />
      )}

      {/* Toast Alert Popups */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
