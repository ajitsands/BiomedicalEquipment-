import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { fetchSiteInspectionDetail, saveSiteInspectionItems, approveSiteHandover } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { 
  Building2, 
  CheckSquare, 
  AlertOctagon, 
  CheckCircle2, 
  Clock, 
  Save, 
  RefreshCw, 
  Award,
  Layers,
  MapPin,
  Calendar,
  Sparkles,
  ChevronRight,
  Filter,
  Check,
  X,
  AlertTriangle,
  FileCheck2,
  HelpCircle,
  Maximize2,
  Anchor,
  Zap,
  BatteryCharging,
  Thermometer,
  Wind,
  Droplets,
  Network,
  Radio,
  Magnet,
  Wrench,
  ShieldAlert,
  Truck,
  FileText,
  Edit3
} from 'lucide-react';

export default function SiteInspectionRunnerModal({
  isOpen,
  onClose,
  inspectionId,
  onSuccess,
  onShowToast,
  onOpenCertificate,
  onOpenEditAudit
}) {
  const { formatDate } = useSettings();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [auditData, setAuditData] = useState(null);
  const [items, setItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [filterResult, setFilterResult] = useState('ALL');
  const [localEvaluations, setLocalEvaluations] = useState({});

  useEffect(() => {
    if (isOpen && inspectionId) {
      loadAudit();
    }
  }, [isOpen, inspectionId]);

  const loadAudit = async () => {
    try {
      setLoading(true);
      const res = await fetchSiteInspectionDetail(inspectionId);
      if (res && res.data) {
        setAuditData(res.data.inspection);
        setItems(res.data.items || []);

        // Initialize local evaluations map
        const map = {};
        (res.data.items || []).forEach(it => {
          map[it.checklist_item_id] = {
            checklist_item_id: it.checklist_item_id,
            result: it.result || 'Pending',
            measured_value: it.measured_value || '',
            inspector_remarks: it.inspector_remarks || ''
          };
        });
        setLocalEvaluations(map);
      }
    } catch (err) {
      if (onShowToast) onShowToast({ type: 'error', title: 'Load Error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Handle result button click for an item
  const handleSetResult = (itemId, result) => {
    setLocalEvaluations(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        result
      }
    }));
  };

  const handleSetMeasured = (itemId, measured_value) => {
    setLocalEvaluations(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        measured_value
      }
    }));
  };

  const handleSetRemarks = (itemId, inspector_remarks) => {
    setLocalEvaluations(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        inspector_remarks
      }
    }));
  };

  // Live Score Calculation
  const totalItemsCount = items.length;
  let passedCount = 0;
  let failedCount = 0;
  let pendingCount = 0;
  let naCount = 0;
  let criticalFailures = 0;

  items.forEach(it => {
    const ev = localEvaluations[it.checklist_item_id] || {};
    const res = ev.result || 'Pending';
    if (res === 'Pass') passedCount++;
    else if (res === 'Fail') {
      failedCount++;
      if (it.default_priority === 'Critical') criticalFailures++;
    } else if (res === 'N/A') naCount++;
    else pendingCount++;
  });

  const applicableTotal = totalItemsCount - naCount;
  const liveReadinessScore = applicableTotal > 0 ? ((passedCount / applicableTotal) * 100).toFixed(1) : '0.0';

  // Group items by category for tab counts
  const categoriesList = [
    { code: 'ALL', name: 'All 18 Categories (130 Checks)' },
    { code: 'SP-01', name: 'SP-01: Room & Civil Works' },
    { code: 'SP-02', name: 'SP-02: Structural & Floor' },
    { code: 'SP-03', name: 'SP-03: Electrical & Ground' },
    { code: 'SP-04', name: 'SP-04: UPS & Emergency' },
    { code: 'SP-05', name: 'SP-05: HVAC & Climate' },
    { code: 'SP-06', name: 'SP-06: Medical Gases & Vac' },
    { code: 'SP-07', name: 'SP-07: Water & Drainage' },
    { code: 'SP-08', name: 'SP-08: IT, LAN & PACS' },
    { code: 'SP-09', name: 'SP-09: Infection Control' },
    { code: 'SP-10', name: 'SP-10: Radiation Shielding' },
    { code: 'SP-11', name: 'SP-11: MRI Shielding & Quench' },
    { code: 'SP-12', name: 'SP-12: Mounting Provisions' },
    { code: 'SP-13', name: 'SP-13: Fire & Life Safety' },
    { code: 'SP-14', name: 'SP-14: Delivery & Logistics' },
    { code: 'SP-15', name: 'SP-15: Documentation & OEM' },
    { code: 'SP-16', name: 'SP-16: Commissioning & PQ' },
    { code: 'SP-17', name: 'SP-17: Specialist Utilities' },
    { code: 'SP-18', name: 'SP-18: Final Handover Approval' }
  ];

  // Filter items
  const filteredItems = items.filter(it => {
    const ev = localEvaluations[it.checklist_item_id] || {};
    const res = ev.result || 'Pending';
    if (activeCategory !== 'ALL' && it.category_code !== activeCategory) return false;
    if (filterResult !== 'ALL' && res !== filterResult) return false;
    return true;
  });

  // Bulk pass all visible/filtered pending items
  const handlePassAllVisible = () => {
    const updated = { ...localEvaluations };
    let count = 0;
    filteredItems.forEach(item => {
      const current = updated[item.checklist_item_id] || {};
      if (current.result === 'Pending' || !current.result) {
        updated[item.checklist_item_id] = {
          ...current,
          checklist_item_id: item.checklist_item_id,
          result: 'Pass',
          measured_value: current.measured_value || 'Compliant',
          inspector_remarks: current.inspector_remarks || 'Inspection verified per pre-installation engineering protocol.'
        };
        count++;
      }
    });
    setLocalEvaluations(updated);
    if (onShowToast) {
      onShowToast({
        type: 'info',
        title: 'Bulk Evaluation Updated',
        message: `Marked ${count} pending checks in "${activeCategory === 'ALL' ? 'All Categories' : activeCategory}" as Pass. Click "Save Progress" to commit.`
      });
    }
  };

  // Save evaluations
  const handleSaveEvaluations = async () => {
    setSubmitting(true);
    try {
      const payload = {
        inspection_id: inspectionId,
        items: Object.values(localEvaluations)
      };
      const res = await saveSiteInspectionItems(payload);
      if (onShowToast) {
        onShowToast({
          type: 'success',
          title: 'Evaluations Saved',
          message: res.message || 'Readiness score updated successfully.'
        });
      }
      if (onSuccess) onSuccess();
      loadAudit();
    } catch (err) {
      if (onShowToast) {
        onShowToast({
          type: 'error',
          title: 'Save Failed',
          message: err.message
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Issue Certificate
  const handleApproveClearance = async () => {
    if (criticalFailures > 0) {
      if (onShowToast) onShowToast({ type: 'error', title: 'Action Blocked', message: 'Critical safety deficiencies must be resolved before issuing clearance.' });
      return;
    }
    if (!window.confirm(`Issue official Site Readiness Certificate for ${auditData?.room_number} with readiness score of ${liveReadinessScore}%?`)) {
      return;
    }

    setSubmitting(true);
    try {
      // First save any unsaved evaluations
      await saveSiteInspectionItems({
        inspection_id: inspectionId,
        items: Object.values(localEvaluations)
      });

      const res = await approveSiteHandover({
        inspection_id: inspectionId,
        biomedical_engineer_signature: auditData?.lead_biomedical_engineer || 'Lead Biomedical Engineer',
        facilities_director_signature: 'Director of Hospital Facilities & MEP',
        vendor_pm_signature: auditData?.vendor_project_manager || 'Vendor Project Director',
        hospital_director_signature: 'Commissioning Committee Chair'
      });

      if (onShowToast) {
        onShowToast({
          type: 'success',
          title: 'Certificate Issued!',
          message: res.message || 'Delivery dispatch clearance granted.'
        });
      }
      if (onSuccess) onSuccess();
      if (onOpenCertificate && auditData) {
        onOpenCertificate(auditData);
      }
      onClose();
    } catch (err) {
      if (onShowToast) {
        onShowToast({
          type: 'error',
          title: 'Approval Failed',
          message: err.message
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Site Readiness Audit: ${auditData?.audit_number || 'Loading...'}`}
      subtitle={`${auditData?.country_flag || ''} ${auditData?.facility_name || ''} • Room: ${auditData?.room_number || ''} • Equipment: ${auditData?.target_model || ''}`}
      icon={Building2}
      size="xl"
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px auto' }} />
          <div>Loading 130 standardized pre-installation questions & audit state...</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Top Live Progress KPI Card */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)',
            border: '1px solid rgba(2, 132, 199, 0.25)',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                Live Readiness Score
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: Number(liveReadinessScore) >= 95 ? '#059669' : Number(liveReadinessScore) >= 75 ? '#d97706' : '#dc2626' }}>
                {liveReadinessScore}%
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {passedCount} Passed of {applicableTotal} Applicable Checks
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center', backgroundColor: 'var(--bg-card)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#059669' }}>{passedCount}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Passed</div>
              </div>
              <div style={{ textAlign: 'center', backgroundColor: 'var(--bg-card)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#dc2626' }}>{failedCount}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Deficiencies</div>
              </div>
              <div style={{ textAlign: 'center', backgroundColor: 'var(--bg-card)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#d97706' }}>{pendingCount}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Pending</div>
              </div>
              <div style={{ textAlign: 'center', backgroundColor: 'var(--bg-card)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#64748b' }}>{naCount}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>N/A</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
              {criticalFailures > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dc2626', fontWeight: 700, fontSize: '0.82rem' }}>
                  <ShieldAlert size={16} />
                  <span>{criticalFailures} Critical Safety Defects (Blocks Clearance)</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669', fontWeight: 600, fontSize: '0.82rem' }}>
                  <CheckCircle2 size={16} />
                  <span>Zero Critical Safety Deficiencies</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {onOpenEditAudit && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => onOpenEditAudit(auditData)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    title="Edit Facility Name, Room, Model, or Engineers"
                  >
                    <Edit3 size={14} />
                    <span>Edit Info</span>
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handlePassAllVisible}
                  disabled={submitting}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  title="Mark all currently visible pending questions as Pass"
                >
                  <CheckCircle2 size={14} color="#10b981" />
                  <span>Pass All Visible</span>
                </button>

                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleSaveEvaluations}
                  disabled={submitting}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {submitting ? <RefreshCw size={14} className="spin" /> : <Save size={14} />}
                  <span>Save Progress</span>
                </button>

                {Number(liveReadinessScore) >= 95 && criticalFailures === 0 && (
                  <button
                    type="button"
                    className="btn btn-success btn-sm"
                    onClick={handleApproveClearance}
                    disabled={submitting}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                  >
                    <Award size={14} />
                    <span>Approve & Issue Certificate</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Category Tabs Strip */}
          <div style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--border-color)'
          }}>
            {categoriesList.map(cat => {
              const isActive = activeCategory === cat.code;
              return (
                <button
                  key={cat.code}
                  type="button"
                  onClick={() => setActiveCategory(cat.code)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.78rem',
                    fontWeight: isActive ? 700 : 500,
                    borderRadius: '20px',
                    border: isActive ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                    backgroundColor: isActive ? 'var(--color-primary)' : 'var(--bg-card)',
                    color: isActive ? '#ffffff' : 'var(--text-main)',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>

          {/* Quick Result Filter Pills */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              Showing <strong>{filteredItems.length}</strong> of 130 standardized checklist questions:
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              {['ALL', 'Pending', 'Pass', 'Fail', 'N/A'].map(filter => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setFilterResult(filter)}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.74rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: filterResult === filter ? 'var(--color-primary-subtle)' : 'transparent',
                    color: filterResult === filter ? 'var(--color-primary)' : 'var(--text-muted)',
                    fontWeight: filterResult === filter ? 700 : 500,
                    cursor: 'pointer'
                  }}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Checklist Items List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '55vh', overflowY: 'auto', paddingRight: '6px' }}>
            {filteredItems.map((item, idx) => {
              const ev = localEvaluations[item.checklist_item_id] || { result: 'Pending', measured_value: '', inspector_remarks: '' };
              const isCritical = item.default_priority === 'Critical';
              const isFail = ev.result === 'Fail';
              const isPass = ev.result === 'Pass';

              return (
                <div
                  key={item.checklist_item_id}
                  style={{
                    backgroundColor: isFail ? 'rgba(239, 68, 68, 0.05)' : isPass ? 'rgba(16, 185, 129, 0.03)' : 'var(--bg-card)',
                    border: isFail ? '1px solid rgba(239, 68, 68, 0.4)' : isPass ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  {/* Item Header & Question */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <span style={{
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        backgroundColor: 'var(--bg-subtle)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        color: 'var(--color-primary)',
                        whiteSpace: 'nowrap'
                      }}>
                        {item.item_code}
                      </span>

                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: isFail ? 'var(--color-danger)' : 'var(--text-main)' }}>
                          {item.deficiency_title}
                        </div>
                        <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {item.inspection_question}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Dept: <strong>{item.responsible_department}</strong> • Standard: <em>{item.standard_tolerance || 'Per OEM'}</em>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`badge ${
                        item.default_priority === 'Critical' ? 'badge-danger' : 
                        item.default_priority === 'High' ? 'badge-warning' : 'badge-neutral'
                      }`} style={{ fontSize: '0.72rem' }}>
                        {item.default_priority}
                      </span>
                    </div>
                  </div>

                  {/* Input & Quick Result Evaluation Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', borderTop: '1px dashed var(--border-color)', paddingTop: '8px' }}>
                    
                    {/* Measurement / Tolerance Input */}
                    <div style={{ display: 'flex', gap: '8px', flex: 1, maxWidth: '400px' }}>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Measured value (e.g. 0.28 Ω, 20.5 °C)"
                        value={ev.measured_value}
                        onChange={(e) => handleSetMeasured(item.checklist_item_id, e.target.value)}
                        style={{ fontSize: '0.78rem' }}
                      />
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Remarks / Contractor notes"
                        value={ev.inspector_remarks}
                        onChange={(e) => handleSetRemarks(item.checklist_item_id, e.target.value)}
                        style={{ fontSize: '0.78rem' }}
                      />
                    </div>

                    {/* Result Buttons: Pass, Fail, Pending, N/A */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => handleSetResult(item.checklist_item_id, 'Pass')}
                        style={{
                          padding: '4px 10px',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          borderRadius: '6px',
                          border: ev.result === 'Pass' ? '1px solid #16a34a' : '1px solid var(--border-color)',
                          backgroundColor: ev.result === 'Pass' ? '#16a34a' : 'transparent',
                          color: ev.result === 'Pass' ? '#fff' : '#16a34a',
                          cursor: 'pointer'
                        }}
                      >
                        ✓ Pass
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetResult(item.checklist_item_id, 'Fail')}
                        style={{
                          padding: '4px 10px',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          borderRadius: '6px',
                          border: ev.result === 'Fail' ? '1px solid #dc2626' : '1px solid var(--border-color)',
                          backgroundColor: ev.result === 'Fail' ? '#dc2626' : 'transparent',
                          color: ev.result === 'Fail' ? '#fff' : '#dc2626',
                          cursor: 'pointer'
                        }}
                      >
                        ✗ Fail (Deficiency)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetResult(item.checklist_item_id, 'Pending')}
                        style={{
                          padding: '4px 8px',
                          fontSize: '0.74rem',
                          borderRadius: '6px',
                          border: ev.result === 'Pending' ? '1px solid #d97706' : '1px solid var(--border-color)',
                          backgroundColor: ev.result === 'Pending' ? '#d97706' : 'transparent',
                          color: ev.result === 'Pending' ? '#fff' : 'var(--text-muted)',
                          cursor: 'pointer'
                        }}
                      >
                        Pending
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetResult(item.checklist_item_id, 'N/A')}
                        style={{
                          padding: '4px 8px',
                          fontSize: '0.74rem',
                          borderRadius: '6px',
                          border: ev.result === 'N/A' ? '1px solid #64748b' : '1px solid var(--border-color)',
                          backgroundColor: ev.result === 'N/A' ? '#64748b' : 'transparent',
                          color: ev.result === 'N/A' ? '#fff' : 'var(--text-muted)',
                          cursor: 'pointer'
                        }}
                      >
                        N/A
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              Evaluations automatically update the Room Readiness Score (%) and generate deficiency punch-list items for failed checks.
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveEvaluations}
                disabled={submitting}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {submitting ? <RefreshCw size={15} className="spin" /> : <Save size={15} />}
                <span>Save All 130 Evaluations</span>
              </button>
            </div>
          </div>

        </div>
      )}
    </Modal>
  );
}
