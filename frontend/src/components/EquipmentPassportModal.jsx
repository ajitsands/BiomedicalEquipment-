import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { 
  fetchEquipmentDetail, 
  uploadAttachment 
} from '../services/api';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Layers, 
  FileText, 
  Clock, 
  AlertOctagon, 
  Paperclip, 
  QrCode, 
  MapPin, 
  ShieldCheck, 
  Phone, 
  Mail, 
  Calendar, 
  DollarSign, 
  Printer, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  CheckSquare, 
  Radio 
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export default function EquipmentPassportModal({
  equipmentId,
  isOpen,
  onClose,
  onOpenChecklistRunner,
  onOpenBookComplaint,
  onShowToast
}) {
  const { formatDate, formatDateTime, formatCurrency, settings } = useSettings();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState('User Manual');
  const [docTitle, setDocTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    if (isOpen && equipmentId) {
      loadDetail();
    }
  }, [isOpen, equipmentId]);

  const loadDetail = async () => {
    try {
      setLoading(true);
      const res = await fetchEquipmentDetail(equipmentId);
      setData(res.data);
    } catch (err) {
      onShowToast({ type: 'error', title: 'Error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!docTitle) {
      onShowToast({ type: 'warning', title: 'Missing Title', message: 'Please provide a document title' });
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('equipment_id', equipmentId);
      formData.append('document_type', docType);
      formData.append('file_title', docTitle);
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      await uploadAttachment(formData);
      onShowToast({ type: 'success', title: 'Uploaded', message: 'Document attachment added successfully' });
      setDocTitle('');
      setSelectedFile(null);
      loadDetail();
    } catch (err) {
      onShowToast({ type: 'error', title: 'Upload Failed', message: err.message });
    } finally {
      setUploading(false);
    }
  };

  const [printMode, setPrintMode] = useState('passport'); // 'passport' | 'label'

  const handlePrint = (mode = 'passport') => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  if (!isOpen) return null;

  const eq = data?.equipment;
  const attachments = data?.attachments || [];
  const maintenance = data?.maintenance_records || [];
  const complaints = data?.complaints || [];
  const rfidLogs = data?.rfid_logs || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={eq ? `${eq.name} (${eq.asset_id})` : 'Equipment Asset Passport'}
      icon={Layers}
      size="lg"
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Biomedical Asset ID: <strong style={{ color: 'var(--text-primary)' }}>{eq?.asset_id}</strong>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handlePrint('passport')}
              title="Print Complete Official Medical Equipment Passport Certificate (A4)"
            >
              <Printer size={15} />
              Print Passport (A4)
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handlePrint('label')}
              title="Print Physical Asset QR Sticker Tag (Thermal / Label Size)"
            >
              <QrCode size={15} />
              Print QR Label
            </button>
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={() => {
                onClose();
                onOpenChecklistRunner(eq);
              }}
            >
              <CheckSquare size={15} />
              Execute PM Checklist
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => {
                onClose();
                onOpenBookComplaint(eq);
              }}
            >
              <AlertOctagon size={15} />
              Book Complaint
            </button>
          </div>
        </div>
      }
    >
      {loading || !eq ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading complete equipment lifecycle history...
        </div>
      ) : (
        <>
          <div className="screen-only-passport">
            {/* Top Quick Summary Strip */}
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '16px', 
            padding: '16px 20px', 
            backgroundColor: 'var(--bg-subtle)', 
            borderRadius: 'var(--radius-md)',
            marginBottom: '20px',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Manufacturer & Model</div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{eq.brand} • {eq.model_number}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>SN: <code>{eq.serial_number}</code></div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Location</div>
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={16} style={{ color: 'var(--color-primary)' }} />
                {eq.department_name} ({eq.floor})
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{eq.room_number} {eq.bed_slot ? `• ${eq.bed_slot}` : ''}</div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Operational Status</div>
              <div style={{ marginTop: '4px' }}>
                <span className={`badge ${
                  eq.status === 'Operational' ? 'badge-success' : 
                  eq.status === 'Under Breakdown' ? 'badge-danger' : 
                  eq.status === 'Calibration Due' ? 'badge-warning' : 'badge-info'
                }`}>
                  <span className="badge-dot" />
                  {eq.status}
                </span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Warranty / Contract</div>
              <div style={{ marginTop: '4px' }}>
                <span className={`badge ${eq.warranty_status === 'Under Warranty' ? 'badge-success' : 'badge-purple'}`}>
                  {eq.warranty_status} ({eq.contract_type})
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="tabs-nav">
            <button 
              className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <FileText size={16} /> Overview & Technical Specs
            </button>
            <button 
              className={`tab-btn ${activeTab === 'purchase_warranty' ? 'active' : ''}`}
              onClick={() => setActiveTab('purchase_warranty')}
            >
              <DollarSign size={16} /> Purchase & Warranty Passport
            </button>
            <button 
              className={`tab-btn ${activeTab === 'pm_history' ? 'active' : ''}`}
              onClick={() => setActiveTab('pm_history')}
            >
              <CheckSquare size={16} /> Maintenance & PM Records ({maintenance.length})
            </button>
            <button 
              className={`tab-btn ${activeTab === 'complaints' ? 'active' : ''}`}
              onClick={() => setActiveTab('complaints')}
            >
              <AlertOctagon size={16} /> Complaints & Breakdowns ({complaints.length})
            </button>
            <button 
              className={`tab-btn ${activeTab === 'attachments' ? 'active' : ''}`}
              onClick={() => setActiveTab('attachments')}
            >
              <Paperclip size={16} /> Attachments & Manuals ({attachments.length})
            </button>
            <button 
              className={`tab-btn ${activeTab === 'qr_rfid' ? 'active' : ''}`}
              onClick={() => setActiveTab('qr_rfid')}
            >
              <QrCode size={16} /> QR Code & RFID Location
            </button>
          </div>

          {/* Tab 1: Overview & Specs */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div className="card" style={{ padding: '18px' }}>
                <h4 style={{ fontSize: '0.95rem', marginBottom: '14px', color: 'var(--color-primary)' }}>Device Classification</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
                  <div><strong>Equipment Type:</strong> {eq.equipment_type_name}</div>
                  <div><strong>Category:</strong> {eq.equipment_category}</div>
                  <div><strong>Risk Class:</strong> <span className="badge badge-danger">{eq.risk_classification}</span></div>
                  <div><strong>Regulatory Code:</strong> <code>{eq.standard_regulatory_code}</code></div>
                  <div><strong>Standard PM Frequency:</strong> {eq.default_pm_frequency}</div>
                  <div><strong>IEC Protection Class:</strong> <span className="badge badge-primary">{eq.protection_class || 'Class I'}</span></div>
                  <div><strong>Patient Applied Part:</strong> <span className={`badge ${eq.applied_part_type === 'CF' ? 'badge-danger' : (eq.applied_part_type === 'BF' ? 'badge-warning' : 'badge-secondary')}`}>Type {eq.applied_part_type || 'None'}</span></div>
                </div>
              </div>

              <div className="card" style={{ padding: '18px' }}>
                <h4 style={{ fontSize: '0.95rem', marginBottom: '14px', color: 'var(--color-primary)' }}>Identification & Tracking</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
                  <div><strong>Hospital Asset ID:</strong> <code>{eq.asset_id}</code></div>
                  <div><strong>Serial Number:</strong> <code>{eq.serial_number}</code></div>
                  <div><strong>QR Code Token:</strong> <code>{eq.qr_code_token}</code></div>
                  <div><strong>RFID EPC Tag:</strong> <code>{eq.rfid_tag_id}</code></div>
                  <div><strong>Last RFID Detection:</strong> {eq.rfid_last_detected_at ? formatDateTime(eq.rfid_last_detected_at) : 'N/A'}</div>
                </div>
              </div>

              <div className="card" style={{ padding: '18px' }}>
                <h4 style={{ fontSize: '0.95rem', marginBottom: '14px', color: 'var(--color-primary)' }}>Emergency & Support Contacts</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
                  <div><strong>Vendor:</strong> {eq.vendor_name}</div>
                  <div><strong>Emergency 24/7 Hotline:</strong> <strong style={{ color: 'var(--color-danger)' }}>{eq.vendor_emergency_hotline}</strong></div>
                  <div><strong>Service Manager:</strong> {eq.service_manager} ({eq.service_manager_phone})</div>
                  <div><strong>In-House Biomedical Contact:</strong> {eq.emergency_contact_name} ({eq.emergency_phone})</div>
                  <div><strong>Service Email:</strong> {eq.vendor_service_email || eq.vendor_email}</div>
                </div>
              </div>

              <div className="card" style={{ padding: '18px' }}>
                <h4 style={{ fontSize: '0.95rem', marginBottom: '14px', color: 'var(--color-primary)' }}>Preventive Maintenance Timelines</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
                  <div><strong>Last PM Performed:</strong> {formatDate(eq.last_pm_date)}</div>
                  <div><strong>Next PM Due Date:</strong> <strong style={{ color: 'var(--color-warning)' }}>{formatDate(eq.next_pm_due_date)}</strong></div>
                  <div><strong>Last Calibration:</strong> {formatDate(eq.last_calibration_date)}</div>
                  <div><strong>Next Calibration Due:</strong> {formatDate(eq.next_calibration_due_date)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Purchase & Warranty */}
          {activeTab === 'purchase_warranty' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              <div className="card" style={{ padding: '20px' }}>
                <h4 style={{ fontSize: '1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <DollarSign size={18} style={{ color: 'var(--color-primary)' }} />
                  Purchase & Acquisition Details
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem' }}>
                  <div><strong>Purchased From:</strong> {eq.vendor_name}</div>
                  <div><strong>Purchase Order (PO):</strong> <code>{eq.po_number || 'N/A'}</code></div>
                  <div><strong>Invoice Number:</strong> <code>{eq.invoice_number || 'N/A'}</code></div>
                  <div><strong>Purchase Date:</strong> {formatDate(eq.purchase_date)}</div>
                  <div><strong>Purchase Cost:</strong> {formatCurrency(eq.purchase_cost, eq.currency)}</div>
                  <div><strong>Installation Date:</strong> {formatDate(eq.installation_date)}</div>
                  <div><strong>Commissioning Engineer:</strong> {eq.commissioning_engineer || 'N/A'}</div>
                </div>
              </div>

              <div className="card" style={{ padding: '20px' }}>
                <h4 style={{ fontSize: '1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={18} style={{ color: 'var(--color-success)' }} />
                  Warranty & Maintenance Contract
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem' }}>
                  <div>
                    <strong>Warranty Status:</strong>{' '}
                    <span className={`badge ${eq.warranty_status === 'Under Warranty' ? 'badge-success' : 'badge-danger'}`}>
                      {eq.warranty_status}
                    </span>
                  </div>
                  <div><strong>Warranty Period:</strong> {formatDate(eq.warranty_start_date)} to {formatDate(eq.warranty_end_date)}</div>
                  <div><strong>Maintenance Contract Type:</strong> <span className="badge badge-neutral">{eq.contract_type}</span></div>
                  {eq.contract_vendor_name && <div><strong>Contract Vendor:</strong> {eq.contract_vendor_name}</div>}
                  {eq.contract_start_date && <div><strong>Contract Validity:</strong> {formatDate(eq.contract_start_date)} to {formatDate(eq.contract_end_date)}</div>}
                  {eq.contract_value > 0 && <div><strong>Annual Contract Value:</strong> {formatCurrency(eq.contract_value, eq.currency)}</div>}
                  <div><strong>Schedule Protocol:</strong> {eq.maintenance_schedule_type}</div>
                  {eq.maintenance_schedule_notes && (
                    <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', marginTop: '6px' }}>
                      <strong>Schedule Notes:</strong> {eq.maintenance_schedule_notes}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Maintenance & PM Records */}
          {activeTab === 'pm_history' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '1rem' }}>Preventive Maintenance & Safety Calibration History</h4>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    onClose();
                    onOpenChecklistRunner(eq);
                  }}
                >
                  <CheckSquare size={15} /> Run New PM Checklist
                </button>
              </div>

              {maintenance.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No maintenance records logged for this equipment yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {maintenance.map((m) => (
                    <div key={m.id} className="card" style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div>
                          <strong>{m.work_order_no}</strong> • <span style={{ color: 'var(--text-muted)' }}>{m.maintenance_type}</span>
                        </div>
                        <span className={`badge ${
                          m.overall_result.includes('Passed') ? 'badge-success' : 'badge-danger'
                        }`}>
                          {m.overall_result}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '0.84rem' }}>
                        <div><strong>Date:</strong> {formatDate(m.performed_date)}</div>
                        <div><strong>Technician:</strong> {m.performed_by} ({m.technician_badge})</div>
                        <div><strong>Next Due:</strong> {formatDate(m.next_pm_due_date)}</div>
                        <div><strong>Time Spent:</strong> {m.time_spent_minutes} mins</div>
                      </div>
                      {m.test_equipment_used && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                          <strong>Test Tools Used:</strong> {m.test_equipment_used}
                        </div>
                      )}
                      {m.engineer_notes && (
                        <div style={{ fontSize: '0.82rem', marginTop: '6px', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                          "{m.engineer_notes}"
                        </div>
                      )}
                      {m.parts_replaced && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-primary)', marginTop: '4px' }}>
                          <strong>Replaced Parts:</strong> {m.parts_replaced}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Complaints & Breakdowns */}
          {activeTab === 'complaints' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '1rem' }}>Breakdown Tickets & Corrective Maintenance History</h4>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    onClose();
                    onOpenBookComplaint(eq);
                  }}
                >
                  <AlertOctagon size={15} /> Book New Complaint
                </button>
              </div>

              {complaints.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No breakdown complaints recorded for this equipment. It is in good operational standing!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {complaints.map((c) => (
                    <div key={c.id} className="card" style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong>{c.ticket_number}</strong>
                          <span className={`badge ${
                            c.priority.includes('Critical') ? 'badge-danger' : 
                            c.priority.includes('High') ? 'badge-warning' : 'badge-neutral'
                          }`}>
                            {c.priority}
                          </span>
                        </div>
                        <span className={`badge ${
                          c.status === 'Closed' || c.status === 'Repaired & Verified' ? 'badge-success' : 
                          c.status === 'Open' ? 'badge-danger' : 'badge-warning'
                        }`}>
                          {c.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {c.complaint_category}
                      </div>
                      <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        {c.description}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        <div>Reported by: <strong>{c.booked_by_name}</strong></div>
                        <div>Date: {formatDateTime(c.reported_at)}</div>
                        {c.assigned_engineer && <div>Engineer: <strong>{c.assigned_engineer}</strong></div>}
                        {c.downtime_hours > 0 && <div>Downtime: <strong>{c.downtime_hours} hrs</strong></div>}
                      </div>
                      {c.action_taken && (
                        <div style={{ fontSize: '0.82rem', marginTop: '8px', backgroundColor: 'var(--bg-subtle)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
                          <strong>Action Taken:</strong> {c.action_taken}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 5: Attachments & Documents */}
          {activeTab === 'attachments' && (
            <div>
              {/* Upload Form */}
              <div className="card" style={{ padding: '18px', marginBottom: '20px' }}>
                <h4 style={{ fontSize: '0.95rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Upload size={16} style={{ color: 'var(--color-primary)' }} />
                  Attach Document (Manual, Warranty Card, Calibration Certificate)
                </h4>
                <form onSubmit={handleFileUpload}>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Document Type</label>
                      <select 
                        className="form-control" 
                        value={docType} 
                        onChange={(e) => setDocType(e.target.value)}
                      >
                        <option value="User Manual">User Manual / Operator Instructions</option>
                        <option value="Service Manual">Technical Service & Repair Manual</option>
                        <option value="Warranty Card / Guarantee Certificate">Warranty Card / Guarantee Certificate</option>
                        <option value="Calibration Certificate">Calibration & Electrical Safety Certificate</option>
                        <option value="Installation Report">Installation & Acceptance Report</option>
                        <option value="Process Manual / SOP">Process Manual / Department SOP</option>
                        <option value="Purchase Invoice / PO">Purchase Invoice / PO Document</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Document Title / Description</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. OEM User Manual Rev 4"
                        value={docTitle}
                        onChange={(e) => setDocTitle(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Select File (PDF, Image, Doc)</label>
                      <input
                        type="file"
                        className="form-control"
                        onChange={(e) => setSelectedFile(e.target.files[0])}
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary btn-sm"
                    disabled={uploading}
                  >
                    <Upload size={15} />
                    {uploading ? 'Uploading...' : 'Save & Attach Document'}
                  </button>
                </form>
              </div>

              {/* Attachments List */}
              <h4 style={{ fontSize: '0.95rem', marginBottom: '12px' }}>Existing Attached Documents</h4>
              {attachments.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No documents attached yet. You can attach user manuals, warranty certificates, and calibration reports above.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                  {attachments.map((att) => (
                    <div key={att.id} className="card" style={{ padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FileText size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{att.file_title}</div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                            {att.document_type} • {att.file_size_kb} KB
                          </div>
                        </div>
                      </div>
                      <a 
                        href={att.file_path} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 8px' }}
                      >
                        <Download size={14} />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 6: QR Code & RFID Tracking */}
          {activeTab === 'qr_rfid' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              {/* QR Code Printable Label Card */}
              <div className="card printable-sheet" style={{ padding: '24px', textAlign: 'center' }}>
                <div style={{ border: '2px dashed var(--border-color)', padding: '20px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-primary)', marginBottom: '4px' }}>
                    {settings?.company_name || 'SaNDS Lab Middle East W.L.L'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                    Hospital Clinical Engineering & Asset ID Tag
                  </div>

                  <div style={{ display: 'inline-block', padding: '12px', background: '#ffffff', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' }}>
                    <QRCodeSVG 
                      value={eq.asset_id} 
                      size={160}
                      level="H"
                      includeMargin={true}
                    />
                  </div>

                  <div style={{ marginTop: '12px', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.1rem' }}>
                    {eq.asset_id}
                  </div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {eq.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    SN: {eq.serial_number} • Dept: {eq.department_name}
                  </div>
                  <div style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--color-warning)', marginTop: '6px' }}>
                    Next PM Due: {eq.next_pm_due_date}
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: '16px' }}
                    onClick={() => handlePrint('label')}
                  >
                    <Printer size={15} /> Print Physical Asset Tag
                  </button>
                </div>
              </div>

              {/* RFID Tag Live Position & Movement Logs */}
              <div className="card" style={{ padding: '20px' }}>
                <h4 style={{ fontSize: '1rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Radio size={18} style={{ color: 'var(--color-accent)' }} />
                  RFID Live Tag Tracking
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem', marginBottom: '18px' }}>
                  <div><strong>RFID Tag EPC:</strong> <code>{eq.rfid_tag_id}</code></div>
                  <div><strong>Protocol:</strong> Gen2 UHF RFID (860 - 960 MHz)</div>
                  <div><strong>Current Zone:</strong> {eq.building} • {eq.floor}</div>
                  <div><strong>Assigned Room/Bed:</strong> {eq.room_number} {eq.bed_slot ? `• ${eq.bed_slot}` : ''}</div>
                  <div><strong>Last Detected By Reader:</strong> <code>{eq.rfid_reader_node || 'READER-DEFAULT'}</code></div>
                </div>

                <h5 style={{ fontSize: '0.86rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>Recent RFID Movement History</h5>
                <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {rfidLogs.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No historical RFID scans logged.</div>
                  ) : (
                    rfidLogs.map((log) => (
                      <div key={log.id} style={{ fontSize: '0.78rem', padding: '8px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontWeight: 600 }}>{log.detected_department} • {log.detected_room}</div>
                        <div style={{ color: 'var(--text-muted)' }}>
                          {formatDateTime(log.scan_timestamp)} • RSSI: {log.signal_strength_rssi} dBm
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dedicated Medical Grade Printable Asset Passport & QR Label */}
        {eq && (
          <div className="asset-passport-printable">
            {printMode === 'label' ? (
              <div className="passport-label-tag" style={{ border: '2.5px solid #0f172a', padding: '16px', borderRadius: '10px', background: '#ffffff', textAlign: 'center', width: '380px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderBottom: '2px solid #0f172a', paddingBottom: '8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 900 }}>✚</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '11pt', fontWeight: 800, letterSpacing: '0.5px' }}>CLINICAL ENGINEERING</div>
                    <div style={{ fontSize: '7.5pt', color: '#475569', textTransform: 'uppercase' }}>Hospital Medical Equipment Asset Tag</div>
                  </div>
                </div>

                <div style={{ margin: '10px auto', display: 'inline-block', background: '#ffffff', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                  <QRCodeSVG 
                    value={eq.asset_id} 
                    size={160}
                    level="H"
                    includeMargin={true}
                  />
                </div>

                <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '15pt', letterSpacing: '1px', marginTop: '6px', color: '#0f172a' }}>
                  {eq.asset_id}
                </div>
                <div style={{ fontSize: '11pt', fontWeight: 700, color: '#1e293b', marginTop: '2px' }}>
                  {eq.name}
                </div>
                <div style={{ fontSize: '8.5pt', color: '#475569', marginTop: '3px' }}>
                  {eq.brand} • {eq.model_number} (SN: {eq.serial_number})
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '10px', fontSize: '8pt', textAlign: 'left', background: '#f8fafc', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div><strong>Dept:</strong> {eq.department_name}</div>
                  <div><strong>Loc:</strong> {eq.room_number || 'General'} {eq.floor ? `(${eq.floor})` : ''}</div>
                  <div><strong>Class:</strong> {eq.iec_protection_class || 'Class I'} / {eq.patient_applied_part || 'BF'}</div>
                  <div><strong>Risk:</strong> {eq.risk_classification || 'Critical'}</div>
                </div>

                <div style={{ marginTop: '10px', padding: '6px 10px', border: '2px solid #0f172a', borderRadius: '6px', background: '#f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '8pt', fontWeight: 700, textTransform: 'uppercase' }}>Next PM Due:</span>
                  <span style={{ fontSize: '10pt', fontWeight: 900, color: '#0f172a' }}>{formatDate(eq.next_pm_due_date)}</span>
                </div>

                <div style={{ marginTop: '8px', fontSize: '7.5pt', color: '#64748b' }}>
                  RFID EPC: <code>{eq.rfid_tag_id}</code> • Service: {eq.vendor_emergency_hotline || eq.vendor_phone || 'Biomed Support'}
                </div>
              </div>
            ) : (
              <div className="passport-a4-sheet" style={{ border: '2px solid #0f172a', padding: '18px 22px', borderRadius: '8px', background: '#ffffff', color: '#0f172a', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                {/* Formal Hospital Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2.5px solid #0f172a', paddingBottom: '12px', marginBottom: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '24px', fontWeight: 900, color: '#0284c7' }}>✚</span>
                      <div>
                        <div style={{ fontSize: '15pt', fontWeight: 900, letterSpacing: '-0.3px', textTransform: 'uppercase' }}>
                          Biomedical Engineering & Clinical Technology
                        </div>
                        <div style={{ fontSize: '9pt', color: '#475569', fontWeight: 600 }}>
                          OFFICIAL MEDICAL EQUIPMENT ASSET PASSPORT & TECHNICAL DOSSIER
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '7.5pt', color: '#64748b', marginTop: '4px' }}>
                      Standard Compliance: WHO Medical Device Technical Series • IEC 62353:2014 • NFPA 99 Healthcare Facilities Code
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', border: '1.5px solid #0f172a', padding: '6px 10px', borderRadius: '4px', background: '#f8fafc' }}>
                    <div style={{ fontSize: '7.5pt', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Passport Generation</div>
                    <div style={{ fontSize: '9pt', fontWeight: 800 }}>{formatDate(new Date().toISOString())}</div>
                    <div style={{ fontSize: '7pt', color: '#0284c7', fontWeight: 700, marginTop: '2px' }}>STATUS: {eq.status.toUpperCase()}</div>
                  </div>
                </div>

                {/* Top Section: Identification & Live QR Code */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '16px', alignItems: 'center', background: '#f8fafc', padding: '12px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '14px' }}>
                  <div>
                    <div style={{ fontSize: '8pt', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Equipment Title & Asset ID</div>
                    <div style={{ fontSize: '14pt', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
                      {eq.name}
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '11pt', background: '#0f172a', color: '#ffffff', padding: '2px 8px', borderRadius: '4px' }}>
                        {eq.asset_id}
                      </span>
                      <span style={{ fontSize: '9pt', fontWeight: 700, color: '#334155' }}>
                        SN: {eq.serial_number}
                      </span>
                      <span style={{ fontSize: '8.5pt', background: '#e2e8f0', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                        {eq.equipment_type}
                      </span>
                      <span style={{ fontSize: '8.5pt', background: eq.risk_classification?.includes('Critical') || eq.risk_classification?.includes('III') ? '#fee2e2' : '#fef3c7', color: eq.risk_classification?.includes('Critical') || eq.risk_classification?.includes('III') ? '#991b1b' : '#92400e', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                        Risk: {eq.risk_classification}
                      </span>
                    </div>
                    <div style={{ fontSize: '9pt', color: '#475569', marginTop: '6px' }}>
                      <strong>Manufacturer / Model:</strong> {eq.brand} • {eq.model_number}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ background: '#ffffff', padding: '4px', border: '1px solid #0f172a', borderRadius: '4px', display: 'inline-block' }}>
                      <QRCodeSVG 
                        value={eq.asset_id} 
                        size={105}
                        level="H"
                        includeMargin={false}
                      />
                    </div>
                    <div style={{ fontSize: '6.5pt', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>
                      SCAN FOR CMMS
                    </div>
                  </div>
                </div>

                {/* 2-Column Technical Dossier Matrix */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  {/* Column 1: Location & Electrical Safety */}
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '8.5pt', fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '8px' }}>
                      1. Deployment Location & Tracking
                    </div>
                    <table style={{ width: '100%', fontSize: '8.5pt', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr>
                          <td style={{ padding: '3px 0', color: '#64748b', width: '42%' }}>Hospital Department:</td>
                          <td style={{ padding: '3px 0', fontWeight: 700 }}>{eq.department_name}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '3px 0', color: '#64748b' }}>Building & Floor:</td>
                          <td style={{ padding: '3px 0', fontWeight: 600 }}>{eq.building} • {eq.floor}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '3px 0', color: '#64748b' }}>Room & Bed Slot:</td>
                          <td style={{ padding: '3px 0', fontWeight: 600 }}>{eq.room_number} {eq.bed_slot ? `(${eq.bed_slot})` : ''}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '3px 0', color: '#64748b' }}>RFID EPC Identifier:</td>
                          <td style={{ padding: '3px 0', fontFamily: 'monospace', fontWeight: 700, fontSize: '8pt' }}>{eq.rfid_tag_id}</td>
                        </tr>
                      </tbody>
                    </table>

                    <div style={{ fontSize: '8.5pt', fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginTop: '10px', marginBottom: '8px' }}>
                      2. Electrical Safety & Classification (IEC 62353)
                    </div>
                    <table style={{ width: '100%', fontSize: '8.5pt', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr>
                          <td style={{ padding: '3px 0', color: '#64748b', width: '42%' }}>Protection Class:</td>
                          <td style={{ padding: '3px 0', fontWeight: 700 }}>{eq.iec_protection_class || 'Class I (Protective Earth)'}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '3px 0', color: '#64748b' }}>Patient Applied Part:</td>
                          <td style={{ padding: '3px 0', fontWeight: 700, color: '#0369a1' }}>{eq.patient_applied_part || 'Type BF (Body Floating)'}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '3px 0', color: '#64748b' }}>Regulatory Spec:</td>
                          <td style={{ padding: '3px 0', fontWeight: 600 }}>{eq.regulatory_code || 'WHO Technical Series / IEC 62353'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Column 2: PM, Calibration & Procurement */}
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '8.5pt', fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '8px' }}>
                      3. Preventive Maintenance & Calibration Timelines
                    </div>
                    <table style={{ width: '100%', fontSize: '8.5pt', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr>
                          <td style={{ padding: '3px 0', color: '#64748b', width: '42%' }}>Standard PM Cycle:</td>
                          <td style={{ padding: '3px 0', fontWeight: 700 }}>{eq.pm_frequency}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '3px 0', color: '#64748b' }}>Last PM Executed:</td>
                          <td style={{ padding: '3px 0', fontWeight: 600 }}>{formatDate(eq.last_pm_date)}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '3px 0', color: '#b45309', fontWeight: 700 }}>Next PM Due Date:</td>
                          <td style={{ padding: '3px 0', fontWeight: 800, color: '#b45309' }}>{formatDate(eq.next_pm_due_date)}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '3px 0', color: '#64748b' }}>Last Calibration:</td>
                          <td style={{ padding: '3px 0', fontWeight: 600 }}>{formatDate(eq.last_calibration_date)}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '3px 0', color: '#0369a1', fontWeight: 700 }}>Next Calibration Due:</td>
                          <td style={{ padding: '3px 0', fontWeight: 800, color: '#0369a1' }}>{formatDate(eq.next_calibration_due_date)}</td>
                        </tr>
                      </tbody>
                    </table>

                    <div style={{ fontSize: '8.5pt', fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginTop: '10px', marginBottom: '8px' }}>
                      4. Procurement & Warranty
                    </div>
                    <table style={{ width: '100%', fontSize: '8.5pt', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr>
                          <td style={{ padding: '3px 0', color: '#64748b', width: '42%' }}>Commission Date:</td>
                          <td style={{ padding: '3px 0', fontWeight: 600 }}>{formatDate(eq.purchase_date)}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '3px 0', color: '#64748b' }}>Asset Cost:</td>
                          <td style={{ padding: '3px 0', fontWeight: 600 }}>{formatCurrency(eq.purchase_cost)}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '3px 0', color: '#64748b' }}>Warranty Status:</td>
                          <td style={{ padding: '3px 0', fontWeight: 700, color: eq.warranty_status === 'Active' ? '#15803d' : '#475569' }}>
                            {eq.warranty_status} (Expires: {formatDate(eq.warranty_expiry_date)})
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Vendor & Emergency Contacts Banner */}
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px 14px', background: '#f8fafc', marginBottom: '14px' }}>
                  <div style={{ fontSize: '8.5pt', fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', marginBottom: '6px' }}>
                    5. Service Vendor, Technical Contacts & 24/7 Breakdown Hotline
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px', fontSize: '8.5pt' }}>
                    <div>
                      <div style={{ color: '#64748b' }}>Authorized Vendor / Distributor:</div>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{eq.vendor_name || 'In-House BioMed'}</div>
                      <div style={{ fontSize: '8pt', color: '#475569' }}>Contact: {eq.vendor_contact_person || 'Clinical Engineering'}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b' }}>Emergency Service Hotline:</div>
                      <div style={{ fontWeight: 800, color: '#dc2626' }}>{eq.vendor_emergency_hotline || eq.vendor_phone || 'Ext 4419'}</div>
                      <div style={{ fontSize: '8pt', color: '#475569' }}>Email: {eq.vendor_email || 'biomed@hospital.org'}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b' }}>Internal Hospital Lead:</div>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{eq.in_house_contact || 'Chief BioMed Specialist'}</div>
                      <div style={{ fontSize: '8pt', color: '#475569' }}>QR Token: <code>{eq.qr_code_token}</code></div>
                    </div>
                  </div>
                </div>

                {/* Formal Verification & Sign-off Certification */}
                <div style={{ borderTop: '2px solid #0f172a', paddingTop: '10px' }}>
                  <div style={{ fontSize: '8pt', fontWeight: 800, textTransform: 'uppercase', color: '#475569', marginBottom: '8px', textAlign: 'center' }}>
                    Official Verification, Commissioning & Hospital Safety Certification
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', textAlign: 'center' }}>
                    <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px', background: '#ffffff' }}>
                      <div style={{ height: '36px', borderBottom: '1px dashed #94a3b8' }}></div>
                      <div style={{ fontSize: '7.5pt', fontWeight: 800, marginTop: '4px' }}>Lead Biomedical Engineer</div>
                      <div style={{ fontSize: '6.5pt', color: '#64748b' }}>Signature & Stamp / Date</div>
                    </div>
                    <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px', background: '#ffffff' }}>
                      <div style={{ height: '36px', borderBottom: '1px dashed #94a3b8' }}></div>
                      <div style={{ fontSize: '7.5pt', fontWeight: 800, marginTop: '4px' }}>Head of Clinical Department</div>
                      <div style={{ fontSize: '6.5pt', color: '#64748b' }}>Department Acceptance / Date</div>
                    </div>
                    <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px', background: '#ffffff' }}>
                      <div style={{ height: '36px', borderBottom: '1px dashed #94a3b8' }}></div>
                      <div style={{ fontSize: '7.5pt', fontWeight: 800, marginTop: '4px' }}>Authorized Service Engineer</div>
                      <div style={{ fontSize: '6.5pt', color: '#64748b' }}>OEM / Vendor Verification</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '6.5pt', color: '#94a3b8', textAlign: 'center', marginTop: '8px' }}>
                    This document is an official clinical asset technical passport. Detachment or unauthorized alteration invalidates hospital biomedical certification.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </>
    )}
  </Modal>
  );
}
