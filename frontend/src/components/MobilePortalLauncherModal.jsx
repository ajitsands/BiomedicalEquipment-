import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { QRCodeSVG } from 'qrcode.react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { 
  fetchMobileNetworkInfo, 
  fetchMobileCategoryJobs, 
  adminAssignMobileJob 
} from '../services/api';
import { 
  Smartphone, 
  QrCode, 
  ExternalLink, 
  Copy, 
  Check, 
  Wifi, 
  Users, 
  ShieldCheck, 
  AlertOctagon, 
  Building2, 
  Sparkles,
  ArrowRight,
  UserCheck,
  RefreshCw
} from 'lucide-react';

export default function MobilePortalLauncherModal({
  isOpen,
  onClose,
  onLaunchMobileView,
  onShowToast
}) {
  const { settings } = useSettings();
  const { allEmployees } = useAuth();

  const [activeTab, setActiveTab] = useState('qr'); // 'qr' or 'assignments'
  const [copied, setCopied] = useState(false);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [useWifiIp, setUseWifiIp] = useState(true);
  const [loading, setLoading] = useState(false);

  // Assignment Tab State
  const [assignCategory, setAssignCategory] = useState('pm');
  const [categoryJobs, setCategoryJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const companyName = settings?.company_name || 'SaNDS Lab Middle East W.L.L';
  const companyLogo = settings?.company_logo || '/sands_logo.png';

  useEffect(() => {
    if (isOpen) {
      loadNetwork();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && activeTab === 'assignments') {
      loadJobsForAssignment(assignCategory);
    }
  }, [isOpen, activeTab, assignCategory]);

  const loadNetwork = async () => {
    try {
      setLoading(true);
      const res = await fetchMobileNetworkInfo();
      if (res && res.status === 'success') {
        setNetworkInfo(res.data);
      }
    } catch (err) {
      console.warn('Network info fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadJobsForAssignment = async (cat) => {
    try {
      setLoading(true);
      const res = await fetchMobileCategoryJobs(cat, null, '', 'Pending');
      if (res && res.status === 'success') {
        setCategoryJobs(res.data.jobs || []);
        if (res.data.jobs?.length > 0) {
          setSelectedJobId(res.data.jobs[0].id || res.data.jobs[0].equipment_id);
        }
      }
    } catch (err) {
      console.warn('Jobs load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Determine Mobile Portal URL
  const currentOrigin = window.location.origin;
  const currentPath = window.location.pathname;
  const currentHost = window.location.hostname;
  const currentPort = window.location.port || '2020';

  let mobileUrl = `${currentOrigin}${currentPath}#mobile`;

  if (useWifiIp && networkInfo?.server_ip && networkInfo.server_ip !== '127.0.0.1') {
    mobileUrl = `http://${networkInfo.server_ip}:${networkInfo.port || currentPort}/#mobile`;
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(mobileUrl);
    setCopied(true);
    if (onShowToast) {
      onShowToast({ type: 'success', title: 'Link Copied', message: 'Mobile portal URL copied to clipboard!' });
    }
    setTimeout(() => setCopied(false), 2500);
  };

  const handleAssignTask = async (e) => {
    e.preventDefault();
    if (!selectedJobId || !selectedEmployeeId) {
      if (onShowToast) {
        onShowToast({ type: 'warning', title: 'Selection Required', message: 'Please select both a job and an employee.' });
      }
      return;
    }

    const emp = allEmployees.find(e => e.id == selectedEmployeeId);
    if (!emp) return;

    try {
      setAssigning(true);
      const res = await adminAssignMobileJob({
        category: assignCategory,
        job_id: selectedJobId,
        employee_id: emp.id,
        employee_name: emp.full_name,
        employee_badge: emp.employee_code
      });

      if (onShowToast) {
        onShowToast({ type: 'success', title: 'Assigned Successfully', message: res.message || `Task assigned to ${emp.full_name}` });
      }

      loadJobsForAssignment(assignCategory);
    } catch (err) {
      if (onShowToast) {
        onShowToast({ type: 'error', title: 'Assignment Failed', message: err.message });
      }
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mobile Field Portal • Staff QR Launch & Task Assignment"
      maxWidth="820px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '8px' }}>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'qr' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('qr')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '6px 6px 0 0', borderBottom: 'none' }}
          >
            <QrCode size={16} />
            <span>Mobile QR Code Scanner</span>
          </button>

          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'assignments' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('assignments')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '6px 6px 0 0', borderBottom: 'none' }}
          >
            <Users size={16} />
            <span>Admin Task Delegation (Assign Staff)</span>
          </button>
        </div>

        {/* TAB 1: QR CODE & MOBILE LAUNCH */}
        {activeTab === 'qr' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 320px) 1fr', gap: '24px', alignItems: 'center' }}>
            
            {/* Left: Big QR Code Card */}
            <div style={{ 
              background: '#ffffff', 
              border: '2px solid #0284c7', 
              borderRadius: '16px', 
              padding: '24px', 
              textAlign: 'center',
              boxShadow: '0 8px 24px rgba(2, 132, 199, 0.12)',
              color: '#0f172a'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '14px' }}>
                <img 
                  src={companyLogo} 
                  alt={companyName} 
                  style={{ maxHeight: '28px', maxWidth: '100px', objectFit: 'contain' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>
                  BioTrack Mobile
                </span>
              </div>

              {/* The QR Code */}
              <div style={{ 
                background: '#fff', 
                padding: '14px', 
                borderRadius: '12px', 
                display: 'inline-block',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
              }}>
                <QRCodeSVG
                  value={mobileUrl}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginTop: '12px' }}>
                Scan to Launch Field Portal
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                Point any smartphone camera to open
              </div>
            </div>

            {/* Right: Connection Details & Direct Launch */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ margin: '0 0 6px', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Hospital Field Staff Mobile Portal
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  Biomedical engineers, technicians, and infection control nurses can scan this QR code on any phone or tablet to access their assigned jobs.
                </p>
              </div>

              {/* Network Selector Pill */}
              <div style={{ 
                background: 'var(--bg-secondary)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '10px', 
                padding: '12px 14px' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Wifi size={15} style={{ color: '#10b981' }} />
                    Network Access Mode:
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      className={`btn btn-xs ${useWifiIp ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setUseWifiIp(true)}
                      style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                    >
                      Wi-Fi / LAN IP
                    </button>
                    <button
                      type="button"
                      className={`btn btn-xs ${!useWifiIp ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setUseWifiIp(false)}
                      style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                    >
                      Current Host
                    </button>
                  </div>
                </div>

                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  background: 'var(--bg-input)', 
                  padding: '8px 12px', 
                  borderRadius: '6px', 
                  border: '1px solid var(--border-color)',
                  wordBreak: 'break-all'
                }}>
                  <code style={{ fontSize: '0.78rem', color: '#0284c7', flex: 1 }}>
                    {mobileUrl}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#10b981' : '#64748b' }}
                    title="Copy Link"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              {/* Feature Highlights */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.78rem' }}>
                <div style={{ padding: '8px 10px', background: 'rgba(2, 132, 199, 0.06)', borderRadius: '6px', border: '1px solid rgba(2, 132, 199, 0.2)' }}>
                  <strong style={{ color: '#0284c7', display: 'block' }}>🩺 PM & Electrical Safety</strong>
                  <span>Evaluate checklists 1-by-1 on mobile</span>
                </div>
                <div style={{ padding: '8px 10px', background: 'rgba(239, 68, 68, 0.06)', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <strong style={{ color: '#ef4444', display: 'block' }}>⚠️ Breakdown Work Orders</strong>
                  <span>Emergency hospital repair tickets</span>
                </div>
                <div style={{ padding: '8px 10px', background: 'rgba(245, 158, 11, 0.06)', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                  <strong style={{ color: '#f59e0b', display: 'block' }}>🏗️ Site Preps</strong>
                  <span>130-point commissioning checklist</span>
                </div>
                <div style={{ padding: '8px 10px', background: 'rgba(16, 185, 129, 0.06)', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <strong style={{ color: '#10b981', display: 'block' }}>🧹 Housekeeping</strong>
                  <span>Terminal clean & ATP swab audits</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    onClose();
                    if (onLaunchMobileView) {
                      onLaunchMobileView();
                    } else {
                      window.location.hash = '#mobile';
                    }
                  }}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#0284c7', borderColor: '#0284c7' }}
                >
                  <Smartphone size={16} />
                  <span>Launch Mobile Portal on Screen</span>
                </button>

                <a
                  href={mobileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <ExternalLink size={15} />
                  <span>Open New Tab</span>
                </a>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: ADMIN TASK ASSIGNMENT */}
        {activeTab === 'assignments' && (
          <form onSubmit={handleAssignTask} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Admin Work Order & Job Assignment Center
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Select a category, choose an open hospital task or audit, and assign it to an engineer or inspector. The task will immediately appear on the staff member's mobile portal.
              </p>
            </div>

            {/* Category Selector Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {[
                { key: 'pm', label: 'PM Checklist', icon: ShieldCheck, color: '#0284c7' },
                { key: 'breakdown', label: 'Breakdown Ticket', icon: AlertOctagon, color: '#ef4444' },
                { key: 'site_prep', label: 'Site Preparation', icon: Building2, color: '#f59e0b' },
                { key: 'housekeeping', label: 'Housekeeping Audit', icon: Sparkles, color: '#10b981' }
              ].map(cat => {
                const Icon = cat.icon;
                const isSelected = assignCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setAssignCategory(cat.key)}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: `1.5px solid ${isSelected ? cat.color : 'var(--border-color)'}`,
                      background: isSelected ? `${cat.color}15` : 'var(--bg-card)',
                      color: isSelected ? cat.color : 'var(--text-primary)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      fontWeight: isSelected ? 800 : 600,
                      fontSize: '0.82rem'
                    }}
                  >
                    <Icon size={18} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Select Task / Job Dropdown */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                Select Open Job / Work Order:
              </label>
              {loading ? (
                <div style={{ padding: '10px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading jobs...</div>
              ) : categoryJobs.length === 0 ? (
                <div style={{ padding: '12px', background: 'var(--bg-card)', border: '1px dashed var(--border-color)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  No open jobs found in this category.
                </div>
              ) : (
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', fontSize: '0.85rem' }}
                >
                  {categoryJobs.map(job => {
                    const id = job.id || job.equipment_id;
                    const title = job.asset_id 
                      ? `${job.asset_id} • ${job.equipment_name || job.name} (${job.department_name || job.room_number || 'Hospital'})`
                      : job.ticket_number 
                      ? `${job.ticket_number} • ${job.equipment_name || 'Device'} (${job.priority})`
                      : job.audit_number
                      ? `${job.audit_number} • ${job.room_number || job.target_model}`
                      : `Job #${id}`;
                    return (
                      <option key={id} value={id}>
                        {title}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>

            {/* Select Technician / Staff Dropdown */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                Assign to Field Staff / Engineer:
              </label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', fontSize: '0.85rem' }}
                required
              >
                <option value="">-- Choose Employee / Technician --</option>
                {allEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.role || emp.designation}) — {emp.employee_code}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit Assignment */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={assigning || categoryJobs.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0284c7', borderColor: '#0284c7' }}
              >
                <UserCheck size={16} />
                <span>{assigning ? 'Assigning...' : 'Confirm Assignment'}</span>
              </button>
            </div>

          </form>
        )}

      </div>
    </Modal>
  );
}
