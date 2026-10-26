import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
  Building2,
  Sparkles,
  AlertOctagon,
  CheckCircle2,
  AlertTriangle,
  Award,
  Play,
  CheckSquare,
  Filter,
  RefreshCw,
  Search,
  UserCheck,
  ShieldCheck,
  X,
  FileText,
  Users,
  Printer
} from 'lucide-react';
import { fetchCalendarMonthSchedule, fetchCalendarDayTasks, completeCalendarTask } from '../services/api';
import { useSettings } from '../context/SettingsContext';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function CalendarView({
  onRunChecklist,
  onRunSiteAudit,
  onRunHkInspection,
  onViewSiteCertificate,
  onViewHkCertificate,
  onViewDeficiency,
  onAssignPhases,
  onPrintWorksheet,
  onShowToast
}) {
  const { settings } = useSettings();

  // State: Default to current year & month, or Oct 2026
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(() => today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => today.getMonth() + 1); // 1-12
  const [selectedModule, setSelectedModule] = useState('ALL'); // 'ALL', 'biomedical', 'site_prep', 'housekeeping'
  
  // Data state
  const [loading, setLoading] = useState(false);
  const [monthData, setMonthData] = useState(null);
  
  // Day Task Deck Modal State
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayTasksLoading, setDayTasksLoading] = useState(false);
  const [dayTasksData, setDayTasksData] = useState(null);
  const [dayTaskFilter, setDayTaskFilter] = useState('ALL'); // 'ALL', 'Pending', 'Completed'
  
  // Completion / Sign-off dialog state
  const [completingTask, setCompletingTask] = useState(null);
  const [signOffName, setSignOffName] = useState('Dr. Fatima Al-Doseri');
  const [signOffNotes, setSignOffNotes] = useState('Job inspected, all checklist criteria verified and satisfied as per NHRA / WHO regulations.');
  const [submittingCompletion, setSubmittingCompletion] = useState(false);

  // Load Month Schedule
  const loadMonthSchedule = async (y = currentYear, m = currentMonth, mod = selectedModule) => {
    try {
      setLoading(true);
      const res = await fetchCalendarMonthSchedule(y, m, mod);
      if (res && res.status === 'success') {
        setMonthData(res.data);
      }
    } catch (err) {
      console.error('Error fetching calendar schedule:', err);
      if (onShowToast) onShowToast('Failed to load schedule: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonthSchedule(currentYear, currentMonth, selectedModule);
  }, [currentYear, currentMonth, selectedModule]);

  // Handle Month Navigation
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleJumpToOctober2026 = () => {
    setCurrentYear(2026);
    setCurrentMonth(10);
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth() + 1);
  };

  // Open Day Tasks Deck
  const handleOpenDayDeck = async (dateStr) => {
    setSelectedDay(dateStr);
    try {
      setDayTasksLoading(true);
      const res = await fetchCalendarDayTasks(dateStr);
      if (res && res.status === 'success') {
        setDayTasksData(res.data);
      }
    } catch (err) {
      console.error('Error fetching day tasks:', err);
      if (onShowToast) onShowToast('Failed to load day tasks: ' + err.message, 'error');
    } finally {
      setDayTasksLoading(false);
    }
  };

  // Close Day Tasks Deck
  const handleCloseDayDeck = () => {
    setSelectedDay(null);
    setDayTasksData(null);
    setCompletingTask(null);
  };

  // Submit Task Completion & Satisfaction
  const handleConfirmTaskCompletion = async () => {
    if (!completingTask) return;
    try {
      setSubmittingCompletion(true);
      const res = await completeCalendarTask({
        task_id: completingTask.id,
        module: completingTask.module,
        signoff_name: signOffName,
        notes: signOffNotes
      });

      if (res && res.status === 'success') {
        if (onShowToast) {
          onShowToast(
            `Task completed! ${res.data?.certificate_number ? 'Certificate: ' + res.data.certificate_number : ''}`,
            'success'
          );
        }
        setCompletingTask(null);
        // Refresh day tasks
        if (selectedDay) {
          const fresh = await fetchCalendarDayTasks(selectedDay);
          if (fresh && fresh.status === 'success') setDayTasksData(fresh.data);
        }
        // Refresh monthly grid
        loadMonthSchedule(currentYear, currentMonth, selectedModule);
      }
    } catch (err) {
      console.error('Task completion error:', err);
      if (onShowToast) onShowToast('Failed to complete task: ' + err.message, 'error');
    } finally {
      setSubmittingCompletion(false);
    }
  };

  // Compute Calendar Grid Cells
  const calendarCells = useMemo(() => {
    if (!monthData?.days) return [];
    
    // First day of month day-of-week (1=Mon, ..., 7=Sun)
    const firstDayStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const firstDayDate = new Date(firstDayStr);
    // getDay() gives 0 for Sunday, 1 for Monday
    let startDayOfWeek = firstDayDate.getDay();
    if (startDayOfWeek === 0) startDayOfWeek = 7; // Convert Sunday to 7
    
    const leadingBlanks = startDayOfWeek - 1; // blanks before 1st of month
    
    const cells = [];
    // Pad leading empty cells
    for (let i = 0; i < leadingBlanks; i++) {
      cells.push({ isBlank: true, key: `blank-pre-${i}` });
    }
    
    // Month days
    monthData.days.forEach(d => {
      cells.push({ ...d, isBlank: false, key: d.date });
    });
    
    // Trailing blanks to complete 7-day row
    const remainder = cells.length % 7;
    if (remainder !== 0) {
      const trailingBlanks = 7 - remainder;
      for (let j = 0; j < trailingBlanks; j++) {
        cells.push({ isBlank: true, key: `blank-post-${j}` });
      }
    }
    
    return cells;
  }, [monthData, currentYear, currentMonth]);

  // Filtered Day Tasks
  const filteredDayTasks = useMemo(() => {
    if (!dayTasksData?.tasks) return [];
    if (dayTaskFilter === 'ALL') return dayTasksData.tasks;
    return dayTasksData.tasks.filter(t => t.status === dayTaskFilter);
  }, [dayTasksData, dayTaskFilter]);

  return (
    <div className="view-container" style={{ padding: '0.75rem 1rem 2.5rem 1rem', maxWidth: '100%', width: '100%', margin: '0', boxSizing: 'border-box' }}>
      {/* Top Banner & Module Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(236, 72, 153, 0.08) 100%)',
        border: '1px solid rgba(2, 132, 199, 0.25)',
        borderRadius: '14px',
        padding: '1.5rem 1.75rem',
        marginBottom: '1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        boxShadow: '0 4px 20px -2px rgba(0,0,0,0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0284c7 0%, #ec4899 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)'
          }}>
            <CalendarIcon size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Master Operations & Jobs Calendar
              </h1>
              <span style={{
                background: 'rgba(2, 132, 199, 0.15)',
                color: '#0284c7',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '3px 9px',
                borderRadius: '12px'
              }}>
                Multi-Module Unified
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Scheduled preventive maintenance, pre-installation site audits, and daily clinical housekeeping protocols across Bahrain hospital wards.
            </p>
          </div>
        </div>

        {/* Quick Jump Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleJumpToOctober2026}
            style={{ fontWeight: 600, borderColor: '#ec4899', color: '#ec4899' }}
            title="View October 2026 schedules as demonstrated"
          >
            ⭐ Jump to Oct 2026
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleJumpToToday}
            style={{ fontWeight: 600 }}
          >
            Today ({today.getDate()} {MONTH_NAMES[today.getMonth()]})
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => loadMonthSchedule()}
            disabled={loading}
            title="Refresh schedule"
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Stats Grid for the Selected Month */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-widget" style={{ borderLeft: '4px solid #0284c7' }}>
          <div className="stat-icon-wrap" style={{ background: 'rgba(2, 132, 199, 0.12)', color: '#0284c7' }}>
            <CalendarIcon size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Monthly Jobs</span>
            <div className="stat-value">{monthData?.summary?.total_scheduled_jobs || 0}</div>
            <div className="stat-desc" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {MONTH_NAMES[currentMonth - 1]} {currentYear}
            </div>
          </div>
        </div>

        <div className="stat-widget" style={{ borderLeft: '4px solid #0ea5e9' }}>
          <div className="stat-icon-wrap" style={{ background: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9' }}>
            <Layers size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Biomedical PM & Tickets</span>
            <div className="stat-value">{monthData?.summary?.biomedical_jobs || 0}</div>
            <div className="stat-desc" style={{ fontSize: '0.72rem', color: '#0ea5e9' }}>
              Quarterly / 3-Month PM & Breakdowns
            </div>
          </div>
        </div>

        <div className="stat-widget" style={{ borderLeft: '4px solid #ea580c' }}>
          <div className="stat-icon-wrap" style={{ background: 'rgba(234, 88, 12, 0.12)', color: '#ea580c' }}>
            <Building2 size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Site Readiness Audits</span>
            <div className="stat-value">{monthData?.summary?.site_prep_jobs || 0}</div>
            <div className="stat-desc" style={{ fontSize: '0.72rem', color: '#ea580c' }}>
              WHO Pre-installation & Civil
            </div>
          </div>
        </div>

        <div className="stat-widget" style={{ borderLeft: '4px solid #e11d48' }}>
          <div className="stat-icon-wrap" style={{ background: 'rgba(225, 29, 72, 0.12)', color: '#e11d48' }}>
            <Sparkles size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Housekeeping Protocols</span>
            <div className="stat-value">{monthData?.summary?.housekeeping_jobs || 0}</div>
            <div className="stat-desc" style={{ fontSize: '0.72rem', color: '#e11d48' }}>
              Daily Clean & Terminal Audits
            </div>
          </div>
        </div>

        <div className="stat-widget" style={{ borderLeft: '4px solid #dc2626' }}>
          <div className="stat-icon-wrap" style={{ background: 'rgba(220, 38, 38, 0.12)', color: '#dc2626' }}>
            <AlertOctagon size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Urgent / Critical</span>
            <div className="stat-value" style={{ color: '#dc2626' }}>
              {monthData?.summary?.critical_urgent_jobs || 0}
            </div>
            <div className="stat-desc" style={{ fontSize: '0.72rem', color: '#dc2626' }}>
              Immediate Attention Required
            </div>
          </div>
        </div>
      </div>

      {/* Main Calendar Navigation & Module Filter Bar */}
      <div style={{
        background: 'var(--card-bg, #ffffff)',
        border: '1px solid var(--border-color, rgba(0,0,0,0.1))',
        borderRadius: '12px 12px 0 0',
        padding: '1rem 1.25rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem'
      }}>
        {/* Month Selector with Arrows */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handlePrevMonth}
            style={{ padding: '6px 10px' }}
            title="Previous Month"
          >
            <ChevronLeft size={18} />
          </button>
          
          <div style={{ fontSize: '1.25rem', fontWeight: 800, minWidth: '220px', textAlign: 'center', color: 'var(--text-primary)' }}>
            {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleNextMonth}
            style={{ padding: '6px 10px' }}
            title="Next Month"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Module Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginRight: '4px' }}>
            Filter:
          </span>
          <button
            type="button"
            onClick={() => setSelectedModule('ALL')}
            className={`btn btn-sm ${selectedModule === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '20px', padding: '4px 14px' }}
          >
            All Modules
          </button>
          <button
            type="button"
            onClick={() => setSelectedModule('biomedical')}
            className={`btn btn-sm ${selectedModule === 'biomedical' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ 
              borderRadius: '20px', 
              padding: '4px 14px',
              backgroundColor: selectedModule === 'biomedical' ? '#0284c7' : 'transparent',
              borderColor: '#0284c7',
              color: selectedModule === 'biomedical' ? '#fff' : '#0284c7'
            }}
          >
            <Layers size={13} style={{ marginRight: '4px' }} />
            Biomedical Equipments
          </button>
          <button
            type="button"
            onClick={() => setSelectedModule('site_prep')}
            className={`btn btn-sm ${selectedModule === 'site_prep' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ 
              borderRadius: '20px', 
              padding: '4px 14px',
              backgroundColor: selectedModule === 'site_prep' ? '#ea580c' : 'transparent',
              borderColor: '#ea580c',
              color: selectedModule === 'site_prep' ? '#fff' : '#ea580c'
            }}
          >
            <Building2 size={13} style={{ marginRight: '4px' }} />
            Site Preparation
          </button>
          <button
            type="button"
            onClick={() => setSelectedModule('housekeeping')}
            className={`btn btn-sm ${selectedModule === 'housekeeping' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ 
              borderRadius: '20px', 
              padding: '4px 14px',
              backgroundColor: selectedModule === 'housekeeping' ? '#e11d48' : 'transparent',
              borderColor: '#e11d48',
              color: selectedModule === 'housekeeping' ? '#fff' : '#e11d48'
            }}
          >
            <Sparkles size={13} style={{ marginRight: '4px' }} />
            Housekeeping (NHRA/WHO)
          </button>
        </div>
      </div>

      {/* 7-Column Calendar Grid Wrapper */}
      <div style={{
        background: 'var(--card-bg, #ffffff)',
        border: '1px solid var(--border-color, rgba(0,0,0,0.1))',
        borderTop: 'none',
        borderRadius: '0 0 12px 12px',
        overflowX: 'auto',
        overflowY: 'hidden',
        boxShadow: '0 6px 18px rgba(0,0,0,0.04)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{
          minWidth: '950px',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {/* Day-of-Week Column Headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            background: 'var(--bg-secondary, rgba(0,0,0,0.03))',
            borderBottom: '1px solid var(--border-color, rgba(0,0,0,0.1))',
            textAlign: 'center',
            fontWeight: 700,
            fontSize: '0.82rem',
            color: 'var(--text-muted)',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            {DAYS_OF_WEEK.map((d, idx) => (
              <div key={d} style={{ padding: '0.75rem 0.5rem', minWidth: 0, overflow: 'hidden', color: idx >= 5 ? '#e11d48' : 'inherit' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Day Cells */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            minHeight: '620px',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            {calendarCells.map((cell) => {
              if (cell.isBlank) {
                return (
                  <div
                    key={cell.key}
                    style={{
                      background: 'var(--bg-tertiary, rgba(0,0,0,0.02))',
                      borderRight: '1px solid var(--border-color, rgba(0,0,0,0.06))',
                      borderBottom: '1px solid var(--border-color, rgba(0,0,0,0.06))',
                      minHeight: '115px',
                      minWidth: 0,
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  />
                );
              }

              const isToday = cell.is_today;
              const hasJobs = cell.total_jobs > 0;
              const hasCritical = cell.critical_count > 0;

              return (
                <div
                  key={cell.date}
                  onClick={() => handleOpenDayDeck(cell.date)}
                  style={{
                    borderRight: '1px solid var(--border-color, rgba(0,0,0,0.06))',
                    borderBottom: '1px solid var(--border-color, rgba(0,0,0,0.06))',
                    minHeight: '115px',
                    padding: '8px',
                    cursor: 'pointer',
                    background: isToday ? 'rgba(2, 132, 199, 0.04)' : 'transparent',
                    transition: 'background 0.15s ease',
                    position: 'relative',
                    minWidth: 0,
                    width: '100%',
                    boxSizing: 'border-box',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(2, 132, 199, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isToday ? 'rgba(2, 132, 199, 0.04)' : 'transparent';
                  }}
                >
                  {/* Cell Header: Day Number & Count Pill */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{
                      fontSize: '0.85rem',
                      fontWeight: isToday ? 800 : 600,
                      color: isToday ? '#0284c7' : 'var(--text-primary)',
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: isToday ? 'rgba(2, 132, 199, 0.18)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {cell.day_number}
                    </span>

                    {hasJobs && (
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '10px',
                        background: hasCritical ? '#dc2626' : 'rgba(2, 132, 199, 0.15)',
                        color: hasCritical ? '#fff' : '#0284c7',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}>
                        {cell.total_jobs} {cell.total_jobs === 1 ? 'Job' : 'Jobs'}
                      </span>
                    )}
                  </div>

                  {/* Event Snippets preview */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden', width: '100%', minWidth: 0 }}>
                    {cell.events?.slice(0, 3).map((ev) => {
                      const isEvDone = ['completed', 'passed', 'approved', 'closed', 'resolved', 'verified'].some(s => (ev.status || '').toLowerCase().includes(s));
                      
                      const bg = isEvDone ? 'rgba(16, 185, 129, 0.12)'
                               : ev.module === 'biomedical' ? 'rgba(2, 132, 199, 0.12)'
                               : ev.module === 'site_prep' ? 'rgba(234, 88, 12, 0.12)'
                               : 'rgba(225, 29, 72, 0.12)';
                      const fg = isEvDone ? '#059669'
                               : ev.module === 'biomedical' ? '#0284c7'
                               : ev.module === 'site_prep' ? '#ea580c'
                               : '#e11d48';

                      return (
                        <div
                          key={ev.id}
                          style={{
                            fontSize: '0.68rem',
                            lineHeight: '1.25',
                            padding: '3px 6px',
                            borderRadius: '4px',
                            background: bg,
                            color: fg,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontWeight: 600,
                            borderLeft: `3px solid ${isEvDone ? '#10b981' : fg}`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            width: '100%',
                            minWidth: 0,
                            boxSizing: 'border-box'
                          }}
                          title={`${ev.type} - ${ev.title} (${ev.location}) - Status: ${ev.status}`}
                        >
                          {isEvDone && (
                            <span
                              style={{
                                background: '#10b981',
                                color: '#ffffff',
                                borderRadius: '50%',
                                width: '12px',
                                height: '12px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '8.5px',
                                fontWeight: 900,
                                flexShrink: 0,
                                boxShadow: '0 1px 2px rgba(16, 185, 129, 0.3)'
                              }}
                              title="Completed & Verified"
                            >
                              ✓
                            </span>
                          )}
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>
                            {ev.title}
                          </span>
                        </div>
                      );
                    })}

                    {cell.events?.length > 3 && (
                      <div style={{
                        fontSize: '0.65rem',
                        color: 'var(--text-muted)',
                        fontWeight: 600,
                        textAlign: 'center',
                        padding: '1px 0',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        +{cell.events.length - 3} more tasks
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Calendar Bottom Legend & Recurrence Guide */}
      <div style={{
        marginTop: '1.25rem',
        padding: '1rem 1.25rem',
        background: 'var(--card-bg, #ffffff)',
        border: '1px solid var(--border-color, rgba(0,0,0,0.1))',
        borderRadius: '12px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        fontSize: '0.8rem',
        color: 'var(--text-muted)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Calendar Legend:</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#0284c7' }} />
            Biomedical PM / Tickets
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ea580c' }} />
            Site Readiness Audits & Civil Deficiencies
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#e11d48' }} />
            Housekeeping NHRA / WHO Disinfection
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#dc2626' }} />
            Critical Urgent SLA
          </span>
        </div>

        <div>
          <span>Click any calendar date to view the <strong>Day Task Deck</strong>, execute inspections, verify complaints, or generate certificates.</span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* DAY TASK DECK DRAWER / MODAL: "What All Complaints/Jobs has to Do Today" */}
      {/* ------------------------------------------------------------- */}
      {selectedDay && (
        <div className="modal-overlay" style={{ zIndex: 1250 }}>
          <div
            className="modal-content-card"
            style={{
              maxWidth: '920px',
              width: '95%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              padding: '0',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.75rem',
              borderBottom: '1px solid var(--border-color, rgba(0,0,0,0.1))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.06) 0%, rgba(236, 72, 153, 0.06) 100%)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CalendarIcon size={20} color="#0284c7" />
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    {dayTasksData?.formatted_date || selectedDay}
                  </h2>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Scheduled jobs, breakdown complaints, site audits and disinfection tasks due on this date.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  background: 'rgba(2, 132, 199, 0.15)',
                  color: '#0284c7'
                }}>
                  {dayTasksData?.total_tasks || 0} Total Tasks
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleCloseDayDeck}
                  style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Task Filter Pills */}
            <div style={{
              padding: '0.75rem 1.75rem',
              borderBottom: '1px solid var(--border-color, rgba(0,0,0,0.08))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--card-bg, #fff)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Status:</span>
                {['ALL', 'Pending', 'Action Required', 'Completed'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setDayTaskFilter(st)}
                    className={`btn btn-sm ${dayTaskFilter === st ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '14px' }}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Showing {filteredDayTasks.length} tasks
              </div>
            </div>

            {/* Scrollable Tasks List */}
            <div style={{ padding: '1.25rem 1.75rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {dayTasksLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  <RefreshCw size={24} className="spin" style={{ marginBottom: '8px' }} />
                  <div>Loading scheduled tasks for {selectedDay}...</div>
                </div>
              ) : filteredDayTasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  <CheckCircle2 size={36} color="#10b981" style={{ marginBottom: '8px' }} />
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    No Tasks Pending for this Date
                  </div>
                  <div style={{ fontSize: '0.85rem' }}>
                    All maintenance criteria, site inspections, and housekeeping protocols are clear.
                  </div>
                </div>
              ) : (
                filteredDayTasks.map((t) => {
                  const isDone = ['completed', 'passed', 'approved', 'closed', 'resolved', 'verified'].some(s => (t.status || '').toLowerCase().includes(s));
                  const isCritical = t.priority === 'Critical';

                  const badgeColor = t.module === 'biomedical' ? '#0284c7'
                                   : t.module === 'site_prep' ? '#ea580c'
                                   : '#e11d48';

                  return (
                    <div
                      key={t.id}
                      style={{
                        border: isDone ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid var(--border-color, rgba(0,0,0,0.12))',
                        borderRadius: '10px',
                        padding: '1rem 1.25rem',
                        background: isDone ? 'rgba(16, 185, 129, 0.04)' : 'var(--card-bg, #ffffff)',
                        borderLeft: isDone ? '4px solid #10b981' : (isCritical ? '4px solid #dc2626' : `4px solid ${badgeColor}`),
                        boxShadow: isDone ? '0 2px 8px rgba(16, 185, 129, 0.08)' : '0 2px 6px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}
                    >
                      {/* Row 1: Module & Status Badges */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: `${badgeColor}18`,
                            color: badgeColor
                          }}>
                            {t.module_name || t.module}
                          </span>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            ● {t.task_type}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: isCritical ? '#dc262622' : 'rgba(0,0,0,0.06)',
                            color: isCritical ? '#dc2626' : 'var(--text-muted)'
                          }}>
                            Priority: {t.priority}
                          </span>
                          {isDone ? (
                            <span style={{
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              padding: '2px 10px',
                              borderRadius: '12px',
                              background: '#10b98122',
                              color: '#059669',
                              border: '1px solid #10b98166',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}>
                              <span style={{
                                background: '#10b981',
                                color: '#fff',
                                borderRadius: '50%',
                                width: '13px',
                                height: '13px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '8.5px',
                                fontWeight: 900
                              }}>✓</span>
                              <span>Verified & Completed</span>
                            </span>
                          ) : (
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: '#f59e0b22',
                              color: '#d97706'
                            }}>
                              {t.status}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Row 2: Title, Subtitle & Location */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        {isDone && (
                          <div style={{
                            background: '#10b981',
                            color: '#ffffff',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 900,
                            flexShrink: 0,
                            marginTop: '2px',
                            boxShadow: '0 2px 5px rgba(16, 185, 129, 0.35)'
                          }} title="Task Completed & Verified">
                            ✓
                          </div>
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {t.title}
                          </div>
                          {t.subtitle && (
                            <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {t.subtitle}
                            </div>
                          )}
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '1rem' }}>
                            <span>📍 <strong>Location:</strong> {t.location}</span>
                            {t.assigned_to && <span>👤 <strong>Assignee:</strong> {t.assigned_to}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Row 3: Actions (Run Job, Mark Satisfied, Generate Certificate) */}
                      <div style={{
                        borderTop: '1px dashed var(--border-color, rgba(0,0,0,0.08))',
                        paddingTop: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {/* Run / Execute Runner */}
                          {t.module === 'biomedical' && (t.equipment_id || t.source_id) && (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-secondary"
                                onClick={() => {
                                  handleCloseDayDeck();
                                  if (onRunChecklist) {
                                    onRunChecklist({
                                      id: t.equipment_id || t.source_id,
                                      name: t.equipment_name || t.title,
                                      asset_id: t.asset_id || '',
                                      equipment_type_id: t.equipment_type_id || null,
                                      equipment_type_name: t.equipment_type_name || '',
                                      brand: t.brand || '',
                                      model_number: t.model_number || '',
                                      serial_number: t.serial_number || '',
                                      maintenance_schedule_type: t.maintenance_schedule_type || 'Quarterly'
                                    });
                                  }
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Play size={13} color="#0284c7" />
                                <span>Execute Checklist</span>
                              </button>

                              {/* Multi-Technician Phase Assignment */}
                              {onAssignPhases && (t.task_type?.includes('Preventive') || t.id.startsWith('BME-PM-')) && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-secondary"
                                  onClick={() => {
                                    handleCloseDayDeck();
                                    onAssignPhases({
                                      id: t.equipment_id || t.source_id,
                                      equipment_id: t.equipment_id || t.source_id,
                                      name: t.equipment_name || t.title,
                                      asset_id: t.asset_id || '',
                                      equipment_type_id: t.equipment_type_id || null,
                                      brand: t.brand || '',
                                      model_number: t.model_number || '',
                                      serial_number: t.serial_number || '',
                                      department_name: t.location
                                    }, selectedDay);
                                  }}
                                  style={{ borderColor: '#0284c7', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '4px' }}
                                  title="Assign 4 phases to different technicians & print worksheets"
                                >
                                  <Users size={13} />
                                  <span>Assign Techs</span>
                                </button>
                              )}

                              {/* Direct A4 Worksheet Printout */}
                              {onPrintWorksheet && (t.task_type?.includes('Preventive') || t.id.startsWith('BME-PM-')) && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-secondary"
                                  onClick={() => {
                                    handleCloseDayDeck();
                                    onPrintWorksheet({
                                      id: t.equipment_id || t.source_id,
                                      equipment_id: t.equipment_id || t.source_id,
                                      name: t.equipment_name || t.title,
                                      asset_id: t.asset_id || '',
                                      equipment_type_id: t.equipment_type_id || null,
                                      brand: t.brand || '',
                                      model_number: t.model_number || '',
                                      serial_number: t.serial_number || '',
                                      department_name: t.location
                                    }, selectedDay, 'ALL');
                                  }}
                                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                                  title="Print physical A4 paper worksheet for sterile room inspection"
                                >
                                  <Printer size={13} />
                                  <span>Print A4</span>
                                </button>
                              )}
                            </>
                          )}

                          {t.module === 'site_prep' && (
                            <>
                              {/* If task is a deficiency, allow opening the Deficiency Rectification modal */}
                              {(t.deficiency || t.deficiency_id) && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-secondary"
                                  onClick={() => {
                                    handleCloseDayDeck();
                                    if (onViewDeficiency) {
                                      onViewDeficiency(t.deficiency || {
                                        id: t.deficiency_id || t.source_id,
                                        deficiency_ticket: t.title?.split(':')[0] || 'DEF',
                                        title: t.title,
                                        priority: t.priority,
                                        status: t.status,
                                        inspection_id: t.inspection_id
                                      });
                                    }
                                  }}
                                  style={{ borderColor: '#ea580c', color: '#ea580c', display: 'flex', alignItems: 'center', gap: '4px' }}
                                  title="View and rectify this civil/MEP deficiency ticket"
                                >
                                  <AlertTriangle size={13} color="#ea580c" />
                                  <span>Rectify Deficiency</span>
                                </button>
                              )}

                              {/* Run / Open Site Audit: ALWAYS pass inspection_id, so the 130 checks load properly without 404 */}
                              {(t.inspection_id || (!t.deficiency_id && t.source_id)) && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-secondary"
                                  onClick={() => {
                                    handleCloseDayDeck();
                                    const inspId = t.inspection_id || t.source_id;
                                    if (onRunSiteAudit) onRunSiteAudit(inspId);
                                  }}
                                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                                  title="Open room readiness audit checklist"
                                >
                                  <Play size={13} color="#ea580c" />
                                  <span>Run Site Audit</span>
                                </button>
                              )}
                            </>
                          )}

                          {t.module === 'housekeeping' && t.source_id && (
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              onClick={() => {
                                handleCloseDayDeck();
                                if (onRunHkInspection) onRunHkInspection(t.source_id);
                              }}
                              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Play size={13} color="#e11d48" />
                              <span>Run HK Inspection</span>
                            </button>
                          )}

                          {/* Certificate view if already certified */}
                          {t.certificate_eligible && isDone && (
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              onClick={() => {
                                handleCloseDayDeck();
                                if (t.module === 'site_prep' && onViewSiteCertificate) {
                                  onViewSiteCertificate({ id: t.source_id });
                                } else if (t.module === 'housekeeping' && onViewHkCertificate) {
                                  onViewHkCertificate({ id: t.source_id });
                                }
                              }}
                              style={{ borderColor: '#10b981', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Award size={13} />
                              <span>View Certificate</span>
                            </button>
                          )}
                        </div>

                        {/* Mark Satisfied & Complete Button */}
                        <div>
                          {!isDone ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={() => setCompletingTask(t)}
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#059669', borderColor: '#059669' }}
                            >
                              <CheckSquare size={13} />
                              <span>Check & Mark Satisfied</span>
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 size={14} />
                              Verified & Closed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1rem 1.75rem',
              borderTop: '1px solid var(--border-color, rgba(0,0,0,0.1))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--card-bg, #fff)'
            }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Certified under Bahrain NHRA Healthcare Standards & WHO 2023 Guidelines
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleCloseDayDeck}
              >
                Close Deck
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TASK VERIFICATION & SATISFACTION SIGN-OFF DIALOG */}
      {/* ------------------------------------------------------------- */}
      {completingTask && (
        <div className="modal-overlay" style={{ zIndex: 1300 }}>
          <div
            className="modal-content-card"
            style={{
              maxWidth: '560px',
              width: '90%',
              padding: '1.75rem',
              borderRadius: '14px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <UserCheck size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Verify & Sign Off Job
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Confirm all complaint points and checklist specifications are satisfied.
                </span>
              </div>
            </div>

            <div style={{
              background: 'var(--bg-secondary, rgba(0,0,0,0.03))',
              border: '1px solid var(--border-color, rgba(0,0,0,0.08))',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              marginBottom: '1rem',
              fontSize: '0.85rem'
            }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{completingTask.title}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '2px' }}>
                Module: {completingTask.module_name || completingTask.module} | Location: {completingTask.location}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>
                Authorized Inspector / Supervisor Name:
              </label>
              <input
                type="text"
                className="form-control"
                value={signOffName}
                onChange={(e) => setSignOffName(e.target.value)}
                placeholder="e.g. Dr. Fatima Al-Doseri / Eng. Ahmed Mansoor"
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>
                Inspection Verification & Closure Notes:
              </label>
              <textarea
                className="form-control"
                rows={3}
                value={signOffNotes}
                onChange={(e) => setSignOffNotes(e.target.value)}
                placeholder="State resolution details, disinfection dilution checked, or mechanical tests completed..."
                required
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setCompletingTask(null)}
                disabled={submittingCompletion}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleConfirmTaskCompletion}
                disabled={submittingCompletion || !signOffName.trim()}
                style={{ background: '#059669', borderColor: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {submittingCompletion ? <RefreshCw size={14} className="spin" /> : <ShieldCheck size={15} />}
                <span>Mark Satisfied & Complete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
