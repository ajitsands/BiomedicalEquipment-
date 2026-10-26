import React, { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import { 
  fetchChecklistTemplates, 
  fetchEquipments, 
  fetchMaintenanceRecords 
} from '../services/api';
import { 
  CheckSquare, 
  ShieldCheck, 
  Clock, 
  Layers, 
  ChevronRight, 
  Play, 
  FileCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  UserCheck, 
  AlertOctagon, 
  Wrench, 
  Info,
  Zap,
  Award
} from 'lucide-react';

export default function ChecklistsView({
  onRunChecklist,
  onViewPassport,
  onShowToast,
  refreshKey = 0
}) {
  const [templates, setTemplates] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [records, setRecords] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateItems, setTemplateItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeTab, setActiveTab] = useState('templates'); // 'templates' or 'history'
  const [selectedPhase, setSelectedPhase] = useState('ALL'); // 'ALL' or specific phase

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tmplRes, eqRes, recRes] = await Promise.all([
        fetchChecklistTemplates(true),
        fetchEquipments(),
        fetchMaintenanceRecords()
      ]);
      setTemplates(tmplRes.data || []);
      setEquipments(eqRes.data || []);
      setRecords(recRes.data || []);

      if (tmplRes.data?.length > 0) {
        inspectTemplate(tmplRes.data[0].id);
      }
    } catch (err) {
      onShowToast({ type: 'error', title: 'Error', message: 'Failed to load checklists' });
    } finally {
      setLoading(false);
    }
  };

  const inspectTemplate = async (templateId) => {
    try {
      const res = await fetch(`/api/checklists.php?template_id=${templateId}`).then(r => r.json());
      setSelectedTemplate(res.template);
      setTemplateItems(res.items || []);
      setSelectedPhase('ALL');
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTemplates = templates.filter(t => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return (
      (t.equipment_type_name && t.equipment_type_name.toLowerCase().includes(q)) ||
      (t.asset_type_code && t.asset_type_code.toLowerCase().includes(q)) ||
      (t.department_scope && t.department_scope.toLowerCase().includes(q)) ||
      (t.equipment_category && t.equipment_category.toLowerCase().includes(q)) ||
      (t.risk_classification && t.risk_classification.toLowerCase().includes(q))
    );
  });

  // Group items dynamically across the 4 clinical phases
  const preUseItems = templateItems.filter(i => i.checklist_phase === 'User pre-use / routine check');
  const pmItems = templateItems.filter(i => 
    i.checklist_phase === 'Preventive maintenance / technical inspection' && 
    i.category !== 'Electrical Safety Test'
  );
  const electricalItems = templateItems.filter(i => 
    i.checklist_phase === 'Electrical Safety (IEC 62353)' || 
    i.category === 'Electrical Safety Test'
  );
  const correctiveItems = templateItems.filter(i => i.checklist_phase === 'Complaint / corrective maintenance');

  const displayedItems = (() => {
    if (selectedPhase === 'ALL') return templateItems;
    if (selectedPhase === 'PRE_USE' || selectedPhase === 'User pre-use / routine check') return preUseItems;
    if (selectedPhase === 'PM' || selectedPhase === 'Preventive maintenance / technical inspection') return pmItems;
    if (selectedPhase === 'ELECTRICAL' || selectedPhase === 'Electrical Safety (IEC 62353)') return electricalItems;
    if (selectedPhase === 'CORRECTIVE' || selectedPhase === 'Complaint / corrective maintenance') return correctiveItems;
    return templateItems;
  })();

  const totalProtocolsCount = templates.reduce((acc, t) => acc + (parseInt(t.total_items, 10) || 0), 0) || 2424;

  const historyColumns = [
    {
      id: 'work_order_no',
      header: 'Work Order #',
      accessor: 'work_order_no',
      render: (row) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-primary)' }}>
          {row.work_order_no}
        </span>
      )
    },
    {
      id: 'equipment',
      header: 'Equipment',
      accessor: 'equipment_name',
      render: (row) => (
        <div>
          <div 
            style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--color-primary)' }}
            onClick={() => onViewPassport(row.equipment_id)}
          >
            {row.equipment_name}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {row.asset_id} • SN: {row.serial_number}
          </div>
        </div>
      )
    },
    {
      id: 'maintenance_type',
      header: 'Procedure Type',
      accessor: 'maintenance_type'
    },
    {
      id: 'performed_date',
      header: 'Inspection Date',
      accessor: 'performed_date'
    },
    {
      id: 'performed_by',
      header: 'Biomedical Engineer',
      accessor: 'performed_by',
      render: (row) => (
        <div>
          <div>{row.performed_by}</div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>ID: {row.technician_badge}</div>
        </div>
      )
    },
    {
      id: 'overall_result',
      header: 'Certificate Result',
      accessor: 'overall_result',
      render: (row) => (
        <span className={`badge ${row.overall_result.includes('Passed') ? 'badge-success' : 'badge-danger'}`}>
          {row.overall_result}
        </span>
      )
    },
    {
      id: 'next_pm_due_date',
      header: 'Next PM Due',
      accessor: 'next_pm_due_date',
      render: (row) => (
        <strong style={{ color: 'var(--color-warning)' }}>
          {row.next_pm_due_date}
        </strong>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '22px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Biomedical Equipment Checklists & Maintenance Library</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            WHO Hospital Standards: 63 Equipment Masters • {totalProtocolsCount.toLocaleString()} Verified Checklist Protocols (WHO & IEC 62353)
          </p>
        </div>

        <div className="tabs-nav" style={{ marginBottom: 0, borderBottom: 'none' }}>
          <button
            className={`tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
            onClick={() => setActiveTab('templates')}
          >
            <ShieldCheck size={16} /> Standard Equipment Library (63)
          </button>
          <button
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <FileCheck size={16} /> Certified Maintenance Logs ({records.length})
          </button>
        </div>
      </div>

      {activeTab === 'templates' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '24px' }}>
          {/* Left: Template Catalog List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Search Box */}
            <div className="datatable-search-box" style={{ width: '100%' }}>
              <Search size={16} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="datatable-search-input"
                placeholder="Search 63 types (e.g. BM-001, Ventilator, ICU)..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0 4px' }}>
              <span>Showing {filteredTemplates.length} of 63 Equipment Types</span>
              <span>WHO & IEC 62353 Protocols</span>
            </div>

            <div style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredTemplates.map((t) => {
                const isSelected = selectedTemplate?.id === t.id;
                return (
                  <div
                    key={t.id}
                    className="card"
                    style={{
                      padding: '14px 16px',
                      cursor: 'pointer',
                      borderLeft: isSelected ? '4px solid var(--color-primary)' : '1px solid var(--border-color)',
                      backgroundColor: isSelected ? 'var(--color-primary-subtle)' : 'var(--bg-surface)',
                      transition: 'var(--transition-normal)'
                    }}
                    onClick={() => inspectTemplate(t.id)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', fontWeight: 700, color: 'var(--color-primary)', backgroundColor: 'var(--bg-subtle)', padding: '1px 6px', borderRadius: '4px' }}>
                          {t.asset_type_code || 'BM'}
                        </span>
                        <strong style={{ fontSize: '0.92rem', color: isSelected ? 'var(--color-primary)' : 'inherit' }}>
                          {t.equipment_type_name}
                        </strong>
                      </div>
                      <span className={`badge ${
                        t.risk_classification?.includes('Critical') ? 'badge-danger' : 
                        t.risk_classification?.includes('High') ? 'badge-warning' : 'badge-neutral'
                      }`} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                        {t.risk_classification?.split(' ')[0]}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Scope: {t.department_scope || t.equipment_category}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                      <span>Schedule: {t.default_pm_frequency || t.frequency || 'Quarterly'}</span>
                      <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                        {t.total_items || 37} Checklist Steps
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Selected Checklist Steps & Matching Devices */}
          <div>
            {selectedTemplate && (
              <div className="card" style={{ padding: '24px' }}>
                {/* Header Information */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.85rem', color: '#ffffff', backgroundColor: 'var(--color-primary)', padding: '2px 8px', borderRadius: '4px' }}>
                        {selectedTemplate.asset_type_code || 'WHO-SPEC'}
                      </span>
                      <span className="badge badge-info">
                        WHO Medical Device Technical Series
                      </span>
                      <span className="badge badge-danger">
                        {selectedTemplate.risk_classification}
                      </span>
                      {selectedTemplate.default_protection_class && (
                        <span className="badge badge-primary" style={{ fontSize: '0.74rem' }}>
                          Safety: {selectedTemplate.default_protection_class}
                        </span>
                      )}
                      {selectedTemplate.default_applied_part_type && selectedTemplate.default_applied_part_type !== 'None' && (
                        <span className={`badge ${selectedTemplate.default_applied_part_type === 'CF' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '0.74rem' }}>
                          Type {selectedTemplate.default_applied_part_type} Patient Contact
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{selectedTemplate.equipment_type_name}</h3>
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Department Scope: <strong>{selectedTemplate.department_scope}</strong> • Planning Schedule: <strong>{selectedTemplate.suggested_pm_schedule}</strong>
                    </div>
                  </div>

                  {/* Pick active equipment to run checklist */}
                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Execute on Hospital Unit:
                    </label>
                    <select
                      className="form-control"
                      style={{ width: '220px', fontSize: '0.84rem' }}
                      onChange={(e) => {
                        const eqId = Number(e.target.value);
                        if (eqId) {
                          const eq = equipments.find(item => item.id === eqId);
                          if (eq) onRunChecklist(eq);
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>Select Equipment...</option>
                      {equipments
                        .filter(e => e.equipment_type_id === selectedTemplate.equipment_type_id)
                        .map(e => (
                          <option key={e.id} value={e.id}>
                            {e.name} ({e.asset_id}) {e.pm_draft_id ? `• In-Progress (${e.pm_draft_progress_percent}%)` : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Common Complaints & Clinical Guidance Strip */}
                {selectedTemplate.common_complaints && (
                  <div style={{ 
                    backgroundColor: 'var(--bg-subtle)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: 'var(--radius-md)', 
                    padding: '12px 16px', 
                    marginBottom: '20px',
                    fontSize: '0.82rem'
                  }}>
                    <div style={{ color: 'var(--color-danger)', fontWeight: 700, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertOctagon size={15} /> Typical Clinical Complaints / Fault Symptoms:
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>
                      {selectedTemplate.common_complaints}
                    </div>
                  </div>
                )}

                {/* Phase Filter Tabs */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${selectedPhase === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setSelectedPhase('ALL')}
                  >
                    All Steps ({templateItems.length})
                  </button>

                  <button
                    type="button"
                    className={`btn btn-sm ${selectedPhase === 'PRE_USE' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setSelectedPhase('PRE_USE')}
                  >
                    <UserCheck size={14} /> Phase 1: User Pre-Use ({preUseItems.length})
                  </button>

                  <button
                    type="button"
                    className={`btn btn-sm ${selectedPhase === 'PM' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setSelectedPhase('PM')}
                  >
                    <ShieldCheck size={14} /> Phase 2: Technical PM ({pmItems.length})
                  </button>

                  <button
                    type="button"
                    className={`btn btn-sm ${selectedPhase === 'ELECTRICAL' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setSelectedPhase('ELECTRICAL')}
                    style={selectedPhase === 'ELECTRICAL' ? {
                      backgroundColor: '#0284c7',
                      borderColor: '#0284c7',
                      color: '#fff'
                    } : {
                      backgroundColor: 'rgba(2, 132, 199, 0.08)',
                      borderColor: 'rgba(2, 132, 199, 0.35)',
                      color: '#0284c7',
                      fontWeight: 600
                    }}
                  >
                    <Zap size={14} /> Electrical Safety: IEC 62353 ({electricalItems.length})
                  </button>

                  <button
                    type="button"
                    className={`btn btn-sm ${selectedPhase === 'CORRECTIVE' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setSelectedPhase('CORRECTIVE')}
                  >
                    <Wrench size={14} /> Phase 3: Breakdown Corrective ({correctiveItems.length})
                  </button>
                </div>

                {/* Checklist Inspection Steps */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {displayedItems.map((step) => (
                    <div 
                      key={step.id} 
                      style={{ 
                        padding: '14px 16px', 
                        borderRadius: 'var(--radius-md)', 
                        border: '1px solid var(--border-color)', 
                        backgroundColor: 'var(--bg-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <span style={{ 
                            fontWeight: 700, 
                            color: 'var(--color-primary)', 
                            fontSize: '0.8rem',
                            backgroundColor: 'var(--color-primary-subtle)',
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {step.step_number}
                          </span>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                              {step.title}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              Phase: <strong>{step.checklist_phase}</strong> • Category: <strong>{step.category}</strong>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {step.category === 'Electrical Safety Test' && (
                            <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>
                              IEC 62353
                            </span>
                          )}
                          {step.check_type === 'numeric' ? (
                            <span className="badge badge-primary" style={{ fontSize: '0.74rem', flexShrink: 0 }}>
                              Tolerance: {step.min_value !== null ? step.min_value : '0'} to {step.max_value !== null ? step.max_value : 'Max'} {step.unit || ''}
                            </span>
                          ) : (
                            <span className="badge badge-neutral" style={{ fontSize: '0.74rem', flexShrink: 0 }}>
                              {step.result_options || 'Pass / Fail / N/A'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expected Result / Acceptance Criteria */}
                      {step.expected_result && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '32px' }}>
                          <strong>Acceptance Standard:</strong> {step.expected_result}
                        </div>
                      )}

                      {/* Role & Failure Action Bar */}
                      <div style={{ 
                        marginLeft: '32px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        flexWrap: 'wrap', 
                        gap: '8px', 
                        fontSize: '0.76rem', 
                        color: 'var(--text-muted)',
                        borderTop: '1px solid var(--border-color-subtle)',
                        paddingTop: '6px',
                        marginTop: '4px'
                      }}>
                        <div>Responsible: <strong style={{ color: 'var(--text-secondary)' }}>{step.responsible_role}</strong> ({step.suggested_timing})</div>
                        {step.failure_action && (
                          <div style={{ color: 'var(--color-danger)' }}>
                            <strong>Failure Action:</strong> {step.failure_action}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* History of Executed Maintenance Logs */
        <DataTable
          columns={historyColumns}
          data={records}
          keyField="id"
          searchPlaceholder="Search maintenance work orders, technicians, or equipment..."
          defaultPageSize={10}
          exportTitle="Maintenance_Execution_Logs"
        />
      )}
    </div>
  );
}
