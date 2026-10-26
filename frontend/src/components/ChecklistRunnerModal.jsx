import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { 
  fetchChecklistTemplates, 
  submitMaintenanceRecord,
  fetchEquipmentDetail,
  fetchPmDraft,
  savePmDraft,
  deletePmDraft
} from '../services/api';
import confetti from 'canvas-confetti';
import { 
  CheckSquare, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ShieldCheck, 
  Sliders, 
  Clock, 
  User, 
  Wrench, 
  Award, 
  UserCheck,
  Zap,
  Printer,
  Save,
  RotateCcw,
  Check,
  Filter,
  BookmarkCheck,
  Layers
} from 'lucide-react';

export default function ChecklistRunnerModal({
  equipment,
  isOpen,
  onClose,
  onSuccess,
  onShowToast,
  onOpenPrintWorksheet
}) {
  const [currentEquipment, setCurrentEquipment] = useState(equipment);
  const [template, setTemplate] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [activePhase, setActivePhase] = useState('ALL'); // 'ALL' or specific phase
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'COMPLETED'

  // Draft State
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [draftId, setDraftId] = useState(null);
  const [draftUpdatedAt, setDraftUpdatedAt] = useState(null);

  useEffect(() => {
    setCurrentEquipment(equipment);
  }, [equipment]);

  // Form State
  const [performedBy, setPerformedBy] = useState('Eng. Hassan Al-Majed (SaNDS Lab)');
  const [technicianBadge, setTechnicianBadge] = useState('SAND-BME-01');
  const [performedDate, setPerformedDate] = useState(new Date().toISOString().slice(0, 10));
  const [timeSpent, setTimeSpent] = useState(45);
  const [testEquipment, setTestEquipment] = useState('Fluke ESA620 Electrical Safety Analyzer, Rigel 288+');
  const [engineerNotes, setEngineerNotes] = useState('');
  const [partsReplaced, setPartsReplaced] = useState('');

  // Item Answers Map: { [itemId]: { status: 'Pass'|'Fail'|'N/A'|null, measuredValue: '', remarks: '', completedAt: null, completedBy: null } }
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    if (isOpen && equipment) {
      loadChecklist();
    }
  }, [isOpen, equipment]);

  const loadChecklist = async () => {
    try {
      setLoading(true);
      let eqData = equipment;
      // If equipment_type_id or asset_id is missing, fetch full equipment details
      if ((!eqData.equipment_type_id || !eqData.asset_id) && (eqData.id || eqData.equipment_id)) {
        try {
          const detailRes = await fetchEquipmentDetail(eqData.id || eqData.equipment_id);
          if (detailRes && detailRes.data) {
            eqData = { ...eqData, ...detailRes.data };
            setCurrentEquipment(eqData);
          }
        } catch (fetchErr) {
          console.warn('Could not fetch extra equipment details:', fetchErr);
        }
      }

      const eqId = eqData.id || eqData.equipment_id;

      // 1. Fetch checklist templates and items
      const res = await fetchChecklistTemplates(false, eqData.equipment_type_id || null);
      setTemplate(res.template);
      const loadedItems = res.items || [];
      setItems(loadedItems);

      // 2. Fetch active PM Draft from Server
      let draftData = null;
      try {
        const draftRes = await fetchPmDraft(eqId);
        if (draftRes && draftRes.has_draft && draftRes.draft) {
          draftData = draftRes.draft;
        }
      } catch (draftErr) {
        console.warn('Could not fetch server draft, checking local storage:', draftErr);
      }

      // 3. Fallback: check localStorage if server draft was not present
      if (!draftData) {
        try {
          const localRaw = localStorage.getItem(`pm_draft_${eqId}`);
          if (localRaw) {
            draftData = JSON.parse(localRaw);
          }
        } catch (e) {
          console.warn('Error reading localStorage draft:', e);
        }
      }

      // 4. Hydrate answers
      const initAnswers = {};
      let restoredCompletedCount = 0;
      loadedItems.forEach(item => {
        if (draftData?.answers && draftData.answers[item.id]) {
          const savedItem = draftData.answers[item.id];
          initAnswers[item.id] = {
            status: savedItem.status || null,
            measuredValue: savedItem.measuredValue ?? '',
            remarks: savedItem.remarks ?? '',
            completedAt: savedItem.completedAt ?? null,
            completedBy: savedItem.completedBy ?? null
          };
          if (savedItem.status) {
            restoredCompletedCount++;
          }
        } else {
          initAnswers[item.id] = {
            status: null,
            measuredValue: '',
            remarks: '',
            completedAt: null,
            completedBy: null
          };
        }
      });

      setAnswers(initAnswers);

      if (draftData && restoredCompletedCount > 0) {
        setHasSavedDraft(true);
        setDraftId(draftData.id || null);
        setDraftUpdatedAt(draftData.updated_at || new Date().toISOString());
        if (draftData.technician_name) setPerformedBy(draftData.technician_name);
        if (draftData.technician_badge) setTechnicianBadge(draftData.technician_badge);
        if (draftData.inspection_date) setPerformedDate(draftData.inspection_date);
        if (draftData.time_spent_minutes) setTimeSpent(Number(draftData.time_spent_minutes));
        if (draftData.test_equipment_used) setTestEquipment(draftData.test_equipment_used);
        if (draftData.engineer_notes) setEngineerNotes(draftData.engineer_notes);
        if (draftData.parts_replaced) setPartsReplaced(draftData.parts_replaced);

        const total = loadedItems.length;
        const pct = total > 0 ? Math.round((restoredCompletedCount / total) * 100) : 0;
        if (onShowToast) {
          onShowToast({
            type: 'info',
            title: 'Resumed In-Progress PM Draft',
            message: `Loaded ${restoredCompletedCount} of ${total} verified items (${pct}% complete). Remaining items marked as pending.`
          });
        }
      } else {
        setHasSavedDraft(false);
        setDraftId(null);
        setDraftUpdatedAt(null);
      }

      setActivePhase('ALL');
      setStatusFilter('ALL');
    } catch (err) {
      if (onShowToast) {
        onShowToast({ type: 'error', title: 'Error', message: err.message || 'Failed to load checklist' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (itemId, newStatus) => {
    const current = answers[itemId]?.status;
    const toggledStatus = current === newStatus ? null : newStatus; // Toggle back to pending if clicked again
    
    const now = new Date();
    const formattedTime = now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setAnswers(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        status: toggledStatus,
        completedAt: toggledStatus ? formattedTime : null,
        completedBy: toggledStatus ? performedBy : null
      }
    }));
  };

  const handleValueChange = (itemId, val, item) => {
    let currentStatus = answers[itemId]?.status || null;
    if (item.check_type === 'numeric' && val !== '') {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        if ((item.min_value !== null && num < item.min_value) || (item.max_value !== null && num > item.max_value)) {
          currentStatus = 'Fail';
        } else if (!currentStatus) {
          currentStatus = 'Pass';
        }
      }
    }

    const now = new Date();
    const formattedTime = now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setAnswers(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        measuredValue: val,
        status: currentStatus,
        completedAt: currentStatus ? (prev[itemId]?.completedAt || formattedTime) : null,
        completedBy: currentStatus ? (prev[itemId]?.completedBy || performedBy) : null
      }
    }));
  };

  // Group items dynamically across the 4 clinical phases
  const preUseItems = items.filter(i => i.checklist_phase === 'User pre-use / routine check');
  const pmItems = items.filter(i => 
    i.checklist_phase === 'Preventive maintenance / technical inspection' && 
    i.category !== 'Electrical Safety Test'
  );
  const electricalItems = items.filter(i => 
    i.checklist_phase === 'Electrical Safety (IEC 62353)' || 
    i.category === 'Electrical Safety Test'
  );
  const correctiveItems = items.filter(i => i.checklist_phase === 'Complaint / corrective maintenance');

  // Calculate Overall Result & Evaluation Completion
  const totalItems = items.length;
  const passCount = Object.values(answers).filter(a => a?.status === 'Pass').length;
  const failCount = Object.values(answers).filter(a => a?.status === 'Fail').length;
  const naCount = Object.values(answers).filter(a => a?.status === 'N/A').length;
  const evaluatedCount = passCount + failCount + naCount;
  const pendingCount = Math.max(0, totalItems - evaluatedCount);
  const isAllComplete = totalItems > 0 && pendingCount === 0;
  const completionPercentage = totalItems > 0 ? Math.round((evaluatedCount / totalItems) * 100) : 0;

  // Filter items by active tab selection and status filter
  const displayedItems = (() => {
    let list = items;
    if (activePhase === 'PRE_USE' || activePhase === 'User pre-use / routine check') list = preUseItems;
    else if (activePhase === 'PM' || activePhase === 'Preventive maintenance / technical inspection') list = pmItems;
    else if (activePhase === 'ELECTRICAL' || activePhase === 'Electrical Safety (IEC 62353)') list = electricalItems;
    else if (activePhase === 'CORRECTIVE' || activePhase === 'Complaint / corrective maintenance') list = correctiveItems;

    if (statusFilter === 'PENDING') {
      return list.filter(it => !answers[it.id] || !answers[it.id].status);
    } else if (statusFilter === 'COMPLETED') {
      return list.filter(it => answers[it.id] && answers[it.id].status);
    }
    return list;
  })();

  const overallResult = pendingCount > 0
    ? `In-Progress Draft (${evaluatedCount}/${totalItems} • ${completionPercentage}%)`
    : failCount > 0 
    ? 'Failed - Immediate Attention Required' 
    : (passCount === totalItems ? 'Passed - Ready for Clinical Use' : 'Passed with Observation');

  // Progressive Save Draft Handler
  const handleSaveProgress = async () => {
    try {
      setSavingDraft(true);
      const eqId = currentEquipment?.id || currentEquipment?.equipment_id || equipment.id;
      
      const payload = {
        equipment_id: eqId,
        template_id: template?.id || null,
        technician_name: performedBy,
        technician_badge: technicianBadge,
        inspection_date: performedDate,
        time_spent_minutes: timeSpent,
        test_equipment_used: testEquipment,
        engineer_notes: engineerNotes,
        parts_replaced: partsReplaced,
        total_items: totalItems,
        completed_count: evaluatedCount,
        progress_percent: completionPercentage,
        answers: answers
      };

      const res = await savePmDraft(payload);

      // Local storage backup
      try {
        localStorage.setItem(`pm_draft_${eqId}`, JSON.stringify({
          ...payload,
          updated_at: res.updated_at || new Date().toISOString()
        }));
      } catch (e) {}

      setHasSavedDraft(true);
      setDraftUpdatedAt(res.updated_at || new Date().toISOString());

      if (onShowToast) {
        onShowToast({
          type: 'success',
          title: 'PM Progress Saved',
          message: `Saved ${evaluatedCount}/${totalItems} items (${completionPercentage}% completed). ${pendingCount} remaining items kept as pending. You can close and resume anytime.`
        });
      }
    } catch (err) {
      if (onShowToast) {
        onShowToast({
          type: 'error',
          title: 'Save Failed',
          message: err.message || 'Could not save progress to server.'
        });
      }
    } finally {
      setSavingDraft(false);
    }
  };

  // Discard Draft Handler
  const handleDiscardDraft = async () => {
    if (!window.confirm('Are you sure you want to discard your saved draft progress? All checked items in this draft will be reset to pending.')) {
      return;
    }

    try {
      setSavingDraft(true);
      const eqId = currentEquipment?.id || currentEquipment?.equipment_id || equipment.id;

      try {
        await deletePmDraft(eqId);
      } catch (err) {
        console.warn('Could not delete server draft:', err);
      }

      try {
        localStorage.removeItem(`pm_draft_${eqId}`);
      } catch (e) {}

      // Reset all answers
      const resetAnswers = {};
      items.forEach(item => {
        resetAnswers[item.id] = {
          status: null,
          measuredValue: '',
          remarks: '',
          completedAt: null,
          completedBy: null
        };
      });
      setAnswers(resetAnswers);
      setHasSavedDraft(false);
      setDraftId(null);
      setDraftUpdatedAt(null);

      if (onShowToast) {
        onShowToast({
          type: 'info',
          title: 'Draft Cleared',
          message: 'Saved progress cleared. PM checklist has been reset.'
        });
      }
    } catch (err) {
      if (onShowToast) {
        onShowToast({
          type: 'error',
          title: 'Failed to Discard',
          message: err.message
        });
      }
    } finally {
      setSavingDraft(false);
    }
  };

  // Final Sign-Off & Complete PM Submission
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!performedBy) {
      onShowToast({ type: 'warning', title: 'Required', message: 'Please provide technician name' });
      return;
    }

    // Strict validation: Every single item must be evaluated (Pass, Fail, or N/A) before generating certificate
    if (pendingCount > 0) {
      setStatusFilter('PENDING'); // Automatically filter to show only pending items!
      onShowToast({
        type: 'warning',
        title: 'Checklist Incomplete',
        message: `${evaluatedCount} of ${totalItems} steps completed (${completionPercentage}%). All ${totalItems} items must be completed to issue the PM Certificate. Click "Save Progress" if you wish to finish the remaining ${pendingCount} steps on another day.`
      });
      // Scroll to the first unselected item
      const firstUnanswered = items.find(it => !answers[it.id] || !answers[it.id].status);
      if (firstUnanswered) {
        setTimeout(() => {
          const el = document.getElementById(`checklist-item-${firstUnanswered.id}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
      return;
    }

    try {
      setSubmitting(true);
      const itemsPayload = items.map(item => ({
        checklist_item_id: item.id,
        category: item.category,
        title: item.title,
        status: answers[item.id]?.status || 'Pass',
        measured_value: answers[item.id]?.measuredValue || '',
        remarks: answers[item.id]?.remarks || ''
      }));

      const payload = {
        equipment_id: currentEquipment?.id || currentEquipment?.equipment_id || equipment.id,
        template_id: template?.id || null,
        performed_by: performedBy,
        technician_badge: technicianBadge,
        performed_date: performedDate,
        overall_result: failCount > 0 ? 'Failed - Immediate Attention Required' : (passCount === totalItems ? 'Passed - Ready for Clinical Use' : 'Passed with Observation'),
        time_spent_minutes: timeSpent,
        test_equipment_used: testEquipment,
        engineer_notes: engineerNotes,
        parts_replaced: partsReplaced,
        items: itemsPayload
      };

      const res = await submitMaintenanceRecord(payload);
      
      // Clear draft on server and local
      const eqId = currentEquipment?.id || currentEquipment?.equipment_id || equipment.id;
      try {
        await deletePmDraft(eqId);
      } catch (e) {}
      try {
        localStorage.removeItem(`pm_draft_${eqId}`);
      } catch (e) {}

      if (overallResult.includes('Passed')) {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      }

      onShowToast({
        type: overallResult.includes('Passed') ? 'success' : 'warning',
        title: 'Checklist Executed & Certified',
        message: `Work order ${res.work_order_no} logged. Next PM due: ${res.next_pm_due_date}`
      });

      onSuccess && onSuccess(res);
      onClose();
    } catch (err) {
      onShowToast({ type: 'error', title: 'Submission Failed', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !equipment) return null;

  const displayAsset = currentEquipment || equipment;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Execute WHO Checklist • ${displayAsset?.name || 'Medical Asset'}`}
      icon={CheckSquare}
      size="lg"
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>Status:</span>
            <span className={`badge ${isAllComplete ? (overallResult.includes('Passed') ? 'badge-success' : 'badge-danger') : 'badge-warning'}`}>
              {isAllComplete ? overallResult : `In-Progress (${completionPercentage}% Done)`}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              ({passCount} Pass, {failCount} Fail, {naCount} N/A • {evaluatedCount}/{totalItems} Completed)
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {onOpenPrintWorksheet && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  onOpenPrintWorksheet(currentEquipment || equipment, null, activePhase);
                }}
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                title="Print physical A4 paper worksheet for sterile room inspection"
              >
                <Printer size={14} />
                <span>Print A4</span>
              </button>
            )}

            <button 
              type="button" 
              className="btn btn-secondary btn-sm" 
              onClick={handleSaveProgress}
              disabled={submitting || loading || savingDraft}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '5px', 
                borderColor: 'var(--color-primary)', 
                color: 'var(--color-primary)', 
                fontWeight: 600,
                backgroundColor: 'var(--color-primary-subtle)'
              }}
              title="Save completed items so you can finish remaining ones on another day"
            >
              <Save size={14} />
              <span>{savingDraft ? 'Saving...' : 'Save Progress (Draft)'}</span>
            </button>

            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={submitting}>
              Close
            </button>

            <button 
              type="button" 
              className={`btn btn-sm ${isAllComplete ? (overallResult.includes('Passed') ? 'btn-success' : 'btn-danger') : 'btn-warning'}`}
              onClick={handleSubmit}
              disabled={submitting || loading || savingDraft}
              style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <Award size={15} />
              {submitting ? 'Submitting...' : isAllComplete ? 'Sign-Off & Complete PM Certificate' : `Complete All Items (${pendingCount} Left to Certify)`}
            </button>
          </div>
        </div>
      }
    >
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading WHO-standard inspection checklist for {displayAsset?.equipment_type_name || displayAsset?.name || 'equipment'}...
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Header Card */}
          <div style={{ 
            backgroundColor: 'var(--bg-subtle)', 
            padding: '16px 20px', 
            borderRadius: 'var(--radius-md)', 
            marginBottom: '16px',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', fontWeight: 800, color: 'var(--color-primary)', backgroundColor: 'var(--color-primary-subtle)', padding: '1px 6px', borderRadius: '4px' }}>
                  {template?.asset_type_code || 'WHO-BM'}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Standard Verification Protocol
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-primary)' }}>
                {template?.title || `${displayAsset?.equipment_type_name || displayAsset?.name || 'Biomedical Equipment'} Maintenance Inspection Protocol`}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Standard: {template?.standard_reference || 'IEC 62353 / WHO CMMS'} • {items.length} Verification Steps Total
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                  Safety: {displayAsset?.protection_class || 'Class I'}
                </span>
                {displayAsset?.applied_part_type && displayAsset.applied_part_type !== 'None' && (
                  <span className={`badge ${displayAsset.applied_part_type === 'CF' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '0.72rem' }}>
                    Type {displayAsset.applied_part_type} Patient Contact
                  </span>
                )}
                <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                  Recurrent PM: {displayAsset?.maintenance_schedule_type || 'Quarterly'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Hospital Asset ID</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{displayAsset?.asset_id || 'N/A'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Serial Number</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{displayAsset?.serial_number || 'N/A'}</div>
              </div>
            </div>
          </div>

          {/* PM Progress Banner & Progressive Save Notice */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(59, 130, 246, 0.03) 100%)',
            border: '1px solid rgba(37, 99, 235, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            marginBottom: '18px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  backgroundColor: completionPercentage === 100 ? '#dcfce7' : '#dbeafe',
                  color: completionPercentage === 100 ? '#166534' : '#1d4ed8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1rem',
                  flexShrink: 0,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}>
                  {completionPercentage}%
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.94rem', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span>Checklist Progress: {evaluatedCount} of {totalItems} Steps Completed</span>
                    {hasSavedDraft && (
                      <span className="badge badge-warning" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                        In-Progress Draft Active
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {pendingCount > 0 ? (
                      <span>
                        <strong style={{ color: '#d97706' }}>{pendingCount} steps remaining pending.</strong> Completed steps are time-stamped. You can save your progress and finish the remaining steps on another day to issue the PM Certificate.
                      </span>
                    ) : (
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>
                        ✓ All {totalItems} inspection steps completed! You can now sign-off and issue the PM Certificate.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={handleSaveProgress}
                  disabled={savingDraft || loading}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                  title="Save current completed steps to resume anytime"
                >
                  <Save size={13} />
                  <span>{savingDraft ? 'Saving...' : 'Save Progress'}</span>
                </button>
                {hasSavedDraft && (
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={handleDiscardDraft}
                    disabled={savingDraft || loading}
                    style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger-subtle)' }}
                    title="Clear saved draft and start fresh"
                  >
                    <RotateCcw size={13} />
                    <span>Discard Draft</span>
                  </button>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{ 
              width: '100%', 
              height: '8px', 
              backgroundColor: '#e2e8f0', 
              borderRadius: '999px', 
              overflow: 'hidden',
              marginTop: '6px'
            }}>
              <div style={{
                width: `${completionPercentage}%`,
                height: '100%',
                backgroundColor: completionPercentage === 100 ? '#10b981' : completionPercentage > 50 ? '#3b82f6' : '#f59e0b',
                transition: 'width 0.4s ease'
              }} />
            </div>

            {draftUpdatedAt && (
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} />
                <span>Last saved: {new Date(draftUpdatedAt).toLocaleString()} • Technician: {performedBy}</span>
              </div>
            )}
          </div>

          {/* Engineer & Tool Details */}
          <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
            <h4 style={{ fontSize: '0.9rem', marginBottom: '12px', color: 'var(--text-secondary)' }}>
              Biomedical Engineer Sign-off & Calibrated Test Instruments
            </h4>
            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Technician Name <span className="required">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  value={performedBy}
                  onChange={(e) => setPerformedBy(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Technician Badge / ID</label>
                <input
                  type="text"
                  className="form-control"
                  value={technicianBadge}
                  onChange={(e) => setTechnicianBadge(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Inspection Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={performedDate}
                  onChange={(e) => setPerformedDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Time Spent (Mins)</label>
                <input
                  type="number"
                  className="form-control"
                  value={timeSpent}
                  onChange={(e) => setTimeSpent(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '12px', marginBottom: 0 }}>
              <label className="form-label">Calibrated Test Tools Used</label>
              <input
                type="text"
                className="form-control"
                value={testEquipment}
                onChange={(e) => setTestEquipment(e.target.value)}
                placeholder="e.g. Fluke ESA620 Electrical Safety Analyzer, Rigel 288+"
              />
            </div>
          </div>

          {/* Phase Filter Tabs & Quick Status Filters */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
            {/* Phase Tabs */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn btn-sm ${activePhase === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActivePhase('ALL')}
              >
                All Steps ({items.length})
              </button>

              <button
                type="button"
                className={`btn btn-sm ${activePhase === 'PRE_USE' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActivePhase('PRE_USE')}
              >
                <UserCheck size={14} /> Phase 1: Pre-Use ({preUseItems.length})
              </button>

              <button
                type="button"
                className={`btn btn-sm ${activePhase === 'PM' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActivePhase('PM')}
              >
                <ShieldCheck size={14} /> Phase 2: Technical PM ({pmItems.length})
              </button>

              <button
                type="button"
                className={`btn btn-sm ${activePhase === 'ELECTRICAL' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActivePhase('ELECTRICAL')}
                style={activePhase === 'ELECTRICAL' ? {
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
                className={`btn btn-sm ${activePhase === 'CORRECTIVE' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActivePhase('CORRECTIVE')}
              >
                <Wrench size={14} /> Phase 3: Corrective ({correctiveItems.length})
              </button>
            </div>

            {/* Quick Filter by Status: All / Pending / Completed */}
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
                All ({items.length})
              </button>
              <button
                type="button"
                className={`btn btn-xs ${statusFilter === 'PENDING' ? 'btn-warning' : 'btn-ghost'}`}
                style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px' }}
                onClick={() => setStatusFilter('PENDING')}
                title="Show only unfinished pending steps"
              >
                Pending ({pendingCount})
              </button>
              <button
                type="button"
                className={`btn btn-xs ${statusFilter === 'COMPLETED' ? 'btn-success' : 'btn-ghost'}`}
                style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px' }}
                onClick={() => setStatusFilter('COMPLETED')}
                title="Show completed steps"
              >
                Completed ({evaluatedCount})
              </button>
            </div>
          </div>

          {/* Checklist Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            {displayedItems.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                {statusFilter === 'PENDING' 
                  ? '🎉 No pending steps in this filter! All items here are verified.' 
                  : statusFilter === 'COMPLETED'
                  ? 'No completed steps yet in this filter.'
                  : 'No checklist items found.'}
              </div>
            ) : (
              displayedItems.map((item) => {
                const ans = answers[item.id] || { status: null, measuredValue: '', remarks: '' };
                const isNumeric = item.check_type === 'numeric';
                
                let isOutOfTolerance = false;
                if (isNumeric && ans.measuredValue !== '') {
                  const n = parseFloat(ans.measuredValue);
                  if (!isNaN(n)) {
                    if (item.min_value !== null && n < item.min_value) isOutOfTolerance = true;
                    if (item.max_value !== null && n > item.max_value) isOutOfTolerance = true;
                  }
                }

                const isUnselected = !ans.status;
                const cardBorderLeft = isUnselected
                  ? '4px solid #f59e0b'
                  : ans.status === 'Pass'
                  ? '4px solid #10b981'
                  : ans.status === 'Fail'
                  ? '4px solid #ef4444'
                  : '4px solid #64748b';

                return (
                  <div 
                    key={item.id} 
                    id={`checklist-item-${item.id}`}
                    className="checklist-item-card"
                    style={{ borderLeft: cardBorderLeft }}
                  >
                    <div className="checklist-item-info">
                      <div className="checklist-item-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ 
                            width: '24px', 
                            height: '24px', 
                            borderRadius: '50%', 
                            background: isUnselected ? '#fef3c7' : 'var(--color-primary-subtle)', 
                            color: isUnselected ? '#b45309' : 'var(--color-primary)', 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            flexShrink: 0
                          }}>
                            {item.step_number}
                          </span>
                          <span style={{ fontWeight: 600 }}>{item.title}</span>
                        </div>

                        {/* Status Label with Completion Timestamp */}
                        {isUnselected ? (
                          <span style={{ 
                            fontSize: '0.72rem', 
                            color: '#b45309', 
                            background: '#fef3c7', 
                            border: '1px solid #fde68a',
                            padding: '2px 8px', 
                            borderRadius: '4px', 
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            flexShrink: 0
                          }}>
                            <Clock size={11} />
                            Pending (Not Checked)
                          </span>
                        ) : (
                          <span style={{ 
                            fontSize: '0.72rem', 
                            color: ans.status === 'Pass' ? '#047857' : ans.status === 'Fail' ? '#b91c1c' : '#475569', 
                            background: ans.status === 'Pass' ? '#d1fae5' : ans.status === 'Fail' ? '#fee2e2' : '#f1f5f9', 
                            border: `1px solid ${ans.status === 'Pass' ? '#a7f3d0' : ans.status === 'Fail' ? '#fecaca' : '#cbd5e1'}`,
                            padding: '2px 8px', 
                            borderRadius: '4px', 
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            flexShrink: 0
                          }}>
                            <Check size={11} />
                            {ans.status} • Completed {ans.completedAt || 'Today'}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px', marginLeft: '32px' }}>
                        Phase: <strong>{item.checklist_phase}</strong> • Category: <strong>{item.category}</strong>
                      </div>

                      {item.expected_result && (
                        <div className="checklist-item-instructions" style={{ marginLeft: '32px' }}>
                          <strong>Acceptance Standard:</strong> {item.expected_result}
                        </div>
                      )}

                      {ans.status === 'Fail' && item.failure_action && (
                        <div style={{ marginLeft: '32px', marginTop: '6px', fontSize: '0.78rem', color: 'var(--color-danger)', backgroundColor: 'var(--color-danger-subtle)', padding: '4px 8px', borderRadius: '4px' }}>
                          ⚠️ <strong>Action Required:</strong> {item.failure_action}
                        </div>
                      )}
                    </div>

                    <div className="checklist-item-controls">
                      {isNumeric && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="number"
                            step="any"
                            className="form-control"
                            style={{ 
                              width: '100px', 
                              padding: '6px 10px', 
                              borderColor: isOutOfTolerance ? 'var(--color-danger)' : undefined,
                              backgroundColor: isOutOfTolerance ? 'var(--color-danger-subtle)' : undefined
                            }}
                            placeholder="Reading"
                            value={ans.measuredValue}
                            onChange={(e) => handleValueChange(item.id, e.target.value, item)}
                          />
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.unit || 'units'}</span>
                        </div>
                      )}

                      <div className="toggle-group">
                        <button
                          type="button"
                          className={`toggle-btn pass ${ans.status === 'Pass' ? 'active' : ''}`}
                          onClick={() => handleStatusChange(item.id, 'Pass')}
                          title={ans.status === 'Pass' ? 'Click to unselect and set back to Pending' : 'Mark as Pass'}
                        >
                          Pass
                        </button>
                        <button
                          type="button"
                          className={`toggle-btn fail ${ans.status === 'Fail' ? 'active' : ''}`}
                          onClick={() => handleStatusChange(item.id, 'Fail')}
                          title={ans.status === 'Fail' ? 'Click to unselect and set back to Pending' : 'Mark as Fail'}
                        >
                          Fail
                        </button>
                        <button
                          type="button"
                          className={`toggle-btn na ${ans.status === 'N/A' ? 'active' : ''}`}
                          onClick={() => handleStatusChange(item.id, 'N/A')}
                          title={ans.status === 'N/A' ? 'Click to unselect and set back to Pending' : 'Mark as N/A'}
                        >
                          N/A
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Engineer Summary & Parts */}
          <div className="card" style={{ padding: '16px' }}>
            <h4 style={{ fontSize: '0.9rem', marginBottom: '12px' }}>Maintenance Findings & Spare Parts</h4>
            <div className="form-group">
              <label className="form-label">Parts / Consumables Replaced</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Bacterial Filter, O-Ring Seal Kit, Blood Leak Detector calibration tube"
                value={partsReplaced}
                onChange={(e) => setPartsReplaced(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Technician Final Remarks & Observations</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="Add any technical remarks, calibration observations, or interim inspection notes..."
                value={engineerNotes}
                onChange={(e) => setEngineerNotes(e.target.value)}
              />
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
