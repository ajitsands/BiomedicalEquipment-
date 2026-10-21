import React, { useState } from 'react';
import Modal from './Modal';
import { useAuth } from '../context/AuthContext';
import { 
  User, 
  Lock, 
  Key, 
  ShieldCheck, 
  CheckCircle2, 
  Users, 
  Building2, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function UserLoginModal({
  isOpen,
  onClose,
  onOpenEmployeesModal,
  onShowToast
}) {
  const { currentUser, allEmployees, switchUser, loginWithCredentials } = useAuth();
  const [activeTab, setActiveTab] = useState('quick'); // 'quick' | 'credentials'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleQuickSwitch = (emp) => {
    switchUser(emp);
    onShowToast({
      type: 'success',
      title: 'Active User Switched',
      message: `Now logged in as ${emp.full_name} (${emp.role})`
    });
    onClose();
  };

  const handleCredentialLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      onShowToast({ type: 'warning', title: 'Required Fields', message: 'Enter username and password' });
      return;
    }

    try {
      setLoading(true);
      const user = await loginWithCredentials(username, password);
      onShowToast({
        type: 'success',
        title: 'Login Successful',
        message: `Welcome back, ${user.full_name} (${user.role})`
      });
      setUsername('');
      setPassword('');
      onClose();
    } catch (err) {
      onShowToast({ type: 'error', title: 'Login Failed', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Staff Login & Active User Session"
      icon={ShieldCheck}
      size="md"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          {onOpenEmployeesModal ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                onClose();
                onOpenEmployeesModal();
              }}
              style={{ fontSize: '0.78rem' }}
            >
              <Users size={14} /> Manage Employees & Reset Passwords
            </button>
          ) : <div />}
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Cancel
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Current Active User Banner */}
        {currentUser && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: 'rgba(2, 132, 199, 0.08)',
            border: '1px solid rgba(2, 132, 199, 0.25)',
            borderRadius: 'var(--radius-sm)'
          }}>
            <div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Currently Active User</div>
              <div style={{ fontWeight: 800, fontSize: '1.02rem', color: 'var(--text-primary)' }}>
                {currentUser.full_name}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                {currentUser.role} • <code>{currentUser.employee_code}</code>
              </div>
            </div>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '12px',
              backgroundColor: '#d1fae5',
              color: '#065f46'
            }}>
              Active
            </span>
          </div>
        )}

        {/* Mode Selector Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '8px' }}>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'quick' ? 'active' : ''}`}
            onClick={() => setActiveTab('quick')}
            style={{ padding: '8px 14px', fontSize: '0.86rem', fontWeight: 600 }}
          >
            ⚡ 1-Click Fast Switch ({allEmployees.length} Staff)
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'credentials' ? 'active' : ''}`}
            onClick={() => setActiveTab('credentials')}
            style={{ padding: '8px 14px', fontSize: '0.86rem', fontWeight: 600 }}
          >
            🔑 Login with Password
          </button>
        </div>

        {activeTab === 'quick' ? (
          <div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Select your account below. All bookings, PM checklist executions, and ticket resolutions will be logged under this employee identity:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
              {allEmployees.map(emp => {
                const isSelected = currentUser?.id === emp.id;
                return (
                  <div
                    key={emp.id}
                    onClick={() => handleQuickSwitch(emp)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      backgroundColor: isSelected ? 'var(--bg-subtle)' : 'var(--bg-surface)',
                      border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: isSelected ? 800 : 600, fontSize: '0.92rem' }}>
                        {emp.full_name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span>{emp.role}</span>
                        <span>•</span>
                        <code>{emp.employee_code}</code>
                        {emp.department_name && (
                          <>
                            <span>•</span>
                            <span>{emp.department_name}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isSelected ? (
                        <CheckCircle2 size={18} style={{ color: 'var(--color-primary)' }} />
                      ) : (
                        <button type="button" className="btn btn-secondary btn-sm" style={{ fontSize: '0.76rem', padding: '3px 8px' }}>
                          Switch <ArrowRight size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <form onSubmit={handleCredentialLogin}>
            <div className="form-group">
              <label className="form-label">Employee Username</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. hassan.bme, reem.bme, layla.nurse"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  style={{ paddingLeft: '34px' }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Employee Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  className="form-control"
                  placeholder="Enter employee password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '34px' }}
                  required
                />
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Default initial password for seeded staff is <code>Hospital@123</code>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '8px' }}
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Sign In as Employee'}
            </button>
          </form>
        )}

      </div>
    </Modal>
  );
}
