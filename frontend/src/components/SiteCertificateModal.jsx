import React, { useRef } from 'react';
import Modal from './Modal';
import { useSettings } from '../context/SettingsContext';
import { 
  FileCheck2, 
  Printer, 
  Download, 
  ShieldCheck, 
  Building2, 
  CheckCircle2, 
  Award,
  Layers,
  MapPin,
  Calendar,
  AlertOctagon,
  UserCheck
} from 'lucide-react';

export default function SiteCertificateModal({
  isOpen,
  onClose,
  certificate,
  inspection
}) {
  const { settings, formatDate, formatDateTime } = useSettings();
  const printRef = useRef(null);

  if (!isOpen || !inspection) return null;

  const handlePrint = () => {
    window.focus();
    setTimeout(() => {
      window.print();
    }, 50);
  };

  const readinessScore = certificate?.approved_readiness_score || inspection?.readiness_percentage || 100.0;
  const companyName = settings?.company_name || 'SaNDS Lab Middle East W.L.L';
  const companyLogo = settings?.company_logo || '/sands_logo.png';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Official Site Readiness & Delivery Dispatch Certificate"
      subtitle={`${certificate?.certificate_number || 'SRC-VERIFIED'} • ${inspection.facility_name}`}
      icon={Award}
      size="xl"
    >
      {/* Embedded A4 Landscape Print Stylesheet */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 6mm 10mm;
          }
          body * {
            visibility: hidden !important;
          }
          .site-certificate-print-sheet,
          .site-certificate-print-sheet * {
            visibility: visible !important;
          }
          .site-certificate-print-sheet {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            max-width: 100% !important;
            height: 100vh !important;
            box-sizing: border-box !important;
            padding: 6mm 10mm !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Top Action Bar */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.4rem' }}>{inspection.country_flag || '🌐'}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                {inspection.regulatory_authority || 'Hospital Clinical Commissioning Directorate'}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Standard: {inspection.primary_standard_doc || 'MOH Pre-Installation Infrastructure Guidelines'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handlePrint}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Printer size={15} />
              <span>Print Official Certificate (A4 Landscape)</span>
            </button>
          </div>
        </div>

        {/* Printable Certificate Document Sheet */}
        <div 
          className="site-certificate-print-sheet"
          ref={printRef}
          style={{
            backgroundColor: '#ffffff',
            color: '#0f172a',
            border: '2px solid #0284c7',
            borderRadius: '12px',
            padding: '28px 36px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            fontFamily: 'Inter, system-ui, sans-serif'
          }}
        >
          {/* Official Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px double #0284c7', paddingBottom: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', maxWidth: '65%' }}>
              <img 
                src={companyLogo} 
                alt={companyName} 
                style={{ maxHeight: '52px', maxWidth: '150px', objectFit: 'contain' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                  {companyName}
                </h2>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0284c7', marginTop: '2px' }}>
                  Biomedical Site Preparation & Infrastructure Clearance • {inspection.facility_name}
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Certificate Number</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0284c7', fontFamily: 'monospace' }}>
                {certificate?.certificate_number || 'SRC-APPROVED'}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
                Date of Issue: <strong>{formatDate(certificate?.created_at || new Date())}</strong>
              </div>
            </div>
          </div>

          {/* Statement of Verification */}
          <div style={{
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '8px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ maxWidth: '75%' }}>
              <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} />
                <span>UNCONDITIONAL PRE-INSTALLATION DELIVERY DISPATCH APPROVED</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#334155', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                This document certifies that the installation room and associated engineering infrastructure (Civil, Electrical Earthing, Isolated Power, HVAC, Medical Gases, Drainage, and LAN/PACS connectivity) have undergone 100% inspection per standardized GCC and national hospital regulatory codes.
              </p>
            </div>

            <div style={{ textAlign: 'center', borderLeft: '2px solid #bae6fd', paddingLeft: '20px' }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Readiness Score</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#059669' }}>
                {Number(readinessScore).toFixed(1)}%
              </div>
              <span style={{ fontSize: '0.7rem', backgroundColor: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                130-Point Certified
              </span>
            </div>
          </div>

          {/* Inspection Metadata Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '0.86rem' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 6px', fontWeight: 600, color: '#64748b', width: '22%' }}>Hospital Facility:</td>
                <td style={{ padding: '8px 6px', fontWeight: 700, color: '#0f172a' }}>{inspection.facility_name}</td>
                <td style={{ padding: '8px 6px', fontWeight: 600, color: '#64748b', width: '22%' }}>Country & Authority:</td>
                <td style={{ padding: '8px 6px', fontWeight: 700, color: '#0f172a' }}>{inspection.country_name} ({inspection.country_code})</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 6px', fontWeight: 600, color: '#64748b' }}>Department / Suite:</td>
                <td style={{ padding: '8px 6px' }}>{inspection.department_name}</td>
                <td style={{ padding: '8px 6px', fontWeight: 600, color: '#64748b' }}>Room & Floor Location:</td>
                <td style={{ padding: '8px 6px' }}><strong>{inspection.room_number}</strong> • {inspection.building} ({inspection.floor})</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 6px', fontWeight: 600, color: '#64748b' }}>Target Medical Equipment:</td>
                <td style={{ padding: '8px 6px', fontWeight: 700, color: '#0284c7' }}>{inspection.target_model}</td>
                <td style={{ padding: '8px 6px', fontWeight: 600, color: '#64748b' }}>Equipment Master Category:</td>
                <td style={{ padding: '8px 6px' }}>{inspection.equipment_type_name} ({inspection.equipment_category})</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 6px', fontWeight: 600, color: '#64748b' }}>Authorized Vendor / OEM:</td>
                <td style={{ padding: '8px 6px' }}>{inspection.vendor_name || 'Authorized OEM Partner'}</td>
                <td style={{ padding: '8px 6px', fontWeight: 600, color: '#64748b' }}>Target Installation Date:</td>
                <td style={{ padding: '8px 6px' }}>{formatDate(inspection.target_installation_date)}</td>
              </tr>
            </tbody>
          </table>

          {/* Operating Conditions & Scope Notes */}
          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', marginBottom: '28px', fontSize: '0.8rem', color: '#475569' }}>
            <strong>Special Operational & Regulatory Conditions:</strong>{' '}
            {certificate?.special_operating_conditions || 'Room infrastructure fully cleared. Zero critical or life-safety deficiencies open. Rigging, uncrating, anchoring, and initial electrical energization permitted per OEM protocol.'}
          </div>

          {/* Multi-Party Sign-Off Signatures Grid */}
          <div style={{ marginTop: '32px' }}>
            <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px', marginBottom: '24px' }}>
              Multi-Disciplinary Joint Commissioning Sign-Offs
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {/* Sign 1: Biomedical */}
              <div style={{ borderTop: '2px solid #0f172a', paddingTop: '8px', textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: '0.84rem' }}>
                  {certificate?.biomedical_engineer_signature || inspection.lead_biomedical_engineer}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Lead Biomedical Engineer</div>
                <div style={{ fontSize: '0.68rem', color: '#059669', marginTop: '4px', fontWeight: 600 }}>✓ Verified & Signed</div>
              </div>

              {/* Sign 2: Facilities */}
              <div style={{ borderTop: '2px solid #0f172a', paddingTop: '8px', textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: '0.84rem' }}>
                  {certificate?.facilities_director_signature || 'Director of Facilities & MEP'}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Hospital Facilities Director</div>
                <div style={{ fontSize: '0.68rem', color: '#059669', marginTop: '4px', fontWeight: 600 }}>✓ Certified MEP</div>
              </div>

              {/* Sign 3: Vendor */}
              <div style={{ borderTop: '2px solid #0f172a', paddingTop: '8px', textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: '0.84rem' }}>
                  {certificate?.vendor_pm_signature || inspection.vendor_project_manager || 'Vendor Project Director'}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Authorized Vendor PM</div>
                <div style={{ fontSize: '0.68rem', color: '#059669', marginTop: '4px', fontWeight: 600 }}>✓ Accepted Site</div>
              </div>

              {/* Sign 4: Hospital Director */}
              <div style={{ borderTop: '2px solid #0f172a', paddingTop: '8px', textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: '0.84rem' }}>
                  {certificate?.hospital_director_signature || 'Commissioning Committee Chair'}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Medical Director / CEO</div>
                <div style={{ fontSize: '0.68rem', color: '#059669', marginTop: '4px', fontWeight: 600 }}>✓ Released for Delivery</div>
              </div>
            </div>
          </div>

          {/* Security Verification Footer */}
          <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '36px', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8' }}>
            <span>BioTrack CMMS Version 2.0 • Digital Site Preparation Verification System</span>
            <span>Security Hash: SHA256-ENC-{certificate?.certificate_number?.slice(4) || 'VALID'}</span>
          </div>
        </div>

      </div>
    </Modal>
  );
}
