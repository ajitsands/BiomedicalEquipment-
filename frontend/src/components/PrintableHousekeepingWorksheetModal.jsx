import React, { useRef, useEffect } from 'react';
import { 
  Printer, 
  X, 
  ShieldCheck, 
  Building2, 
  Calendar, 
  CheckSquare, 
  UserCheck, 
  Sparkles,
  ClipboardList
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export default function PrintableHousekeepingWorksheetModal({
  isOpen,
  onClose,
  inspection,
  items = []
}) {
  const { settings, formatDate } = useSettings();
  const printRef = useRef(null);

  // Retrieve Company Branding dynamically from Application Settings
  const companyName = settings?.company_name || 'SaNDS Lab Middle East W.L.L';
  const companyLogo = settings?.company_logo || '/sands_logo.png';
  const facilityName = inspection?.facility_name || '';

  const applyPrintPortrait = () => {
    const styleId = 'housekeeping-print-orientation-style';
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `@media print { @page { size: A4 portrait !important; margin: 8mm 10mm !important; } }`;
    document.body.classList.add('worksheet-modal-printing-target');
  };

  useEffect(() => {
    if (!isOpen) return;
    applyPrintPortrait();

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('worksheet-modal-printing-target');
      const el = document.getElementById('housekeeping-print-orientation-style');
      if (el) el.remove();
    };
  }, [isOpen]);

  const handlePrint = () => {
    const content = document.getElementById('printable-a4-worksheet');
    if (!content) {
      window.print();
      return;
    }

    let iframe = document.getElementById('housekeeping-print-iframe');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'housekeeping-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${inspection?.audit_number || 'Housekeeping-Audit'} - Task List Worksheet</title>
          <style>
            @page { 
              size: A4 portrait; 
              margin: 8mm 10mm 8mm 10mm; 
            }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; 
              margin: 0; 
              padding: 0; 
              color: #0f172a; 
              background: #ffffff; 
              font-size: 10pt; 
              line-height: 1.35;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              page-break-inside: auto; 
            }
            tr { 
              page-break-inside: avoid; 
              page-break-after: auto; 
            }
            thead { 
              display: table-header-group; 
            }
            * { 
              box-sizing: border-box; 
            }
          </style>
        </head>
        <body>
          ${content.outerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }, 200);
  };

  if (!isOpen || !inspection) return null;

  const auditDate = inspection.conducted_at 
    ? new Date(inspection.conducted_at).toLocaleDateString('en-GB')
    : new Date().toLocaleDateString('en-GB');

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div 
        className="modal-content-card modal-xl" 
        style={{ 
          maxWidth: '960px', 
          width: '98%', 
          maxHeight: '94vh', 
          display: 'flex', 
          flexDirection: 'column',
          backgroundColor: '#fff',
          color: '#0f172a'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Screen Controls Header (Hidden during actual print) */}
        <div className="no-print" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '14px 24px', 
          backgroundColor: '#f8fafc', 
          borderBottom: '1px solid #e2e8f0' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ClipboardList size={20} style={{ color: '#0284c7' }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
              Print Physical Task List / Audit Worksheet (A4)
            </h3>
            <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
              {items.length} Verification Tasks
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handlePrint}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0284c7', borderColor: '#0284c7' }}
            >
              <Printer size={16} />
              <span>Print A4 Worksheet</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>

        {/* Scrollable Printable A4 Document Container */}
        <div className="modal-body-scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }} ref={printRef}>
          <div id="printable-a4-worksheet" className="printable-worksheet" style={{ maxWidth: '850px', margin: '0 auto', fontSize: '11pt', color: '#000' }}>
            
            {/* Document Header: Dynamic Company Name and Logo from Application Settings */}
            <div style={{ borderBottom: '2.5px solid #0284c7', paddingBottom: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  {/* Single Line: Logo and Company Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                    {companyLogo && (
                      <img 
                        src={companyLogo} 
                        alt={companyName} 
                        style={{ 
                          maxHeight: '40px', 
                          maxWidth: '140px', 
                          objectFit: 'contain',
                          flexShrink: 0
                        }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <div style={{ fontSize: '15pt', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.3px', lineHeight: 1.2, textTransform: 'uppercase' }}>
                      {companyName}
                    </div>
                  </div>

                  {/* Below Content Starting From Left Edge Itself */}
                  <div style={{ fontSize: '9pt', fontWeight: 600, color: '#475569', marginTop: '2px' }}>
                    Environmental Health & Infection Control Directorate
                  </div>
                  <div style={{ fontSize: '11pt', fontWeight: 800, color: '#0284c7', marginTop: '4px', textTransform: 'uppercase' }}>
                    INFECTION CONTROL & ENVIRONMENTAL CLEANING TASK LIST
                  </div>
                  <div style={{ fontSize: '8pt', color: '#64748b', marginTop: '1px' }}>
                    Bahrain NHRA Healthcare Accreditation • WHO 2023 Environmental Cleaning Guidelines • Form HK-AUD-A4
                  </div>
                </div>

                {/* Audit Voucher Details */}
                <div style={{ textAlign: 'right', border: '1.5px solid #0284c7', padding: '8px 14px', borderRadius: '6px', background: '#f0f9ff', flexShrink: 0 }}>
                  <div style={{ fontSize: '8pt', textTransform: 'uppercase', color: '#0284c7', fontWeight: 700 }}>Audit Voucher #</div>
                  <div style={{ fontSize: '12pt', fontWeight: 800, fontFamily: 'monospace', color: '#0f172a' }}>
                    {inspection.audit_number || 'HKA-2026-TEMP'}
                  </div>
                  <div style={{ fontSize: '8.5pt', fontWeight: 700, color: '#059669', marginTop: '2px' }}>
                    {inspection.cleaning_type || 'Discharge/Terminal Clean'}
                  </div>
                </div>
              </div>
            </div>

            {/* Room / Location & Inspector Metadata Box */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '9.5pt' }}>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', background: '#f8fafc', fontWeight: 700, width: '18%' }}>
                    Room / Area Name:
                  </td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', fontWeight: 600, width: '32%' }}>
                    {inspection.room_number} — {inspection.area_type}
                  </td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', background: '#f8fafc', fontWeight: 700, width: '18%' }}>
                    Audit Date:
                  </td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', width: '32%' }}>
                    {auditDate}
                  </td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', background: '#f8fafc', fontWeight: 700 }}>
                    Building / Floor:
                  </td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px' }}>
                    {inspection.building} • {inspection.floor}
                  </td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', background: '#f8fafc', fontWeight: 700 }}>
                    Cleaning Protocol:
                  </td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px' }}>
                    {inspection.cleaning_type} Clean
                  </td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', background: '#f8fafc', fontWeight: 700 }}>
                    Assigned Inspector:
                  </td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px' }}>
                    {inspection.inspector_name || 'Infection Control Link Nurse'} ({inspection.inspector_role || 'Staff'})
                  </td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', background: '#f8fafc', fontWeight: 700 }}>
                    Audit Status:
                  </td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', fontWeight: 700, color: inspection.status === 'Passed' ? '#059669' : '#d97706' }}>
                    {inspection.status || 'In Progress'} ({inspection.total_items || items.length} Total Verification Tasks)
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Instruction Banner */}
            <div style={{ 
              backgroundColor: '#f1f5f9', 
              border: '1px solid #cbd5e1', 
              borderRadius: '4px', 
              padding: '6px 10px', 
              marginBottom: '14px',
              fontSize: '8.5pt',
              lineHeight: 1.3
            }}>
              <strong>PHYSICAL INSPECTION INSTRUCTIONS:</strong> Check each high-touch surface and infection control barrier. Mark <strong>[✓] PASS</strong> if clean, disinfected with approved PPM solution & dry; <strong>[✓] FAIL</strong> if organic residue, dust, bio-film, or disinfectant contact time breach observed; or <strong>[✓] N/A</strong> if not present in room. Regulatory Gate items are mandatory NHRA/WHO clearance prerequisites.
            </div>

            {/* Task List Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '20px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', color: '#fff', textAlign: 'left' }}>
                  <th style={{ border: '1px solid #0f172a', padding: '6px 8px', width: '6%', textAlign: 'center' }}>#</th>
                  <th style={{ border: '1px solid #0f172a', padding: '6px 8px', width: '12%' }}>Code</th>
                  <th style={{ border: '1px solid #0f172a', padding: '6px 8px', width: '42%' }}>Inspection Task & Disinfection Protocol</th>
                  <th style={{ border: '1px solid #0f172a', padding: '6px 8px', width: '18%', textAlign: 'center' }}>Field Verification</th>
                  <th style={{ border: '1px solid #0f172a', padding: '6px 8px', width: '22%' }}>Inspector Findings / ATP Reading</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const isMandatory = Boolean(Number(item.is_regulatory_mandate));
                  const isPass = item.status === 'Pass';
                  const isFail = item.status === 'Fail';
                  const isNA = item.status === 'N/A';

                  return (
                    <tr key={item.checklist_item_id || item.id} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f8fafc' }}>
                      <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'center', fontWeight: 700 }}>
                        {index + 1}
                      </td>

                      <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', fontFamily: 'monospace', fontWeight: 700, fontSize: '8.5pt' }}>
                        {item.item_code}
                        {isMandatory && (
                          <div style={{ fontSize: '7pt', color: '#dc2626', fontWeight: 800, textTransform: 'uppercase' }}>
                            Mandatory Gate
                          </div>
                        )}
                      </td>

                      <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          {item.inspection_item}
                        </div>
                        <div style={{ fontSize: '8pt', color: '#475569', marginTop: '2px' }}>
                          <strong>Criteria:</strong> {item.acceptance_criteria}
                        </div>
                        <div style={{ fontSize: '7.5pt', color: '#0284c7', marginTop: '1px' }}>
                          Layer: {item.standard_layer === 'NHRA_BAHRAIN' ? 'NHRA Bahrain Mandate' : item.standard_layer === 'WHO_2023' ? 'WHO Environmental Cleaning 2023' : 'Hospital SOP'}
                        </div>
                      </td>

                      <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start', marginLeft: '12px', fontSize: '8.5pt' }}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                            <span style={{ 
                              display: 'inline-block', 
                              width: '13px', 
                              height: '13px', 
                              border: '1.5px solid #000', 
                              borderRadius: '2px',
                              textAlign: 'center',
                              lineHeight: '12px',
                              fontSize: '10px',
                              fontWeight: 900
                            }}>
                              {isPass ? '✓' : ''}
                            </span>
                            <span style={{ fontWeight: isPass ? 800 : 500, color: isPass ? '#059669' : 'inherit' }}>PASS</span>
                          </label>

                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                            <span style={{ 
                              display: 'inline-block', 
                              width: '13px', 
                              height: '13px', 
                              border: '1.5px solid #000', 
                              borderRadius: '2px',
                              textAlign: 'center',
                              lineHeight: '12px',
                              fontSize: '10px',
                              fontWeight: 900
                            }}>
                              {isFail ? '✕' : ''}
                            </span>
                            <span style={{ fontWeight: isFail ? 800 : 500, color: isFail ? '#dc2626' : 'inherit' }}>FAIL</span>
                          </label>

                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                            <span style={{ 
                              display: 'inline-block', 
                              width: '13px', 
                              height: '13px', 
                              border: '1.5px solid #000', 
                              borderRadius: '2px',
                              textAlign: 'center',
                              lineHeight: '12px',
                              fontSize: '10px',
                              fontWeight: 900
                            }}>
                              {isNA ? '—' : ''}
                            </span>
                            <span style={{ fontWeight: isNA ? 800 : 500, color: isNA ? '#475569' : 'inherit' }}>N/A</span>
                          </label>
                        </div>
                      </td>

                      <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', fontSize: '8pt', color: '#334155' }}>
                        {item.notes ? (
                          <div>{item.notes}</div>
                        ) : (
                          <div style={{ height: '32px', borderBottom: '1px dotted #94a3b8' }} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Field Sign-Off & Chain of Custody Section */}
            <div style={{ 
              border: '1.5px solid #000', 
              borderRadius: '4px', 
              padding: '12px 16px', 
              pageBreakInside: 'avoid',
              marginTop: '16px' 
            }}>
              <div style={{ fontWeight: 800, fontSize: '10pt', textTransform: 'uppercase', marginBottom: '10px', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px' }}>
                PHYSICAL AUDIT VERIFICATION & CERTIFICATE SIGN-OFF
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                  <div style={{ fontSize: '8.5pt', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                    1. INSPECTION CONDUCTED BY (LINK NURSE / BME STAFF):
                  </div>
                  <div style={{ fontSize: '9pt', fontWeight: 600 }}>{inspection.inspector_name || 'Infection Control Link Nurse'}</div>
                  <div style={{ marginTop: '24px', borderTop: '1px solid #000', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '8pt' }}>
                    <span>Signature: __________________________</span>
                    <span>Date: ____/____/2026</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '8.5pt', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                    2. VERIFIED & APPROVED BY (INFECTION CONTROL SUPERVISOR):
                  </div>
                  <div style={{ fontSize: '9pt', fontWeight: 600 }}>{inspection.supervisor_name || 'Infection Control Officer in-Charge'}</div>
                  <div style={{ marginTop: '24px', borderTop: '1px solid #000', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '8pt' }}>
                    <span>Signature: __________________________</span>
                    <span>Date: ____/____/2026</span>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '7.5pt', color: '#64748b', textAlign: 'center', marginTop: '14px', borderTop: '1px dashed #cbd5e1', paddingTop: '6px' }}>
                This physical worksheet complies with Bahrain National Health Regulatory Authority (NHRA) Hospital Hygiene Standard & WHO Environmental Cleaning Protocols.
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Print Stylesheet injection for table page-breaks and typography */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait !important;
            margin: 8mm 10mm 8mm 10mm !important;
          }
          .printable-worksheet table {
            page-break-inside: auto !important;
            break-inside: auto !important;
          }
          .printable-worksheet tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .printable-worksheet thead {
            display: table-header-group !important;
          }
        }
      `}</style>
    </div>
  );
}
