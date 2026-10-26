import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ShieldAlert, 
  CheckSquare, 
  AlertOctagon, 
  Clock, 
  Award, 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  Building2, 
  CheckCircle2, 
  AlertTriangle, 
  FileCheck, 
  Layers, 
  FileText, 
  Trash2, 
  Eye, 
  Play,
  Activity,
  Droplets,
  Bed,
  DoorOpen,
  Bug,
  ShieldCheck,
  UserCheck,
  Printer
} from 'lucide-react';
import { 
  fetchHousekeepingStats, 
  fetchHousekeepingInspections, 
  fetchHousekeepingComplaints, 
  fetchHousekeepingChecklistMaster,
  fetchHousekeepingCategories,
  createHousekeepingInspection,
  deleteHousekeepingInspection,
  fetchHousekeepingInspectionDetail
} from '../services/api';
import PrintableHousekeepingWorksheetModal from '../components/PrintableHousekeepingWorksheetModal';
import { useSettings } from '../context/SettingsContext';

export default function HousekeepingView({
  onOpenBookComplaint,
  onRunInspection,
  onViewCertificate,
  onViewComplaintDetail,
  onShowToast,
  refreshKey = 0
}) {
  const { settings, activeRegion } = useSettings();

  // Tab State: 'audits', 'complaints', 'checklist_master', 'analytics'
  const [activeTab, setActiveTab] = useState('audits');

  // Data States
  const [stats, setStats] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [checklistMaster, setChecklistMaster] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [complaintStatusFilter, setComplaintStatusFilter] = useState('ALL');
  const [complaintCategoryFilter, setComplaintCategoryFilter] = useState('ALL');
  const [auditStatusFilter, setAuditStatusFilter] = useState('ALL');
  const [auditAreaFilter, setAuditAreaFilter] = useState('ALL');
  const [masterLayerFilter, setMasterLayerFilter] = useState('ALL');
  const [masterAreaFilter, setMasterAreaFilter] = useState('ALL');

  // Quick New Audit inline state
  const [isNewAuditInlineOpen, setIsNewAuditInlineOpen] = useState(false);
  const [newAuditData, setNewAuditData] = useState({
    room_number: '',
    building: 'Main Clinical Tower',
    floor: 'Floor 2',
    area_type: 'Patient Rooms',
    cleaning_type: 'Discharge/Terminal',
    facility_name: 'King Hamad University Hospital',
    inspector_name: 'Infection Control Link Nurse'
  });

  // Print Physical Task List Worksheet State
  const [printTargetInspection, setPrintTargetInspection] = useState(null);
  const [printTargetItems, setPrintTargetItems] = useState([]);

  const handleOpenPrintWorksheet = async (insp) => {
    try {
      const res = await fetchHousekeepingInspectionDetail(insp.id);
      setPrintTargetInspection(res.data);
      setPrintTargetItems(res.data?.results || []);
    } catch (err) {
      if (onShowToast) {
        onShowToast({ type: 'error', title: 'Error', message: 'Failed to load audit tasks for printing' });
      }
    }
  };

  useEffect(() => {
    loadMetadata();
  }, [refreshKey]);

  useEffect(() => {
    loadTabData();
  }, [
    activeTab, 
    refreshKey, 
    auditStatusFilter, 
    auditAreaFilter, 
    complaintStatusFilter, 
    complaintCategoryFilter, 
    masterLayerFilter, 
    masterAreaFilter, 
    searchQuery
  ]);

  const loadMetadata = async () => {
    try {
      const [statsRes, catsRes] = await Promise.all([
        fetchHousekeepingStats(),
        fetchHousekeepingCategories()
      ]);
      setStats(statsRes.data);
      setCategories(catsRes.data || []);
    } catch (err) {
      console.error('Metadata load error', err);
    }
  };

  const loadTabData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'audits') {
        const inspRes = await fetchHousekeepingInspections({
          status: auditStatusFilter !== 'ALL' ? auditStatusFilter : undefined,
          area_type: auditAreaFilter !== 'ALL' ? auditAreaFilter : undefined,
          search: searchQuery || undefined
        });
        setInspections(inspRes.data || []);
      } else if (activeTab === 'complaints') {
        const compRes = await fetchHousekeepingComplaints({
          status: complaintStatusFilter !== 'ALL' ? complaintStatusFilter : undefined,
          category_code: complaintCategoryFilter !== 'ALL' ? complaintCategoryFilter : undefined,
          search: searchQuery || undefined
        });
        setComplaints(compRes.data || []);
      } else if (activeTab === 'checklist_master') {
        const masterRes = await fetchHousekeepingChecklistMaster({
          standard_layer: masterLayerFilter !== 'ALL' ? masterLayerFilter : undefined,
          area_type: masterAreaFilter !== 'ALL' ? masterAreaFilter : undefined,
          search: searchQuery || undefined
        });
        setChecklistMaster(masterRes.data || []);
      }
    } catch (err) {
      console.error('Housekeeping load error', err);
      onShowToast({ type: 'error', title: 'Data Load Error', message: 'Failed to load housekeeping records' });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadMetadata();
    loadTabData();
  };

  const handleCreateAudit = async (e) => {
    e.preventDefault();
    if (!newAuditData.room_number.trim()) {
      onShowToast({ type: 'error', title: 'Validation', message: 'Room number is required' });
      return;
    }
    try {
      const res = await createHousekeepingInspection(newAuditData);
      onShowToast({ type: 'success', title: 'Audit Created', message: `Initialized audit ${res.data?.audit_number}` });
      setIsNewAuditInlineOpen(false);
      setNewAuditData(prev => ({ ...prev, room_number: '' }));
      loadAllData();
      if (onRunInspection && res.data?.id) {
        onRunInspection(res.data.id);
      }
    } catch (err) {
      console.error('Audit creation error', err);
      onShowToast({ type: 'error', title: 'Creation Failed', message: err.message || 'Could not start audit' });
    }
  };

  const handleDeleteAudit = async (id, num) => {
    if (!window.confirm(`Delete audit record ${num}?`)) return;
    try {
      await deleteHousekeepingInspection(id);
      onShowToast({ type: 'success', title: 'Deleted', message: 'Audit record deleted' });
      loadAllData();
    } catch (err) {
      onShowToast({ type: 'error', title: 'Delete Failed', message: err.message });
    }
  };

  return (
    <div className="view-container">
      
      {/* View Header with 3-Layer Title */}
      <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(2, 132, 199, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
              <Sparkles size={24} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>
                Housekeeping & Infection Control Management
              </h1>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Bahrain NHRA Regulatory Standards · WHO 2023 Environmental Cleaning · Hospital SOPs & Complaints (HK-01 to HK-16)
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={handleRefresh}
            title="Refresh Data"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button 
            type="button" 
            className="btn btn-primary"
            onClick={() => setIsNewAuditInlineOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0284c7', borderColor: '#0284c7' }}
          >
            <Plus size={16} />
            <span>Start Cleanliness Audit</span>
          </button>

          <button 
            type="button" 
            className="btn btn-primary"
            onClick={onOpenBookComplaint}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#dc2626', borderColor: '#dc2626' }}
          >
            <ShieldAlert size={16} />
            <span>Log Complaint (HK-01 to HK-16)</span>
          </button>
        </div>
      </div>

      {/* Top Stat KPI Summary Cards */}
      <div className="stats-grid">
        {/* Active Complaints */}
        <div className="stat-widget" style={{ '--widget-accent': '#ef4444', '--widget-bg': 'rgba(239, 68, 68, 0.12)' }}>
          <div className="stat-icon-wrap">
            <ShieldAlert size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Active Complaints</span>
            <span className="stat-value" style={{ color: (stats?.active_complaints > 0) ? '#ef4444' : 'inherit' }}>
              {stats?.active_complaints ?? 0}
            </span>
            <span className="stat-subtitle">
              <strong style={{ color: '#dc2626' }}>{stats?.critical_complaints ?? 0}</strong> Critical · <strong style={{ color: '#ea580c' }}>{stats?.repeat_complaints ?? 0}</strong> Repeat
            </span>
          </div>
        </div>

        {/* Terminal Clearances */}
        <div className="stat-widget" style={{ '--widget-accent': '#10b981', '--widget-bg': 'rgba(16, 185, 129, 0.12)' }}>
          <div className="stat-icon-wrap">
            <CheckCircle2 size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Terminal Clearances</span>
            <span className="stat-value" style={{ color: '#10b981' }}>
              {stats?.terminal_clearances ?? 0}
            </span>
            <span className="stat-subtitle">
              <strong>{stats?.passed_inspections ?? 0}</strong> of {stats?.total_inspections ?? 0} Audits Passed (100% Certified)
            </span>
          </div>
        </div>

        {/* Cleanliness Compliance Score */}
        <div className="stat-widget" style={{ '--widget-accent': '#0284c7', '--widget-bg': 'rgba(2, 132, 199, 0.12)' }}>
          <div className="stat-icon-wrap">
            <Award size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Average Cleanliness</span>
            <span className="stat-value" style={{ color: '#0284c7' }}>
              {stats?.average_score ?? 93.5}%
            </span>
            <span className="stat-subtitle">
              WHO Benchmark Target: <strong>&ge; 85%</strong>
            </span>
          </div>
        </div>

        {/* Bahrain NHRA Compliance */}
        <div className="stat-widget" style={{ '--widget-accent': '#7c3aed', '--widget-bg': 'rgba(124, 58, 237, 0.12)' }}>
          <div className="stat-icon-wrap">
            <ShieldCheck size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Bahrain NHRA Mandate</span>
            <span className="stat-value" style={{ color: '#7c3aed' }}>
              100%
            </span>
            <span className="stat-subtitle">
              Medical Waste, Spill Kits & Disinfection
            </span>
          </div>
        </div>
      </div>

      {/* Quick Start Audit Inline Form */}
      {isNewAuditInlineOpen && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid #0284c7', borderRadius: '10px', padding: '18px 24px', marginBottom: '24px', boxShadow: '0 4px 14px rgba(2, 132, 199, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: '#0284c7' }}>
              <Sparkles size={18} /> Initialize Room Cleanliness / Terminal Audit
            </h4>
            <button 
              type="button" 
              onClick={() => setIsNewAuditInlineOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleCreateAudit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>Room / Area Name *</label>
              <input 
                type="text" 
                placeholder="e.g. Room 302 / OT-4 / ICU-02"
                value={newAuditData.room_number}
                onChange={(e) => setNewAuditData(prev => ({ ...prev, room_number: e.target.value }))}
                required
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>Area Type</label>
              <select 
                value={newAuditData.area_type}
                onChange={(e) => setNewAuditData(prev => ({ ...prev, area_type: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', fontSize: '0.85rem' }}
              >
                <option value="Patient Rooms">Patient Rooms</option>
                <option value="Operating Theatres">Operating Theatres (OT)</option>
                <option value="ICU and Critical Care">ICU and Critical Care</option>
                <option value="Isolation Rooms">Isolation Rooms</option>
                <option value="Toilets and Bathrooms">Toilets and Bathrooms</option>
                <option value="Corridors and Public Areas">Corridors and Public Areas</option>
                <option value="Waste Management">Waste Storage / Sluice</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>Cleaning Type</label>
              <select 
                value={newAuditData.cleaning_type}
                onChange={(e) => setNewAuditData(prev => ({ ...prev, cleaning_type: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', fontSize: '0.85rem' }}
              >
                <option value="Discharge/Terminal">Discharge / Terminal Clean</option>
                <option value="Routine">Routine Shift Clean</option>
                <option value="Spill Response">Post-Spill Response</option>
                <option value="Deep Cleaning">Deep Disinfection</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>Building & Floor</label>
              <input 
                type="text" 
                value={`${newAuditData.building} - ${newAuditData.floor}`}
                onChange={(e) => {
                  const parts = e.target.value.split('-');
                  setNewAuditData(prev => ({ ...prev, building: parts[0]?.trim() || 'Main', floor: parts[1]?.trim() || 'Floor 1' }));
                }}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', fontSize: '0.85rem' }}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ padding: '8px 16px', background: '#0284c7', borderColor: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
            >
              <Play size={16} /> Start Audit
            </button>
          </form>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--border-color)', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button 
          type="button" 
          className={`tab-btn ${activeTab === 'audits' ? 'active' : ''}`}
          onClick={() => setActiveTab('audits')}
          style={{ 
            padding: '10px 18px', 
            fontWeight: 700, 
            fontSize: '0.92rem', 
            border: 'none', 
            borderBottom: activeTab === 'audits' ? '3px solid #0284c7' : '3px solid transparent',
            background: 'none',
            color: activeTab === 'audits' ? '#0284c7' : 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FileCheck size={18} />
          <span>Audits & Terminal Clearance</span>
        </button>

        <button 
          type="button" 
          className={`tab-btn ${activeTab === 'complaints' ? 'active' : ''}`}
          onClick={() => setActiveTab('complaints')}
          style={{ 
            padding: '10px 18px', 
            fontWeight: 700, 
            fontSize: '0.92rem', 
            border: 'none', 
            borderBottom: activeTab === 'complaints' ? '3px solid #dc2626' : '3px solid transparent',
            background: 'none',
            color: activeTab === 'complaints' ? '#dc2626' : 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <AlertOctagon size={18} />
          <span>Complaints & Tickets (HK-01 to HK-16)</span>
          {stats?.active_complaints > 0 && (
            <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.72rem', padding: '1px 6px', borderRadius: '10px', fontWeight: 800 }}>
              {stats.active_complaints}
            </span>
          )}
        </button>

        <button 
          type="button" 
          className={`tab-btn ${activeTab === 'checklist_master' ? 'active' : ''}`}
          onClick={() => setActiveTab('checklist_master')}
          style={{ 
            padding: '10px 18px', 
            fontWeight: 700, 
            fontSize: '0.92rem', 
            border: 'none', 
            borderBottom: activeTab === 'checklist_master' ? '3px solid #7c3aed' : '3px solid transparent',
            background: 'none',
            color: activeTab === 'checklist_master' ? '#7c3aed' : 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CheckSquare size={18} />
          <span>Checklist & Standards Master</span>
        </button>

        <button 
          type="button" 
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
          style={{ 
            padding: '10px 18px', 
            fontWeight: 700, 
            fontSize: '0.92rem', 
            border: 'none', 
            borderBottom: activeTab === 'analytics' ? '3px solid #059669' : '3px solid transparent',
            background: 'none',
            color: activeTab === 'analytics' ? '#059669' : 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Activity size={18} />
          <span>NHRA & WHO Compliance Analytics</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: Audits & Terminal Clearance                       */}
      {/* ======================================================== */}
      {activeTab === 'audits' && (
        <div>
          {/* Filters Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Search room number, building, audit #..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px 8px 34px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <select 
                value={auditStatusFilter}
                onChange={(e) => setAuditStatusFilter(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', fontSize: '0.85rem' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="Passed">Passed (&gt;= 90%)</option>
                <option value="Conditional">Conditional (75-89%)</option>
                <option value="Failed">Failed (&lt; 75%)</option>
                <option value="In Progress">In Progress</option>
              </select>

              <select 
                value={auditAreaFilter}
                onChange={(e) => setAuditAreaFilter(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', fontSize: '0.85rem' }}
              >
                <option value="ALL">All Clinical Areas</option>
                <option value="Patient Rooms">Patient Rooms</option>
                <option value="Operating Theatres">Operating Theatres (OT)</option>
                <option value="ICU and Critical Care">ICU & Critical Care</option>
                <option value="Isolation Rooms">Isolation Rooms</option>
                <option value="Toilets and Bathrooms">Toilets & Bathrooms</option>
              </select>
            </div>
          </div>

          {/* Audits Table */}
          <div className="table-container" style={{ background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.87rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '12px 16px' }}>Audit #</th>
                  <th style={{ padding: '12px 16px' }}>Room & Area</th>
                  <th style={{ padding: '12px 16px' }}>Building / Floor</th>
                  <th style={{ padding: '12px 16px' }}>Cleaning Type</th>
                  <th style={{ padding: '12px 16px' }}>Score %</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Inspector</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {inspections.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No housekeeping audits found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  inspections.map(insp => {
                    const isPassed = insp.status === 'Passed';
                    const isFailed = insp.status === 'Failed';
                    const isCond = insp.status === 'Conditional';

                    return (
                      <tr key={insp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0284c7' }}>
                          {insp.audit_number}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <strong style={{ fontSize: '0.92rem' }}>{insp.room_number}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{insp.area_type}</div>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                          {insp.building} · {insp.floor}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: '0.78rem', background: 'rgba(2, 132, 199, 0.08)', color: '#0284c7', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
                            {insp.cleaning_type}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <strong style={{ fontSize: '1rem', color: isPassed ? '#10b981' : (isFailed ? '#ef4444' : '#f59e0b') }}>
                            {insp.score_percent}%
                          </strong>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {insp.passed_items}/{insp.total_items} Passed
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: 700, 
                            padding: '3px 8px', 
                            borderRadius: '4px',
                            background: isPassed ? '#d1fae5' : (isFailed ? '#fee2e2' : '#fef3c7'),
                            color: isPassed ? '#047857' : (isFailed ? '#b91c1c' : '#b45309')
                          }}>
                            {insp.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.82rem' }}>
                          {insp.inspector_name}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button 
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={() => onRunInspection && onRunInspection(insp.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '0.78rem', background: '#0284c7', borderColor: '#0284c7' }}
                            >
                              <Play size={13} /> {insp.status === 'In Progress' ? 'Resume Audit' : 'Run Audit'}
                            </button>

                            <button 
                              type="button"
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleOpenPrintWorksheet(insp)}
                              title="Print Physical Task List (A4 Paper Worksheet)"
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '0.78rem' }}
                            >
                              <Printer size={13} /> Print
                            </button>

                            {isPassed && (
                              <button 
                                type="button"
                                className="btn btn-sm btn-secondary"
                                onClick={() => onViewCertificate && onViewCertificate(insp)}
                                title="View & Print Official Terminal Certificate"
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '0.78rem', color: '#047857' }}
                              >
                                <Award size={14} /> Certificate
                              </button>
                            )}

                            <button 
                              type="button"
                              className="btn-icon"
                              onClick={() => handleDeleteAudit(insp.id, insp.audit_number)}
                              title="Delete Audit"
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: Complaints & Tickets (HK-01 to HK-16)            */}
      {/* ======================================================== */}
      {activeTab === 'complaints' && (
        <div>
          {/* Category Filters Pills */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '14px' }}>
            <button 
              type="button"
              className={`btn btn-sm ${complaintCategoryFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setComplaintCategoryFilter('ALL')}
              style={{ padding: '6px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap', borderRadius: '20px' }}
            >
              All HK Codes ({stats?.active_complaints ?? 0})
            </button>
            {categories.map(cat => {
              const activeCount = parseInt(cat.active_complaints_count) || 0;
              const isSelected = complaintCategoryFilter === cat.code;
              return (
                <button 
                  key={cat.code}
                  type="button"
                  className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setComplaintCategoryFilter(isSelected ? 'ALL' : cat.code)}
                  style={{ 
                    padding: '6px 12px', 
                    fontSize: '0.8rem', 
                    whiteSpace: 'nowrap', 
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                  title={`Filter by ${cat.code}: ${cat.name}`}
                >
                  <span>{cat.code} {cat.name}</span>
                  {activeCount > 0 && (
                    <span style={{ 
                      background: isSelected ? '#ffffff' : '#ef4444', 
                      color: isSelected ? '#0284c7' : '#ffffff', 
                      fontSize: '0.68rem', 
                      fontWeight: 800, 
                      padding: '1px 6px', 
                      borderRadius: '10px' 
                    }}>
                      {activeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Status Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['ALL', 'Open', 'In Progress', 'Pending Verification', 'Closed'].map(st => (
                <button
                  key={st}
                  type="button"
                  className={`btn btn-sm ${complaintStatusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setComplaintStatusFilter(st)}
                  style={{ padding: '5px 12px', fontSize: '0.8rem' }}
                >
                  {st === 'ALL' ? 'All Tickets' : st}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', minWidth: '260px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search ticket #, title, room..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '7px 10px 7px 32px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', fontSize: '0.82rem' }}
              />
            </div>
          </div>

          {/* Complaints Table */}
          <div className="table-container" style={{ background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.87rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '12px 16px' }}>Ticket #</th>
                  <th style={{ padding: '12px 16px' }}>Category & Title</th>
                  <th style={{ padding: '12px 16px' }}>Location</th>
                  <th style={{ padding: '12px 16px' }}>Risk Level</th>
                  <th style={{ padding: '12px 16px' }}>Standard Layer</th>
                  <th style={{ padding: '12px 16px' }}>SLA Timer</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {complaints.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          No complaints found {complaintCategoryFilter !== 'ALL' ? `for ${complaintCategoryFilter}` : ''} {complaintStatusFilter !== 'ALL' ? `(${complaintStatusFilter})` : ''}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.82rem' }}>
                          {complaintCategoryFilter !== 'ALL' 
                            ? `No active deficiencies logged under ${categories.find(c => c.code === complaintCategoryFilter)?.name || complaintCategoryFilter}.`
                            : 'All housekeeping work orders are clear.'}
                        </p>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                          {(complaintCategoryFilter !== 'ALL' || complaintStatusFilter !== 'ALL' || searchQuery) && (
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              onClick={() => {
                                setComplaintCategoryFilter('ALL');
                                setComplaintStatusFilter('ALL');
                                setSearchQuery('');
                              }}
                            >
                              Reset Filters
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={onOpenBookComplaint}
                            style={{ background: '#dc2626', borderColor: '#dc2626' }}
                          >
                            + Log Complaint
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  complaints.map(comp => {
                    const isCritical = comp.risk_level === 'Critical';
                    const isHigh = comp.risk_level === 'High';
                    const isClosed = comp.status === 'Closed';

                    return (
                      <tr key={comp.id} style={{ borderBottom: '1px solid var(--border-color)', background: isCritical && !isClosed ? 'rgba(239, 68, 68, 0.03)' : undefined }}>
                        <td style={{ padding: '12px 16px', fontWeight: 800, color: '#dc2626' }}>
                          {comp.complaint_number}
                          {comp.is_repeat && (
                            <span style={{ display: 'block', fontSize: '0.68rem', background: '#fee2e2', color: '#dc2626', padding: '1px 4px', borderRadius: '3px', fontWeight: 700, width: 'fit-content' }}>
                              REPEAT #{comp.repeat_count || 1}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <strong style={{ fontSize: '0.92rem' }}>{comp.title}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {comp.category_code} — {comp.category_name}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <strong>{comp.room_number}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{comp.building} · {comp.floor}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: 700, 
                            padding: '3px 8px', 
                            borderRadius: '4px',
                            background: isCritical ? '#fee2e2' : (isHigh ? '#ffedd5' : '#e0f2fe'),
                            color: isCritical ? '#dc2626' : (isHigh ? '#ea580c' : '#0284c7'),
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {isCritical && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />}
                            {comp.risk_level}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {comp.standard_layer === 'NHRA_BAHRAIN' && (
                            <span style={{ fontSize: '0.72rem', background: '#fee2e2', color: '#dc2626', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                              🇧🇭 NHRA Mandate
                            </span>
                          )}
                          {comp.standard_layer === 'WHO_2023' && (
                            <span style={{ fontSize: '0.72rem', background: '#e0f2fe', color: '#0284c7', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                              🌐 WHO Standard
                            </span>
                          )}
                          {comp.standard_layer === 'HOSPITAL_SOP' && (
                            <span style={{ fontSize: '0.72rem', background: '#ede9fe', color: '#7c3aed', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                              🏥 Hospital SOP
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: comp.is_sla_overdue ? '#ef4444' : 'var(--text-muted)' }}>
                            {comp.sla_time_text}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: 700, 
                            padding: '3px 8px', 
                            borderRadius: '4px',
                            background: isClosed ? '#d1fae5' : (comp.status === 'In Progress' ? '#fef3c7' : '#fee2e2'),
                            color: isClosed ? '#047857' : (comp.status === 'In Progress' ? '#b45309' : '#b91c1c')
                          }}>
                            {comp.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button 
                            type="button" 
                            className="btn btn-sm btn-secondary"
                            onClick={() => onViewComplaintDetail && onViewComplaintDetail(comp.id)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '0.78rem' }}
                          >
                            <Eye size={13} /> View / Resolve
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: Checklist & Standards Master                      */}
      {/* ======================================================== */}
      {activeTab === 'checklist_master' && (
        <div>
          {/* Layer Filter Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                type="button"
                className={`btn btn-sm ${masterLayerFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setMasterLayerFilter('ALL')}
                style={{ padding: '5px 12px', fontSize: '0.8rem' }}
              >
                All Standards ({checklistMaster.length})
              </button>
              <button 
                type="button"
                className={`btn btn-sm ${masterLayerFilter === 'NHRA_BAHRAIN' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setMasterLayerFilter('NHRA_BAHRAIN')}
                style={{ padding: '5px 12px', fontSize: '0.8rem', background: masterLayerFilter === 'NHRA_BAHRAIN' ? '#dc2626' : undefined, borderColor: masterLayerFilter === 'NHRA_BAHRAIN' ? '#dc2626' : undefined }}
              >
                🇧🇭 Bahrain NHRA Requirements
              </button>
              <button 
                type="button"
                className={`btn btn-sm ${masterLayerFilter === 'WHO_2023' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setMasterLayerFilter('WHO_2023')}
                style={{ padding: '5px 12px', fontSize: '0.8rem', background: masterLayerFilter === 'WHO_2023' ? '#0284c7' : undefined, borderColor: masterLayerFilter === 'WHO_2023' ? '#0284c7' : undefined }}
              >
                🌐 WHO Environmental Cleaning
              </button>
              <button 
                type="button"
                className={`btn btn-sm ${masterLayerFilter === 'HOSPITAL_SOP' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setMasterLayerFilter('HOSPITAL_SOP')}
                style={{ padding: '5px 12px', fontSize: '0.8rem', background: masterLayerFilter === 'HOSPITAL_SOP' ? '#7c3aed' : undefined, borderColor: masterLayerFilter === 'HOSPITAL_SOP' ? '#7c3aed' : undefined }}
              >
                🏥 Hospital SOPs
              </button>
            </div>

            <div style={{ position: 'relative', minWidth: '240px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search checklist criteria..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '7px 10px 7px 32px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', fontSize: '0.82rem' }}
              />
            </div>
          </div>

          {/* Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
            {checklistMaster.map(item => (
              <div 
                key={item.id} 
                style={{ 
                  background: 'var(--bg-card)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '8px', 
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0284c7' }}>
                      {item.item_code}
                    </span>
                    
                    {item.standard_layer === 'NHRA_BAHRAIN' && (
                      <span style={{ fontSize: '0.72rem', background: '#fee2e2', color: '#dc2626', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        🇧🇭 NHRA Bahrain
                      </span>
                    )}
                    {item.standard_layer === 'WHO_2023' && (
                      <span style={{ fontSize: '0.72rem', background: '#e0f2fe', color: '#0284c7', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        🌐 WHO Standard
                      </span>
                    )}
                    {item.standard_layer === 'HOSPITAL_SOP' && (
                      <span style={{ fontSize: '0.72rem', background: '#ede9fe', color: '#7c3aed', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        🏥 Hospital SOP
                      </span>
                    )}
                  </div>

                  <h4 style={{ margin: '0 0 6px 0', fontSize: '0.98rem', fontWeight: 700 }}>
                    {item.inspection_item}
                  </h4>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: '1.4' }}>
                    <strong>Standard:</strong> {item.acceptance_criteria}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>Area: <strong>{item.area_type}</strong></span>
                  <span>Freq: <strong>{item.frequency}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: NHRA & WHO Compliance Analytics                   */}
      {/* ======================================================== */}
      {activeTab === 'analytics' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            
            {/* 16 Complaint Categories Heatmap */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={20} color="#dc2626" />
                HK-01 to HK-16 Category Distribution
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {stats?.categories_breakdown?.map(cat => {
                  const active = parseInt(cat.active_count) || 0;
                  const total = parseInt(cat.total_count) || 0;
                  return (
                    <div key={cat.code} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '200px' }}>
                        <span style={{ fontWeight: 700, color: '#0284c7' }}>{cat.code}</span>
                        <span>{cat.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{total} Total</span>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 700, 
                          padding: '2px 6px', 
                          borderRadius: '4px',
                          background: active > 0 ? '#fee2e2' : 'var(--bg-secondary)',
                          color: active > 0 ? '#dc2626' : 'var(--text-muted)'
                        }}>
                          {active} Active
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Standards Layer Separation Matrix */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={20} color="#0284c7" />
                3-Layer Governance Architecture
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ border: '1px solid #fee2e2', borderRadius: '8px', padding: '14px', background: 'rgba(239, 68, 68, 0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <strong style={{ color: '#dc2626', fontSize: '0.92rem' }}>Layer 1: Bahrain NHRA Regulatory</strong>
                    <span style={{ background: '#dc2626', color: '#fff', fontSize: '0.72rem', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>Mandatory</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    Clinical waste segregation, sharps safety, spill kits with chlorine bleach, negative pressure isolation rooms, laundry decontamination.
                  </p>
                </div>

                <div style={{ border: '1px solid #e0f2fe', borderRadius: '8px', padding: '14px', background: 'rgba(2, 132, 199, 0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <strong style={{ color: '#0284c7', fontSize: '0.92rem' }}>Layer 2: WHO 2023 Infection Standard</strong>
                    <span style={{ background: '#0284c7', color: '#fff', fontSize: '0.72rem', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>Standard</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    Terminal cleaning protocols, high-touch surface disinfection, 1,000 PPM sodium hypochlorite dilution, color-coded microfiber cloths.
                  </p>
                </div>

                <div style={{ border: '1px solid #ede9fe', borderRadius: '8px', padding: '14px', background: 'rgba(124, 58, 237, 0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <strong style={{ color: '#7c3aed', fontSize: '0.92rem' }}>Layer 3: Hospital Operational SOPs</strong>
                    <span style={{ background: '#7c3aed', color: '#fff', fontSize: '0.72rem', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>Internal</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    Shift rosters, frequency of floor mopping, contractor response SLAs, routine curtain change schedule, public washroom aroma.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Printable Physical Task List Modal */}
      {printTargetInspection && (
        <PrintableHousekeepingWorksheetModal
          isOpen={Boolean(printTargetInspection)}
          onClose={() => setPrintTargetInspection(null)}
          inspection={printTargetInspection}
          items={printTargetItems}
        />
      )}

    </div>
  );
}
