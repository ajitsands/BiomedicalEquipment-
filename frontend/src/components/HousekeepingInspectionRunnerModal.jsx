import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle, 
  AlertOctagon, 
  MinusCircle, 
  FileCheck, 
  Building2, 
  ShieldCheck, 
  AlertTriangle, 
  Sparkles,
  ClipboardCheck,
  UserCheck,
  Printer,
  Save,
  Clock,
  RotateCcw,
  Check,
  Filter,
  ClipboardList
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { fetchHousekeepingInspectionDetail, saveHousekeepingInspectionResults } from '../services/api';
import PrintableHousekeepingWorksheetModal from './PrintableHousekeepingWorksheetModal';

export default function HousekeepingInspectionRunnerModal({ 
  inspectionId, 
  isOpen, 
  onClose, 
  onSuccess, 
  onShowToast,
  onViewCertificate
}) {
  const [inspection, setInspection] = useState(null);
  const [results, setResults] = useState([]);
  const [supervisorName, setSupervisorName] = useState('');
  const [notes, setNotes] = useState('');
  const [activeLayerFilter, setActiveLayerFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'VERIFIED'
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inspectionId) {
      loadInspection();
    }
  }, [isOpen, inspectionId]);

  const loadInspection = async () => {
    setLoading(true);
    try {
      const res = await fetchHousekeepingInspectionDetail(inspectionId);
      setInspection(res.data);
      setSupervisorName(res.data.supervisor_name || '');
      setNotes(res.data.notes || '');

      // Normalize results format: NO default Pass! Keep as Pending unless already verified
      const initialResults = (res.data.results || []).map(r => ({
        checklist_item_id: r.checklist_item_id || r.id,
        item_code: r.item_code,
        inspection_item: r.inspection_item,
        acceptance_criteria: r.acceptance_criteria,
        standard_layer: r.standard_layer,
        is_regulatory_mandate: Boolean(Number(r.is_regulatory_mandate)),
        category_name: r.category_name,
        // If status is not Pass/Fail/N/A, default to 'Pending'
        status: (r.status === 'Pass' || r.status === 'Fail' || r.status === 'N/A') ? r.status : 'Pending',
        notes: r.notes || '',
        photo_evidence: r.photo_evidence || null,
        completed_at: r.completed_at || null
      }));
      setResults(initialResults);
      setActiveLayerFilter('ALL');
      setStatusFilter('ALL');
    } catch (err) {
      console.error('Failed to load inspection detail', err);
      onShowToast({ type: 'error', title: 'Load Error', message: 'Could not load inspection checklist' });
    } finally {
      setLoading(false);
    }
  };

  const setItemStatus = (itemId, newStatus) => {
    setResults(prev => prev.map(item => {
      if (item.checklist_item_id === itemId) {
        // Toggle back to Pending if clicked again
        const toggledStatus = item.status === newStatus ? 'Pending' : newStatus;
        const now = new Date();
        const formattedTime = now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        return { 
          ...item, 
          status: toggledStatus,
          completed_at: toggledStatus !== 'Pending' ? formattedTime : null
        };
      }
      return item;
    }));
  };

  const setItemNotes = (itemId, text) => {
    setResults(prev => prev.map(item => {
      if (item.checklist_item_id === itemId) {
        return { ...item, notes: text };
      }
      return item;
    }));
  };

  // Completion & Progress calculations
  const totalItems = results.length;
  const passedCount = results.filter(r => r.status === 'Pass').length;
  const failedCount = results.filter(r => r.status === 'Fail').length;
  const naCount = results.filter(r => r.status === 'N/A').length;
  const evaluatedCount = passedCount + failedCount + naCount;
  const pendingCount = results.filter(r => !r.status || r.status === 'Pending').length;
  const completionPercentage = totalItems > 0 ? Math.round((evaluatedCount / totalItems) * 100) : 0;
  const isAllComplete = totalItems > 0 && pendingCount === 0;

  // Real-time compliance score calculation (based on evaluated items)
  const scorableEvaluated = passedCount + failedCount;
  const criticalFails = results.filter(r => r.status === 'Fail' && r.is_regulatory_mandate).length;
  const currentScore = scorableEvaluated > 0 ? Math.round((passedCount / scorableEvaluated) * 100) : (pendingCount === totalItems ? 0 : 100);

  let scoreColor = '#10b981';
  let statusBadge = isAllComplete ? 'Passed' : 'In-Progress';
  if (criticalFails > 0 || (currentScore < 75 && scorableEvaluated > 0)) {
    scoreColor = '#ef4444';
    statusBadge = isAllComplete ? 'Failed (Regulatory/Score Breach)' : 'Deficiencies Observed';
  } else if (currentScore < 90 && scorableEvaluated > 0) {
    scoreColor = '#f59e0b';
    statusBadge = isAllComplete ? 'Conditional Pass' : 'Under Review';
  }

  // Save Progress / Draft Handler
  const handleSaveProgress = async () => {
    setSavingDraft(true);
    try {
      const payload = {
        inspection_id: inspectionId,
        supervisor_name: supervisorName,
        notes: notes,
        results: results,
        is_draft: true
      };

      const res = await saveHousekeepingInspectionResults(payload);

      onShowToast({
        type: 'success',
        title: 'Audit Progress Saved',
        message: `Saved ${evaluatedCount} of ${totalItems} items (${completionPercentage}% verified). ${pendingCount} remaining items kept as pending. You can resume anytime.`
      });

      onSuccess && onSuccess(res.data);
    } catch (err) {
      console.error('Save progress error', err);
      onShowToast({ type: 'error', title: 'Save Failed', message: err.message || 'Could not save audit progress' });
    } finally {
      setSavingDraft(false);
    }
  };

  // Final Submit & Score Audit Handler
  const handleSubmitFinal = async () => {
    // Strict validation: All items must be evaluated before official certification
    if (pendingCount > 0) {
      setStatusFilter('PENDING'); // Automatically filter to pending items!
      onShowToast({
        type: 'warning',
        title: 'Audit Checklist Incomplete',
        message: `${evaluatedCount} of ${totalItems} items evaluated (${completionPercentage}%). Please evaluate all ${totalItems} inspection criteria to issue the Cleanliness Certificate, or click "Save Progress" to resume later.`
      });
      // Scroll to first pending item
      const firstPending = results.find(r => !r.status || r.status === 'Pending');
      if (firstPending) {
        setTimeout(() => {
          const el = document.getElementById(`hk-item-${firstPending.checklist_item_id}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
      return;
    }

    if (!supervisorName) {
      onShowToast({ type: 'warning', title: 'Required Field', message: 'Please provide Supervisor / Infection Control In-Charge Name' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        inspection_id: inspectionId,
        supervisor_name: supervisorName,
        notes: notes,
        results: results,
        is_draft: false
      };
      const res = await saveHousekeepingInspectionResults(payload);

      if (res.data?.status === 'Passed') {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      }

      onShowToast({ 
        type: res.data?.status === 'Passed' ? 'success' : 'warning', 
        title: 'Inspection Scored & Certified', 
        message: `Audit completed! Score: ${res.data?.score_percent}% (${res.data?.status})` 
      });

      if (res.data?.certificate_number && onViewCertificate) {
        onViewCertificate({ ...inspection, ...res.data });
      }

      onSuccess && onSuccess(res.data);
      onClose();
    } catch (err) {
      console.error('Save error', err);
      onShowToast({ type: 'error', title: 'Submission Failed', message: err.message || 'Could not submit audit results' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  // Filter items by Layer and by Status (ALL / PENDING / VERIFIED)
  const filteredResults = results.filter(r => {
    // 1. Layer filter
    if (activeLayerFilter !== 'ALL' && r.standard_layer !== activeLayerFilter) {
      return false;
    }
    // 2. Status filter
    if (statusFilter === 'PENDING') {
      return !r.status || r.status === 'Pending';
    }
    if (statusFilter === 'VERIFIED') {
      return r.status === 'Pass' || r.status === 'Fail' || r.status === 'N/A';
    }
    return true;
  });

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div 
          className="modal-content-card modal-xl" 
          style={{ maxWidth: '1080px', width: '96%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
          onClick={(e) => e.stopPropagation()}
        >
          
          {/* Modal Header with Live Score Gauge */}
          <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.8rem', background: 'rgba(2, 132, 199, 0.12)', color: '#0284c7', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  {inspection?.audit_number || 'AUDIT RUNNER'}
                </span>
                <span style={{ fontSize: '0.8rem', background: 'rgba(16, 185, 129, 0.12)', color: '#059669', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  {inspection?.cleaning_type || 'Terminal Clean'}
                </span>
                <span className="badge badge-warning" style={{ fontSize: '0.74rem' }}>
                  {isAllComplete ? '100% Evaluated' : `In-Progress (${completionPercentage}% Done)`}
                </span>
              </div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
                {inspection?.room_number} — {inspection?.area_type}
              </h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {inspection?.building} | {inspection?.floor} | Facility: {inspection?.facility_name}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              {/* Live Compliance Score Gauge */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: scoreColor, lineHeight: 1 }}>
                  {scorableEvaluated > 0 ? `${currentScore}%` : '0%'}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: scoreColor, textTransform: 'uppercase' }}>
                  {statusBadge}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {passedCount} Passed · {failedCount} Failed · {pendingCount} Pending
                </div>
              </div>

              <button 
                type="button" 
                className="btn-icon" 
                onClick={onClose}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={22} />
              </button>
            </div>
          </div>

          {/* Progressive Progress Banner */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(59, 130, 246, 0.03) 100%)',
            borderBottom: '1px solid rgba(2, 132, 199, 0.2)',
            padding: '12px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  backgroundColor: isAllComplete ? '#dcfce7' : '#dbeafe',
                  color: isAllComplete ? '#166534' : '#1d4ed8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  flexShrink: 0
                }}>
                  {completionPercentage}%
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Audit Progress: {evaluatedCount} of {totalItems} Tasks Verified</span>
                    {pendingCount > 0 ? (
                      <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                        {pendingCount} Pending
                      </span>
                    ) : (
                      <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                        Ready for Certification
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                    {pendingCount > 0 ? (
                      <span>
                        <strong style={{ color: '#d97706' }}>Items are not auto-passed.</strong> Evaluate items one by one. You can save your progress and finish the remaining {pendingCount} tasks later.
                      </span>
                    ) : (
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>
                        ✓ All {totalItems} inspection criteria verified! Enter supervisor name below to certify.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Banner Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={handleSaveProgress}
                  disabled={savingDraft || saving}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                  title="Save verified items so you can resume audit anytime"
                >
                  <Save size={13} />
                  <span>{savingDraft ? 'Saving...' : 'Save Progress (Draft)'}</span>
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setIsPrintModalOpen(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                  title="Print physical paper task list for sterile room inspection"
                >
                  <Printer size={13} />
                  <span>Print Task List</span>
                </button>
              </div>
            </div>

            {/* Smooth Progress Bar */}
            <div style={{ 
              width: '100%', 
              height: '6px', 
              backgroundColor: '#e2e8f0', 
              borderRadius: '999px', 
              overflow: 'hidden' 
            }}>
              <div style={{
                width: `${completionPercentage}%`,
                height: '100%',
                backgroundColor: isAllComplete ? '#10b981' : completionPercentage > 50 ? '#3b82f6' : '#f59e0b',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>

          {/* Layer Filter & Status Filter Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 24px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Layer:</span>
              <button 
                type="button"
                className={`btn btn-sm ${activeLayerFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveLayerFilter('ALL')}
                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
              >
                All Layers ({results.length})
              </button>
              <button 
                type="button"
                className={`btn btn-sm ${activeLayerFilter === 'NHRA_BAHRAIN' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveLayerFilter('NHRA_BAHRAIN')}
                style={{ padding: '4px 10px', fontSize: '0.78rem', background: activeLayerFilter === 'NHRA_BAHRAIN' ? '#dc2626' : undefined, borderColor: activeLayerFilter === 'NHRA_BAHRAIN' ? '#dc2626' : undefined }}
              >
                🇧🇭 NHRA Bahrain Mandates
              </button>
              <button 
                type="button"
                className={`btn btn-sm ${activeLayerFilter === 'WHO_2023' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveLayerFilter('WHO_2023')}
                style={{ padding: '4px 10px', fontSize: '0.78rem', background: activeLayerFilter === 'WHO_2023' ? '#0284c7' : undefined, borderColor: activeLayerFilter === 'WHO_2023' ? '#0284c7' : undefined }}
              >
                🌐 WHO Guidelines
              </button>
              <button 
                type="button"
                className={`btn btn-sm ${activeLayerFilter === 'HOSPITAL_SOP' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveLayerFilter('HOSPITAL_SOP')}
                style={{ padding: '4px 10px', fontSize: '0.78rem', background: activeLayerFilter === 'HOSPITAL_SOP' ? '#7c3aed' : undefined, borderColor: activeLayerFilter === 'HOSPITAL_SOP' ? '#7c3aed' : undefined }}
              >
                🏥 Hospital SOPs
              </button>
            </div>

            {/* Quick Filter: All / Pending / Verified */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--bg-subtle)', padding: '3px 6px', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginRight: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Filter size={12} /> Show:
              </span>
              <button
                type="button"
                className={`btn btn-xs ${statusFilter === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px' }}
                onClick={() => setStatusFilter('ALL')}
              >
                All ({results.length})
              </button>
              <button
                type="button"
                className={`btn btn-xs ${statusFilter === 'PENDING' ? 'btn-warning' : 'btn-ghost'}`}
                style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px' }}
                onClick={() => setStatusFilter('PENDING')}
                title="Show only unverified pending tasks"
              >
                Pending ({pendingCount})
              </button>
              <button
                type="button"
                className={`btn btn-xs ${statusFilter === 'VERIFIED' ? 'btn-success' : 'btn-ghost'}`}
                style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px' }}
                onClick={() => setStatusFilter('VERIFIED')}
                title="Show verified tasks"
              >
                Verified ({evaluatedCount})
              </button>
            </div>
          </div>

          {/* Scrollable Questions List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                Loading inspection criteria...
              </div>
            ) : filteredResults.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px' }}>
                {statusFilter === 'PENDING' 
                  ? '🎉 No pending tasks in this filter! All items here are verified.' 
                  : statusFilter === 'VERIFIED'
                  ? 'No verified tasks yet in this filter.'
                  : 'No checklist items match filter.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredResults.map((item, idx) => {
                  const isPending = !item.status || item.status === 'Pending';
                  const isPass = item.status === 'Pass';
                  const isFail = item.status === 'Fail';
                  const isNA = item.status === 'N/A';

                  const cardBorderColor = isPending
                    ? '#f59e0b'
                    : isPass
                    ? '#10b981'
                    : isFail
                    ? '#ef4444'
                    : '#94a3b8';

                  return (
                    <div 
                      key={item.checklist_item_id}
                      id={`hk-item-${item.checklist_item_id}`}
                      style={{ 
                        border: `1px solid ${isFail ? '#fca5a5' : isPending ? '#fde68a' : 'var(--border-color)'}`,
                        borderLeft: `4px solid ${cardBorderColor}`,
                        borderRadius: '8px',
                        padding: '12px 16px',
                        background: isFail 
                          ? 'rgba(239, 68, 68, 0.04)' 
                          : isPending 
                          ? 'rgba(245, 158, 11, 0.02)' 
                          : 'var(--bg-card)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '280px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                              #{idx + 1} {item.item_code}
                            </span>
                            
                            {/* Standard Layer Tag */}
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

                            {item.is_regulatory_mandate && (
                              <span style={{ fontSize: '0.72rem', background: '#fef2f2', border: '1px solid #dc2626', color: '#dc2626', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                Mandatory Regulatory Gate
                              </span>
                            )}

                            {/* Status Pill */}
                            {isPending ? (
                              <span style={{ 
                                fontSize: '0.72rem', 
                                color: '#b45309', 
                                background: '#fef3c7', 
                                border: '1px solid #fde68a',
                                padding: '1px 7px', 
                                borderRadius: '4px', 
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}>
                                <Clock size={11} />
                                Pending
                              </span>
                            ) : (
                              <span style={{ 
                                fontSize: '0.72rem', 
                                color: isPass ? '#047857' : isFail ? '#b91c1c' : '#475569', 
                                background: isPass ? '#d1fae5' : isFail ? '#fee2e2' : '#f1f5f9', 
                                border: `1px solid ${isPass ? '#a7f3d0' : isFail ? '#fecaca' : '#cbd5e1'}`,
                                padding: '1px 7px', 
                                borderRadius: '4px', 
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}>
                                <Check size={11} />
                                {item.status} • {item.completed_at || 'Verified'}
                              </span>
                            )}
                          </div>

                          <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '4px' }}>
                            {item.inspection_item}
                          </div>
                          <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                            <strong>Acceptance Standard:</strong> {item.acceptance_criteria}
                          </div>
                        </div>

                        {/* Status Toggle Buttons (Allow Unselecting back to Pending) */}
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => setItemStatus(item.checklist_item_id, 'Pass')}
                            title={isPass ? 'Click to unselect and return to Pending' : 'Mark task as Pass'}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '6px',
                              border: '1px solid',
                              cursor: 'pointer',
                              fontWeight: 600,
                              fontSize: '0.82rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: isPass ? '#10b981' : 'transparent',
                              color: isPass ? '#fff' : '#10b981',
                              borderColor: '#10b981'
                            }}
                          >
                            <CheckCircle size={15} /> Pass
                          </button>

                          <button
                            type="button"
                            onClick={() => setItemStatus(item.checklist_item_id, 'Fail')}
                            title={isFail ? 'Click to unselect and return to Pending' : 'Mark task as Fail'}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '6px',
                              border: '1px solid',
                              cursor: 'pointer',
                              fontWeight: 600,
                              fontSize: '0.82rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: isFail ? '#ef4444' : 'transparent',
                              color: isFail ? '#fff' : '#ef4444',
                              borderColor: '#ef4444'
                            }}
                          >
                            <AlertOctagon size={15} /> Fail
                          </button>

                          <button
                            type="button"
                            onClick={() => setItemStatus(item.checklist_item_id, 'N/A')}
                            title={isNA ? 'Click to unselect and return to Pending' : 'Mark task as N/A'}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid',
                              cursor: 'pointer',
                              fontWeight: 600,
                              fontSize: '0.82rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: isNA ? 'var(--text-muted)' : 'transparent',
                              color: isNA ? '#fff' : 'var(--text-muted)',
                              borderColor: 'var(--border-color)'
                            }}
                          >
                            <MinusCircle size={14} /> N/A
                          </button>
                        </div>
                      </div>

                      {/* Non-compliance notes field if failed */}
                      {isFail && (
                        <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #fca5a5' }}>
                          <input 
                            type="text" 
                            placeholder="State exact observed deficiency / corrective action required..."
                            value={item.notes}
                            onChange={(e) => setItemNotes(item.checklist_item_id, e.target.value)}
                            style={{ width: '100%', padding: '6px 10px', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #f87171', background: '#fff' }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Modal Footer: Supervisor Sign-off & Actions */}
          <div style={{ borderTop: '1px solid var(--border-color)', padding: '16px 24px', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px' }}>
              <UserCheck size={18} style={{ color: 'var(--color-primary)' }} />
              <input 
                type="text" 
                placeholder="Supervisor / Infection Control In-Charge Name *"
                value={supervisorName}
                onChange={(e) => setSupervisorName(e.target.value)}
                style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', fontSize: '0.85rem', width: '280px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsPrintModalOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                title="Print physical paper task list worksheet for clinical area"
              >
                <Printer size={14} />
                <span>Print Task List</span>
              </button>

              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                onClick={handleSaveProgress}
                disabled={saving || savingDraft}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '5px', 
                  borderColor: 'var(--color-primary)', 
                  color: 'var(--color-primary)', 
                  fontWeight: 600,
                  backgroundColor: 'var(--color-primary-subtle)'
                }}
                title="Save verified items so you can finish remaining tasks on another day"
              >
                <Save size={14} />
                <span>{savingDraft ? 'Saving...' : 'Save Progress (Draft)'}</span>
              </button>

              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                onClick={onClose}
                disabled={saving || savingDraft}
              >
                Close
              </button>

              <button 
                type="button" 
                className={`btn btn-sm ${isAllComplete ? (currentScore >= 90 ? 'btn-success' : 'btn-warning') : 'btn-warning'}`}
                onClick={handleSubmitFinal}
                disabled={saving || savingDraft}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <FileCheck size={15} />
                {saving 
                  ? 'Scoring & Certifying...' 
                  : isAllComplete 
                  ? 'Submit & Score Audit' 
                  : `Complete All Tasks (${pendingCount} Left to Score)`}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Printable Physical Task List Modal */}
      {isPrintModalOpen && (
        <PrintableHousekeepingWorksheetModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          inspection={inspection}
          items={results}
        />
      )}
    </>
  );
}
