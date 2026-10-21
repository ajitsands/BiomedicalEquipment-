import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import SelectSearch from './SelectSearch';
import { 
  bookComplaint, 
  fetchEquipments, 
  fetchDepartments, 
  fetchComplaintCodes 
} from '../services/api';
import { 
  AlertOctagon, 
  AlertTriangle, 
  Send, 
  MapPin, 
  User, 
  Phone, 
  Layers, 
  Tag 
} from 'lucide-react';

export default function BookComplaintModal({
  isOpen,
  onClose,
  preselectedEquipment = null,
  onSuccess,
  onShowToast
}) {
  const [equipments, setEquipments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [complaintCodes, setComplaintCodes] = useState([]);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [roomOrBed, setRoomOrBed] = useState('');
  const [bookedByName, setBookedByName] = useState('Staff Nurse Layla');
  const [bookedByRole, setBookedByRole] = useState('Staff Nurse In-Charge');
  const [bookedByPhone, setBookedByPhone] = useState('+973-3881-2299');
  const [selectedCode, setSelectedCode] = useState('');
  const [category, setCategory] = useState('Power / start-up');
  const [priority, setPriority] = useState('Critical - Life Support');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (preselectedEquipment) {
      setSelectedEquipmentId(preselectedEquipment.id);
      setDepartmentId(preselectedEquipment.department_id);
      setRoomOrBed(`${preselectedEquipment.room_number || ''} ${preselectedEquipment.bed_slot || ''}`.trim());
      if (preselectedEquipment.criticality?.includes('Critical')) {
        setPriority('Critical - Life Support');
      }
    }
  }, [preselectedEquipment]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [eqRes, deptRes, codeRes] = await Promise.all([
        fetchEquipments(),
        fetchDepartments(),
        fetchComplaintCodes()
      ]);
      setEquipments(eqRes.data || []);
      setDepartments(deptRes.data || []);
      setComplaintCodes(codeRes.data || []);
    } catch (err) {
      console.error('Error loading data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEquipmentSelect = (val, opt) => {
    setSelectedEquipmentId(val);
    if (opt) {
      setDepartmentId(opt.department_id);
      setRoomOrBed(`${opt.room_number || ''} ${opt.bed_slot || ''}`.trim());
      if (opt.criticality?.includes('Critical')) {
        setPriority('Critical - Life Support');
      }
    }
  };

  const handleComplaintCodeSelect = (e) => {
    const codeStr = e.target.value;
    setSelectedCode(codeStr);
    const found = complaintCodes.find(c => c.code === codeStr);
    if (found) {
      setCategory(found.category);
      if (!description) {
        setDescription(found.description);
      }
      if (found.priority_guidance?.toLowerCase().includes('critical')) {
        setPriority('Critical - Life Support');
      } else if (found.priority_guidance?.toLowerCase().includes('high')) {
        setPriority('High Priority');
      } else if (found.priority_guidance?.toLowerCase().includes('medium')) {
        setPriority('Medium');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEquipmentId || !description || !bookedByName) {
      onShowToast({ type: 'warning', title: 'Required Fields', message: 'Please select an equipment and describe the problem' });
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        equipment_id: Number(selectedEquipmentId),
        department_id: departmentId ? Number(departmentId) : undefined,
        room_or_bed: roomOrBed,
        booked_by_name: bookedByName,
        booked_by_role: bookedByRole,
        booked_by_phone: bookedByPhone,
        complaint_category: selectedCode ? `[${selectedCode}] ${category}` : category,
        priority,
        description
      };

      const res = await bookComplaint(payload);

      onShowToast({
        type: 'danger',
        title: 'Breakdown Ticket Booked',
        message: `Ticket ${res.ticket_number} logged! Emergency alert dispatched to Biomedical Engineering team.`
      });

      setDescription('');
      onSuccess && onSuccess(res);
      onClose();
    } catch (err) {
      onShowToast({ type: 'error', title: 'Booking Failed', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const equipmentOptions = equipments.map(eq => ({
    value: eq.id,
    label: `${eq.name} (${eq.asset_id})`,
    subLabel: `${eq.brand} ${eq.model_number} • Dept: ${eq.department_name} • ${eq.room_number}`,
    department_id: eq.department_id,
    room_number: eq.room_number,
    bed_slot: eq.bed_slot,
    criticality: eq.criticality
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Rapid Emergency Complaint Booking"
      icon={AlertOctagon}
      size="md"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button 
            type="button" 
            className="btn btn-danger btn-sm" 
            onClick={handleSubmit}
            disabled={submitting || !selectedEquipmentId || !description}
          >
            <Send size={15} />
            {submitting ? 'Dispatching Ticket...' : 'Book Complaint & Dispatch Alert'}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit}>
        <div style={{ 
          backgroundColor: 'var(--color-danger-subtle)', 
          borderLeft: '4px solid var(--color-danger)', 
          padding: '12px 16px', 
          borderRadius: 'var(--radius-sm)',
          marginBottom: '18px',
          fontSize: '0.84rem',
          color: 'var(--color-danger-text)'
        }}>
          <strong>Clinical Safety Alert:</strong> This immediately flags device status as <em>Under Breakdown</em>, notifies the on-duty Biomedical Engineer, and logs an audit record.
        </div>

        {/* Equipment Selector (Select2 Style) */}
        <div className="form-group">
          <label className="form-label">Select Biomedical Equipment <span className="required">*</span></label>
          <SelectSearch
            options={equipmentOptions}
            value={selectedEquipmentId}
            onChange={handleEquipmentSelect}
            placeholder="Type device name, asset ID, or room..."
            subLabelKey="subLabel"
          />
        </div>

        {/* Standard WHO Complaint Codes */}
        <div className="form-group">
          <label className="form-label">
            WHO Standard Fault Code (Select to auto-populate defect & guidance):
          </label>
          <select
            className="form-control"
            value={selectedCode}
            onChange={handleComplaintCodeSelect}
          >
            <option value="">-- Choose Standard Complaint Code (Optional) --</option>
            {complaintCodes.map(c => (
              <option key={c.code} value={c.code}>
                {c.code}: {c.category} — {c.description.slice(0, 50)}...
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Complaint Category <span className="required">*</span></label>
            <input
              type="text"
              className="form-control"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Power / start-up, Alarm fault"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Severity / Priority <span className="required">*</span></label>
            <select
              className="form-control"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              style={{ fontWeight: 600, color: priority.includes('Critical') ? 'var(--color-danger)' : undefined }}
            >
              <option value="Critical - Life Support">🚨 Critical - Life Support (Emergency)</option>
              <option value="High Priority">⚠️ High Priority (Urgent)</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority / Routine</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Department / Ward</label>
            <select
              className="form-control"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="">Select Department...</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.floor})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Room / Bed / Bay Location</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. ICU Bed 04, Trauma Bay 1"
              value={roomOrBed}
              onChange={(e) => setRoomOrBed(e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Reported By Name <span className="required">*</span></label>
            <input
              type="text"
              className="form-control"
              value={bookedByName}
              onChange={(e) => setBookedByName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Role / Designation</label>
            <input
              type="text"
              className="form-control"
              value={bookedByRole}
              onChange={(e) => setBookedByRole(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contact Phone / Extension</label>
            <input
              type="text"
              className="form-control"
              value={bookedByPhone}
              onChange={(e) => setBookedByPhone(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Problem Symptoms & Description <span className="required">*</span></label>
          <textarea
            className="form-control"
            rows={3}
            placeholder="Describe what occurred, any error codes displayed on screen, and patient safety status..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
      </form>
    </Modal>
  );
}
