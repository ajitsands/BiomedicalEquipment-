import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { 
  fetchVendors, 
  createVendor, 
  updateVendor, 
  deleteVendor 
} from '../services/api';
import { 
  Building2, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  Briefcase, 
  Truck, 
  ShieldCheck, 
  Edit2, 
  CheckCircle2, 
  X, 
  AlertTriangle,
  Globe,
  FileText
} from 'lucide-react';

export default function PartnersModal({
  isOpen,
  onClose,
  onShowToast,
  onPartnerChanged,
  initialType = 'ALL'
}) {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState(initialType);
  
  // Create / Edit Partner Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    vendor_type: 'Vendor / OEM',
    vendor_code: '',
    contact_person: '',
    phone: '',
    emergency_hotline: '',
    email: '',
    address: '',
    tax_id: '',
    service_manager: '',
    service_manager_phone: '',
    website: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadPartners();
    }
  }, [isOpen]);

  const loadPartners = async () => {
    try {
      setLoading(true);
      const res = await fetchVendors();
      setPartners(res.data || []);
    } catch (err) {
      onShowToast({ type: 'error', title: 'Error', message: 'Failed to load partners' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingPartner(null);
    setFormData({
      name: '',
      vendor_type: typeFilter !== 'ALL' ? typeFilter : 'Vendor / OEM',
      vendor_code: '',
      contact_person: '',
      phone: '',
      emergency_hotline: '',
      email: '',
      address: '',
      tax_id: '',
      service_manager: '',
      service_manager_phone: '',
      website: ''
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (partner) => {
    setEditingPartner(partner);
    setFormData({
      name: partner.name || '',
      vendor_type: partner.vendor_type || 'Vendor / OEM',
      vendor_code: partner.vendor_code || '',
      contact_person: partner.contact_person || '',
      phone: partner.phone || '',
      emergency_hotline: partner.emergency_hotline || '',
      email: partner.email || '',
      address: partner.address || '',
      tax_id: partner.tax_id || '',
      service_manager: partner.service_manager || '',
      service_manager_phone: partner.service_manager_phone || '',
      website: partner.website || ''
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.emergency_hotline.trim()) {
      onShowToast({ type: 'warning', title: 'Required Fields', message: 'Partner Name and Emergency Hotline are required' });
      return;
    }

    try {
      setSubmitting(true);
      if (editingPartner) {
        await updateVendor({
          id: editingPartner.id,
          ...formData
        });
        onShowToast({ type: 'success', title: 'Partner Updated', message: `${formData.name} updated successfully` });
      } else {
        await createVendor(formData);
        onShowToast({ type: 'success', title: 'Partner Created', message: `${formData.name} added to ${formData.vendor_type} directory` });
      }

      setIsFormOpen(false);
      loadPartners();
      if (onPartnerChanged) onPartnerChanged();
    } catch (err) {
      onShowToast({ type: 'error', title: 'Submission Failed', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (partner) => {
    try {
      const newActive = partner.is_active ? 0 : 1;
      await updateVendor({ id: partner.id, is_active: newActive });
      onShowToast({ 
        type: 'info', 
        title: 'Status Updated', 
        message: `${partner.name} is now ${newActive ? 'Active' : 'Inactive'}` 
      });
      loadPartners();
      if (onPartnerChanged) onPartnerChanged();
    } catch (err) {
      onShowToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  const filteredPartners = partners.filter(p => {
    const matchesType = typeFilter === 'ALL' || p.vendor_type === typeFilter;
    const q = searchTerm.toLowerCase();
    const matchesSearch = !q || 
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.vendor_code && p.vendor_code.toLowerCase().includes(q)) ||
      (p.contact_person && p.contact_person.toLowerCase().includes(q)) ||
      (p.email && p.email.toLowerCase().includes(q)) ||
      (p.emergency_hotline && p.emergency_hotline.includes(q));
    return matchesType && matchesSearch;
  });

  const countByType = {
    ALL: partners.length,
    'Vendor / OEM': partners.filter(p => p.vendor_type === 'Vendor / OEM').length,
    'Contractor': partners.filter(p => p.vendor_type === 'Contractor').length,
    'Supplier': partners.filter(p => p.vendor_type === 'Supplier').length,
    'Authorized Service Provider': partners.filter(p => p.vendor_type === 'Authorized Service Provider').length
  };

  const getTypeBadgeStyle = (type) => {
    switch(type) {
      case 'Contractor':
        return { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' };
      case 'Supplier':
        return { backgroundColor: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe' };
      case 'Authorized Service Provider':
        return { backgroundColor: '#f3e8ff', color: '#6b21a8', border: '1px solid #e9d5ff' };
      default:
        return { backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' };
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Partners & Directory Master: Vendors, Contractors & Suppliers"
      icon={Building2}
      size="xl"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Total Directory Records: <strong>{partners.length} Partners</strong> across OEM, Maintenance Contractors & Suppliers
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Close Directory
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Top Controls: Search, Type Tabs & Add Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          
          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn btn-sm ${typeFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTypeFilter('ALL')}
            >
              All Partners ({countByType.ALL})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${typeFilter === 'Vendor / OEM' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTypeFilter('Vendor / OEM')}
            >
              🏭 OEM Vendors ({countByType['Vendor / OEM']})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${typeFilter === 'Contractor' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTypeFilter('Contractor')}
            >
              🛠️ Contractors ({countByType['Contractor']})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${typeFilter === 'Supplier' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTypeFilter('Supplier')}
            >
              📦 Suppliers ({countByType['Supplier']})
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search partner or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '32px' }}
              />
            </div>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleOpenAdd}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={15} />
              <span>Add Partner</span>
            </button>
          </div>
        </div>

        {/* Embedded Form Drawer for Adding / Editing */}
        {isFormOpen && (
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '2px solid var(--color-primary)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            animation: 'fadeInDown 0.2s ease',
            boxShadow: 'var(--shadow-md)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={18} style={{ color: 'var(--color-primary)' }} />
                <h4 style={{ margin: 0, fontWeight: 700 }}>
                  {editingPartner ? `Edit Partner: ${editingPartner.name}` : 'Register New Partner (Vendor / Contractor / Supplier)'}
                </h4>
              </div>
              <button 
                type="button" 
                className="btn btn-secondary btn-icon btn-sm"
                onClick={() => setIsFormOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Partner Type <span className="required">*</span></label>
                  <select
                    className="form-control"
                    value={formData.vendor_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, vendor_type: e.target.value }))}
                    required
                  >
                    <option value="Vendor / OEM">🏭 Original Equipment Manufacturer (OEM / Vendor)</option>
                    <option value="Contractor">🛠️ Maintenance & Calibration Contractor</option>
                    <option value="Supplier">📦 Spare Parts & Consumables Supplier</option>
                    <option value="Authorized Service Provider">🛡️ Authorized Warranty / Service Provider</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Company / Partner Name <span className="required">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. MedServe Clinical Contractors W.L.L"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Partner Code</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Auto-generated if blank (e.g. CONT-MED-01)"
                    value={formData.vendor_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, vendor_code: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Contact Person</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Eng. Fahad Al-Bahrani"
                    value={formData.contact_person}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">24/7 Emergency Service Hotline <span className="required">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. +973-3507-8079"
                    value={formData.emergency_hotline}
                    onChange={(e) => setFormData(prev => ({ ...prev, emergency_hotline: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Official Email</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="service@contractor.com"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Office Phone Number</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="+973-1722-4488"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">CR Number / Tax ID</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. BH-CR-984421-2"
                    value={formData.tax_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, tax_id: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Website URL</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="https://company.com"
                    value={formData.website}
                    onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Facility Address / Service Center Location</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Building, Road, Block, City, Country"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  />
                </div>

                <div className="form-group" style={{ width: '220px' }}>
                  <label className="form-label">Service Manager Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Mansoor Al-Haddad"
                    value={formData.service_manager}
                    onChange={(e) => setFormData(prev => ({ ...prev, service_manager: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsFormOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={submitting}
                >
                  {submitting ? 'Saving Partner...' : (editingPartner ? 'Update Partner' : 'Save Partner')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Partners Table */}
        <div style={{ 
          backgroundColor: 'var(--bg-surface)', 
          border: '1px solid var(--border-color)', 
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden'
        }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading partners directory...
            </div>
          ) : filteredPartners.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No partners found matching the filter criteria.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', maxHeight: '480px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-subtle)', textAlign: 'left', borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ padding: '10px 14px' }}>Partner & Type</th>
                    <th style={{ padding: '10px 14px' }}>Code</th>
                    <th style={{ padding: '10px 14px' }}>24/7 Hotline & Phone</th>
                    <th style={{ padding: '10px 14px' }}>Contact Person</th>
                    <th style={{ padding: '10px 14px' }}>CR / Tax No</th>
                    <th style={{ padding: '10px 14px' }}>Equipments</th>
                    <th style={{ padding: '10px 14px' }}>Status</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPartners.map(p => {
                    const badgeStyle = getTypeBadgeStyle(p.vendor_type);
                    return (
                      <tr 
                        key={p.id} 
                        style={{ 
                          borderBottom: '1px solid var(--border-color)',
                          opacity: p.is_active ? 1 : 0.6
                        }}
                      >
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {p.name}
                          </div>
                          <span style={{ 
                            ...badgeStyle, 
                            fontSize: '0.7rem', 
                            fontWeight: 700, 
                            padding: '1px 6px', 
                            borderRadius: '4px',
                            display: 'inline-block',
                            marginTop: '2px'
                          }}>
                            {p.vendor_type || 'Vendor'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600 }}>
                          {p.vendor_code}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 700, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Phone size={13} /> {p.emergency_hotline}
                          </div>
                          {p.phone && (
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              Office: {p.phone}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div>{p.contact_person || '—'}</div>
                          {p.email && (
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                              {p.email}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {p.tax_id || '—'}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700 }}>
                          {p.supplied_equipment_count || 0}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: p.is_active ? '#d1fae5' : '#fee2e2',
                            color: p.is_active ? '#065f46' : '#991b1b'
                          }}>
                            {p.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-icon btn-sm"
                              onClick={() => handleOpenEdit(p)}
                              title="Edit Partner Details"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm ${p.is_active ? 'btn-ghost' : 'btn-outline-primary'}`}
                              style={{ fontSize: '0.74rem', padding: '2px 8px' }}
                              onClick={() => handleToggleStatus(p)}
                              title={p.is_active ? 'Deactivate Partner' : 'Activate Partner'}
                            >
                              {p.is_active ? 'Disable' : 'Enable'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </Modal>
  );
}
