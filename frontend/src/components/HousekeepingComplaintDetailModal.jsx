import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldAlert, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Building2, 
  MapPin, 
  UserCheck, 
  FileText, 
  Sparkles,
  Save,
  Trash2
} from 'lucide-react';
import { fetchHousekeepingComplaintDetail, updateHousekeepingComplaint, deleteHousekeepingComplaint } from '../services/api';

export default function HousekeepingComplaintDetailModal({ 
  complaintId, 
  isOpen, 
  onClose, 
  onSuccess, 
  onShowToast 
}) {
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [status, setStatus] = useState('Open');
  const [riskLevel, setRiskLevel] = useState('Medium');
  const [assignedTeam, setAssignedTeam] = useState('');
  const [assignedEmployee, setAssignedEmployee] = useState('');
  const [correctiveActionTaken, setCorrectiveActionTaken] = useState('');
  const [verifiedBy, setVerifiedBy] = useState('');
  const [closureNotes, setClosureNotes] = useState('');

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
    if (isOpen && complaintId) {
      loadComplaint();
    }
  }, [isOpen, complaintId]);

  const loadComplaint = async () => {
    setLoading(true);
    try {
      const res = await fetchHousekeepingComplaintDetail(complaintId);
      const c = res.data;
      setComplaint(c);
      setStatus(c.status);
      setRiskLevel(c.risk_level);
      setAssignedTeam(c.assigned_team || '');
      setAssignedEmployee(c.assigned_employee || '');
      setCorrectiveActionTaken(c.corrective_action_taken || '');
      setVerifiedBy(c.verified_by || '');
      setClosureNotes(c.closure_notes || '');
    } catch (err) {
      console.error('Failed to load complaint', err);
      onShowToast({ type: 'error', title: 'Load Error', message: 'Could not load complaint ticket' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const payload = {
        id: complaintId,
        status,
        risk_level: riskLevel,
        assigned_team: assignedTeam,
        assigned_employee: assignedEmployee,
        corrective_action_taken: correctiveActionTaken,
        verified_by: verifiedBy,
        closure_notes: closureNotes
      };
      await updateHousekeepingComplaint(payload);
      onShowToast({ type: 'success', title: 'Ticket Updated', message: `Complaint ${complaint?.complaint_number} updated successfully` });
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      console.error('Update error', err);
      onShowToast({ type: 'error', title: 'Update Failed', message: err.message || 'Could not update ticket' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete complaint ${complaint?.complaint_number}?`)) {
      return;
    }
    try {
      await deleteHousekeepingComplaint(complaintId);
      onShowToast({ type: 'success', title: 'Deleted', message: 'Complaint ticket deleted successfully' });
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      console.error('Delete error', err);
      onShowToast({ type: 'error', title: 'Delete Failed', message: err.message || 'Could not delete ticket' });
    }
  };

  if (!isOpen || !complaint) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content-card modal-lg" 
        style={{ maxWidth: '840px', width: '95%', maxHeight: '92vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.12)', color: '#dc2626' }}>
              {complaint.complaint_number}
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                {complaint.title}
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {complaint.category_code} — {complaint.category_name}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              type="button" 
              onClick={handleDelete}
              className="btn btn-sm"
              title="Delete ticket"
              style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
            >
              <Trash2 size={18} />
            </button>
            <button 
              type="button" 
              className="btn-icon" 
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div style={{ padding: '20px 24px' }}>
          
          {/* Top Info Banner */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', background: 'var(--bg-secondary)', padding: '14px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.83rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem', fontWeight: 600 }}>LOCATION:</span>
              <strong>{complaint.room_number}</strong>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{complaint.building} - {complaint.floor}</div>
            </div>

            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem', fontWeight: 600 }}>STANDARD LAYER:</span>
              <strong style={{ color: complaint.standard_layer === 'NHRA_BAHRAIN' ? '#dc2626' : '#0284c7' }}>
                {complaint.standard_layer === 'NHRA_BAHRAIN' ? '🇧🇭 NHRA Bahrain' : (complaint.standard_layer === 'WHO_2023' ? '🌐 WHO 2023' : '🏥 Hospital SOP')}
              </strong>
            </div>

            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem', fontWeight: 600 }}>CLEANING TYPE:</span>
              <strong>{complaint.cleaning_type}</strong>
            </div>

            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem', fontWeight: 600 }}>REPORTED BY:</span>
              <strong>{complaint.reported_by}</strong>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{new Date(complaint.reported_at).toLocaleDateString()}</div>
            </div>
          </div>

          {/* Description & Required Action */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
              DEFICIENCY DETAILS
            </label>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px', fontSize: '0.9rem', lineHeight: '1.5' }}>
              {complaint.description || 'No extended description recorded.'}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
              REQUIRED CORRECTIVE ACTION
            </label>
            <div style={{ background: 'rgba(239, 68, 68, 0.04)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', padding: '12px', fontSize: '0.9rem', color: '#991b1b', fontWeight: 500 }}>
              {complaint.corrective_action_required || 'Standard cleaning protocol execution required.'}
            </div>
          </div>

          {/* Update Action Panel */}
          <div style={{ borderTop: '2px solid var(--border-color)', paddingTop: '18px' }}>
            <h4 style={{ margin: '0 0 14px 0', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} style={{ color: 'var(--color-primary)' }} />
              Resolution & Supervisor Verification
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.82rem', fontWeight: 600 }}>Ticket Status</label>
                <select 
                  className="form-control"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', fontSize: '0.85rem' }}
                >
                  <option value="Open">🔴 Open (Pending Action)</option>
                  <option value="In Progress">🟡 In Progress (Assigned)</option>
                  <option value="Pending Verification">🔵 Pending Supervisor Verification</option>
                  <option value="Closed">🟢 Closed (Verified & Cleared)</option>
                  <option value="Escalated">⚠️ Escalated (HICC / Vendor Penalty)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.82rem', fontWeight: 600 }}>Risk Priority</label>
                <select 
                  className="form-control"
                  value={riskLevel}
                  onChange={(e) => setRiskLevel(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', fontSize: '0.85rem' }}
                >
                  <option value="Critical">🔴 Critical (Immediate)</option>
                  <option value="High">🟠 High</option>
                  <option value="Medium">🔵 Medium</option>
                  <option value="Low">🟢 Low</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.82rem', fontWeight: 600 }}>Assigned Team / Contractor</label>
                <input 
                  type="text" 
                  className="form-control"
                  value={assignedTeam}
                  onChange={(e) => setAssignedTeam(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            {/* Corrective Action Taken */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.82rem', fontWeight: 600 }}>
                Corrective Action Taken by Housekeeping Team
              </label>
              <textarea 
                rows={2}
                className="form-control"
                placeholder="Describe action executed (e.g. Area disinfected with 1000 PPM sodium hypochlorite, floor dried, soap refilled)..."
                value={correctiveActionTaken}
                onChange={(e) => setCorrectiveActionTaken(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', fontSize: '0.85rem' }}
              />
            </div>

            {/* Verification & Closure */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.82rem', fontWeight: 600 }}>Supervisor Verification Sign-off</label>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="Supervisor / Quality Auditor Name (e.g. Tariq Al-Mansoor)"
                  value={verifiedBy}
                  onChange={(e) => setVerifiedBy(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.82rem', fontWeight: 600 }}>Closure Verification Notes</label>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="e.g. Swab test passed, room ready for use"
                  value={closureNotes}
                  onChange={(e) => setClosureNotes(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', fontSize: '0.85rem' }}
                />
              </div>
            </div>

          </div>

          {/* Action Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={handleUpdate}
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0284c7', borderColor: '#0284c7' }}
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save & Update Ticket'}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
