import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { createReader, fetchDepartments } from '../services/api';
import { Radio, Plus, CheckCircle2, Building, ShieldCheck, MapPin } from 'lucide-react';

export default function NewReaderModal({
  isOpen,
  onClose,
  onSuccess,
  onShowToast
}) {
  const [departments, setDepartments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    device_model: 'Dahua DHI-ASI1201M-MEP',
    ip_address: '',
    port: 80,
    reader_type: 'Dahua Access Control',
    department_id: 2,
    door_zone: '',
    building: 'Surgical Pavilion B',
    floor: '2nd Floor'
  });

  useEffect(() => {
    if (isOpen) {
      loadDepartments();
    }
  }, [isOpen]);

  const loadDepartments = async () => {
    try {
      const res = await fetchDepartments();
      setDepartments(res.data || []);
      if (res.data && res.data.length > 0) {
        setFormData(prev => ({
          ...prev,
          department_id: res.data[0].id,
          building: res.data[0].building,
          floor: res.data[0].floor
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeptChange = (e) => {
    const id = Number(e.target.value);
    const d = departments.find(dept => dept.id === id);
    setFormData(prev => ({
      ...prev,
      department_id: id,
      building: d ? d.building : prev.building,
      floor: d ? d.floor : prev.floor
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.ip_address) {
      onShowToast && onShowToast({ type: 'warning', title: 'Required', message: 'Reader Name and IP Address are required' });
      return;
    }

    try {
      setSubmitting(true);
      const res = await createReader(formData);
      onShowToast && onShowToast({
        type: 'success',
        title: 'Reader Registered',
        message: `Node '${formData.name}' added successfully to Access Control network.`
      });
      onSuccess && onSuccess(res.reader);
      onClose();
    } catch (err) {
      onShowToast && onShowToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'Failed to register reader node'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Access Control & RFID Reader Node"
      icon={Radio}
      size="md"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button 
            type="button" 
            className="btn btn-primary btn-sm" 
            onClick={handleSubmit}
            disabled={submitting || !formData.name || !formData.ip_address}
          >
            <Plus size={15} />
            {submitting ? 'Registering...' : 'Register Reader Node'}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit}>
        <div style={{ 
          backgroundColor: 'var(--color-primary-subtle)', 
          padding: '12px 16px', 
          borderRadius: 'var(--radius-sm)', 
          marginBottom: '16px',
          fontSize: '0.84rem',
          color: 'var(--color-primary-text)'
        }}>
          Register a physical access control reader or UHF RFID antenna gateway on the hospital LAN network to monitor medical device locations.
        </div>

        <div className="form-group">
          <label className="form-label">Reader Node Name <span className="required">*</span></label>
          <input
            type="text"
            className="form-control"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. Dahua DHI-ASI1201M-MEP (192.168.8.109) or OT-GATE-03"
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Hardware Device Model</label>
            <input
              type="text"
              className="form-control"
              name="device_model"
              value={formData.device_model}
              onChange={handleChange}
              placeholder="e.g. Dahua DHI-ASI1201M-MEP, Zebra FX9600"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Technology / Type</label>
            <select
              className="form-control"
              name="reader_type"
              value={formData.reader_type}
              onChange={handleChange}
            >
              <option value="Dahua Access Control">Dahua Access Control (Mifare / IC)</option>
              <option value="UHF RFID Gateway">UHF RFID Long-Range Gateway (860-960MHz)</option>
              <option value="Biometric & Card Gate">Biometric & RFID Turnstile Gate</option>
              <option value="Barcode & QR Scanner Node">Barcode & QR Scanner Portal</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Device IP Address <span className="required">*</span></label>
            <input
              type="text"
              className="form-control"
              name="ip_address"
              value={formData.ip_address}
              onChange={handleChange}
              placeholder="e.g. 192.168.8.109"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Port</label>
            <input
              type="number"
              className="form-control"
              name="port"
              value={formData.port}
              onChange={handleChange}
              placeholder="80"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Monitored Door / Location Gate <span className="required">*</span></label>
          <input
            type="text"
            className="form-control"
            name="door_zone"
            value={formData.door_zone}
            onChange={handleChange}
            placeholder="e.g. Operation Theatre Suite 4 Door, ICU Main Entry Gate"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Assigned Department Zone</label>
          <select 
            className="form-control"
            name="department_id"
            value={formData.department_id}
            onChange={handleDeptChange}
          >
            {departments.map(d => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.building} - {d.floor})
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Building / Pavilion</label>
            <input
              type="text"
              className="form-control"
              name="building"
              value={formData.building}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Floor Level</label>
            <input
              type="text"
              className="form-control"
              name="floor"
              value={formData.floor}
              onChange={handleChange}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
