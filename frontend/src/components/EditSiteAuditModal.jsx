import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { updateSiteAudit, fetchDepartments, fetchEquipmentTypes, fetchVendors, fetchSiteComplianceProfiles } from '../services/api';
import { 
  Building2, 
  MapPin, 
  Layers, 
  Edit3, 
  Calendar, 
  User, 
  Save, 
  RefreshCw,
  Globe,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

export default function EditSiteAuditModal({
  isOpen,
  onClose,
  audit,
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
    id: 0,
    country_code: 'BH',
    facility_name: '',
    department_id: '',
    room_number: '',
    equipment_type_id: '',
    target_model: '',
    vendor_id: '',
    vendor_project_manager: '',
    lead_biomedical_engineer: '',
    target_installation_date: '',
    overall_status: 'Under Inspection',
    notes: '',
    special_notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadPrerequisites();
    }
  }, [isOpen]);

  useEffect(() => {
    if (audit) {
      const existingNotes = audit.notes || audit.special_notes || '';
      setFormData({
        id: audit.id,
        country_code: audit.country_code || 'BH',
        facility_name: audit.facility_name || '',
        department_id: audit.department_id || '',
        room_number: audit.room_number || '',
        equipment_type_id: audit.equipment_type_id || '',
        target_model: audit.target_model || '',
        vendor_id: audit.vendor_id || '',
        vendor_project_manager: audit.vendor_project_manager || '',
        lead_biomedical_engineer: audit.lead_biomedical_engineer || '',
        target_installation_date: audit.target_installation_date ? audit.target_installation_date.slice(0, 10) : '',
        overall_status: audit.overall_status || 'Under Inspection',
        notes: existingNotes,
        special_notes: existingNotes
      });
    }
  }, [audit, isOpen]);

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
    } catch (err) {
      console.error('Failed to load prerequisites:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !audit) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.facility_name || !formData.room_number) {
      if (onShowToast) onShowToast({ type: 'warning', title: 'Missing Info', message: 'Please provide hospital facility name and room number.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await updateSiteAudit(formData);
      if (onShowToast) {
        onShowToast({
          type: 'success',
          title: 'Audit Updated',
          message: res.message || 'Site preparation details updated successfully.'
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

  const selectedCountry = countries.find(c => c.country_code === formData.country_code);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Site Preparation & Room Audit Details"
      subtitle={`${audit.audit_number} • ${audit.facility_name}`}
      icon={Edit3}
      size="lg"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', width: '100%' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleSubmit}
            disabled={submitting || loading}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {submitting ? <RefreshCw className="spin" size={15} /> : <Save size={15} />}
            <span>Save Audit Changes</span>
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Country & Regulatory Profile Header */}
        <div style={{ backgroundColor: 'var(--color-primary-subtle)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.92rem', color: 'var(--color-primary)' }}>
              <Globe size={18} />
              <span>Host Country & Regulatory Jurisdiction</span>
            </div>
            <span style={{ fontSize: '1.4rem' }}>{selectedCountry?.flag || '🌐'}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
            <div>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Country</label>
              <select
                className="form-control"
                value={formData.country_code}
                onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
                required
              >
                {countries.map(c => (
                  <option key={c.country_code} value={c.country_code}>
                    {c.flag} {c.country_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Governing Regulatory Code</label>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '7px 10px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                {selectedCountry?.regulatory_authority || 'Ministry of Health Pre-Installation Directorate'}
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Hospital Facility & Location */}
        <div>
          <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '14px' }}>
            <Building2 size={16} color="var(--color-primary)" />
            <span>Hospital Facility & Physical Location</span>
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', marginBottom: '12px' }}>
            <div>
              <label className="form-label">Hospital / Healthcare Facility Name *</label>
              <input
                type="text"
                className="form-control"
                value={formData.facility_name}
                onChange={(e) => setFormData({ ...formData, facility_name: e.target.value })}
                placeholder="e.g. King Hamad University Hospital"
                required
              />
            </div>

            <div>
              <label className="form-label">Room / Suite Number *</label>
              <input
                type="text"
                className="form-control"
                value={formData.room_number}
                onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                placeholder="e.g. OT-Suite-04"
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
            <div>
              <label className="form-label">Clinical Department *</label>
              <select
                className="form-control"
                value={formData.department_id}
                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                required
              >
                {departments.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.building} - {d.floor})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Medical Equipment & Vendor */}
        <div>
          <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '14px' }}>
            <Layers size={16} color="var(--color-primary)" />
            <span>Target Medical Equipment & Authorized Vendor</span>
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '12px' }}>
            <div>
              <label className="form-label">Equipment Category *</label>
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

            <div>
              <label className="form-label">Target Equipment Make & Model *</label>
              <input
                type="text"
                className="form-control"
                value={formData.target_model}
                onChange={(e) => setFormData({ ...formData, target_model: e.target.value })}
                placeholder="e.g. Artis pheno Robotic C-Arm Hybrid Operating Suite"
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label className="form-label">Authorized Vendor / OEM Partner</label>
              <select
                className="form-control"
                value={formData.vendor_id}
                onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
              >
                <option value="">Select Vendor...</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Vendor Project Manager</label>
              <input
                type="text"
                className="form-control"
                value={formData.vendor_project_manager}
                onChange={(e) => setFormData({ ...formData, vendor_project_manager: e.target.value })}
                placeholder="e.g. Eng. Marcus Weber"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Engineering Personnel & Status */}
        <div>
          <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '14px' }}>
            <User size={16} color="var(--color-primary)" />
            <span>Biomedical Leadership & Overall Status</span>
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '12px' }}>
            <div>
              <label className="form-label">Lead Biomedical Engineer *</label>
              <input
                type="text"
                className="form-control"
                value={formData.lead_biomedical_engineer}
                onChange={(e) => setFormData({ ...formData, lead_biomedical_engineer: e.target.value })}
                placeholder="e.g. Eng. Hassan Al-Majed"
                required
              />
            </div>

            <div>
              <label className="form-label">Target Installation Date</label>
              <input
                type="date"
                className="form-control"
                value={formData.target_installation_date}
                onChange={(e) => setFormData({ ...formData, target_installation_date: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px', marginBottom: '12px' }}>
            <div>
              <label className="form-label">Overall Site Clearance Status</label>
              <select
                className="form-control"
                value={formData.overall_status}
                onChange={(e) => setFormData({ ...formData, overall_status: e.target.value })}
              >
                <option value="Under Inspection">Under Inspection</option>
                <option value="Remediation Required">Remediation Required</option>
                <option value="Conditional Clearance">Conditional Clearance</option>
                <option value="Approved & Ready for Delivery">Approved & Ready for Delivery</option>
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">Special Engineering Notes & Operating Instructions</label>
            <textarea
              className="form-control"
              rows={3}
              value={formData.notes ?? formData.special_notes ?? ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value, special_notes: e.target.value })}
              placeholder="e.g. Pre-installation room civil works complete. EWA electrical test certificate attached."
            />
          </div>
        </div>

      </form>
    </Modal>
  );
}
