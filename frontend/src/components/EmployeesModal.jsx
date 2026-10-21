import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { 
  fetchEmployees, 
  createEmployee, 
  updateEmployee, 
  deleteEmployee,
  fetchDepartments 
} from '../services/api';
import { 
  Users, 
  Plus, 
  Search, 
  User, 
  Lock, 
  Key, 
  Eye, 
  EyeOff, 
  Phone, 
  Mail, 
  Building2, 
  BadgeCheck, 
  Edit2, 
  X, 
  CheckCircle2, 
  AlertTriangle,
  Shield,
  FileText
} from 'lucide-react';

export default function EmployeesModal({
  isOpen,
  onClose,
  onShowToast,
  onEmployeeChanged
}) {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    password: '',
    employee_code: '',
    role: 'Biomedical Engineer',
    department_id: '',
    designation: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [empRes, deptRes] = await Promise.all([
        fetchEmployees(),
        fetchDepartments()
      ]);
      setEmployees(empRes.data || []);
      setDepartments(deptRes.data || []);
    } catch (err) {
      onShowToast({ type: 'error', title: 'Error', message: 'Failed to load employees data' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingEmployee(null);
    setShowPassword(false);
    setFormData({
      full_name: '',
      username: '',
      password: 'Hospital@' + Math.floor(100 + Math.random() * 900),
      employee_code: '',
      role: 'Biomedical Engineer',
      department_id: departments.length > 0 ? departments[0].id : '',
      designation: 'Clinical Engineering Staff',
      phone: '+973-',
      email: ''
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (emp) => {
    setEditingEmployee(emp);
    setShowPassword(false);
    setFormData({
      full_name: emp.full_name || '',
      username: emp.username || '',
      password: '', // Blank unless resetting
      employee_code: emp.employee_code || '',
      role: emp.role || 'Biomedical Engineer',
      department_id: emp.department_id || '',
      designation: emp.designation || '',
      phone: emp.phone || '',
      email: emp.email || ''
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name.trim() || !formData.username.trim()) {
      onShowToast({ type: 'warning', title: 'Required Fields', message: 'Full Name and Username are required' });
      return;
    }

    if (!editingEmployee && !formData.password.trim()) {
      onShowToast({ type: 'warning', title: 'Password Required', message: 'Initial password is required to create employee credentials' });
      return;
    }

    try {
      setSubmitting(true);
      if (editingEmployee) {
        await updateEmployee({
          id: editingEmployee.id,
          ...formData
        });
        onShowToast({ type: 'success', title: 'Employee Updated', message: `${formData.full_name} profile updated successfully` });
      } else {
        await createEmployee(formData);
        onShowToast({ type: 'success', title: 'Employee Registered', message: `${formData.full_name} created with login username: ${formData.username}` });
      }

      setIsFormOpen(false);
      loadData();
      if (onEmployeeChanged) onEmployeeChanged();
    } catch (err) {
      onShowToast({ type: 'error', title: 'Action Failed', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (emp) => {
    try {
      const newActive = emp.is_active ? 0 : 1;
      await updateEmployee({ id: emp.id, is_active: newActive });
      onShowToast({
        type: 'info',
        title: 'Status Updated',
        message: `${emp.full_name} account is now ${newActive ? 'Active' : 'Deactivated'}`
      });
      loadData();
      if (onEmployeeChanged) onEmployeeChanged();
    } catch (err) {
      onShowToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesRole = roleFilter === 'ALL' || emp.role === roleFilter;
    const q = searchTerm.toLowerCase();
    const matchesSearch = !q ||
      (emp.full_name && emp.full_name.toLowerCase().includes(q)) ||
      (emp.username && emp.username.toLowerCase().includes(q)) ||
      (emp.employee_code && emp.employee_code.toLowerCase().includes(q)) ||
      (emp.phone && emp.phone.includes(q)) ||
      (emp.department_name && emp.department_name.toLowerCase().includes(q));
    return matchesRole && matchesSearch;
  });

  const getRoleBadgeStyle = (role) => {
    if (role.includes('Engineer') || role.includes('BME')) {
      return { backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' };
    }
    if (role.includes('Nurse') || role.includes('Clinical')) {
      return { backgroundColor: '#fce7f3', color: '#be185d', border: '1px solid #fbcfe8' };
    }
    if (role.includes('Tech')) {
      return { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' };
    }
    if (role.includes('Admin') || role.includes('Director')) {
      return { backgroundColor: '#f3e8ff', color: '#6b21a8', border: '1px solid #e9d5ff' };
    }
    return { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' };
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Hospital Staff & Clinical Engineers Master (Employee Accounts & Credentials)"
      icon={Users}
      size="xl"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Total Registered Staff: <strong>{employees.length} Employees</strong> with secure username & password credentials
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Close Staff Directory
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Top Control Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          
          {/* Role Filters */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn btn-sm ${roleFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setRoleFilter('ALL')}
            >
              All Staff ({employees.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${roleFilter === 'Biomedical Engineer' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setRoleFilter('Biomedical Engineer')}
            >
              ⚙️ Engineers
            </button>
            <button
              type="button"
              className={`btn btn-sm ${roleFilter === 'Biomedical Technician' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setRoleFilter('Biomedical Technician')}
            >
              🛠️ Technicians
            </button>
            <button
              type="button"
              className={`btn btn-sm ${roleFilter === 'Staff Nurse In-Charge' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setRoleFilter('Staff Nurse In-Charge')}
            >
              🩺 Nurses & Clinical
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search staff or username..."
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
              <span>Add Employee</span>
            </button>
          </div>
        </div>

        {/* Form Drawer for Add / Edit */}
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
                <Key size={18} style={{ color: 'var(--color-primary)' }} />
                <h4 style={{ margin: 0, fontWeight: 700 }}>
                  {editingEmployee ? `Edit Employee Account: ${editingEmployee.full_name}` : 'Register New Employee & Generate Login Credentials'}
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
                  <label className="form-label">Full Name <span className="required">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Eng. Reem Al-Kooheji"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Login Username <span className="required">*</span></label>
                  <div style={{ position: 'relative' }}>
                    <User size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. reem.bme"
                      value={formData.username}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/\s+/g, '') }))}
                      style={{ paddingLeft: '32px' }}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {editingEmployee ? 'Reset Password (Leave blank to keep)' : 'Initial Password *'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-control"
                      placeholder={editingEmployee ? 'Enter new password to reset' : 'e.g. Hospital@123'}
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      style={{ paddingLeft: '32px', paddingRight: '36px' }}
                      required={!editingEmployee}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)'
                      }}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Hospital Role <span className="required">*</span></label>
                  <select
                    className="form-control"
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value, designation: e.target.value }))}
                    required
                  >
                    <option value="Biomedical Engineer">⚙️ Biomedical Engineer (Clinical Tech Lead)</option>
                    <option value="Senior Clinical Engineer">🔬 Senior Clinical Engineer (Specialist)</option>
                    <option value="Biomedical Technician">🛠️ Biomedical Technician (PM / Calibration)</option>
                    <option value="Staff Nurse In-Charge">🩺 Staff Nurse In-Charge (Ward / OT / ICU)</option>
                    <option value="Head of Department / ICU Lead">🏥 Head of Department / Medical Lead</option>
                    <option value="Biomedical Director / Administrator">🛡️ Biomedical Director / Administrator</option>
                    <option value="Contractor Representative">🤝 Authorized Contractor Representative</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Assigned Department</label>
                  <select
                    className="form-control"
                    value={formData.department_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, department_id: e.target.value }))}
                  >
                    <option value="">-- General / Hospital-Wide --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.floor})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Employee ID Code</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Auto-generated if blank (e.g. EMP-BME-102)"
                    value={formData.employee_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, employee_code: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Mobile / Pager Phone</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="+973-3507-8079"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Official Work Email</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="staff@hospital.com"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Clinical Designation / Title</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Critical Care Equipment Supervisor"
                    value={formData.designation}
                    onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
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
                  {submitting ? 'Saving Employee...' : (editingEmployee ? 'Update Account' : 'Save Employee & Credentials')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Employees Table */}
        <div style={{ 
          backgroundColor: 'var(--bg-surface)', 
          border: '1px solid var(--border-color)', 
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden'
        }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading hospital staff directory...
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No staff members found matching criteria.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', maxHeight: '480px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-subtle)', textAlign: 'left', borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ padding: '10px 14px' }}>Employee & Code</th>
                    <th style={{ padding: '10px 14px' }}>Login Username</th>
                    <th style={{ padding: '10px 14px' }}>Role & Title</th>
                    <th style={{ padding: '10px 14px' }}>Assigned Department</th>
                    <th style={{ padding: '10px 14px' }}>Contact Phone</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>Booked Complaints</th>
                    <th style={{ padding: '10px 14px' }}>Password Hint</th>
                    <th style={{ padding: '10px 14px' }}>Status</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map(emp => {
                    const badgeStyle = getRoleBadgeStyle(emp.role);
                    return (
                      <tr 
                        key={emp.id} 
                        style={{ 
                          borderBottom: '1px solid var(--border-color)',
                          opacity: emp.is_active ? 1 : 0.6
                        }}
                      >
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {emp.full_name}
                          </div>
                          <div style={{ fontFamily: 'monospace', fontSize: '0.74rem', color: '#0284c7', fontWeight: 600 }}>
                            {emp.employee_code}
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                            <User size={13} style={{ color: 'var(--color-primary)' }} />
                            <code>{emp.username}</code>
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ 
                            ...badgeStyle, 
                            fontSize: '0.72rem', 
                            fontWeight: 700, 
                            padding: '2px 8px', 
                            borderRadius: '4px',
                            display: 'inline-block'
                          }}>
                            {emp.role}
                          </span>
                          {emp.designation && emp.designation !== emp.role && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {emp.designation}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div>{emp.department_name || 'Hospital-Wide'}</div>
                          {emp.department_floor && (
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              Floor: {emp.department_floor}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                            <Phone size={13} style={{ color: 'var(--text-muted)' }} />
                            {emp.phone || '—'}
                          </div>
                          {emp.email && (
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              {emp.email}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700 }}>
                          <span style={{ 
                            backgroundColor: 'rgba(2, 132, 199, 0.1)', 
                            color: '#0284c7', 
                            padding: '2px 8px', 
                            borderRadius: '10px',
                            fontSize: '0.75rem' 
                          }}>
                            {emp.total_booked_complaints || 0}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <code>{emp.plain_password_hint || '••••••••'}</code>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: emp.is_active ? '#d1fae5' : '#fee2e2',
                            color: emp.is_active ? '#065f46' : '#991b1b'
                          }}>
                            {emp.is_active ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-icon btn-sm"
                              onClick={() => handleOpenEdit(emp)}
                              title="Edit Employee & Password"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm ${emp.is_active ? 'btn-ghost' : 'btn-outline-primary'}`}
                              style={{ fontSize: '0.74rem', padding: '2px 8px' }}
                              onClick={() => handleToggleStatus(emp)}
                              title={emp.is_active ? 'Deactivate Account' : 'Activate Account'}
                            >
                              {emp.is_active ? 'Disable' : 'Enable'}
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
