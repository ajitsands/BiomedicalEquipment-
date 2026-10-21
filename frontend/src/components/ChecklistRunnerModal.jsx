import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { 
  fetchChecklistTemplates, 
  submitMaintenanceRecord 
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
  Zap
} from 'lucide-react';

export default function ChecklistRunnerModal({
  equipment,
  isOpen,
  onClose,
  onSuccess,
  onShowToast
}) {
  const [template, setTemplate] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activePhase, setActivePhase] = useState('ALL'); // 'ALL' or specific phase

  // Form State
  const [performedBy, setPerformedBy] = useState('Eng. Hassan Al-Majed (SaNDS Lab)');
  const [technicianBadge, setTechnicianBadge] = useState('SAND-BME-01');
  const [performedDate, setPerformedDate] = useState(new Date().toISOString().slice(0, 10));
  const [timeSpent, setTimeSpent] = useState(45);
  const [testEquipment, setTestEquipment] = useState('Fluke ESA620 Electrical Safety Analyzer, Rigel 288+');
  const [engineerNotes, setEngineerNotes] = useState('');
  const [partsReplaced, setPartsReplaced] = useState('');

  // Item Answers Map: { [itemId]: { status: 'Pass'|'Fail'|'N/A', measuredValue: '', remarks: '' } }
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    if (isOpen && equipment) {
      loadChecklist();
    }
  }, [isOpen, equipment]);

  const loadChecklist = async () => {
    try {
      setLoading(true);
      const res = await fetchChecklistTemplates(false, equipment.equipment_type_id);
      setTemplate(res.template);
      setItems(res.items || []);

      // Initialize answers
      const initAnswers = {};
      (res.items || []).forEach(item => {
        initAnswers[item.id] = {
          status: 'Pass',
          measuredValue: '',
          remarks: ''
        };
      });
      setAnswers(initAnswers);
      setActivePhase('ALL');
    } catch (err) {
      onShowToast({ type: 'error', title: 'Error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (itemId, newStatus) => {
    setAnswers(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        status: newStatus
      }
    }));
  };

  const handleValueChange = (itemId, val, item) => {
    let autoStatus = 'Pass';
    if (item.check_type === 'numeric' && val !== '') {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        if (item.min_value !== null && num < item.min_value) autoStatus = 'Fail';
        if (item.max_value !== null && num > item.max_value) autoStatus = 'Fail';
      }
    }

    setAnswers(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        measuredValue: val,
        status: autoStatus
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

  // Filter items by active tab selection
  const displayedItems = (() => {
    if (activePhase === 'ALL') return items;
    if (activePhase === 'PRE_USE' || activePhase === 'User pre-use / routine check') return preUseItems;
    if (activePhase === 'PM' || activePhase === 'Preventive maintenance / technical inspection') return pmItems;
    if (activePhase === 'ELECTRICAL' || activePhase === 'Electrical Safety (IEC 62353)') return electricalItems;
    if (activePhase === 'CORRECTIVE' || activePhase === 'Complaint / corrective maintenance') return correctiveItems;
    return items;
  })();

  // Calculate Overall Result
  const totalItems = items.length;
  const passCount = Object.values(answers).filter(a => a.status === 'Pass').length;
  const failCount = Object.values(answers).filter(a => a.status === 'Fail').length;
  const overallResult = failCount > 0 
    ? 'Failed - Immediate Attention Required' 
    : (passCount === totalItems ? 'Passed - Ready for Clinical Use' : 'Passed with Observation');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!performedBy) {
      onShowToast({ type: 'warning', title: 'Required', message: 'Please provide technician name' });
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
        equipment_id: equipment.id,
        template_id: template?.id || null,
        performed_by: performedBy,
        technician_badge: technicianBadge,
        performed_date: performedDate,
        overall_result: overallResult,
        time_spent_minutes: timeSpent,
        test_equipment_used: testEquipment,
        engineer_notes: engineerNotes,
        parts_replaced: partsReplaced,
        items: itemsPayload
      };

      const res = await submitMaintenanceRecord(payload);
      
      if (overallResult.includes('Passed')) {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      }

      onShowToast({
        type: overallResult.includes('Passed') ? 'success' : 'warning',
        title: 'Checklist Executed',
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Execute WHO Checklist • ${equipment.name}`}
      icon={CheckSquare}
      size="lg"
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.84rem' }}>Evaluation:</span>
            <span className={`badge ${overallResult.includes('Passed') ? 'badge-success' : 'badge-danger'}`}>
              {overallResult}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              ({passCount} Passed, {failCount} Failed of {totalItems})
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button 
              type="button" 
              className={`btn btn-sm ${overallResult.includes('Passed') ? 'btn-success' : 'btn-danger'}`}
              onClick={handleSubmit}
              disabled={submitting || loading}
            >
              <Award size={15} />
              {submitting ? 'Submitting...' : 'Sign-Off & Complete PM Certificate'}
            </button>
          </div>
        </div>
      }
    >
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading WHO-standard inspection checklist for {equipment.equipment_type_name}...
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Header Card */}
          <div style={{ 
            backgroundColor: 'var(--bg-subtle)', 
            padding: '16px 20px', 
            borderRadius: 'var(--radius-md)', 
            marginBottom: '20px',
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
                {template?.title || `${equipment.equipment_type_name} Maintenance Inspection Protocol`}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Standard: {template?.standard_reference || 'IEC 62353 / WHO CMMS'} • {items.length} Verification Steps Total
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                  Safety: {equipment.protection_class || 'Class I'}
                </span>
                {equipment.applied_part_type && equipment.applied_part_type !== 'None' && (
                  <span className={`badge ${equipment.applied_part_type === 'CF' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '0.72rem' }}>
                    Type {equipment.applied_part_type} Patient Contact
                  </span>
                )}
                <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                  Recurrent PM: {equipment.maintenance_schedule_type || 'Quarterly'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Hospital Asset ID</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{equipment.asset_id}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Serial Number</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{equipment.serial_number}</div>
              </div>
            </div>
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

          {/* Phase Filter Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
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

          {/* Checklist Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            {displayedItems.map((item) => {
              const ans = answers[item.id] || { status: 'Pass', measuredValue: '', remarks: '' };
              const isNumeric = item.check_type === 'numeric';
              
              let isOutOfTolerance = false;
              if (isNumeric && ans.measuredValue !== '') {
                const n = parseFloat(ans.measuredValue);
                if (!isNaN(n)) {
                  if (item.min_value !== null && n < item.min_value) isOutOfTolerance = true;
                  if (item.max_value !== null && n > item.max_value) isOutOfTolerance = true;
                }
              }

              return (
                <div key={item.id} className="checklist-item-card">
                  <div className="checklist-item-info">
                    <div className="checklist-item-title">
                      <span style={{ 
                        width: '24px', 
                        height: '24px', 
                        borderRadius: '50%', 
                        background: 'var(--color-primary-subtle)', 
                        color: 'var(--color-primary)', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        flexShrink: 0
                      }}>
                        {item.step_number}
                      </span>
                      <span>{item.title}</span>
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
                      >
                        Pass
                      </button>
                      <button
                        type="button"
                        className={`toggle-btn fail ${ans.status === 'Fail' ? 'active' : ''}`}
                        onClick={() => handleStatusChange(item.id, 'Fail')}
                      >
                        Fail
                      </button>
                      <button
                        type="button"
                        className={`toggle-btn na ${ans.status === 'N/A' ? 'active' : ''}`}
                        onClick={() => handleStatusChange(item.id, 'N/A')}
                      >
                        N/A
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Engineer Summary & Parts */}
          <div className="card" style={{ padding: '16px' }}>
            <h4 style={{ fontSize: '0.9rem', marginBottom: '12px' }}>Maintenance Findings & Spare Parts</h4>
            <div className="form-group">
              <label className="form-label">Parts / Consumables Replaced</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Bacterial Filter, O-Ring Seal Kit, Battery pack"
                value={partsReplaced}
                onChange={(e) => setPartsReplaced(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Technician Final Remarks & Observations</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="Add any technical remarks, calibration observations, or recommendations..."
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
