import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import SelectSearch from './SelectSearch';
import { 
  bookComplaint, 
  fetchEquipments, 
  fetchDepartments, 
  fetchComplaintCodes,
  fetchEmployees
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  AlertOctagon, 
  AlertTriangle, 
  Send, 
  MapPin, 
  User, 
  Phone, 
  Layers, 
  Tag,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export default function BookComplaintModal({
  isOpen,
  onClose,
  preselectedEquipment = null,
  onSuccess,
  onShowToast
}) {
  const { currentUser } = useAuth();
  const [equipments, setEquipments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [complaintCodes, setComplaintCodes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [roomOrBed, setRoomOrBed] = useState('');
  const [bookedByEmployeeId, setBookedByEmployeeId] = useState('');
  const [bookedByName, setBookedByName] = useState('');
  const [bookedByRole, setBookedByRole] = useState('');
  const [bookedByPhone, setBookedByPhone] = useState('');
  const [selectedCode, setSelectedCode] = useState('');
  const [category, setCategory] = useState('Power / start-up');
  const [priority, setPriority] = useState('Critical - Life Support');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setErrors({});
      loadData();
      if (currentUser) {
        setBookedByEmployeeId(currentUser.id);
        setBookedByName(currentUser.full_name);
        setBookedByRole(currentUser.designation || currentUser.role);
        setBookedByPhone(currentUser.phone || '');
        if (currentUser.department_id && !departmentId) {
          setDepartmentId(currentUser.department_id);
        }
      }
    }
  }, [isOpen, currentUser]);

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
      const [eqRes, deptRes, codeRes, empRes] = await Promise.all([
        fetchEquipments(),
        fetchDepartments(),
        fetchComplaintCodes(),
        fetchEmployees()
      ]);
      setEquipments(eqRes.data || []);
      setDepartments(deptRes.data || []);
      setComplaintCodes(codeRes.data || []);
      setEmployees(empRes.data || []);
    } catch (err) {
      console.error('Error loading data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEquipmentSelect = (val, opt) => {
    setSelectedEquipmentId(val);
    if (errors.equipment) {
      setErrors(prev => ({ ...prev, equipment: null }));
    }
    if (opt) {
      setDepartmentId(opt.department_id);
      setRoomOrBed(`${opt.room_number || ''} ${opt.bed_slot || ''}`.trim());
      if (opt.criticality?.includes('Critical')) {
        setPriority('Critical - Life Support');
      }
    }
  };

  const handleEmployeeSelect = (val, opt) => {
    setBookedByEmployeeId(val);
    if (opt) {
      setBookedByName(opt.full_name || opt.label);
      setBookedByRole(opt.designation || opt.role || '');
      setBookedByPhone(opt.phone || '');
      if (opt.department_id && !departmentId) {
        setDepartmentId(opt.department_id);
      }
    }
    if (errors.bookedByName) {
      setErrors(prev => ({ ...prev, bookedByName: null }));
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
        if (errors.description) {
          setErrors(prev => ({ ...prev, description: null }));
        }
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
    if (e && e.preventDefault) e.preventDefault();
    
    const newErrors = {};
    if (!selectedEquipmentId) {
      newErrors.equipment = 'Please select a biomedical equipment from the list';
    }
    if (!description || !description.trim()) {
      newErrors.description = 'Please describe the problem symptoms';
    }
    if (!bookedByName || !bookedByName.trim()) {
      newErrors.bookedByName = 'Please select or enter the reporter name';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.equipment) {
        onShowToast({ 
          type: 'warning', 
          title: 'Equipment Required', 
          message: 'Please select an equipment from the dropdown to book a complaint.' 
        });
      } else if (newErrors.description) {
        onShowToast({ 
          type: 'warning', 
          title: 'Description Required', 
          message: 'Please provide problem symptoms or description.' 
        });
      }
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        equipment_id: Number(selectedEquipmentId),
        department_id: departmentId ? Number(departmentId) : undefined,
        room_or_bed: roomOrBed,
        booked_by_employee_id: bookedByEmployeeId ? Number(bookedByEmployeeId) : undefined,
        booked_by_name: bookedByName,
        booked_by_role: bookedByRole,
        booked_by_phone: bookedByPhone,
        complaint_category: selectedCode ? `[${selectedCode}] ${category}` : category,
        priority,
        description: description.trim()
      };

      const res = await bookComplaint(payload);

      onShowToast({
        type: 'danger',
        title: 'Breakdown Ticket Booked',
        message: `Ticket ${res.ticket_number} logged! Logged by ${bookedByName}. Emergency alert dispatched to Biomedical Engineering.`
      });

      setDescription('');
      setErrors({});
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

  const employeeOptions = employees.map(emp => ({
    value: emp.id,
    label: `${emp.full_name} (${emp.employee_code || emp.username})`,
    subLabel: `${emp.role} • ${emp.designation || 'Staff'} • ${emp.phone || 'No phone'} • Dept: ${emp.department_name || 'General'}`,
    ...emp
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
            disabled={submitting}
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
            placeholder={loading ? "Loading equipment inventory..." : "Type device name, asset ID, or room..."}
            subLabelKey="subLabel"
            hasError={Boolean(errors.equipment)}
          />
          {errors.equipment && (
            <div className="field-error-text">
              <AlertTriangle size={13} />
              <span>{errors.equipment}</span>
            </div>
          )}
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

        {/* Booked By / Staff Master Selector (Select2 Style) */}
        <div style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '12px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <UserCheck size={16} color="var(--color-primary)" />
              <strong>Booked / Reported By (Employee Master) <span className="required">*</span></strong>
            </label>
            {bookedByName && (
              <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
                Active Log: {bookedByName}
              </span>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: '10px' }}>
            <SelectSearch
              options={employeeOptions}
              value={bookedByEmployeeId}
              onChange={handleEmployeeSelect}
              placeholder="Type staff name, employee code, or role to search..."
              subLabelKey="subLabel"
              hasError={Boolean(errors.bookedByName)}
            />
          </div>

          <div className="form-row" style={{ marginBottom: 0 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>Reporter Name</label>
              <input
                type="text"
                className={`form-control ${errors.bookedByName ? 'input-error' : ''}`}
                value={bookedByName}
                onChange={(e) => {
                  setBookedByName(e.target.value);
                  if (errors.bookedByName) setErrors(prev => ({ ...prev, bookedByName: null }));
                }}
                placeholder="Full Name"
                required
              />
              {errors.bookedByName && (
                <div className="field-error-text">
                  <AlertTriangle size={13} />
                  <span>{errors.bookedByName}</span>
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>Role / Designation</label>
              <input
                type="text"
                className="form-control"
                value={bookedByRole}
                onChange={(e) => setBookedByRole(e.target.value)}
                placeholder="Designation"
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>Contact Phone / Ext</label>
              <input
                type="text"
                className="form-control"
                value={bookedByPhone}
                onChange={(e) => setBookedByPhone(e.target.value)}
                placeholder="Phone / Extension"
              />
            </div>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Problem Symptoms & Description <span className="required">*</span></label>
          <textarea
            className={`form-control ${errors.description ? 'input-error' : ''}`}
            rows={3}
            placeholder="Describe what occurred, any error codes displayed on screen, and patient safety status..."
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errors.description) setErrors(prev => ({ ...prev, description: null }));
            }}
            required
          />
          {errors.description && (
            <div className="field-error-text">
              <AlertTriangle size={13} />
              <span>{errors.description}</span>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
