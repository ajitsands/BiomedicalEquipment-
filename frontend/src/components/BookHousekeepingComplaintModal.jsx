import React, { useState, useEffect } from 'react';
import { 
  X, 
  AlertTriangle, 
  Sparkles, 
  Building2, 
  Clock, 
  ShieldAlert, 
  Send, 
  Layers, 
  MapPin, 
  AlertOctagon, 
  FileText,
  UserCheck
} from 'lucide-react';
import { fetchDepartments, createHousekeepingComplaint, fetchHousekeepingCategories } from '../services/api';

export default function BookHousekeepingComplaintModal({ isOpen, onClose, onSuccess, onShowToast }) {
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    category_code: 'HK-01',
    title: '',
    description: '',
    department_id: '',
    building: 'Main Clinical Tower',
    floor: 'Floor 1',
    room_number: '',
    specific_location: '',
    cleaning_type: 'Routine',
    risk_level: 'Medium',
    standard_layer: 'HOSPITAL_SOP',
    is_repeat: false,
    assigned_team: 'Internal Housekeeping Team',
    assigned_employee: '',
    contractor_name: 'Sanitary Services Co. W.L.L',
    corrective_action_required: '',
    target_sla_hours: 4,
    reported_by: 'Ward Nurse In-Charge',
    photo_before: ''
  });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
      loadInitialData();
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [catsRes, deptsRes] = await Promise.all([
        fetchHousekeepingCategories(),
        fetchDepartments()
      ]);
      setCategories(catsRes.data || []);
      setDepartments(deptsRes.data || []);
      
      if (catsRes.data && catsRes.data.length > 0) {
        const first = catsRes.data[0];
        setFormData(prev => ({
          ...prev,
          category_code: first.code,
          risk_level: first.risk_level || 'Medium',
          target_sla_hours: first.default_sla_hours || 4
        }));
      }
    } catch (err) {
      console.error('Failed to load complaint modal data', err);
      onShowToast({ type: 'error', title: 'Data Load Error', message: 'Could not load housekeeping categories' });
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (e) => {
    const code = e.target.value;
    const cat = categories.find(c => c.code === code);
    setFormData(prev => ({
      ...prev,
      category_code: code,
      risk_level: cat ? cat.risk_level : prev.risk_level,
      target_sla_hours: cat ? cat.default_sla_hours : prev.target_sla_hours,
      standard_layer: (code === 'HK-04' || code === 'HK-07' || code === 'HK-08' || code === 'HK-15') ? 'NHRA_BAHRAIN' : prev.standard_layer
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      onShowToast({ type: 'error', title: 'Validation Failed', message: 'Please provide a complaint title / issue description' });
      return;
    }
    if (!formData.room_number.trim()) {
      onShowToast({ type: 'error', title: 'Validation Failed', message: 'Please specify the room number or area' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await createHousekeepingComplaint(formData);
      onShowToast({ 
        type: 'success', 
        title: 'Complaint Logged', 
        message: `Ticket ${res.data?.complaint_number} created successfully` 
      });
      onSuccess && onSuccess(res.data);
      onClose();
    } catch (err) {
      console.error('Complaint creation error', err);
      onShowToast({ 
        type: 'error', 
        title: 'Submission Error', 
        message: err.message || 'Failed to create housekeeping complaint' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content-card modal-lg" 
        style={{ maxWidth: '840px', width: '95%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
              <ShieldAlert size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Log Housekeeping Complaint & Work Order</h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                HK-01 to HK-16 Master Protocol | Bahrain NHRA & WHO Compliance
              </p>
            </div>
          </div>
          <button 
            type="button" 
            className="btn-icon" 
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            {/* Category HK-01 to HK-16 */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                Complaint Category (HK-01 to HK-16) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select 
                className="form-control" 
                value={formData.category_code} 
                onChange={handleCategoryChange}
                required
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)' }}
              >
                {categories.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name} ({c.risk_level} Risk)
                  </option>
                ))}
              </select>
            </div>

            {/* Standard Layer */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                Standard Layer Classification
              </label>
              <select 
                className="form-control" 
                value={formData.standard_layer} 
                onChange={(e) => setFormData(prev => ({ ...prev, standard_layer: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)' }}
              >
                <option value="NHRA_BAHRAIN">🇧🇭 Bahrain NHRA Regulatory Non-Compliance</option>
                <option value="WHO_2023">🌐 WHO Environmental Cleaning & Infection Standard</option>
                <option value="HOSPITAL_SOP">🏥 Hospital Approved Service SOP</option>
              </select>
            </div>
          </div>

          {/* Title */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
              Complaint Title / Observed Deficiency <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="e.g. Bed rails not disinfected / Blood spill in Triage / Bin overflowing"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
              style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)' }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
              Deficiency Details & Context
            </label>
            <textarea 
              rows={2}
              className="form-control" 
              placeholder="Detail the exact condition observed, surface cleanliness, odor, or safety hazard..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)' }}
            />
          </div>

          {/* Location Grid: Department, Building, Floor, Room */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', fontWeight: 600 }}>Department</label>
              <select 
                className="form-control"
                value={formData.department_id}
                onChange={(e) => setFormData(prev => ({ ...prev, department_id: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', fontSize: '0.85rem' }}
              >
                <option value="">Select Dept...</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', fontWeight: 600 }}>Building</label>
              <input 
                type="text" 
                className="form-control" 
                value={formData.building}
                onChange={(e) => setFormData(prev => ({ ...prev, building: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', fontWeight: 600 }}>Floor</label>
              <input 
                type="text" 
                className="form-control" 
                value={formData.floor}
                onChange={(e) => setFormData(prev => ({ ...prev, floor: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', fontWeight: 600 }}>
                Room / Bay <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. Room 204"
                value={formData.room_number}
                onChange={(e) => setFormData(prev => ({ ...prev, room_number: e.target.value }))}
                required
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* Operational Details Grid: Cleaning Type, Risk, SLA, Repeat Check */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', fontWeight: 600 }}>Cleaning Type</label>
              <select 
                className="form-control"
                value={formData.cleaning_type}
                onChange={(e) => setFormData(prev => ({ ...prev, cleaning_type: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', fontSize: '0.85rem' }}
              >
                <option value="Routine">Routine Cleaning</option>
                <option value="Scheduled">Scheduled Periodic</option>
                <option value="Discharge/Terminal">Discharge / Terminal Clean</option>
                <option value="Spill Response">Emergency Spill Response</option>
                <option value="Deep Cleaning">Deep Disinfection</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', fontWeight: 600 }}>Risk Level</label>
              <select 
                className="form-control"
                value={formData.risk_level}
                onChange={(e) => setFormData(prev => ({ ...prev, risk_level: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', fontSize: '0.85rem' }}
              >
                <option value="Critical">🔴 Critical (Immediate)</option>
                <option value="High">🟠 High (1-2h)</option>
                <option value="Medium">🔵 Medium (4h)</option>
                <option value="Low">🟢 Low (8h)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', fontWeight: 600 }}>Target SLA (Hours)</label>
              <input 
                type="number" 
                min="1" 
                max="72"
                className="form-control" 
                value={formData.target_sla_hours}
                onChange={(e) => setFormData(prev => ({ ...prev, target_sla_hours: parseInt(e.target.value) || 4 }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, marginTop: '16px' }}>
                <input 
                  type="checkbox" 
                  checked={formData.is_repeat}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_repeat: e.target.checked }))}
                  style={{ width: '16px', height: '16px' }}
                />
                <span style={{ color: formData.is_repeat ? '#dc2626' : 'inherit' }}>Repeat Complaint?</span>
              </label>
            </div>
          </div>

          {/* Corrective Action Required & Responsible Team */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                Required Corrective Action
              </label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. Deploy 1,000 PPM chlorine bleach, mop floor, and replace soap dispenser"
                value={formData.corrective_action_required}
                onChange={(e) => setFormData(prev => ({ ...prev, corrective_action_required: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                Responsible Housekeeping Team / Contractor
              </label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. Sanitary Services Co. / Ward Housekeeping"
                value={formData.assigned_team}
                onChange={(e) => setFormData(prev => ({ ...prev, assigned_team: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)' }}
              />
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
              disabled={submitting}
              style={{ padding: '8px 18px', borderRadius: '6px' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={submitting}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 20px', borderRadius: '6px', background: '#dc2626', borderColor: '#dc2626' }}
            >
              <Send size={16} />
              {submitting ? 'Logging...' : 'Create Complaint Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
