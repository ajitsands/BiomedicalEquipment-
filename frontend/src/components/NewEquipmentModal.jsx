import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { 
  createEquipment, 
  fetchEquipmentTypes, 
  fetchDepartments, 
  fetchVendors 
} from '../services/api';
import { 
  PlusCircle, 
  Plus,
  Layers, 
  MapPin, 
  DollarSign, 
  ShieldCheck, 
  Phone, 
  QrCode, 
  Radio 
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export default function NewEquipmentModal({
  isOpen,
  onClose,
  onSuccess,
  onOpenDepartments,
  onShowToast
}) {
  const { settings } = useSettings();
  const [types, setTypes] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    equipment_type_id: 1,
    brand: '',
    model_number: '',
    serial_number: '',
    asset_id: '',
    department_id: 1,
    building: 'Critical Care Tower A',
    floor: '3rd Floor',
    room_number: '',
    bed_slot: '',
    rfid_tag_id: '',
    vendor_id: 1,
    po_number: '',
    invoice_number: '',
    purchase_date: new Date().toISOString().slice(0, 10),
    purchase_cost: 15000,
    currency: settings?.currency || 'BHD',
    installation_date: new Date().toISOString().slice(0, 10),
    commissioning_engineer: 'Eng. Hassan Al-Majed',
    warranty_start_date: new Date().toISOString().slice(0, 10),
    warranty_end_date: new Date(Date.now() + 365 * 24 * 3600 * 1000 * 2).toISOString().slice(0, 10),
    contract_type: 'Warranty Period',
    contract_vendor_id: 1,
    contract_value: 0,
    maintenance_schedule_type: 'Quarterly',
    maintenance_schedule_notes: 'Under factory warranty. OEM quarterly certified PM visits included. Post-warranty requires Comprehensive CMC contract.',
    emergency_contact_name: 'SanDS Lab Biomedical Engineering Duty Desk',
    emergency_phone: '+973-1789-4099',
    vendor_service_email: '',
    criticality: 'High Priority',
    protection_class: 'Class I',
    applied_part_type: 'None',
    status: 'Operational'
  });

  useEffect(() => {
    if (isOpen) {
      loadDropdowns();
      // Auto-generate sample asset id and rfid tag
      const randHex = Math.random().toString(16).substring(2, 8).toUpperCase();
      setFormData(prev => ({
        ...prev,
        asset_id: `BME-ASSET-${randHex}`,
        rfid_tag_id: `E280116060${randHex}${Math.floor(1000 + Math.random() * 9000)}`
      }));
    }
  }, [isOpen]);

  const loadDropdowns = async () => {
    try {
      setLoading(true);
      const [typeRes, deptRes, vendRes] = await Promise.all([
        fetchEquipmentTypes(),
        fetchDepartments(),
        fetchVendors()
      ]);
      setTypes(typeRes.data || []);
      setDepartments(deptRes.data || []);
      setVendors(vendRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTypeChange = (e) => {
    const typeId = Number(e.target.value);
    const found = types.find(t => t.id === typeId);
    setFormData(prev => ({
      ...prev,
      equipment_type_id: typeId,
      criticality: found?.risk_classification?.includes('Critical') ? 'Critical Life-Support' : (found?.risk_classification?.includes('High') ? 'High Priority' : 'Standard'),
      maintenance_schedule_type: found?.default_pm_frequency || prev.maintenance_schedule_type,
      maintenance_schedule_notes: found?.suggested_pm_schedule ? `Planning Schedule: ${found.suggested_pm_schedule}` : prev.maintenance_schedule_notes,
      protection_class: found?.default_protection_class || 'Class I',
      applied_part_type: found?.default_applied_part_type || 'None'
    }));
  };

  const handleDepartmentChange = (e) => {
    const deptId = Number(e.target.value);
    const dept = departments.find(d => d.id === deptId);
    setFormData(prev => ({
      ...prev,
      department_id: deptId,
      building: dept ? dept.building : prev.building,
      floor: dept ? dept.floor : prev.floor
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.brand || !formData.model_number || !formData.serial_number) {
      onShowToast({ type: 'warning', title: 'Required Fields', message: 'Name, Brand, Model and Serial Number are required' });
      return;
    }

    try {
      setSubmitting(true);
      const res = await createEquipment(formData);
      onShowToast({
        type: 'success',
        title: 'Equipment Registered',
        message: `Asset ${res.asset_id} added with QR code and RFID Tag ID!`
      });
      onSuccess && onSuccess(res);
      onClose();
    } catch (err) {
      onShowToast({ type: 'error', title: 'Registration Failed', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Biomedical Equipment Master"
      icon={PlusCircle}
      size="lg"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button 
            type="button" 
            className="btn btn-primary btn-sm" 
            onClick={handleSubmit}
            disabled={submitting}
          >
            <PlusCircle size={15} />
            {submitting ? 'Registering...' : 'Register Equipment Master & Generate QR/RFID'}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit}>
        {/* Section 1: Basic Equipment Info */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ fontSize: '0.96rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '6px', marginBottom: '14px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} />
            Equipment Classification & Technical Specifications
          </h4>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Equipment Master Type <span className="required">*</span></label>
              <select
                className="form-control"
                name="equipment_type_id"
                value={formData.equipment_type_id}
                onChange={handleTypeChange}
              >
                {types.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.asset_type_code ? `${t.asset_type_code}: ` : ''}{t.name} ({t.category} - {t.risk_classification?.split(' ')[0]})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Device Name / Tag <span className="required">*</span></label>
              <input
                type="text"
                className="form-control"
                name="name"
                placeholder="e.g. ICU Mechanical Ventilator Bay 3"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">IEC Electrical Safety Protection Class</label>
              <select
                className="form-control"
                name="protection_class"
                value={formData.protection_class}
                onChange={handleChange}
              >
                <option value="Class I">Class I (Protective Earth Grounded)</option>
                <option value="Class II">Class II (Double / Reinforced Insulation)</option>
                <option value="Internally Powered">Internally Powered (Battery Only)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Patient Applied Part Category</label>
              <select
                className="form-control"
                name="applied_part_type"
                value={formData.applied_part_type}
                onChange={handleChange}
              >
                <option value="None">None (No direct patient contact)</option>
                <option value="B">Type B (Body grounded/general contact)</option>
                <option value="BF">Type BF (Body Floating / Isolated)</option>
                <option value="CF">Type CF (Cardiac Floating / Direct Myocardium)</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Manufacturer / Brand <span className="required">*</span></label>
              <input
                type="text"
                className="form-control"
                name="brand"
                placeholder="e.g. Dräger, Philips, GE, Mindray"
                value={formData.brand}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Model Number <span className="required">*</span></label>
              <input
                type="text"
                className="form-control"
                name="model_number"
                placeholder="e.g. Evita V800, HeartStart XL+"
                value={formData.model_number}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Serial Number <span className="required">*</span></label>
              <input
                type="text"
                className="form-control"
                name="serial_number"
                placeholder="e.g. DRA-2026-9901"
                value={formData.serial_number}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Hospital Asset ID <span className="required">*</span></label>
              <input
                type="text"
                className="form-control"
                name="asset_id"
                value={formData.asset_id}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">RFID UHF Tag EPC</label>
              <input
                type="text"
                className="form-control"
                name="rfid_tag_id"
                value={formData.rfid_tag_id}
                onChange={handleChange}
                placeholder="e.g. E28011606000021A5F90B1"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Clinical Criticality</label>
              <select
                className="form-control"
                name="criticality"
                value={formData.criticality}
                onChange={handleChange}
              >
                <option value="Critical Life-Support">🚨 Critical Life-Support (Tier 1)</option>
                <option value="High Priority">⚠️ High Priority (Tier 2)</option>
                <option value="Standard">Standard Diagnostic (Tier 3)</option>
                <option value="Low">Low Risk / Utility (Tier 4)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Location Tracking */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ fontSize: '0.96rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '6px', marginBottom: '14px', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={18} />
            Physical Location & Department Hierarchy
          </h4>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Assigned Department <span className="required">*</span></span>
                {onOpenDepartments && (
                  <button
                    type="button"
                    onClick={onOpenDepartments}
                    style={{ 
                      background: 'transparent', 
                      border: 'none', 
                      color: 'var(--color-primary)', 
                      cursor: 'pointer', 
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                  >
                    <Plus size={12} /> Add / Manage Depts
                  </button>
                )}
              </label>
              <select
                className="form-control"
                name="department_id"
                value={formData.department_id}
                onChange={handleDepartmentChange}
              >
                {departments.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.building} - {d.floor})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Building / Wing</label>
              <input
                type="text"
                className="form-control"
                name="building"
                value={formData.building}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Floor</label>
              <input
                type="text"
                className="form-control"
                name="floor"
                value={formData.floor}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Room Number</label>
              <input
                type="text"
                className="form-control"
                name="room_number"
                placeholder="e.g. ICU Room 302, OT Suite 1"
                value={formData.room_number}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Bed Slot / Station</label>
              <input
                type="text"
                className="form-control"
                name="bed_slot"
                placeholder="e.g. Bed 02, Pendant East"
                value={formData.bed_slot}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Purchase & Financials */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ fontSize: '0.96rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '6px', marginBottom: '14px', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DollarSign size={18} />
            Purchase, Vendor & Procurement History
          </h4>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Supplied By Vendor <span className="required">*</span></label>
              <select
                className="form-control"
                name="vendor_id"
                value={formData.vendor_id}
                onChange={handleChange}
              >
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name} (Hotline: {v.emergency_hotline})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Purchase Order (PO) #</label>
              <input
                type="text"
                className="form-control"
                name="po_number"
                placeholder="PO-2026-MED-XXXX"
                value={formData.po_number}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Invoice Number</label>
              <input
                type="text"
                className="form-control"
                name="invoice_number"
                placeholder="INV-XXXX"
                value={formData.invoice_number}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Purchase Date</label>
              <input
                type="date"
                className="form-control"
                name="purchase_date"
                value={formData.purchase_date}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Purchase Cost</label>
              <input
                type="number"
                className="form-control"
                name="purchase_cost"
                value={formData.purchase_cost}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Currency</label>
              <select
                className="form-control"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
              >
                <optgroup label="Gulf Region (GCC)">
                  <option value="BHD">BHD — Bahraini Dinar (BD)</option>
                  <option value="SAR">SAR — Saudi Riyal (ر.س)</option>
                  <option value="AED">AED — UAE Dirham (د.إ)</option>
                  <option value="KWD">KWD — Kuwaiti Dinar (KD)</option>
                  <option value="QAR">QAR — Qatari Riyal (QR)</option>
                  <option value="OMR">OMR — Omani Rial (OMR)</option>
                </optgroup>
                <optgroup label="India">
                  <option value="INR">INR — Indian Rupee (₹)</option>
                </optgroup>
                <optgroup label="International">
                  <option value="USD">USD — US Dollar ($)</option>
                  <option value="EUR">EUR — Euro (€)</option>
                  <option value="GBP">GBP — British Pound (£)</option>
                </optgroup>
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: Warranty & Maintenance Schedule */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ fontSize: '0.96rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '6px', marginBottom: '14px', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} />
            Warranty Period & Maintenance Schedules (Warranty & Post-Warranty)
          </h4>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Warranty Start Date</label>
              <input
                type="date"
                className="form-control"
                name="warranty_start_date"
                value={formData.warranty_start_date}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Warranty End Date</label>
              <input
                type="date"
                className="form-control"
                name="warranty_end_date"
                value={formData.warranty_end_date}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contract Type</label>
              <select
                className="form-control"
                name="contract_type"
                value={formData.contract_type}
                onChange={handleChange}
              >
                <option value="Warranty Period">Manufacturer Warranty Period</option>
                <option value="Comprehensive AMC (CMC)">Comprehensive AMC (CMC - Parts & Labor)</option>
                <option value="Non-Comprehensive AMC">Non-Comprehensive AMC (Labor Only)</option>
                <option value="In-House Maintenance">In-House Biomedical Engineering</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Maintenance Frequency</label>
              <select
                className="form-control"
                name="maintenance_schedule_type"
                value={formData.maintenance_schedule_type}
                onChange={handleChange}
              >
                <option value="Monthly">Monthly Inspection</option>
                <option value="Bi-Monthly">Bi-Monthly Inspection</option>
                <option value="Quarterly">Quarterly PM & Safety Test</option>
                <option value="Semi-Annual">Semi-Annual Calibration</option>
                <option value="Annual">Annual Overhaul</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Emergency Hotline Contact Number</label>
              <input
                type="text"
                className="form-control"
                name="emergency_phone"
                value={formData.emergency_phone}
                onChange={handleChange}
                placeholder="+973-1789-4099"
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Maintenance Schedule Protocols (On-Warranty vs Post-Warranty)</label>
            <textarea
              className="form-control"
              rows={2}
              name="maintenance_schedule_notes"
              value={formData.maintenance_schedule_notes}
              onChange={handleChange}
              placeholder="Specify requirements during warranty period vs post-warranty AMC terms..."
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
