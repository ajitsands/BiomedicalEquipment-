import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { 
  fetchMobileUserCategories, 
  fetchMobileCategoryJobs, 
  fetchMobileJobTasks, 
  saveMobileJobProgress, 
  submitMobileJob 
} from '../services/api';
import confetti from 'canvas-confetti';
import { 
  Smartphone, 
  ShieldCheck, 
  AlertOctagon, 
  Building2, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ChevronRight, 
  ArrowLeft, 
  Save, 
  Check, 
  X, 
  LogOut, 
  Search, 
  User, 
  Calendar, 
  MapPin, 
  Filter, 
  Award,
  RefreshCw,
  Lock,
  FileCheck
} from 'lucide-react';

export default function MobilePortalView({
  onShowToast,
  onExitMobile
}) {
  const { currentUser, allEmployees, switchUser, loginEmployee, logoutUser } = useAuth();
  const { settings, formatDate } = useSettings();

  // Navigation State within Mobile Portal: 'categories', 'jobs', 'runner'
  const [currentScreen, setCurrentScreen] = useState('categories');
  const [selectedCategory, setSelectedCategory] = useState(null); // 'pm', 'breakdown', 'site_prep', 'housekeeping'
  const [selectedJob, setSelectedJob] = useState(null);

  // Login Screen State (if not logged in)
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Category Summaries State
  const [categoryCounts, setCategoryCounts] = useState(null);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Jobs List State
  const [jobs, setJobs] = useState([]);
  const [jobFilter, setJobFilter] = useState('ALL'); // 'ALL', 'Pending', 'Completed'
  const [jobSearch, setJobSearch] = useState('');
  const [loadingJobs, setLoadingJobs] = useState(false);

  // Active Runner State
  const [jobDetail, setJobDetail] = useState(null);
  const [taskItems, setTaskItems] = useState([]);
  const [itemStatuses, setItemStatuses] = useState({});
  const [itemFindings, setItemFindings] = useState({});
  const [itemAtp, setItemAtp] = useState({});
  const [engineerNotes, setEngineerNotes] = useState('');
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [submittingFinal, setSubmittingFinal] = useState(false);

  const companyName = settings?.company_name || 'SaNDS Lab Middle East W.L.L';
  const companyLogo = settings?.company_logo || '/sands_logo.png';

  // Load Categories when logged-in user changes
  useEffect(() => {
    if (currentUser) {
      loadCategories();
    }
  }, [currentUser]);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const res = await fetchMobileUserCategories(currentUser?.id, currentUser?.full_name);
      if (res && res.status === 'success') {
        setCategoryCounts(res.data);
      }
    } catch (err) {
      console.warn('Error loading categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword) {
      if (onShowToast) onShowToast({ type: 'warning', title: 'Input Required', message: 'Enter username and password' });
      return;
    }
    try {
      setLoginLoading(true);
      const res = await loginEmployee(loginUsername, loginPassword);
      if (res && res.status === 'success') {
        if (onShowToast) {
          onShowToast({ type: 'success', title: 'Welcome', message: `Logged in as ${res.employee?.full_name}` });
        }
      }
    } catch (err) {
      if (onShowToast) {
        onShowToast({ type: 'error', title: 'Login Failed', message: err.message || 'Invalid credentials' });
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleQuickStaffLogin = async (emp) => {
    if (switchUser) {
      switchUser(emp);
      if (onShowToast) {
        onShowToast({ type: 'success', title: 'Staff Selected', message: `Switched to ${emp.full_name}` });
      }
    }
  };

  const handleOpenCategory = async (catKey) => {
    setSelectedCategory(catKey);
    setCurrentScreen('jobs');
    await loadCategoryJobs(catKey);
  };

  const loadCategoryJobs = async (catKey = selectedCategory) => {
    try {
      setLoadingJobs(true);
      const res = await fetchMobileCategoryJobs(catKey, currentUser?.id, currentUser?.full_name, 'ALL');
      if (res && res.status === 'success') {
        setJobs(res.data.jobs || []);
      }
    } catch (err) {
      if (onShowToast) {
        onShowToast({ type: 'error', title: 'Error', message: 'Failed to load assigned jobs' });
      }
    } finally {
      setLoadingJobs(false);
    }
  };

  const handleOpenJobRunner = async (job) => {
    setSelectedJob(job);
    setCurrentScreen('runner');
    try {
      setLoadingTasks(true);
      const jobId = job.id || job.equipment_id;
      const res = await fetchMobileJobTasks(selectedCategory, jobId);
      if (res && res.status === 'success') {
        setJobDetail(res.data.detail);
        const items = res.data.items || [];
        setTaskItems(items);

        // Prepopulate statuses & findings
        const initialStatuses = {};
        const initialFindings = {};
        const initialAtp = {};

        items.forEach(it => {
          const id = it.id || it.checklist_item_id;
          initialStatuses[id] = it.status || 'Pending';
          initialFindings[id] = it.findings || it.notes || '';
          if (it.atp_reading_rlu) initialAtp[id] = it.atp_reading_rlu;
        });

        setItemStatuses(initialStatuses);
        setItemFindings(initialFindings);
        setItemAtp(initialAtp);
        setEngineerNotes(res.data.detail?.engineer_notes || res.data.detail?.notes || '');
      }
    } catch (err) {
      if (onShowToast) {
        onShowToast({ type: 'error', title: 'Task Load Error', message: err.message });
      }
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleItemStatusToggle = (itemId, newStatus) => {
    setItemStatuses(prev => ({
      ...prev,
      [itemId]: prev[itemId] === newStatus ? 'Pending' : newStatus
    }));
  };

  const handleSaveDraft = async () => {
    if (!selectedJob) return;
    const jobId = selectedJob.id || selectedJob.equipment_id;

    const payloadResults = taskItems.map(it => {
      const id = it.id || it.checklist_item_id;
      return {
        id,
        checklist_item_id: it.checklist_item_id || it.id,
        status: itemStatuses[id] || 'Pending',
        findings: itemFindings[id] || '',
        notes: itemFindings[id] || '',
        atp_reading_rlu: itemAtp[id] || null
      };
    });

    try {
      setSavingProgress(true);
      const res = await saveMobileJobProgress({
        category: selectedCategory,
        job_id: jobId,
        results: payloadResults,
        technician_name: currentUser?.full_name || 'Mobile Field Engineer',
        engineer_notes: engineerNotes
      });

      if (onShowToast) {
        onShowToast({ 
          type: 'success', 
          title: 'Draft Saved', 
          message: res.message || 'Progress saved to central database.' 
        });
      }
    } catch (err) {
      if (onShowToast) {
        onShowToast({ type: 'error', title: 'Save Failed', message: err.message });
      }
    } finally {
      setSavingProgress(false);
    }
  };

  const handleSubmitFinalJob = async () => {
    if (!selectedJob) return;
    const jobId = selectedJob.id || selectedJob.equipment_id;

    // Check if there are pending items
    const pendingCount = taskItems.filter(it => {
      const id = it.id || it.checklist_item_id;
      return (itemStatuses[id] || 'Pending') === 'Pending';
    }).length;

    if (pendingCount > 0) {
      const proceed = window.confirm(`There are still ${pendingCount} unverified items. Are you sure you want to finalize this work order?`);
      if (!proceed) return;
    }

    try {
      setSubmittingFinal(true);
      // First save current answers
      await handleSaveDraft();

      const res = await submitMobileJob({
        category: selectedCategory,
        job_id: jobId,
        technician_name: currentUser?.full_name || 'Mobile Field Engineer',
        engineer_notes: engineerNotes
      });

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });

      if (onShowToast) {
        onShowToast({
          type: 'success',
          title: 'Work Order Completed!',
          message: res.message || 'Updated central CMMS in real time.'
        });
      }

      // Return to Jobs list
      await loadCategoryJobs(selectedCategory);
      setCurrentScreen('jobs');
    } catch (err) {
      if (onShowToast) {
        onShowToast({ type: 'error', title: 'Submission Failed', message: err.message });
      }
    } finally {
      setSubmittingFinal(false);
    }
  };

  // Compute Task Statistics for Runner
  const totalTasksCount = taskItems.length;
  const completedTasksCount = taskItems.filter(it => {
    const id = it.id || it.checklist_item_id;
    return (itemStatuses[id] || 'Pending') !== 'Pending';
  }).length;
  const passTasksCount = taskItems.filter(it => {
    const id = it.id || it.checklist_item_id;
    return (itemStatuses[id] || 'Pending') === 'Pass';
  }).length;
  const failTasksCount = taskItems.filter(it => {
    const id = it.id || it.checklist_item_id;
    return (itemStatuses[id] || 'Pending') === 'Fail';
  }).length;
  const progressPct = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  // -------------------------------------------------------------------------
  // SCREEN 1: LOGIN SCREEN (if user not authenticated)
  // -------------------------------------------------------------------------
  if (!currentUser) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div style={{ maxWidth: '420px', width: '100%', background: '#ffffff', color: '#0f172a', borderRadius: '16px', padding: '28px 24px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
          
          {/* Logo & Enterprise Header */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <img 
              src={companyLogo} 
              alt={companyName} 
              style={{ maxHeight: '46px', maxWidth: '160px', objectFit: 'contain', margin: '0 auto 10px' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '-0.3px' }}>
              {companyName}
            </h2>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0284c7', marginTop: '3px' }}>
              Hospital Field Engineering & Mobile Task Portal
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
              Sign in to view your assigned PMs, Work Orders & Audits
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px', color: '#475569' }}>
                Username / Employee Code:
              </label>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="e.g. hassan.bme or EMP-BME-001"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px', color: '#475569' }}>
                Password:
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter password"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
              />
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '3px' }}>
                Default password for staff is <code>Hospital@123</code>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                background: '#0284c7',
                color: '#fff',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '6px'
              }}
            >
              <Lock size={16} />
              <span>{loginLoading ? 'Signing In...' : 'Sign In to Mobile Portal'}</span>
            </button>
          </form>

          {/* Quick Staff Switcher for Instant Field Testing */}
          <div style={{ marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', textAlign: 'center' }}>
              ⚡ 1-Tap Quick Staff Login (Demo / Testing):
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {allEmployees.slice(0, 4).map(emp => (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => handleQuickStaffLogin(emp)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>{emp.full_name}</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{emp.role || emp.designation} • {emp.employee_code}</div>
                  </div>
                  <ChevronRight size={14} color="#0284c7" />
                </button>
              ))}
            </div>
          </div>

          {onExitMobile && (
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button
                type="button"
                onClick={onExitMobile}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Return to Desktop CMMS
              </button>
            </div>
          )}

        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // SCREEN 2: MOBILE CATEGORIES DASHBOARD (Main Home)
  // -------------------------------------------------------------------------
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      color: '#0f172a',
      fontFamily: 'Inter, system-ui, sans-serif',
      paddingBottom: '40px'
    }}>
      
      {/* Top Mobile App Bar */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img 
            src={companyLogo} 
            alt={companyName} 
            style={{ maxHeight: '28px', maxWidth: '80px', objectFit: 'contain' }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
              BioTrack Mobile
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
              {currentUser.full_name} ({currentUser.employee_code})
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onExitMobile && (
            <button
              type="button"
              onClick={onExitMobile}
              title="Desktop View"
              style={{
                padding: '5px 8px',
                borderRadius: '6px',
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#475569',
                cursor: 'pointer'
              }}
            >
              Desktop
            </button>
          )}

          <button
            type="button"
            onClick={logoutUser}
            title="Switch User / Logout"
            style={{
              padding: '6px',
              borderRadius: '6px',
              background: '#fee2e2',
              border: 'none',
              color: '#ef4444',
              cursor: 'pointer'
            }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '16px' }}>

        {/* ===================================================================
            VIEW A: CATEGORY SELECTION DASHBOARD
           =================================================================== */}
        {currentScreen === 'categories' && (
          <div>
            {/* Welcome Technician Banner */}
            <div style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#fff',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.25)'
            }}>
              <div style={{ fontSize: '0.75rem', opacity: 0.9, textTransform: 'uppercase', fontWeight: 700 }}>
                Hospital Field Staff Portal
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '4px 0 2px' }}>
                Hello, {currentUser.full_name}
              </h2>
              <div style={{ fontSize: '0.8rem', opacity: 0.95 }}>
                {currentUser.role || currentUser.designation} • {settings?.hospital_name || 'Hospital Biomedical Service'}
              </div>
            </div>

            {/* Instruction Title */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                Select Work Category
              </h3>
              <button
                type="button"
                onClick={loadCategories}
                style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <RefreshCw size={12} className={loadingCategories ? 'spin' : ''} /> Refresh
              </button>
            </div>

            {/* 4 Category Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { 
                  key: 'pm', 
                  title: 'Preventive Maintenance (PM)', 
                  subtitle: 'WHO & IEC 62353 Safety Checklists', 
                  icon: ShieldCheck, 
                  color: '#0284c7', 
                  bg: '#e0f2fe',
                  count: categoryCounts?.pm?.pending_count ?? 0 
                },
                { 
                  key: 'breakdown', 
                  title: 'Breakdowns & Work Orders', 
                  subtitle: 'Emergency Clinical Equipment Breakdown Tickets', 
                  icon: AlertOctagon, 
                  color: '#ef4444', 
                  bg: '#fee2e2',
                  count: categoryCounts?.breakdown?.pending_count ?? 0 
                },
                { 
                  key: 'site_prep', 
                  title: 'Site Preparation & Commissioning', 
                  subtitle: '130-Point Pre-Installation Hospital Engineering', 
                  icon: Building2, 
                  color: '#f59e0b', 
                  bg: '#fef3c7',
                  count: categoryCounts?.site_prep?.pending_count ?? 0 
                },
                { 
                  key: 'housekeeping', 
                  title: 'Housekeeping & Infection Control', 
                  subtitle: 'NHRA Cleanliness & High-Touch Disinfection', 
                  icon: Sparkles, 
                  color: '#10b981', 
                  bg: '#d1fae5',
                  count: categoryCounts?.housekeeping?.pending_count ?? 0 
                }
              ].map(cat => {
                const Icon = cat.icon;
                return (
                  <div
                    key={cat.key}
                    onClick={() => handleOpenCategory(cat.key)}
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '10px',
                        background: cat.bg,
                        color: cat.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Icon size={24} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                          {cat.title}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                          {cat.subtitle}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {cat.count > 0 ? (
                        <span style={{
                          background: cat.color,
                          color: '#fff',
                          fontWeight: 800,
                          fontSize: '0.75rem',
                          padding: '3px 9px',
                          borderRadius: '12px'
                        }}>
                          {cat.count} Pending
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                          Up to date
                        </span>
                      )}
                      <ChevronRight size={18} color="#94a3b8" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================================
            VIEW B: JOBS LIST (Under Selected Category)
           =================================================================== */}
        {currentScreen === 'jobs' && (
          <div>
            {/* Header with Back button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <button
                type="button"
                onClick={() => setCurrentScreen('categories')}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#475569'
                }}
              >
                <ArrowLeft size={16} /> Back
              </button>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, textTransform: 'capitalize' }}>
                  {selectedCategory === 'pm' ? 'Preventive Maintenance Jobs' :
                   selectedCategory === 'breakdown' ? 'Breakdown Tickets' :
                   selectedCategory === 'site_prep' ? 'Site Preparation Audits' :
                   'Housekeeping Cleaning Audits'}
                </h2>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Assigned to {currentUser.full_name}
                </div>
              </div>
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
              {['ALL', 'Pending', 'Completed'].map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setJobFilter(f)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '20px',
                    border: '1px solid',
                    borderColor: jobFilter === f ? '#0284c7' : '#cbd5e1',
                    background: jobFilter === f ? '#0284c7' : '#fff',
                    color: jobFilter === f ? '#fff' : '#475569',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Jobs List */}
            {loadingJobs ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                Loading assigned jobs...
              </div>
            ) : jobs.length === 0 ? (
              <div style={{ background: '#fff', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '36px', textAlign: 'center', color: '#64748b' }}>
                <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 10px' }} />
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>No pending tasks in this category</div>
                <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>All assigned jobs are completed!</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {jobs
                  .filter(job => {
                    const status = job.status || job.overall_status || 'Pending';
                    if (jobFilter === 'Pending') return status !== 'Completed' && status !== 'Resolved' && status !== 'Passed' && status !== 'Approved';
                    if (jobFilter === 'Completed') return status === 'Completed' || status === 'Resolved' || status === 'Passed' || status === 'Approved';
                    return true;
                  })
                  .map(job => {
                    const id = job.id || job.equipment_id;
                    const assetId = job.asset_id || job.ticket_number || job.audit_number || `#${id}`;
                    const title = job.equipment_name || job.name || job.target_model || job.room_number || 'Hospital Task';
                    const location = job.department_name ? `${job.department_name} • ${job.room_number || ''}` : `${job.building || ''} ${job.floor || ''}`;
                    const isCompleted = job.status === 'Completed' || job.status === 'Resolved' || job.status === 'Passed' || job.status === 'Approved';
                    const hasDraft = job.draft_percent > 0;

                    return (
                      <div
                        key={id}
                        style={{
                          background: '#ffffff',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284c7', background: '#e0f2fe', padding: '2px 6px', borderRadius: '4px' }}>
                              {assetId}
                            </span>
                            <h4 style={{ margin: '4px 0 2px', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                              {title}
                            </h4>
                            <div style={{ fontSize: '0.74rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={12} /> {location || 'Clinical Area'}
                            </div>
                          </div>

                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: isCompleted ? '#dcfce7' : '#fef3c7',
                            color: isCompleted ? '#166534' : '#92400e'
                          }}>
                            {job.status || job.overall_status || 'Pending'}
                          </span>
                        </div>

                        {/* Progress bar if draft exists */}
                        {hasDraft && (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 700, color: '#0284c7', marginBottom: '3px' }}>
                              <span>Progress: {job.completed_items_count} / {job.total_items_count} tasks</span>
                              <span>{job.draft_percent}%</span>
                            </div>
                            <div style={{ height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${job.draft_percent}%`, height: '100%', background: '#0284c7', borderRadius: '3px' }} />
                            </div>
                          </div>
                        )}

                        {/* Action Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenJobRunner(job)}
                          style={{
                            width: '100%',
                            padding: '9px',
                            borderRadius: '6px',
                            background: isCompleted ? '#f1f5f9' : '#0284c7',
                            color: isCompleted ? '#0f172a' : '#ffffff',
                            border: isCompleted ? '1px solid #cbd5e1' : 'none',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          <FileCheck size={15} />
                          <span>{hasDraft ? 'Resume Checklist' : isCompleted ? 'View Results' : 'Start Task'}</span>
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            VIEW C: ACTIVE TASK RUNNER (Checklist Done 1-by-1)
           =================================================================== */}
        {currentScreen === 'runner' && (
          <div>
            {/* Header Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <button
                type="button"
                onClick={() => setCurrentScreen('jobs')}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#475569'
                }}
              >
                <ArrowLeft size={15} /> Back
              </button>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284c7' }}>
                  {selectedJob?.asset_id || selectedJob?.ticket_number || selectedJob?.audit_number}
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                  {selectedJob?.equipment_name || selectedJob?.target_model || selectedJob?.room_number}
                </div>
              </div>
            </div>

            {/* Live Progress Bar Banner */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '16px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>
                  Task Completion: {completedTasksCount} / {totalTasksCount} Verified
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: progressPct === 100 ? '#10b981' : '#0284c7' }}>
                  {progressPct}%
                </span>
              </div>
              <div style={{ height: '7px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${progressPct}%`, height: '100%', background: progressPct === 100 ? '#10b981' : '#0284c7', transition: 'width 0.2s ease' }} />
              </div>

              <div style={{ display: 'flex', gap: '14px', marginTop: '8px', fontSize: '0.72rem', fontWeight: 700 }}>
                <span style={{ color: '#10b981' }}>✓ Pass: {passTasksCount}</span>
                <span style={{ color: '#ef4444' }}>✗ Fail: {failTasksCount}</span>
                <span style={{ color: '#64748b' }}>⏳ Pending: {totalTasksCount - completedTasksCount}</span>
              </div>
            </div>

            {/* Task Items List - 1 by 1 */}
            {loadingTasks ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                Loading checklist items...
              </div>
            ) : taskItems.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                No checklist questions configured for this work order.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                {taskItems.map((item, index) => {
                  const itemId = item.id || item.checklist_item_id;
                  const currentStatus = itemStatuses[itemId] || 'Pending';
                  const title = item.task_description || item.question || item.inspection_item || item.title || `Task #${index + 1}`;
                  const desc = item.standard_procedure || item.sub_category || item.cleaning_criteria || item.desc || '';
                  const itemCode = item.item_code || `TASK-${index + 1}`;

                  return (
                    <div
                      key={itemId}
                      style={{
                        background: '#ffffff',
                        border: `1.5px solid ${currentStatus === 'Pass' ? '#10b981' : currentStatus === 'Fail' ? '#ef4444' : currentStatus === 'N/A' ? '#94a3b8' : '#e2e8f0'}`,
                        borderRadius: '10px',
                        padding: '14px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                          #{index + 1} • {itemCode}
                        </span>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: currentStatus === 'Pass' ? '#dcfce7' : currentStatus === 'Fail' ? '#fee2e2' : currentStatus === 'N/A' ? '#f1f5f9' : '#fef3c7',
                          color: currentStatus === 'Pass' ? '#166534' : currentStatus === 'Fail' ? '#991b1b' : currentStatus === 'N/A' ? '#475569' : '#92400e'
                        }}>
                          {currentStatus}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                        {title}
                      </div>

                      {desc && (
                        <div style={{ fontSize: '0.76rem', color: '#64748b', marginBottom: '10px', lineHeight: 1.3 }}>
                          {desc}
                        </div>
                      )}

                      {/* 3 Large Touch Action Buttons: PASS, FAIL, N/A */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                        <button
                          type="button"
                          onClick={() => handleItemStatusToggle(itemId, 'Pass')}
                          style={{
                            padding: '10px',
                            borderRadius: '6px',
                            border: `1.5px solid ${currentStatus === 'Pass' ? '#10b981' : '#cbd5e1'}`,
                            background: currentStatus === 'Pass' ? '#10b981' : '#f8fafc',
                            color: currentStatus === 'Pass' ? '#ffffff' : '#0f172a',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          <Check size={14} /> PASS
                        </button>

                        <button
                          type="button"
                          onClick={() => handleItemStatusToggle(itemId, 'Fail')}
                          style={{
                            padding: '10px',
                            borderRadius: '6px',
                            border: `1.5px solid ${currentStatus === 'Fail' ? '#ef4444' : '#cbd5e1'}`,
                            background: currentStatus === 'Fail' ? '#ef4444' : '#f8fafc',
                            color: currentStatus === 'Fail' ? '#ffffff' : '#0f172a',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          <X size={14} /> FAIL
                        </button>

                        <button
                          type="button"
                          onClick={() => handleItemStatusToggle(itemId, 'N/A')}
                          style={{
                            padding: '10px',
                            borderRadius: '6px',
                            border: `1.5px solid ${currentStatus === 'N/A' ? '#64748b' : '#cbd5e1'}`,
                            background: currentStatus === 'N/A' ? '#64748b' : '#f8fafc',
                            color: currentStatus === 'N/A' ? '#ffffff' : '#0f172a',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                          }}
                        >
                          N/A
                        </button>
                      </div>

                      {/* Observations / ATP reading input */}
                      <input
                        type="text"
                        value={itemFindings[itemId] || ''}
                        onChange={(e) => setItemFindings({ ...itemFindings, [itemId]: e.target.value })}
                        placeholder="Findings, measurement reading, or notes..."
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.78rem',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  );
                })}

                {/* Engineer Overall Notes */}
                <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                    Overall Work Notes / Spare Parts / Recommendations:
                  </label>
                  <textarea
                    rows={3}
                    value={engineerNotes}
                    onChange={(e) => setEngineerNotes(e.target.value)}
                    placeholder="Document test equipment used, calibration numbers, or follow-up actions..."
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.8rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Bottom Floating Action Bar */}
            <div style={{
              position: 'sticky',
              bottom: '12px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex',
              gap: '10px',
              boxShadow: '0 8px 20px rgba(0,0,0,0.12)'
            }}>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={savingProgress || submittingFinal}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  color: '#0f172a',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Save size={16} />
                <span>{savingProgress ? 'Saving...' : 'Save Progress'}</span>
              </button>

              <button
                type="button"
                onClick={handleSubmitFinalJob}
                disabled={savingProgress || submittingFinal}
                style={{
                  flex: 1.3,
                  padding: '12px',
                  borderRadius: '8px',
                  background: progressPct === 100 ? '#10b981' : '#0284c7',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <CheckCircle2 size={16} />
                <span>{submittingFinal ? 'Submitting...' : progressPct === 100 ? 'Submit & Certify' : 'Submit Task'}</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
