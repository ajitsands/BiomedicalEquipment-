import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { updateSiteDeficiency } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { 
  AlertOctagon, 
  Clock, 
  CheckCircle2, 
  User, 
  Wrench, 
  Calendar, 
  FileText, 
  Save, 
  RefreshCw,
  ShieldAlert,
  AlertTriangle,
  Building
} from 'lucide-react';

export default function SiteDeficiencyModal({
  isOpen,
  onClose,
  deficiency,
  onSuccess,
  onShowToast
}) {
  const { formatDate } = useSettings();
  const [formData, setFormData] = useState({
    id: 0,
    status: 'Open',
    priority: 'High',
    contractor_assigned: '',
    corrective_action_plan: '',
    evidence_attachment_url: '',
    resolved_by: '',
    verified_by: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (deficiency) {
      setFormData({
        id: deficiency.id,
        status: deficiency.status || 'Open',
        priority: deficiency.priority || 'High',
        contractor_assigned: deficiency.contractor_assigned || '',
        corrective_action_plan: deficiency.corrective_action_plan || '',
        evidence_attachment_url: deficiency.evidence_attachment_url || '',
        resolved_by: deficiency.resolved_by || '',
        verified_by: deficiency.verified_by || ''
      });
    }
  }, [deficiency]);

  if (!isOpen || !deficiency) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateSiteDeficiency(formData);
      if (onShowToast) {
        onShowToast({
          type: 'success',
          title: 'Deficiency Updated',
          message: `${deficiency.deficiency_ticket} status updated to ${formData.status}.`
        });
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      if (onShowToast) {
        onShowToast({
          type: 'error',
          title: 'Update Failed',
          message: err.message
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isCritical = deficiency.priority === 'Critical';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Site Deficiency: ${deficiency.deficiency_ticket}`}
      subtitle={`${deficiency.category_code} • ${deficiency.assigned_department} • ${deficiency.title}`}
      icon={AlertOctagon}
      size="lg"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Deficiency Info Card */}
        <div style={{
          backgroundColor: isCritical ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-card)',
          border: isCritical ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: isCritical ? 'var(--color-danger)' : 'var(--text-main)' }}>
              {deficiency.title}
            </span>
            <span className={`badge ${
              deficiency.priority === 'Critical' ? 'badge-danger' : 
              deficiency.priority === 'High' ? 'badge-warning' : 'badge-neutral'
            }`}>
              {deficiency.priority} Priority
            </span>
          </div>

          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
            {deficiency.description}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <div><strong>Audit Reference:</strong> {deficiency.audit_number || 'Site Audit'}</div>
            <div><strong>Department:</strong> {deficiency.department_name} ({deficiency.room_number})</div>
            <div><strong>Standard Tolerance:</strong> {deficiency.standard_tolerance || 'Per OEM specification'}</div>
            <div><strong>Logged Date:</strong> {formatDate(deficiency.created_at)}</div>
          </div>
        </div>

        {/* Status & Priority Selection */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Workflow Remediation Status</label>
            <select
              className="form-control"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="Open">Open — Newly Logged</option>
              <option value="Assigned to department">Assigned to Department / Contractor</option>
              <option value="In progress">In Progress — Work Underway</option>
              <option value="Awaiting verification">Awaiting Biomedical Verification</option>
              <option value="Closed after verification">Closed after Verification (Resolved)</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Priority Severity</label>
            <select
              className="form-control"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            >
              <option value="Critical">Critical — Potential Safety Hazard (Blocks Delivery)</option>
              <option value="High">High — Blocks Installation / Commissioning</option>
              <option value="Medium">Medium — Required Correction Before Clinical Use</option>
              <option value="Low">Low — Non-critical / Documentation Follow-up</option>
            </select>
          </div>
        </div>

        {/* Assigned Contractor */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontWeight: 600 }}>Assigned Contractor / Subcontractor Lead</label>
          <input
            type="text"
            className="form-control"
            value={formData.contractor_assigned}
            onChange={(e) => setFormData({ ...formData, contractor_assigned: e.target.value })}
            placeholder="e.g. Al-Bawani Mechanical Division, General Contractor MEP Lead"
          />
        </div>

        {/* Corrective Action Plan */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontWeight: 600 }}>Corrective Action Plan & Rectification Details</label>
          <textarea
            className="form-control"
            rows="3"
            value={formData.corrective_action_plan}
            onChange={(e) => setFormData({ ...formData, corrective_action_plan: e.target.value })}
            placeholder="Describe the technical remediation steps taken by the contractor to resolve this deficiency..."
          />
        </div>

        {/* Sign-offs for Verification */}
        {formData.status === 'Closed after verification' && (
          <div style={{
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px'
          }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Contractor Representative (Resolved By)</label>
              <input
                type="text"
                className="form-control"
                value={formData.resolved_by}
                onChange={(e) => setFormData({ ...formData, resolved_by: e.target.value })}
                placeholder="Contractor Lead Name"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Biomedical Engineer (Verified By)</label>
              <input
                type="text"
                className="form-control"
                value={formData.verified_by}
                onChange={(e) => setFormData({ ...formData, verified_by: e.target.value })}
                placeholder="Biomedical Lead Name"
              />
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {submitting ? <RefreshCw size={15} className="spin" /> : <Save size={15} />}
            <span>{submitting ? 'Saving Updates...' : 'Update Deficiency Ticket'}</span>
          </button>
        </div>

      </form>
    </Modal>
  );
}
