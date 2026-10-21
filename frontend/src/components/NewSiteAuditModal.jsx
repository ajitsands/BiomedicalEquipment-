import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { createSiteAudit, fetchDepartments, fetchEquipmentTypes, fetchVendors, fetchSiteComplianceProfiles } from '../services/api';
import { 
  Building2, 
  MapPin, 
  Layers, 
  Plus, 
  Calendar, 
  User, 
  Save, 
  RefreshCw,
  Globe,
  Sparkles
} from 'lucide-react';

export default function NewSiteAuditModal({
  isOpen,
  onClose,
  onSuccess,
  onShowToast
}) {
  const [departments, setDepartments] = useState([]);
  const [types, setTypes] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    country_code: 'BH',
    facility_name: '',
    department_id: '',
    room_number: '',
    building: 'Main Clinical Wing',
    floor: 'Ground Floor',
    equipment_type_id: '',
    target_model: '',
    vendor_id: '',
    vendor_project_manager: '',
    lead_biomedical_engineer: 'Eng. Hassan Al-Majed',
    contractor_representative: 'General Contractor MEP Lead',
    target_delivery_date: '',
    target_installation_date: '',
    inspection_date: new Date().toISOString().slice(0, 10),
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadPrerequisites();
    }
  }, [isOpen]);

  const loadPrerequisites = async () => {
    try {
      setLoading(true);
      const [deptRes, typeRes, vendRes, countryRes] = await Promise.all([
        fetchDepartments(),
        fetchEquipmentTypes(),
        fetchVendors(),
        fetchSiteComplianceProfiles()
      ]);
      setDepartments(deptRes.data || []);
      setTypes(typeRes.data || []);
      setVendors(vendRes.data || []);
      setCountries(countryRes.data || []);

      if (deptRes.data?.length > 0 && !formData.department_id) {
        setFormData(prev => ({
          ...prev,
          department_id: deptRes.data[0].id,
          equipment_type_id: typeRes.data?.[0]?.id || '',
          vendor_id: vendRes.data?.[0]?.id || ''
        }));
      }
    } catch (err) {
      console.error('Failed to load prerequisites:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.facility_name || !formData.room_number) {
      if (onShowToast) onShowToast({ type: 'warning', title: 'Missing Info', message: 'Please provide hospital name and room number.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await createSiteAudit(formData);
      if (onShowToast) {
        onShowToast({
          type: 'success',
          title: 'Site Audit Created',
          message: res.message || 'Audit initialized with 130 standardized checks.'
        });
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      if (onShowToast) {
        onShowToast({
          type: 'error',
          title: 'Creation Failed',
          message: err.message
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Initiate Site Preparation Readiness Audit"
      subtitle="Standardized 130-Point Medical Equipment Pre-Installation Checklist (GCC & India)"
      icon={Building2}
      size="lg"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Country & Regulatory Profile */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Country & Regulatory Standard</label>
            <select
              className="form-control"
              value={formData.country_code}
              onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
            >
              {countries.map(c => (
                <option key={c.country_code} value={c.country_code}>
                  {c.flag} {c.country_name} — {c.regulatory_authority}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Hospital / Healthcare Facility Name</label>
            <input
              type="text"
              className="form-control"
              value={formData.facility_name}
              onChange={(e) => setFormData({ ...formData, facility_name: e.target.value })}
              placeholder="e.g. King Hamad University Hospital, KFMC Riyadh"
              required
            />
          </div>
        </div>

        {/* Location & Room */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Hospital Department</label>
            <select
              className="form-control"
              value={formData.department_id}
              onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
              required
            >
              {departments.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.building})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Room / Suite / Bay Number</label>
            <input
              type="text"
              className="form-control"
              value={formData.room_number}
              onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
              placeholder="e.g. OT-Suite-04, MRI-Room-01, ICU-Bay-08"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Building & Floor</label>
            <input
              type="text"
              className="form-control"
              value={formData.building}
              onChange={(e) => setFormData({ ...formData, building: e.target.value })}
              placeholder="e.g. Surgical Tower, 2nd Floor"
            />
          </div>
        </div>

        {/* Target Medical Equipment */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Target Equipment Type</label>
            <select
              className="form-control"
              value={formData.equipment_type_id}
              onChange={(e) => setFormData({ ...formData, equipment_type_id: e.target.value })}
              required
            >
              {types.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.category})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Equipment Make & Model (Package)</label>
            <input
              type="text"
              className="form-control"
              value={formData.target_model}
              onChange={(e) => setFormData({ ...formData, target_model: e.target.value })}
              placeholder="e.g. Siemens Magnetom Vida 3.0T / Getinge SERVO-u"
              required
            />
          </div>
        </div>

        {/* Vendor & Key Stakeholders */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Authorized Vendor / OEM</label>
            <select
              className="form-control"
              value={formData.vendor_id}
              onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
            >
              <option value="">-- Select Vendor --</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Lead Biomedical Engineer</label>
            <input
              type="text"
              className="form-control"
              value={formData.lead_biomedical_engineer}
              onChange={(e) => setFormData({ ...formData, lead_biomedical_engineer: e.target.value })}
              placeholder="Lead Clinical Engineer"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Vendor Project Manager</label>
            <input
              type="text"
              className="form-control"
              value={formData.vendor_project_manager}
              onChange={(e) => setFormData({ ...formData, vendor_project_manager: e.target.value })}
              placeholder="OEM Project Manager"
            />
          </div>
        </div>

        {/* Milestone Dates */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Inspection Audit Date</label>
            <input
              type="date"
              className="form-control"
              value={formData.inspection_date}
              onChange={(e) => setFormData({ ...formData, inspection_date: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Target Equipment Delivery Date</label>
            <input
              type="date"
              className="form-control"
              value={formData.target_delivery_date}
              onChange={(e) => setFormData({ ...formData, target_delivery_date: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Target Installation Date</label>
            <input
              type="date"
              className="form-control"
              value={formData.target_installation_date}
              onChange={(e) => setFormData({ ...formData, target_installation_date: e.target.value })}
            />
          </div>
        </div>

        {/* Initial Notes */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontWeight: 600 }}>Initial Architectural / Engineering Scope Notes</label>
          <textarea
            className="form-control"
            rows="2"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Special site preparation scope, contractor milestones, or structural considerations..."
          />
        </div>

        {/* Modal Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {submitting ? <RefreshCw size={15} className="spin" /> : <Save size={15} />}
            <span>{submitting ? 'Creating Audit...' : 'Initiate 130-Point Audit'}</span>
          </button>
        </div>

      </form>
    </Modal>
  );
}
