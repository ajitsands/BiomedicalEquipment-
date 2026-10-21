import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { 
  fetchDepartments, 
  createDepartment, 
  updateDepartment, 
  deleteDepartment 
} from '../services/api';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  Layers, 
  Activity, 
  AlertTriangle,
  Sparkles
} from 'lucide-react';

export default function DepartmentsModal({
  isOpen,
  onClose,
  onShowToast,
  onDepartmentChanged
}) {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    building: 'Main Hospital Block',
    floor: 'Ground Floor',
    head_of_department: '',
    contact_phone: '',
    email: ''
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      loadDepartments();
    }
  }, [isOpen]);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const res = await fetchDepartments();
      setDepartments(res.data || []);
    } catch (err) {
      onShowToast && onShowToast({ type: 'error', title: 'Error', message: 'Failed to load hospital departments' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddForm = () => {
    setEditingDept(null);
    setFormData({
      name: '',
      code: '',
      building: 'Main Hospital Block',
      floor: 'Ground Floor',
      head_of_department: '',
      contact_phone: '',
      email: ''
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (dept) => {
    setEditingDept(dept);
    setFormData({
      id: dept.id,
      name: dept.name || '',
      code: dept.code || '',
      building: dept.building || 'Main Hospital Block',
      floor: dept.floor || 'Ground Floor',
      head_of_department: dept.head_of_department || '',
      contact_phone: dept.contact_phone || '',
      email: dept.email || ''
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleCancelForm = () => {
    setIsFormOpen(false);
    setEditingDept(null);
    setFormErrors({});
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    setFormData(prev => {
      // Auto-suggest department code if adding new
      let suggestedCode = prev.code;
      if (!editingDept && (!prev.code || prev.code === suggestCode(prev.name))) {
        suggestedCode = suggestCode(val);
      }
      return { ...prev, name: val, code: suggestedCode };
    });
    if (formErrors.name) setFormErrors(prev => ({ ...prev, name: null }));
  };

  const suggestCode = (nameStr) => {
    if (!nameStr) return '';
    const clean = nameStr.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    const words = clean.split(/\s+/);
    if (words.length > 1) {
      return words.map(w => w[0]).join('').toUpperCase().slice(0, 6);
    }
    return clean.slice(0, 4).toUpperCase();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Department name is required';
    if (!formData.code.trim()) errors.code = 'Department code is required';
    if (!formData.building.trim()) errors.building = 'Building is required';
    if (!formData.floor.trim()) errors.floor = 'Floor is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      if (editingDept) {
        await updateDepartment(formData);
        onShowToast && onShowToast({
          type: 'success',
          title: 'Department Updated',
          message: `${formData.name} (${formData.code}) updated successfully.`
        });
      } else {
        await createDepartment(formData);
        onShowToast && onShowToast({
          type: 'success',
          title: 'Department Created',
          message: `${formData.name} (${formData.code}) added to hospital registry.`
        });
      }

      setIsFormOpen(false);
      setEditingDept(null);
      await loadDepartments();
      onDepartmentChanged && onDepartmentChanged();
    } catch (err) {
      onShowToast && onShowToast({ type: 'error', title: 'Save Failed', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (dept) => {
    if (dept.total_equipments > 0) {
      onShowToast && onShowToast({
        type: 'warning',
        title: 'Action Prohibited',
        message: `Cannot delete ${dept.name}: ${dept.total_equipments} medical equipment asset(s) are currently stationed here.`
      });
      return;
    }

    if (!window.confirm(`Are you sure you want to delete department "${dept.name}" (${dept.code})?`)) {
      return;
    }

    try {
      await deleteDepartment(dept.id);
      onShowToast && onShowToast({
        type: 'success',
        title: 'Department Removed',
        message: `${dept.name} has been removed from the registry.`
      });
      await loadDepartments();
      onDepartmentChanged && onDepartmentChanged();
    } catch (err) {
      onShowToast && onShowToast({ type: 'error', title: 'Delete Failed', message: err.message });
    }
  };

  const filteredDepts = departments.filter(d => {
    const q = searchTerm.toLowerCase();
    return (
      d.name?.toLowerCase().includes(q) ||
      d.code?.toLowerCase().includes(q) ||
      d.building?.toLowerCase().includes(q) ||
      d.floor?.toLowerCase().includes(q) ||
      d.head_of_department?.toLowerCase().includes(q)
    );
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Hospital Departments & Facility Registry"
      icon={Building2}
      size="xl"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            Total Registered Departments: <strong>{departments.length}</strong>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      }
    >
      <div>
        {/* Top Control Bar */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '12px', 
          marginBottom: '16px' 
        }}>
          <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
            <Search 
              size={15} 
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} 
            />
            <input
              type="text"
              className="form-control"
              placeholder="Search departments, building, or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '34px', fontSize: '0.86rem' }}
            />
          </div>

          {!isFormOpen && (
            <button 
              type="button" 
              className="btn btn-primary btn-sm"
              onClick={handleOpenAddForm}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={15} />
              Add Hospital Department
            </button>
          )}
        </div>

        {/* Add / Edit Form Card */}
        {isFormOpen && (
          <div style={{
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--color-primary-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            marginBottom: '20px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={16} style={{ color: 'var(--color-primary)' }} />
                <span>{editingDept ? `Edit Department: ${editingDept.name}` : 'Register New Hospital Department'}</span>
              </div>
              <button 
                type="button" 
                onClick={handleCancelForm}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label className="form-label">Department / Unit Name <span className="required">*</span></label>
                  <input
                    type="text"
                    className={`form-control ${formErrors.name ? 'input-error' : ''}`}
                    placeholder="e.g. Clinical Laboratory & Blood Bank, Endoscopy Suite"
                    value={formData.name}
                    onChange={handleNameChange}
                    required
                  />
                  {formErrors.name && (
                    <div className="field-error-text">
                      <AlertTriangle size={13} />
                      <span>{formErrors.name}</span>
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Unique Code <span className="required">*</span></label>
                  <input
                    type="text"
                    className={`form-control ${formErrors.code ? 'input-error' : ''}`}
                    placeholder="e.g. LAB-PATH, ENDO"
                    value={formData.code}
                    onChange={(e) => {
                      setFormData({ ...formData, code: e.target.value.toUpperCase() });
                      if (formErrors.code) setFormErrors(prev => ({ ...prev, code: null }));
                    }}
                    required
                  />
                  {formErrors.code && (
                    <div className="field-error-text">
                      <AlertTriangle size={13} />
                      <span>{formErrors.code}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Building / Tower <span className="required">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Main Hospital Block, Surgical Pavilion B"
                    value={formData.building}
                    onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Floor Location <span className="required">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Ground Floor, 2nd Floor, Basement 1"
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Head of Department / Clinical In-Charge</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Dr. Sarah Jenkins"
                    value={formData.head_of_department}
                    onChange={(e) => setFormData({ ...formData, head_of_department: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Direct Contact Phone / Ext</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. +973-1789-4100"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Department Email</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="e.g. department@hospital.bh"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleCancelForm} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                  <Check size={14} />
                  {submitting ? 'Saving...' : editingDept ? 'Update Department' : 'Save Department'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Departments Table / Cards */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading hospital departments...
          </div>
        ) : filteredDepts.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No matching departments found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
            <table className="datatable" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: '100px' }}>Code</th>
                  <th>Department Name</th>
                  <th>Location (Building / Floor)</th>
                  <th>Clinical Leadership & Contact</th>
                  <th style={{ textAlign: 'center' }}>Equipment Assets</th>
                  <th style={{ width: '100px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDepts.map((d) => {
                  const total = Number(d.total_equipments || 0);
                  const operational = Number(d.operational_count || 0);
                  const breakdown = Number(d.breakdown_count || 0);

                  return (
                    <tr key={d.id}>
                      <td>
                        <span style={{ 
                          fontFamily: 'var(--font-mono)', 
                          fontWeight: 700, 
                          color: 'var(--color-primary)', 
                          backgroundColor: 'var(--color-primary-subtle)', 
                          padding: '3px 7px', 
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.8rem'
                        }}>
                          {d.code}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{d.name}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.84rem' }}>
                          <MapPin size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          <span>{d.building} • <strong style={{ color: 'var(--color-primary)' }}>{d.floor}</strong></span>
                        </div>
                      </td>
                      <td>
                        {d.head_of_department ? (
                          <div style={{ fontSize: '0.84rem' }}>
                            <div style={{ fontWeight: 500 }}>{d.head_of_department}</div>
                            {d.contact_phone && (
                              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{d.contact_phone}</div>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Not Assigned</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {total > 0 ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span className="badge badge-info" title={`${operational} Operational Assets`}>
                              {total} Assets
                            </span>
                            {breakdown > 0 && (
                              <span className="badge badge-danger" title={`${breakdown} Under Breakdown`}>
                                {breakdown} Down
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>0 Assets</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-icon"
                            style={{ width: '28px', height: '28px' }}
                            onClick={() => handleOpenEditForm(d)}
                            title="Edit Department"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-icon"
                            style={{ 
                              width: '28px', 
                              height: '28px',
                              opacity: total > 0 ? 0.4 : 1,
                              cursor: total > 0 ? 'not-allowed' : 'pointer'
                            }}
                            onClick={() => handleDelete(d)}
                            title={total > 0 ? 'Cannot delete: Equipment assets are assigned here' : 'Delete Department'}
                          >
                            <Trash2 size={13} style={{ color: total > 0 ? 'inherit' : 'var(--color-danger)' }} />
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
    </Modal>
  );
}
