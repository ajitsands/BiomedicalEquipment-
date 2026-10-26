import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import { QRCodeSVG } from 'qrcode.react';
import { useSettings } from '../context/SettingsContext';
import { fetchChecklistTemplates, fetchEquipmentDetail } from '../services/api';
import { 
  Printer, 
  FileText, 
  ShieldCheck, 
  UserCheck, 
  Zap, 
  Wrench, 
  Layers, 
  Camera, 
  CheckSquare, 
  AlertTriangle,
  Building2,
  Calendar,
  X
} from 'lucide-react';

export default function PrintablePhaseWorksheetModal({
  isOpen,
  onClose,
  equipment,
  pmDueDate,
  initialPhase = 'ALL',
  assignedTechnician = null,
  onShowToast
}) {
  const { settings, formatDate } = useSettings();
  const printRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [eqDetail, setEqDetail] = useState(equipment);
  const [template, setTemplate] = useState(null);
  const [items, setItems] = useState([]);
  const [selectedPhase, setSelectedPhase] = useState(initialPhase); // 'ALL', 'PRE_USE', 'PM_TECH', 'ELECTRICAL', 'CORRECTIVE'
  const [technician, setTechnician] = useState(assignedTechnician || {
    name: 'Eng. Hassan Al-Majed',
    badge: 'SAND-BME-01',
    role: 'Biomedical Service Engineer'
  });

  useEffect(() => {
    if (isOpen && equipment) {
      loadData();
    }
  }, [isOpen, equipment]);

  useEffect(() => {
    if (assignedTechnician) {
      setTechnician(assignedTechnician);
    }
  }, [assignedTechnician]);

  const loadData = async () => {
    try {
      setLoading(true);
      let eqData = equipment;
      if ((!eqData.equipment_type_id || !eqData.asset_id) && (eqData.id || eqData.equipment_id)) {
        try {
          const res = await fetchEquipmentDetail(eqData.id || eqData.equipment_id);
          if (res && res.data) {
            eqData = { ...eqData, ...res.data };
            setEqDetail(eqData);
          }
        } catch (e) {
          console.warn('Could not fetch extra equipment details:', e);
        }
      }

      const res = await fetchChecklistTemplates(false, eqData.equipment_type_id || null);
      setTemplate(res.template);
      setItems(res.items || []);
    } catch (err) {
      console.error('Failed to load checklist for worksheet:', err);
      if (onShowToast) {
        onShowToast({ type: 'error', title: 'Load Error', message: 'Could not load checklist template' });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Filter items based on selected phase
  const filteredItems = items.filter(item => {
    if (selectedPhase === 'ALL') return true;
    if (selectedPhase === 'PRE_USE') return item.checklist_phase === 'User pre-use / routine check';
    if (selectedPhase === 'PM_TECH') return item.checklist_phase === 'Preventive maintenance / technical inspection' && item.category !== 'Electrical Safety Test';
    if (selectedPhase === 'ELECTRICAL') return item.checklist_phase === 'Electrical Safety (IEC 62353)' || item.category === 'Electrical Safety Test';
    if (selectedPhase === 'CORRECTIVE') return item.checklist_phase === 'Complaint / corrective maintenance';
    return true;
  });

  const applyPrintLandscape = () => {
    const styleId = 'worksheet-print-orientation-style';
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `@media print { @page { size: A4 landscape !important; margin: 6mm 8mm 6mm 8mm !important; } }`;
    document.body.classList.add('worksheet-modal-printing-target');
  };

  useEffect(() => {
    if (!isOpen) return;
    applyPrintLandscape();

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
      const el = document.getElementById('worksheet-print-orientation-style');
      if (el) el.remove();
    };
  }, [isOpen]);

  const handlePrint = () => {
    const content = document.getElementById('printable-a4-worksheet');
    if (!content) {
      window.print();
      return;
    }

    let iframe = document.getElementById('pm-worksheet-print-iframe');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'pm-worksheet-print-iframe';
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
          <title>${eqDetail?.asset_id || 'PM'} - Preventive Maintenance Worksheet</title>
          <style>
            @page { 
              size: A4 landscape; 
              margin: 6mm 8mm 6mm 8mm; 
            }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; 
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

  const dueStr = pmDueDate ? formatDate(pmDueDate) : formatDate(eqDetail?.next_pm_due_date || new Date().toISOString().slice(0, 10));
  const docNo = `PM-A4-${new Date().getFullYear()}-${eqDetail?.asset_id || eqDetail?.id || '001'}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Printable A4 Phase Inspection Worksheet • ${eqDetail?.asset_id || 'Medical Device'}`}
      icon={FileText}
      size="xl"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Designed for sterile rooms, OT, and offline hospital zones. Photograph signed paper upon exit.
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            <button type="button" className="btn btn-primary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Printer size={16} />
              <span>Print A4 Worksheet (Ctrl+P)</span>
            </button>
          </div>
        </div>
      }
    >
      {/* Top Controls: Phase Filter & Custom Technician info (Screen-only Block 1) */}
      <div className="no-print worksheet-screen-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0284c7' }}>Worksheet Phase:</span>
          <button
            type="button"
            className={`btn btn-sm ${selectedPhase === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedPhase('ALL')}
          >
            All 37 Steps
          </button>
          <button
            type="button"
            className={`btn btn-sm ${selectedPhase === 'PRE_USE' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedPhase('PRE_USE')}
          >
            <UserCheck size={13} /> Phase 1: Pre-Use
          </button>
          <button
            type="button"
            className={`btn btn-sm ${selectedPhase === 'PM_TECH' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedPhase('PM_TECH')}
          >
            <ShieldCheck size={13} /> Phase 2: Technical PM
          </button>
          <button
            type="button"
            className={`btn btn-sm ${selectedPhase === 'ELECTRICAL' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedPhase('ELECTRICAL')}
          >
            <Zap size={13} /> Electrical Safety (IEC 62353)
          </button>
          <button
            type="button"
            className={`btn btn-sm ${selectedPhase === 'CORRECTIVE' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedPhase('CORRECTIVE')}
          >
            <Wrench size={13} /> Phase 3: Corrective
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Assigned Tech:</span>
          <input
            type="text"
            className="form-control"
            style={{ width: '190px', padding: '4px 8px', fontSize: '0.8rem' }}
            value={technician.name}
            onChange={(e) => setTechnician({ ...technician, name: e.target.value })}
            placeholder="Technician Name"
          />
          <input
            type="text"
            className="form-control"
            style={{ width: '110px', padding: '4px 8px', fontSize: '0.8rem' }}
            value={technician.badge}
            onChange={(e) => setTechnician({ ...technician, badge: e.target.value })}
            placeholder="Badge ID"
          />
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* THE PRINTABLE A4 CONTAINER */}
      {/* ------------------------------------------------------------- */}
      <div 
        ref={printRef}
        id="printable-a4-worksheet"
        style={{
          background: '#ffffff',
          color: '#111827',
          padding: '24px 28px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          fontFamily: 'Inter, -apple-system, sans-serif',
          lineHeight: '1.4',
          fontSize: '11px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}
      >
        {/* Header with Company Logo, Company Name from Settings & Live QR */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start', 
          borderBottom: '2.5px solid #0284c7', 
          paddingBottom: '12px',
          marginBottom: '14px',
          gap: '16px'
        }}>
          <div style={{ flex: 1 }}>
            {/* Single Line: Logo and Company Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
              {(settings?.company_logo || '/sands_logo.png') && (
                <img 
                  src={settings?.company_logo || '/sands_logo.png'} 
                  alt={settings?.company_name || 'SaNDS Lab Middle East W.L.L'} 
                  style={{ 
                    maxHeight: '38px', 
                    maxWidth: '140px', 
                    objectFit: 'contain',
                    flexShrink: 0
                  }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
              <div style={{ fontSize: '13pt', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.3px', lineHeight: 1.2, textTransform: 'uppercase' }}>
                {settings?.company_name || 'SaNDS Lab Middle East W.L.L'}
              </div>
            </div>

            {/* Below Content Starting From Left Edge Itself */}
            <div style={{ fontSize: '8.5pt', fontWeight: 600, color: '#475569', marginTop: '2px' }}>
              Department of Clinical Engineering & Healthcare Technology Management
            </div>
            <div style={{ fontSize: '10.5pt', fontWeight: 800, color: '#0284c7', marginTop: '4px', textTransform: 'uppercase' }}>
              PREVENTIVE MAINTENANCE & ELECTRICAL SAFETY WORKSHEET (A4)
            </div>
            <div style={{ fontSize: '7.5pt', color: '#64748b', marginTop: '1px' }}>
              IEC 62353 / WHO 2023 Medical Device Technical Series • Form PM-AUD-A4
            </div>
          </div>

          {/* Right: Live QR Code & Document Meta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right', fontSize: '9.5px', color: '#475569' }}>
              <div><strong>Document No:</strong> {docNo}</div>
              <div><strong>Scheduled Date:</strong> {dueStr}</div>
              <div><strong>Standard:</strong> IEC 62353 / WHO 2023</div>
            </div>
            <div style={{ padding: '4px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
              <QRCodeSVG 
                value={eqDetail?.qr_code_token || eqDetail?.asset_id || 'QR-BME-001'} 
                size={55} 
                level="M" 
              />
            </div>
          </div>
        </div>

        {/* Equipment & Assignee Information Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          padding: '10px 12px',
          marginBottom: '14px',
          fontSize: '10.5px'
        }}>
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: '9px', fontWeight: 700 }}>HOSPITAL ASSET ID</span>
            <strong style={{ color: '#0284c7', fontSize: '12px' }}>{eqDetail?.asset_id || 'BME-ASSET'}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: '9px', fontWeight: 700 }}>EQUIPMENT NAME</span>
            <strong>{eqDetail?.name || 'Medical Equipment'}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: '9px', fontWeight: 700 }}>MANUFACTURER & MODEL</span>
            <span>{eqDetail?.brand || 'OEM'} • {eqDetail?.model_number || 'Model'}</span>
          </div>
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: '9px', fontWeight: 700 }}>SERIAL NUMBER</span>
            <span><code>{eqDetail?.serial_number || 'N/A'}</code></span>
          </div>

          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: '9px', fontWeight: 700 }}>LOCATION / WARD</span>
            <span>{eqDetail?.department_name || 'General Ward'}</span>
          </div>
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: '9px', fontWeight: 700 }}>IEC PROTECTION CLASS</span>
            <span>{eqDetail?.protection_class || 'Class I'} • {eqDetail?.applied_part_type ? `Type ${eqDetail.applied_part_type}` : 'Type BF'}</span>
          </div>
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: '9px', fontWeight: 700 }}>ASSIGNED TECHNICIAN</span>
            <strong>{technician.name}</strong> ({technician.badge})
          </div>
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: '9px', fontWeight: 700 }}>WORKSHEET PHASE</span>
            <span style={{ color: '#0284c7', fontWeight: 700 }}>
              {selectedPhase === 'ALL' ? 'Complete 37-Step Verification' : selectedPhase}
            </span>
          </div>
        </div>

        {/* Verification Items Table */}
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse', 
          marginBottom: '14px',
          fontSize: '10px'
        }}>
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
              <th style={{ padding: '6px 8px', textAlign: 'center', width: '32px' }}>#</th>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>Verification Item & Acceptance Standard</th>
              <th style={{ padding: '6px 8px', textAlign: 'left', width: '130px' }}>Category & Phase</th>
              <th style={{ padding: '6px 8px', textAlign: 'center', width: '110px' }}>Measured Value</th>
              <th style={{ padding: '6px 8px', textAlign: 'center', width: '110px' }}>Evaluation</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item, idx) => {
              const isNumeric = item.check_type === 'numeric';
              return (
                <tr key={item.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: '#64748b' }}>
                    {item.step_number || idx + 1}
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    <div style={{ fontWeight: 700, color: '#1e293b' }}>{item.title}</div>
                    {item.expected_result && (
                      <div style={{ fontSize: '9px', color: '#475569', marginTop: '2px' }}>
                        <strong>Standard:</strong> {item.expected_result}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '6px 8px', color: '#64748b', fontSize: '9px' }}>
                    <div><strong>{item.checklist_phase?.slice(0, 18)}...</strong></div>
                    <div>{item.category}</div>
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                    {isNumeric ? (
                      <div style={{ 
                        border: '1px dashed #94a3b8', 
                        height: '20px', 
                        borderRadius: '3px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#94a3b8',
                        fontSize: '9px'
                      }}>
                        ______ {item.unit || ''}
                      </div>
                    ) : (
                      <span style={{ color: '#cbd5e1' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', fontSize: '9.5px', fontWeight: 700 }}>
                      <span>[ &nbsp; ] Pass</span>
                      <span>[ &nbsp; ] Fail</span>
                      <span>[ &nbsp; ] N/A</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Observations, Spare Parts & Sign-Off Block */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: '12px',
          borderTop: '2px solid #e2e8f0',
          paddingTop: '10px'
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '10px', marginBottom: '4px' }}>
              Maintenance Findings, Deficiencies & Consumables Replaced:
            </div>
            <div style={{ 
              border: '1px solid #cbd5e1', 
              borderRadius: '4px', 
              height: '55px', 
              padding: '6px', 
              fontSize: '9px', 
              color: '#94a3b8' 
            }}>
              Notes / Replaced filters, O-rings, sensors, safety fuses, calibration values...
            </div>

            <div style={{ marginTop: '8px', fontSize: '9px', color: '#64748b' }}>
              <strong>Calibrated Test Analyzer:</strong> Fluke ESA620 / Rigel 288+ &nbsp;•&nbsp; <strong>Cal Due:</strong> 2027
            </div>
          </div>

          <div style={{ 
            background: '#f8fafc', 
            border: '1px solid #cbd5e1', 
            borderRadius: '6px', 
            padding: '8px 12px' 
          }}>
            <div style={{ fontWeight: 700, fontSize: '10px', color: '#0f172a' }}>
              Technician Physical Verification & Sign-Off
            </div>
            <div style={{ fontSize: '8.5px', color: '#64748b', marginTop: '2px', lineHeight: '1.2' }}>
              I hereby certify that I have physically inspected and verified the above steps as per clinical & WHO/IEC safety standards.
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', alignItems: 'flex-end' }}>
              <div>
                <div style={{ borderBottom: '1px solid #475569', width: '130px', height: '18px' }} />
                <span style={{ fontSize: '8.5px', color: '#475569' }}>Technician Signature & Stamp</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ borderBottom: '1px solid #475569', width: '90px', height: '18px' }} />
                <span style={{ fontSize: '8.5px', color: '#475569' }}>Date & Time</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Sterile Area Protocol Instructions */}
        <div style={{
          marginTop: '12px',
          borderTop: '1px dashed #cbd5e1',
          paddingTop: '6px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '8.5px',
          color: '#64748b'
        }}>
          <div>
            📷 <strong>STERILE AREA MOBILE PROTOCOL:</strong> If mobile phones are restricted inside OT/ICU, conduct testing on this paper. Upon exiting, launch the <strong>BioTrack Mobile Portal</strong> camera to photograph this signed document to automatically attach and complete the digital work order.
          </div>
          <div style={{ flexShrink: 0, marginLeft: '12px', fontWeight: 700 }}>
            Page 1 of 1 • SaNDS Biomedical
          </div>
        </div>
      </div>
    </Modal>
  );
}
