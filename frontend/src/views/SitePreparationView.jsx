import React, { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import { 
  fetchSiteInspections, 
  fetchSiteCategories, 
  fetchSiteDeficiencies, 
  fetchSiteComplianceProfiles,
  fetchSiteMasterItems
} from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { 
  Building2, 
  CheckSquare, 
  AlertOctagon, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Eye, 
  Award, 
  Globe, 
  Search, 
  Filter, 
  ShieldCheck, 
  Wrench, 
  FileText, 
  Sparkles,
  Maximize2,
  Zap,
  Thermometer,
  Wind,
  Droplets,
  Network,
  Radio,
  FileCheck2,
  AlertTriangle,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export default function SitePreparationView({
  onOpenNewAudit,
  onRunAudit,
  onViewDeficiency,
  onViewCertificate,
  onShowToast
}) {
  const { formatDate } = useSettings();
  const [activeTab, setActiveTab] = useState('audits'); // 'audits' | 'deficiencies' | 'regulatory' | 'master_130'
  const [selectedCountry, setSelectedCountry] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Data states
  const [inspections, setInspections] = useState([]);
  const [categories, setCategories] = useState([]);
  const [deficiencies, setDeficiencies] = useState([]);
  const [regulatoryProfiles, setRegulatoryProfiles] = useState([]);
  const [masterItems, setMasterItems] = useState([]);
  const [selectedCategoryCode, setSelectedCategoryCode] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedCountry, statusFilter, activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [inspRes, catRes, defRes, regRes] = await Promise.all([
        fetchSiteInspections({ country: selectedCountry, status: statusFilter }),
        fetchSiteCategories(),
        fetchSiteDeficiencies({ country: selectedCountry }),
        fetchSiteComplianceProfiles()
      ]);

      setInspections(inspRes.data || []);
      setCategories(catRes.data || []);
      setDeficiencies(defRes.data || []);
      setRegulatoryProfiles(regRes.data || []);

      if (activeTab === 'master_130' && masterItems.length === 0) {
        const masterRes = await fetchSiteMasterItems();
        setMasterItems(masterRes.data || []);
      }
    } catch (err) {
      if (onShowToast) onShowToast({ type: 'error', title: 'Data Load Error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // KPI Computations
  const totalAudits = inspections.length;
  const approvedAudits = inspections.filter(i => i.overall_status === 'Approved & Ready for Delivery').length;
  const remediationRequired = inspections.filter(i => i.overall_status === 'Remediation Required').length;
  const openDeficienciesCount = deficiencies.filter(d => d.status !== 'Closed after verification').length;
  const criticalDefectsCount = deficiencies.filter(d => d.priority === 'Critical' && d.status !== 'Closed after verification').length;

  return (
    <div className="view-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* View Header with Version 2.0 Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284c7 0%, #d946ef 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <Building2 size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  Site Preparation & Hospital Commissioning Master
                </h2>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #0284c7 0%, #10b981 100%)',
                  color: '#ffffff',
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}>
                  VERSION 2.0
                </span>
              </div>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Standardized 130-Point Pre-Installation Audit, Readiness Scoring & Deficiency Punch-List for Saudi Arabia, Bahrain, UAE, Qatar, Oman, Kuwait & India
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onOpenNewAudit}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} />
            <span>Initiate Site Audit</span>
          </button>
        </div>
      </div>

      {/* Top Stat KPI Summary Cards */}
      <div className="stats-grid">
        <div className="stat-widget" style={{ '--widget-accent': '#0284c7', '--widget-bg': 'var(--color-primary-subtle)' }}>
          <div className="stat-icon-wrap">
            <Building2 size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Site Preparation Audits</span>
            <span className="stat-value">{totalAudits}</span>
            <span className="stat-subtitle">Hospital rooms under assessment</span>
          </div>
        </div>

        <div className="stat-widget" style={{ '--widget-accent': '#10b981', '--widget-bg': 'var(--color-success-subtle)' }}>
          <div className="stat-icon-wrap">
            <Award size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Approved & Ready for Delivery</span>
            <span className="stat-value">{approvedAudits}</span>
            <span className="stat-subtitle">Certified ≥ 95% readiness score</span>
          </div>
        </div>

        <div className="stat-widget" style={{ '--widget-accent': '#f59e0b', '--widget-bg': 'var(--color-warning-subtle)' }}>
          <div className="stat-icon-wrap">
            <Wrench size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Remediation Required / Blocked</span>
            <span className="stat-value">{remediationRequired}</span>
            <span className="stat-subtitle">Contractor actions underway</span>
          </div>
        </div>

        <div className="stat-widget" style={{ '--widget-accent': '#ec4899', '--widget-bg': 'rgba(236, 72, 153, 0.1)' }}>
          <div className="stat-icon-wrap">
            <AlertOctagon size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Open Site Deficiencies</span>
            <span className="stat-value">{openDeficienciesCount}</span>
            <span className="stat-subtitle">Punch-list items across 18 categories</span>
          </div>
        </div>

        <div className="stat-widget" style={{ '--widget-accent': '#dc2626', '--widget-bg': 'rgba(220, 38, 38, 0.1)' }}>
          <div className="stat-icon-wrap">
            <AlertTriangle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Critical Safety Hazards</span>
            <span className="stat-value" style={{ color: criticalDefectsCount > 0 ? '#dc2626' : 'inherit' }}>
              {criticalDefectsCount}
            </span>
            <span className="stat-subtitle">
              {criticalDefectsCount > 0 ? 'Blocks equipment delivery' : 'Zero life-safety blocks'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--border-color)', paddingBottom: '4px', flexWrap: 'wrap', gap: '12px' }}>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'audits' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('audits')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Building2 size={15} />
            <span>Room Readiness Audits ({inspections.length})</span>
          </button>

          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'deficiencies' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('deficiencies')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <AlertOctagon size={15} />
            <span>Deficiency Punch-List ({deficiencies.length})</span>
          </button>

          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'regulatory' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('regulatory')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Globe size={15} />
            <span>GCC & India Regulatory Guidelines</span>
          </button>

          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'master_130' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('master_130')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <CheckSquare size={15} />
            <span>130-Point Checklist Library</span>
          </button>
        </div>

        {/* Country Quick Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Country Profile:</label>
          <select
            className="form-control form-control-sm"
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            style={{ width: 'auto', fontWeight: 600 }}
          >
            <option value="ALL">🌐 All GCC & India</option>
            <option value="SA">🇸🇦 Saudi Arabia (MOH / SFDA)</option>
            <option value="BH">🇧🇭 Bahrain (NHRA)</option>
            <option value="AE">🇦🇪 United Arab Emirates (MOHAP / DHA)</option>
            <option value="QA">🇶🇦 Qatar (MOPH)</option>
            <option value="OM">🇴🇲 Oman (MOH)</option>
            <option value="KW">🇰🇼 Kuwait (MOH)</option>
            <option value="IN">🇮🇳 India (AERB / NABH)</option>
          </select>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: Room Readiness Audits & Inspections */}
      {/* ======================================================== */}
      {activeTab === 'audits' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {inspections.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
              <Building2 size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>No Site Audits Found</h3>
              <p style={{ fontSize: '0.84rem', maxWidth: '420px', margin: '6px auto 16px auto' }}>
                There are no active site preparation audits logged for this selection. Initiate a new audit to evaluate room readiness against the 130 standardized checks.
              </p>
              <button type="button" className="btn btn-primary btn-sm" onClick={onOpenNewAudit}>
                + Initiate Site Audit
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
              {inspections.map(insp => {
                const readiness = Number(insp.readiness_percentage || 0);
                const isApproved = insp.overall_status === 'Approved & Ready for Delivery';
                const isRemediation = insp.overall_status === 'Remediation Required';
                const hasCritical = Number(insp.critical_deficiencies_count) > 0;

                return (
                  <div 
                    key={insp.id}
                    className="card"
                    style={{
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      borderLeft: isApproved ? '4px solid #10b981' : isRemediation ? '4px solid #dc2626' : '4px solid #0284c7',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                    }}
                  >
                    {/* Header: Audit Reference & Country */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.3rem' }}>{insp.country_flag || '🌐'}</span>
                        <div>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.88rem', color: 'var(--color-primary)' }}>
                            {insp.audit_number}
                          </span>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            {insp.country_name} • {insp.regulatory_authority?.split(' ')[0] || 'MOH'}
                          </div>
                        </div>
                      </div>

                      <span className={`badge ${
                        isApproved ? 'badge-success' : 
                        isRemediation ? 'badge-danger' : 
                        insp.overall_status === 'Conditional Clearance' ? 'badge-warning' : 'badge-neutral'
                      }`} style={{ fontSize: '0.72rem' }}>
                        {insp.overall_status}
                      </span>
                    </div>

                    {/* Room & Target Medical Equipment */}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                        {insp.room_number} — {insp.facility_name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {insp.department_name} • {insp.building} ({insp.floor})
                      </div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--color-primary)', marginTop: '6px' }}>
                        🎯 {insp.target_model}
                      </div>
                    </div>

                    {/* Readiness Progress Bar */}
                    <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '10px 12px', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 600 }}>Site Readiness Score</span>
                        <strong style={{ color: readiness >= 95 ? '#059669' : readiness >= 75 ? '#d97706' : '#dc2626' }}>
                          {readiness.toFixed(1)}%
                        </strong>
                      </div>
                      
                      <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${readiness}%`,
                          height: '100%',
                          backgroundColor: readiness >= 95 ? '#10b981' : readiness >= 75 ? '#f59e0b' : '#ef4444',
                          transition: 'width 0.4s ease'
                        }} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                        <span>Open Deficiencies: <strong style={{ color: insp.open_deficiencies_count > 0 ? 'var(--color-danger)' : 'inherit' }}>{insp.open_deficiencies_count}</strong></span>
                        {hasCritical && (
                          <span style={{ color: '#dc2626', fontWeight: 700 }}>⚠️ {insp.critical_deficiencies_count} Critical</span>
                        )}
                      </div>
                    </div>

                    {/* Key Stakeholders & Delivery Target */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      <div>BioMed: <strong>{insp.lead_biomedical_engineer}</strong></div>
                      <div>Target Install: <strong>{formatDate(insp.target_installation_date)}</strong></div>
                    </div>

                    {/* Card Actions */}
                    <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '4px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => onRunAudit(insp.id)}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <CheckSquare size={14} />
                        <span>Run 130-Point Audit</span>
                      </button>

                      {isApproved && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => onViewCertificate(insp)}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                          title="View Official Site Clearance Certificate"
                        >
                          <Award size={14} />
                          <span>Certificate</span>
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: Deficiencies Punch-List */}
      {/* ======================================================== */}
      {activeTab === 'deficiencies' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Category Filter Pills */}
          <div style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--border-color)'
          }}>
            <button
              type="button"
              className={`btn btn-sm ${selectedCategoryCode === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedCategoryCode('ALL')}
            >
              All Categories ({deficiencies.length})
            </button>
            {categories.map(c => (
              <button
                key={c.code}
                type="button"
                className={`btn btn-sm ${selectedCategoryCode === c.code ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedCategoryCode(c.code)}
                style={{ whiteSpace: 'nowrap' }}
              >
                {c.code}: {c.name.split(' ')[0]} ({c.active_deficiencies_count || 0})
              </button>
            ))}
          </div>

          {/* Deficiencies Table */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Ticket / Item</th>
                  <th>Category & Department</th>
                  <th>Deficiency Description & Rectification Plan</th>
                  <th>Priority</th>
                  <th>Assigned Contractor</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {deficiencies
                  .filter(d => selectedCategoryCode === 'ALL' || d.category_code === selectedCategoryCode)
                  .map(def => {
                    const isClosed = def.status === 'Closed after verification';
                    const isCritical = def.priority === 'Critical';

                    return (
                      <tr key={def.id} style={{ opacity: isClosed ? 0.6 : 1 }}>
                        <td>
                          <div style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary)' }}>
                            {def.deficiency_ticket}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            {def.item_code} • {def.audit_number}
                          </div>
                        </td>

                        <td>
                          <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                            {def.category_code}
                          </span>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {def.assigned_department}
                          </div>
                        </td>

                        <td>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: isCritical ? 'var(--color-danger)' : 'var(--text-main)' }}>
                            {def.title}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px', maxWidth: '450px' }}>
                            {def.description}
                          </div>
                          {def.corrective_action_plan && (
                            <div style={{ fontSize: '0.74rem', color: 'var(--color-primary)', marginTop: '4px', fontStyle: 'italic' }}>
                              Plan: {def.corrective_action_plan}
                            </div>
                          )}
                        </td>

                        <td>
                          <span className={`badge ${
                            def.priority === 'Critical' ? 'badge-danger' : 
                            def.priority === 'High' ? 'badge-warning' : 'badge-neutral'
                          }`}>
                            {def.priority}
                          </span>
                        </td>

                        <td>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{def.contractor_assigned || 'Unassigned'}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Due: {formatDate(def.due_date)}</div>
                        </td>

                        <td>
                          <span className={`badge ${
                            isClosed ? 'badge-success' : 
                            def.status === 'In progress' ? 'badge-purple' : 
                            def.status === 'Awaiting verification' ? 'badge-warning' : 'badge-danger'
                          }`}>
                            {def.status}
                          </span>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => onViewDeficiency(def)}
                          >
                            Update
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: GCC & India Country Regulatory Compliance Frameworks */}
      {/* ======================================================== */}
      {activeTab === 'regulatory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            BioTrack CMMS maintains active country regulatory compliance profiles across the GCC and India. Selecting a country dynamically tailors building utility codes, radiation licenses, and official commissioning standards:
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '18px' }}>
            {regulatoryProfiles.map(prof => (
              <div 
                key={prof.country_code}
                className="card"
                style={{
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  borderTop: '3px solid var(--color-primary)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '2rem' }}>{prof.flag}</span>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>{prof.country_name}</h3>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Code: {prof.country_code}</span>
                    </div>
                  </div>

                  {prof.guidelines_url && (
                    <a
                      href={prof.guidelines_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-icon btn-sm"
                      title="Visit Official Regulatory Portal"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Competent Authority
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--color-primary)', marginTop: '2px' }}>
                    {prof.regulatory_authority}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Primary Standard Reference Document
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {prof.primary_standard_doc}
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '10px 12px', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-main)' }}>Key Commissioning Mandates:</strong>
                  <p style={{ margin: '4px 0 0 0', lineHeight: 1.4 }}>
                    {prof.key_mandates}
                  </p>
                </div>

                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                  Sign-off Authority: <strong>{prof.commissioning_authority}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: 130-Point Master Checklist Library */}
      {/* ======================================================== */}
      {activeTab === 'master_130' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Complete standardized library of all <strong>130 Pre-Installation Inspection Checks</strong> across 18 specialized categories:
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search checklist (e.g. Earth, Quench, RO, Chilled)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '260px' }}
              />
            </div>
          </div>

          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Category</th>
                  <th>Deficiency Title & Inspection Question</th>
                  <th>Responsible Dept</th>
                  <th>Specialist Focus</th>
                  <th>Default Priority</th>
                  <th>Standard Tolerance & Evidence</th>
                </tr>
              </thead>
              <tbody>
                {masterItems
                  .filter(m => {
                    if (!searchQuery) return true;
                    const q = searchQuery.toLowerCase();
                    return m.item_code.toLowerCase().includes(q) || 
                           m.deficiency_title.toLowerCase().includes(q) || 
                           m.inspection_question.toLowerCase().includes(q) ||
                           m.responsible_department.toLowerCase().includes(q);
                  })
                  .map(m => (
                    <tr key={m.id}>
                      <td>
                        <strong style={{ fontFamily: 'monospace', color: 'var(--color-primary)' }}>
                          {m.item_code}
                        </strong>
                      </td>
                      <td>
                        <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                          {m.category_code}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                          {m.deficiency_title}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px', maxWidth: '420px' }}>
                          {m.inspection_question}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem' }}>{m.responsible_department}</span>
                      </td>
                      <td>
                        <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
                          {m.specialist_department}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          m.default_priority === 'Critical' ? 'badge-danger' : 
                          m.default_priority === 'High' ? 'badge-warning' : 'badge-neutral'
                        }`}>
                          {m.default_priority}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>{m.standard_tolerance}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>{m.evidence_required}</div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
