import React, { useState, useEffect, useRef } from 'react';
import SelectSearch from '../components/SelectSearch';
import { 
  fetchEquipments, 
  fetchEquipmentDetail 
} from '../services/api';
import { QRCodeSVG } from 'qrcode.react';
import { 
  FileText, 
  Download, 
  Printer, 
  Layers, 
  ShieldCheck, 
  DollarSign, 
  MapPin, 
  Phone, 
  CheckSquare, 
  AlertOctagon, 
  Award, 
  Radio 
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export default function ReportsView({
  theme,
  onShowToast,
  onOpenSandsSupport
}) {
  const { formatDate, formatDateTime, formatCurrency, settings } = useSettings();
  const companyName = settings?.company_name || 'SaNDS Lab Middle East W.L.L';
  const companyLogo = settings?.company_logo || '/sands_logo.png';
  const [equipments, setEquipments] = useState([]);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const printableRef = useRef(null);

  useEffect(() => {
    loadEquipmentList();
  }, []);

  const loadEquipmentList = async () => {
    try {
      const res = await fetchEquipments();
      setEquipments(res.data || []);
      if (res.data?.length > 0) {
        setSelectedEquipmentId(res.data[0].id);
        loadFullPassportReport(res.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadFullPassportReport = async (id) => {
    try {
      setLoading(true);
      const res = await fetchEquipmentDetail(id);
      setReportData(res.data);
    } catch (err) {
      onShowToast({ type: 'error', title: 'Error', message: 'Failed to load report data' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEquipment = (val) => {
    setSelectedEquipmentId(val);
    if (val) {
      loadFullPassportReport(val);
    }
  };

  const [orientation, setOrientation] = useState('landscape'); // 'landscape' | 'portrait'

  const handlePrint = () => {
    const styleId = 'dynamic-print-orientation';
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    const margin = orientation === 'landscape' ? '6mm 8mm 6mm 8mm' : '8mm 10mm 8mm 10mm';
    styleEl.innerHTML = `@media print { @page { size: A4 ${orientation} !important; margin: ${margin} !important; } }`;

    window.focus();
    setTimeout(() => {
      window.print();
    }, 50);
  };

  const equipmentOptions = equipments.map(e => ({
    value: e.id,
    label: `${e.name} (${e.asset_id})`,
    subLabel: `${e.brand} ${e.model_number} • Dept: ${e.department_name} • Floor: ${e.floor}`
  }));

  const eq = reportData?.equipment;
  const maintenance = reportData?.maintenance_records || [];
  const complaints = reportData?.complaints || [];
  const attachments = reportData?.attachments || [];

  return (
    <div>
      <div className="no-print screen-only-reports" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '22px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Biomedical Equipment Lifecycle History & Reports</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Official WHO-Standard Asset Passport, Comprehensive Maintenance History & PDF Export
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Orientation Selector: Landscape (Default) vs Portrait */}
          <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '3px' }}>
            <button
              type="button"
              className={`btn btn-sm ${orientation === 'landscape' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: '4px', height: 'auto', fontWeight: 600 }}
              onClick={() => setOrientation('landscape')}
              title="Wide Landscape Layout - Ideal for multi-column tables, technical PM logs & signatures"
            >
              📄 Landscape (Wide)
            </button>
            <button
              type="button"
              className={`btn btn-sm ${orientation === 'portrait' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: '4px', height: 'auto', fontWeight: 600 }}
              onClick={() => setOrientation('portrait')}
              title="Standard Portrait Layout"
            >
              📑 Portrait
            </button>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handlePrint}
            disabled={!reportData}
          >
            <Printer size={15} />
            Print / Save as PDF ({orientation === 'landscape' ? 'Landscape' : 'Portrait'})
          </button>
        </div>
      </div>

      {/* Equipment Selector Toolbar */}
      <div className="no-print screen-only-reports" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '14px', 
        flexWrap: 'wrap', 
        backgroundColor: 'var(--bg-surface)', 
        border: '1px solid var(--border-color)', 
        padding: '14px 20px', 
        borderRadius: 'var(--radius-lg)',
        marginBottom: '24px'
      }}>
        <div style={{ minWidth: '380px' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
            Select Equipment for Full Lifecycle Audit Report:
          </label>
          <SelectSearch
            options={equipmentOptions}
            value={selectedEquipmentId}
            onChange={handleSelectEquipment}
            placeholder="Search equipment to generate passport..."
            subLabelKey="subLabel"
          />
        </div>

        <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', alignSelf: 'center', marginTop: '16px' }}>
          Report standard includes: Procurement PO, Warranty Terms, PM History, Breakdown Downtime, and Attached Manuals.
        </div>
      </div>

      {loading || !eq ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading complete equipment history...
        </div>
      ) : (
        /* Printable Executive Report Container */
        <div 
          ref={printableRef}
          className="printable-sheet card"
          style={{ 
            padding: '36px 42px', 
            backgroundColor: '#ffffff', 
            color: '#0f172a',
            border: '1px solid #cbd5e1',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            maxWidth: '100%',
            margin: '0 auto'
          }}
        >
          {/* Official Report Header */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            borderBottom: '3px solid #0284c7', 
            paddingBottom: '20px',
            marginBottom: '24px' 
          }}>
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }}
              onClick={onOpenSandsSupport}
              title="Click to view SaNDS Lab Vendor Support, WhatsApp & Products"
            >
              <img 
                src={companyLogo} 
                alt={`${companyName} Logo`} 
                style={{ height: '48px', width: 'auto', objectFit: 'contain' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {companyName}
                </h2>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                  Biomedical Asset Management & Clinical Engineering Services
                </div>
                <div style={{ fontSize: '0.74rem', color: '#0284c7', fontWeight: 700, textTransform: 'uppercase' }}>
                  Official Equipment Lifecycle Passport & Compliance Certificate
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.76rem', color: '#64748b' }}>Date of Report</div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{formatDateTime(new Date())}</div>
              <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
                Asset Code: <strong style={{ color: '#0284c7' }}>{eq.asset_id}</strong>
              </div>
            </div>
          </div>

          {/* Device Summary & QR Code Block */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 180px', 
            gap: '24px', 
            backgroundColor: '#f8fafc', 
            padding: '20px', 
            borderRadius: '8px', 
            border: '1px solid #e2e8f0',
            marginBottom: '24px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ 
                  backgroundColor: '#0284c7', 
                  color: '#ffffff', 
                  fontSize: '0.72rem', 
                  fontWeight: 700, 
                  padding: '2px 8px', 
                  borderRadius: '4px' 
                }}>
                  {eq.risk_classification}
                </span>
                <span style={{ 
                  backgroundColor: eq.status === 'Operational' ? '#d1fae5' : '#fee2e2', 
                  color: eq.status === 'Operational' ? '#065f46' : '#991b1b', 
                  fontSize: '0.72rem', 
                  fontWeight: 700, 
                  padding: '2px 8px', 
                  borderRadius: '4px' 
                }}>
                  {eq.status}
                </span>
              </div>

              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                {eq.name}
              </h3>

              <div style={{ fontSize: '0.88rem', color: '#334155', marginBottom: '10px' }}>
                <strong>Manufacturer:</strong> {eq.brand} • <strong>Model:</strong> {eq.model_number} • <strong>Serial No:</strong> <code>{eq.serial_number}</code>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '0.82rem', color: '#475569' }}>
                <div><strong>Standard:</strong> {eq.standard_regulatory_code}</div>
                <div><strong>Location:</strong> {eq.department_name} ({eq.floor})</div>
                <div><strong>Room / Bed:</strong> {eq.room_number} {eq.bed_slot ? `• ${eq.bed_slot}` : ''}</div>
                <div><strong>RFID EPC Tag:</strong> <code>{eq.rfid_tag_id}</code></div>
              </div>
            </div>

            {/* QR Code */}
            <div style={{ textAlign: 'center', borderLeft: '1px solid #e2e8f0', paddingLeft: '16px' }}>
              <div style={{ display: 'inline-block', padding: '6px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                <QRCodeSVG 
                  value={eq.asset_id} 
                  size={110}
                  level="H"
                />
              </div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', marginTop: '4px' }}>
                {eq.asset_id}
              </div>
            </div>
          </div>

          {/* Section 1: Procurement, Vendor & Warranty Details */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ 
              fontSize: '0.98rem', 
              fontWeight: 700, 
              color: '#0284c7', 
              borderBottom: '2px solid #e2e8f0', 
              paddingBottom: '6px', 
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <DollarSign size={16} /> 1. Procurement, Warranty & Maintenance Contract Specifications
            </h4>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 6px', fontWeight: 600, width: '25%', color: '#475569' }}>Supplied By Vendor:</td>
                  <td style={{ padding: '8px 6px', width: '25%' }}>{eq.vendor_name}</td>
                  <td style={{ padding: '8px 6px', fontWeight: 600, width: '25%', color: '#475569' }}>Vendor Hotline (24/7):</td>
                  <td style={{ padding: '8px 6px', width: '25%', color: '#dc2626', fontWeight: 700 }}>{eq.vendor_emergency_hotline}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 6px', fontWeight: 600, color: '#475569' }}>Purchase Order (PO):</td>
                  <td style={{ padding: '8px 6px' }}><code>{eq.po_number || 'N/A'}</code></td>
                  <td style={{ padding: '8px 6px', fontWeight: 600, color: '#475569' }}>Invoice Number:</td>
                  <td style={{ padding: '8px 6px' }}><code>{eq.invoice_number || 'N/A'}</code></td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 6px', fontWeight: 600, color: '#475569' }}>Purchase Date:</td>
                  <td style={{ padding: '8px 6px' }}>{formatDate(eq.purchase_date)}</td>
                  <td style={{ padding: '8px 6px', fontWeight: 600, color: '#475569' }}>Purchase Cost:</td>
                  <td style={{ padding: '8px 6px' }}>{formatCurrency(eq.purchase_cost, eq.currency)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 6px', fontWeight: 600, color: '#475569' }}>Warranty Period:</td>
                  <td style={{ padding: '8px 6px' }}>
                    {formatDate(eq.warranty_start_date)} to {formatDate(eq.warranty_end_date)} ({eq.warranty_status})
                  </td>
                  <td style={{ padding: '8px 6px', fontWeight: 600, color: '#475569' }}>Current Contract Type:</td>
                  <td style={{ padding: '8px 6px', fontWeight: 600 }}>{eq.contract_type}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 6px', fontWeight: 600, color: '#475569' }}>PM Schedule Frequency:</td>
                  <td style={{ padding: '8px 6px' }}>{eq.maintenance_schedule_type}</td>
                  <td style={{ padding: '8px 6px', fontWeight: 600, color: '#475569' }}>Emergency Contact:</td>
                  <td style={{ padding: '8px 6px' }}>{eq.emergency_contact_name} ({eq.emergency_phone})</td>
                </tr>
              </tbody>
            </table>

            {eq.maintenance_schedule_notes && (
              <div style={{ marginTop: '8px', padding: '8px 12px', backgroundColor: '#f1f5f9', borderRadius: '6px', fontSize: '0.8rem', color: '#334155' }}>
                <strong>Maintenance Protocol Notes:</strong> {eq.maintenance_schedule_notes}
              </div>
            )}
          </div>

          {/* Section 2: Preventive Maintenance & Calibration History */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ 
              fontSize: '0.98rem', 
              fontWeight: 700, 
              color: '#0284c7', 
              borderBottom: '2px solid #e2e8f0', 
              paddingBottom: '6px', 
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <CheckSquare size={16} /> 2. Preventive Maintenance & Electrical Safety Calibration Records
            </h4>

            {maintenance.length === 0 ? (
              <div style={{ fontSize: '0.82rem', color: '#64748b', fontStyle: 'italic', padding: '8px 0' }}>
                No maintenance work orders executed yet.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '8px' }}>Work Order #</th>
                    <th style={{ padding: '8px' }}>Procedure</th>
                    <th style={{ padding: '8px' }}>Date</th>
                    <th style={{ padding: '8px' }}>Inspector</th>
                    <th style={{ padding: '8px' }}>Result</th>
                    <th style={{ padding: '8px' }}>Next PM Due</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenance.map(m => (
                    <tr key={m.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 600 }}>{m.work_order_no}</td>
                      <td style={{ padding: '8px' }}>{m.maintenance_type}</td>
                      <td style={{ padding: '8px' }}>{formatDate(m.performed_date)}</td>
                      <td style={{ padding: '8px' }}>{m.performed_by}</td>
                      <td style={{ padding: '8px', fontWeight: 600, color: m.overall_result.includes('Passed') ? '#059669' : '#dc2626' }}>
                        {m.overall_result}
                      </td>
                      <td style={{ padding: '8px', fontWeight: 700 }}>{formatDate(m.next_pm_due_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Section 3: Breakdown Tickets & Downtime Summary */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ 
              fontSize: '0.98rem', 
              fontWeight: 700, 
              color: '#0284c7', 
              borderBottom: '2px solid #e2e8f0', 
              paddingBottom: '6px', 
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <AlertOctagon size={16} /> 3. Corrective Maintenance, Breakdown History & Downtime
            </h4>

            {complaints.length === 0 ? (
              <div style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 600, padding: '8px 0' }}>
                ✓ Zero breakdown complaints logged. 100% equipment reliability rating.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '8px' }}>Ticket #</th>
                    <th style={{ padding: '8px' }}>Defect Category</th>
                    <th style={{ padding: '8px' }}>Reported Date</th>
                    <th style={{ padding: '8px' }}>Priority</th>
                    <th style={{ padding: '8px' }}>Downtime</th>
                    <th style={{ padding: '8px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 600 }}>{c.ticket_number}</td>
                      <td style={{ padding: '8px' }}>{c.complaint_category}</td>
                      <td style={{ padding: '8px' }}>{formatDate(c.reported_at)}</td>
                      <td style={{ padding: '8px' }}>{c.priority}</td>
                      <td style={{ padding: '8px' }}>{c.downtime_hours || 0} hrs</td>
                      <td style={{ padding: '8px', fontWeight: 600 }}>{c.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Section 4: Document Attachments */}
          <div style={{ marginBottom: '32px' }}>
            <h4 style={{ 
              fontSize: '0.98rem', 
              fontWeight: 700, 
              color: '#0284c7', 
              borderBottom: '2px solid #e2e8f0', 
              paddingBottom: '6px', 
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <FileText size={16} /> 4. Attached Technical Documentation & Certificates
            </h4>

            {attachments.length === 0 ? (
              <div style={{ fontSize: '0.82rem', color: '#64748b', fontStyle: 'italic' }}>
                No electronic attachments filed in repository.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {attachments.map(att => (
                  <div key={att.id} style={{ padding: '8px 12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.82rem' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{att.file_title}</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      {att.document_type} • File: {att.file_name} ({att.file_size_kb} KB)
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Certified Engineering Stamp & Signatures */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            borderTop: '2px solid #cbd5e1', 
            paddingTop: '24px',
            fontSize: '0.82rem',
            color: '#475569'
          }}>
            <div style={{ width: '260px' }}>
              <div style={{ height: '40px' }} />
              <div style={{ borderTop: '1px solid #0f172a', paddingTop: '4px', fontWeight: 700 }}>
                Lead Biomedical Engineer
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                {companyName}
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                border: '2px solid #0284c7', 
                color: '#0284c7', 
                padding: '8px 16px', 
                borderRadius: '6px', 
                fontWeight: 800,
                fontSize: '0.78rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                CERTIFIED ASSET PASSPORT
                <div style={{ fontSize: '0.68rem', fontWeight: 500, color: '#475569' }}>
                  WHO CMMS / IEC 62353
                </div>
              </div>
            </div>

            <div style={{ width: '260px', textAlign: 'right' }}>
              <div style={{ height: '40px' }} />
              <div style={{ borderTop: '1px solid #0f172a', paddingTop: '4px', fontWeight: 700 }}>
                Hospital Clinical Director / HOD
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                Hospital Management Authority
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.72rem', color: '#94a3b8' }}>
            Powered and Engineered by {companyName} • BioTrack CMMS • Page 1 of 1
          </div>
        </div>
      )}
    </div>
  );
}
