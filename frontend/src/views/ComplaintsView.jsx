import React, { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import SelectSearch from '../components/SelectSearch';
import { 
  fetchComplaints, 
  updateComplaint,
  fetchVendors,
  uploadServiceAttachment
} from '../services/api';
import { 
  AlertOctagon, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  User, 
  Wrench, 
  DollarSign, 
  Plus, 
  FileText,
  Building,
  Paperclip,
  UploadCloud,
  ExternalLink,
  ShieldCheck,
  Trash2,
  FileCheck
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export default function ComplaintsView({
  onBookComplaint,
  onViewPassport,
  onShowToast,
  refreshKey = 0
}) {
  const { formatCurrency, formatDate, formatDateTime, settings } = useSettings();
  const [complaints, setComplaints] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Status Filter
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Resolve Ticket Modal
  const [activeTicket, setActiveTicket] = useState(null);
  const [newStatus, setNewStatus] = useState('Repaired & Verified');
  const [assignedEngineer, setAssignedEngineer] = useState('Eng. Hassan Al-Majed (SaNDS Lab)');
  const [servicedByType, setServicedByType] = useState('In-House Biomedical Engineering');
  const [servicedByVendorId, setServicedByVendorId] = useState('');
  const [serviceAttachmentUrl, setServiceAttachmentUrl] = useState('');
  const [serviceAttachmentName, setServiceAttachmentName] = useState('');
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [actionTaken, setActionTaken] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [replacedParts, setReplacedParts] = useState('');
  const [downtimeHours, setDowntimeHours] = useState(2.0);
  const [repairCost, setRepairCost] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComplaints();
    loadVendors();
  }, [statusFilter, priorityFilter, refreshKey]);

  const loadVendors = async () => {
    try {
      const res = await fetchVendors('ALL');
      setVendors(res.data || []);
    } catch (err) {
      console.error('Failed to load vendors', err);
    }
  };

  const loadComplaints = async () => {
    try {
      setLoading(true);
      const res = await fetchComplaints({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined
      });
      setComplaints(res.data || []);
    } catch (err) {
      onShowToast({ type: 'error', title: 'Error', message: 'Failed to load complaints' });
    } finally {
      setLoading(false);
    }
  };

  const openResolutionModal = (ticket) => {
    setActiveTicket(ticket);
    setNewStatus(ticket.status === 'Open' ? 'In Progress' : 'Repaired & Verified');
    setAssignedEngineer(ticket.assigned_engineer || 'Eng. Hassan Al-Majed (SaNDS Lab)');
    setServicedByType(ticket.serviced_by_type || 'In-House Biomedical Engineering');
    setServicedByVendorId(ticket.serviced_by_vendor_id ? String(ticket.serviced_by_vendor_id) : '');
    setServiceAttachmentUrl(ticket.service_attachment_url || '');
    setServiceAttachmentName(ticket.service_attachment_name || '');
    setActionTaken(ticket.action_taken || '');
    setRootCause(ticket.root_cause || '');
    setReplacedParts(ticket.replaced_parts || '');
    setDowntimeHours(ticket.downtime_hours || 2.0);
    setRepairCost(ticket.repair_cost || 0);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      setUploadingAttachment(true);
      const res = await uploadServiceAttachment(file, {
        complaint_id: activeTicket?.id,
        document_type: 'Service Completion Report',
        file_title: `${activeTicket?.ticket_number || 'Complaint'} - Service Report`
      });

      setServiceAttachmentUrl(res.file_path);
      setServiceAttachmentName(res.original_name || file.name);
      onShowToast({
        type: 'success',
        title: 'Document Attached',
        message: `${file.name} uploaded successfully.`
      });
    } catch (err) {
      onShowToast({
        type: 'error',
        title: 'Upload Failed',
        message: err.message || 'Could not upload attachment'
      });
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleUpdateTicket = async (e) => {
    e.preventDefault();
    if (!activeTicket) return;

    try {
      setSubmitting(true);
      await updateComplaint({
        id: activeTicket.id,
        status: newStatus,
        assigned_engineer: assignedEngineer,
        serviced_by_type: servicedByType,
        serviced_by_vendor_id: servicedByVendorId ? Number(servicedByVendorId) : null,
        service_attachment_url: serviceAttachmentUrl,
        service_attachment_name: serviceAttachmentName,
        action_taken: actionTaken,
        root_cause: rootCause,
        replaced_parts: replacedParts,
        downtime_hours: Number(downtimeHours),
        repair_cost: Number(repairCost),
        resolved_at: newStatus === 'Repaired & Verified' || newStatus === 'Closed' ? new Date().toISOString() : undefined
      });

      onShowToast({
        type: 'success',
        title: 'Work Ticket Updated',
        message: `${activeTicket.ticket_number} updated to ${newStatus}`
      });

      setActiveTicket(null);
      loadComplaints();
    } catch (err) {
      onShowToast({ type: 'error', title: 'Update Failed', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      id: 'ticket_number',
      header: 'Ticket #',
      accessor: 'ticket_number',
      render: (row) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-danger)' }}>
          {row.ticket_number}
        </span>
      )
    },
    {
      id: 'equipment',
      header: 'Biomedical Asset',
      accessor: 'equipment_name',
      render: (row) => (
        <div>
          <div 
            style={{ fontWeight: 600, color: 'var(--color-primary)', cursor: 'pointer' }}
            onClick={() => onViewPassport(row.equipment_id)}
          >
            {row.equipment_name}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {row.asset_id} • {row.brand} {row.model_number}
          </div>
        </div>
      )
    },
    {
      id: 'department',
      header: 'Ward / Room',
      accessor: 'department_name',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 500 }}>{row.department_name}</div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
            {row.room_or_bed}
          </div>
        </div>
      )
    },
    {
      id: 'category',
      header: 'Complaint Defect',
      accessor: 'complaint_category',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.86rem' }}>{row.complaint_category}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {row.description}
          </div>
        </div>
      )
    },
    {
      id: 'priority',
      header: 'Severity Priority',
      accessor: 'priority',
      render: (row) => (
        <span className={`badge ${
          row.priority.includes('Critical') ? 'badge-danger' : 
          row.priority.includes('High') ? 'badge-warning' : 'badge-neutral'
        }`}>
          {row.priority}
        </span>
      )
    },
    {
      id: 'reported_at',
      header: 'Reported When & By',
      accessor: 'reported_at',
      render: (row) => (
        <div>
          <div style={{ fontSize: '0.82rem' }}>{formatDateTime(row.reported_at)}</div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            by <strong>{row.booked_by_name}</strong>
          </div>
          {row.booked_by_employee_code ? (
            <span className="badge badge-info" style={{ fontSize: '0.70rem', marginTop: '2px', padding: '1px 6px', display: 'inline-block' }}>
              Staff #{row.booked_by_employee_code}
            </span>
          ) : row.booked_by_username ? (
            <span className="badge badge-neutral" style={{ fontSize: '0.70rem', marginTop: '2px', padding: '1px 6px', display: 'inline-block' }}>
              @{row.booked_by_username}
            </span>
          ) : null}
        </div>
      )
    },
    {
      id: 'status',
      header: 'Ticket Status',
      accessor: 'status',
      render: (row) => (
        <span className={`badge ${
          row.status === 'Closed' || row.status === 'Repaired & Verified' ? 'badge-success' : 
          row.status === 'Open' ? 'badge-danger' : 'badge-warning'
        }`}>
          {row.status}
        </span>
      )
    },
    {
      id: 'engineer',
      header: 'Serviced By / Engineer',
      accessor: 'assigned_engineer',
      render: (row) => (
        <div>
          <div style={{ fontSize: '0.84rem', fontWeight: 500 }}>
            {row.assigned_engineer || <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}
          </div>
          {row.serviced_by_type && row.serviced_by_type !== 'In-House Biomedical Engineering' && (
            <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Building size={12} />
              <span>{row.serviced_by_vendor_name || row.serviced_by_type}</span>
            </div>
          )}
          {row.service_attachment_url && (
            <div style={{ marginTop: '4px' }}>
              <a
                href={row.service_attachment_url.startsWith('http') ? row.service_attachment_url : `http://127.0.0.1:8000${row.service_attachment_url}`}
                target="_blank"
                rel="noreferrer"
                className="badge badge-success"
                style={{ fontSize: '0.70rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}
                title={row.service_attachment_name || 'Service Report'}
              >
                <Paperclip size={10} />
                <span>Service Report</span>
                <ExternalLink size={10} />
              </a>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'actions',
      header: 'Action',
      sortable: false,
      render: (row) => (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ padding: '4px 10px', fontSize: '0.78rem' }}
          onClick={() => openResolutionModal(row)}
        >
          <Wrench size={14} /> Update Ticket
        </button>
      )
    }
  ];

  const partnerOptions = vendors.map(v => ({
    value: v.id,
    label: `${v.name} (${v.vendor_type || 'Vendor'})`,
    subLabel: `Contact: ${v.contact_person || 'N/A'} • ${v.phone || v.email || 'No phone'}`,
    ...v
  }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '22px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Breakdowns & Corrective Maintenance Work Tickets</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Instant Complaint Booking, Downtime Tracking, and Technical Resolution Logs
          </p>
        </div>

        <button
          type="button"
          className="btn-book-complaint"
          onClick={() => onBookComplaint(null)}
        >
          <AlertOctagon size={16} />
          Book Emergency Complaint
        </button>
      </div>

      {/* Filter Toolbar */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        flexWrap: 'wrap', 
        backgroundColor: 'var(--bg-surface)', 
        border: '1px solid var(--border-color)', 
        padding: '12px 18px', 
        borderRadius: 'var(--radius-lg)',
        marginBottom: '20px'
      }}>
        <select
          className="form-control"
          style={{ width: '200px' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Ticket Statuses</option>
          <option value="Open">Open</option>
          <option value="Assigned">Assigned</option>
          <option value="In Progress">In Progress</option>
          <option value="Awaiting Spare Parts">Awaiting Spare Parts</option>
          <option value="Repaired & Verified">Repaired & Verified</option>
          <option value="Closed">Closed</option>
        </select>

        <select
          className="form-control"
          style={{ width: '200px' }}
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          <option value="">All Severities</option>
          <option value="Critical - Life Support">Critical - Life Support</option>
          <option value="High Priority">High Priority</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        {(statusFilter || priorityFilter) && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setStatusFilter('');
              setPriorityFilter('');
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={complaints}
        keyField="id"
        searchPlaceholder="Search complaints by ticket #, equipment name, serial, or nurse..."
        defaultPageSize={10}
        exportTitle="Breakdown_Complaints_Report"
      />

      {/* Resolution Modal */}
      {activeTicket && (
        <Modal
          isOpen={true}
          onClose={() => setActiveTicket(null)}
          title={`Update Work Ticket • ${activeTicket.ticket_number}`}
          icon={Wrench}
          size="md"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setActiveTicket(null)}>
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary btn-sm" 
                onClick={handleUpdateTicket}
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Save Ticket Resolution'}
              </button>
            </div>
          }
        >
          <form onSubmit={handleUpdateTicket}>
            <div style={{ 
              backgroundColor: 'var(--bg-subtle)', 
              padding: '12px 16px', 
              borderRadius: 'var(--radius-sm)', 
              marginBottom: '16px',
              fontSize: '0.86rem'
            }}>
              <div><strong>Asset:</strong> {activeTicket.equipment_name} ({activeTicket.asset_id})</div>
              <div><strong>Reported Problem:</strong> {activeTicket.description}</div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Workflow Status</label>
                <select
                  className="form-control"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  <option value="Open">Open (Pending Triage)</option>
                  <option value="Assigned">Assigned to Engineer</option>
                  <option value="In Progress">In Progress (Troubleshooting)</option>
                  <option value="Awaiting Spare Parts">Awaiting Spare Parts</option>
                  <option value="Repaired & Verified">Repaired & Verified (Return to Service)</option>
                  <option value="Closed">Closed & Completed</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Assigned Biomedical Engineer</label>
                <input
                  type="text"
                  className="form-control"
                  value={assignedEngineer}
                  onChange={(e) => setAssignedEngineer(e.target.value)}
                />
              </div>
            </div>

            {/* Servicing Responsibility (In-House / External Contractor / OEM Vendor / Warranty Service) */}
            <div style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              marginBottom: '16px'
            }}>
              <label className="form-label" style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building size={16} color="var(--color-primary)" />
                <strong>Servicing Responsibility / Provider Type</strong>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px', marginBottom: '10px' }}>
                {[
                  { id: 'In-House Biomedical Engineering', label: 'In-House BME Team' },
                  { id: 'External Contractor', label: 'External Contractor' },
                  { id: 'OEM Vendor', label: 'OEM Vendor' },
                  { id: 'Warranty Service Provider', label: 'Warranty Service' }
                ].map(item => (
                  <label 
                    key={item.id} 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: servicedByType === item.id ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                      backgroundColor: servicedByType === item.id ? 'var(--color-primary-subtle, rgba(37, 99, 235, 0.08))' : 'var(--bg-surface)',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: servicedByType === item.id ? 600 : 400
                    }}
                  >
                    <input
                      type="radio"
                      name="servicedByType"
                      value={item.id}
                      checked={servicedByType === item.id}
                      onChange={() => {
                        setServicedByType(item.id);
                        if (item.id === 'In-House Biomedical Engineering') {
                          setServicedByVendorId('');
                        }
                      }}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>

              {/* Show Partner Master SelectSearch if Contractor, Vendor, or Warranty */}
              {servicedByType !== 'In-House Biomedical Engineering' && (
                <div className="form-group" style={{ marginBottom: '6px' }}>
                  <label className="form-label" style={{ fontSize: '0.80rem' }}>
                    Select {servicedByType} (Partners Master • Select2 Search)
                  </label>
                  <SelectSearch
                    options={partnerOptions}
                    value={servicedByVendorId}
                    onChange={(val) => setServicedByVendorId(val)}
                    placeholder="Search contractor, vendor, or supplier by name or contact..."
                    subLabelKey="subLabel"
                  />
                </div>
              )}
            </div>

            {/* Optional Document / Attachment Upload for Service Reports */}
            <div style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px dashed var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Paperclip size={15} color="var(--color-primary)" />
                  <strong>Service Report / Attachment (Optional)</strong>
                </label>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  PDF, Images, Calibration Certificates, Invoices
                </span>
              </div>

              {serviceAttachmentUrl ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  backgroundColor: 'var(--color-success-subtle, rgba(16, 185, 129, 0.1))',
                  border: '1px solid var(--color-success)',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <FileCheck size={18} color="var(--color-success)" />
                    <span style={{ fontSize: '0.84rem', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {serviceAttachmentName || 'Service_Report.pdf'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <a
                      href={serviceAttachmentUrl.startsWith('http') ? serviceAttachmentUrl : `http://127.0.0.1:8000${serviceAttachmentUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '3px 8px', fontSize: '0.75rem', textDecoration: 'none' }}
                    >
                      <ExternalLink size={12} /> View
                    </a>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                      onClick={() => {
                        setServiceAttachmentUrl('');
                        setServiceAttachmentName('');
                      }}
                      title="Remove attachment"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <input
                    type="file"
                    id="serviceReportUpload"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  />
                  <label
                    htmlFor="serviceReportUpload"
                    className="btn btn-secondary btn-sm"
                    style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <UploadCloud size={15} />
                    {uploadingAttachment ? 'Uploading Document...' : 'Attach Field Service Report / Invoice'}
                  </label>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Optional • Not mandatory
                  </span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Corrective Action Taken</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="Detail the technical repair steps, calibration check, or parts replacement..."
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Root Cause Analysis</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Component fatigue, electrical surge, user error"
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Replaced Spare Parts</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. SMPS Board, O-ring, Coiled cable"
                  value={replacedParts}
                  onChange={(e) => setReplacedParts(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Total Downtime (Hours)</label>
                <input
                  type="number"
                  step="0.5"
                  className="form-control"
                  value={downtimeHours}
                  onChange={(e) => setDowntimeHours(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Repair Cost ({settings.currency})</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={repairCost}
                  onChange={(e) => setRepairCost(e.target.value)}
                />
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
