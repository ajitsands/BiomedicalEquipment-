import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { fetchPmAssignments, savePmAssignments } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { 
  Users, 
  ShieldCheck, 
  UserCheck, 
  Zap, 
  Wrench, 
  Printer, 
  Save, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Building2,
  Calendar,
  Sparkles,
  Smartphone
} from 'lucide-react';

export default function AssignPhasesModal({
  isOpen,
  onClose,
  equipment,
  pmDueDate,
  onOpenPrintWorksheet,
  onShowToast
}) {
  const { formatDate } = useSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [equipmentData, setEquipmentData] = useState(equipment);
  const [phases, setPhases] = useState([]);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    if (isOpen && equipment) {
      loadData();
    }
  }, [isOpen, equipment]);

  const loadData = async () => {
    try {
      setLoading(true);
      const eqId = equipment.id || equipment.equipment_id;
      const res = await fetchPmAssignments(eqId, pmDueDate);
      if (res && res.status === 'success') {
        setEquipmentData(res.data.equipment || equipment);
        setPhases(res.data.phases || []);
        setEmployees(res.data.employees || []);
      }
    } catch (err) {
      console.error('Failed to load assignments:', err);
      if (onShowToast) {
        onShowToast({ type: 'error', title: 'Load Error', message: err.message || 'Could not load phase assignments' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeChange = (phaseKey, employeeId) => {
    const selectedEmp = employees.find(e => String(e.id) === String(employeeId));
    setPhases(prev => prev.map(p => {
      if (p.phase_key === phaseKey) {
        return {
          ...p,
          assigned_employee_id: selectedEmp ? selectedEmp.id : null,
          assigned_employee_name: selectedEmp ? selectedEmp.full_name : 'Unassigned',
          assigned_employee_badge: selectedEmp ? selectedEmp.employee_code : 'STAFF-01'
        };
      }
      return p;
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const eqId = equipmentData?.id || equipment.id;
      await savePmAssignments({
        equipment_id: eqId,
        pm_due_date: pmDueDate || equipmentData?.next_pm_due_date || new Date().toISOString().slice(0, 10),
        assignments: phases.map(p => ({
          phase_key: p.phase_key,
          phase_name: p.phase_name,
          assigned_employee_id: p.assigned_employee_id,
          assigned_employee_name: p.assigned_employee_name,
          assigned_employee_badge: p.assigned_employee_badge
        }))
      });

      if (onShowToast) {
        onShowToast({
          type: 'success',
          title: 'Assignments Saved',
          message: 'Technicians assigned! They can now access their phases on mobile or via printed worksheets.'
        });
      }
      onClose();
    } catch (err) {
      if (onShowToast) {
        onShowToast({ type: 'error', title: 'Save Failed', message: err.message });
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const getPhaseIcon = (key) => {
    if (key === 'PRE_USE') return <UserCheck size={18} color="#0284c7" />;
    if (key === 'PM_TECH') return <ShieldCheck size={18} color="#059669" />;
    if (key === 'ELECTRICAL') return <Zap size={18} color="#d97706" />;
    if (key === 'CORRECTIVE') return <Wrench size={18} color="#e11d48" />;
    return <Users size={18} />;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Delegate PM Phases & Assign Technicians • ${equipmentData?.asset_id || equipmentData?.name || 'Device'}`}
      icon={Users}
      size="lg"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {onOpenPrintWorksheet && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  onOpenPrintWorksheet(equipmentData, pmDueDate, 'ALL');
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Printer size={15} />
                <span>Print All A4 Worksheets</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Save size={15} />
              <span>{saving ? 'Saving...' : 'Save & Notify Technicians'}</span>
            </button>
          </div>
        </div>
      }
    >
      {/* Device Overview Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(14, 165, 233, 0.04) 100%)',
        border: '1px solid rgba(2, 132, 199, 0.2)',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {equipmentData?.name} ({equipmentData?.asset_id})
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {equipmentData?.brand} • {equipmentData?.model_number} • SN: {equipmentData?.serial_number || 'N/A'} • {equipmentData?.department_name}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Scheduled PM Due:</span>
          <strong style={{ color: '#0284c7', fontSize: '0.9rem' }}>
            {formatDate(pmDueDate || equipmentData?.next_pm_due_date || new Date().toISOString().slice(0, 10))}
          </strong>
        </div>
      </div>

      {/* Instructions */}
      <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
        Assign different staff members to each stage of this Preventive Maintenance job based on their role and clinical clearance. Assigned technicians can scan the machine's QR code on mobile or receive a physical A4 printed worksheet if mobile phones are restricted in the area.
      </p>

      {/* Phase Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {phases.map((phase) => {
          const isCompleted = phase.status === 'Completed';

          return (
            <div
              key={phase.phase_key}
              style={{
                background: 'var(--card-bg, #fff)',
                border: `1px solid ${isCompleted ? '#10b981' : 'var(--border-color, #e2e8f0)'}`,
                borderLeft: `4px solid ${isCompleted ? '#10b981' : phase.phase_key === 'ELECTRICAL' ? '#f59e0b' : '#0284c7'}`,
                borderRadius: '8px',
                padding: '14px 16px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              {/* Left: Phase Title & Icon */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '240px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: isCompleted ? 'rgba(16, 185, 129, 0.12)' : 'rgba(2, 132, 199, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {getPhaseIcon(phase.phase_key)}
                </div>

                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                    {phase.phase_name}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Status: <strong style={{ color: isCompleted ? '#059669' : '#d97706' }}>{phase.status}</strong>
                    {isCompleted && phase.completed_by && ` • Completed by ${phase.completed_by}`}
                  </div>
                </div>
              </div>

              {/* Middle: Assign Employee Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px', maxWidth: '340px' }}>
                <select
                  className="form-control"
                  style={{ fontSize: '0.85rem', padding: '6px 10px' }}
                  value={phase.assigned_employee_id || ''}
                  onChange={(e) => handleEmployeeChange(phase.phase_key, e.target.value)}
                  disabled={isCompleted}
                >
                  <option value="">-- Select Staff / Technician --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.role} • {emp.employee_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Right: Quick Print A4 for this specific phase */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {onOpenPrintWorksheet && (
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => {
                      onOpenPrintWorksheet(equipmentData, pmDueDate, phase.phase_key, {
                        name: phase.assigned_employee_name,
                        badge: phase.assigned_employee_badge
                      });
                    }}
                    title="Print single A4 sheet for this phase only"
                    style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Printer size={13} />
                    <span>Print A4</span>
                  </button>
                )}

                {phase.paper_scanned_photo_url && (
                  <a
                    href={phase.paper_scanned_photo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-ghost"
                    style={{ color: '#0284c7', fontSize: '0.78rem' }}
                    title="View uploaded photo of physical signed paper"
                  >
                    📷 View Paper
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
