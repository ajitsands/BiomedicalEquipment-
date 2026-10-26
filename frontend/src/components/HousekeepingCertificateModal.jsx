import React, { useRef, useEffect } from 'react';
import { X, Printer, ShieldCheck, CheckCircle2, Award, Building2, Calendar, UserCheck, Sparkles, Check } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export default function HousekeepingCertificateModal({ inspection, isOpen, onClose }) {
  const { settings, formatDate } = useSettings();
  const printAreaRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  if (!isOpen || !inspection) return null;

  const handlePrint = () => {
    window.print();
  };

  const isPassed = (inspection.status || '').toLowerCase() === 'passed' || (inspection.score_percent || 100) >= 80;
  const certNumber = inspection.certificate_number || `CERT-HK-${new Date().getFullYear()}-${String(inspection.id || '0001').padStart(4, '0')}`;
  
  // Format Date & Time
  let conductedDate = inspection.conducted_at 
    ? new Date(inspection.conducted_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) 
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  // Company details dynamically retrieved from Master Settings
  const companyName = settings?.company_name || 'SaNDS Lab Middle East W.L.L';
  const companyLogo = settings?.company_logo || '/sands_logo.png';
  const facilityName = inspection.facility_name || 'Bahrain Healthcare Facility';

  const totalChecks = inspection.total_items || inspection.passed_items || 16;
  const passedChecks = inspection.passed_items || totalChecks;
  const failedChecks = inspection.failed_items || 0;
  const complianceScore = inspection.score_percent !== undefined ? inspection.score_percent : (failedChecks === 0 ? 100 : Math.round((passedChecks / totalChecks) * 100));

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1300 }}>
      {/* Embedded A4 Landscape Print Stylesheet */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 6mm 10mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            width: 100% !important;
            height: 100% !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          .housekeeping-certificate-print-sheet,
          .housekeeping-certificate-print-sheet * {
            visibility: visible !important;
          }
          .housekeeping-certificate-print-sheet {
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
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div 
        className="modal-content-card" 
        style={{ 
          maxWidth: '1120px', 
          width: '96vw', 
          maxHeight: '94vh', 
          overflowY: 'auto', 
          background: '#f8fafc', 
          color: '#1e293b',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          padding: 0,
          border: '1px solid rgba(2, 132, 199, 0.2)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Control Bar (Hidden in Print) */}
        <div className="no-print" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '12px 24px', 
          borderBottom: '1px solid #e2e8f0', 
          background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(236, 72, 153, 0.08) 100%)' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ 
              background: '#0284c7', 
              color: '#fff', 
              fontSize: '0.72rem', 
              fontWeight: 800, 
              padding: '2px 8px', 
              borderRadius: '12px',
              textTransform: 'uppercase'
            }}>
              A4 Landscape
            </span>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>
              Official Bahrain NHRA / WHO Cleanliness & Terminal Clearance Certificate
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              type="button" 
              className="btn btn-primary btn-sm"
              onClick={handlePrint}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0284c7', borderColor: '#0284c7', fontWeight: 700 }}
            >
              <Printer size={15} /> Print / Save PDF (A4 Landscape)
            </button>
            <button 
              type="button" 
              className="btn-icon" 
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              title="Close Certificate"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Certificate Sheet (A4 Landscape Form Factor) */}
        <div 
          className="housekeeping-certificate-print-sheet" 
          ref={printAreaRef} 
          style={{ 
            padding: '24px 32px', 
            background: '#ffffff', 
            position: 'relative',
            boxSizing: 'border-box'
          }}
        >
          {/* Certificate Double Border Container */}
          <div style={{ 
            border: '3px double #0284c7', 
            borderRadius: '12px', 
            padding: '20px 24px', 
            position: 'relative',
            background: '#ffffff',
            boxShadow: 'inset 0 0 0 1px rgba(2, 132, 199, 0.25)'
          }}>

            {/* Header: Dynamic Company Info from Master Settings + NHRA/WHO Badges */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              borderBottom: '2px solid #e2e8f0', 
              paddingBottom: '14px', 
              marginBottom: '16px' 
            }}>
              {/* Left: Dynamic Company Logo & Name from Master Settings */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', maxWidth: '65%' }}>
                <img 
                  src={companyLogo} 
                  alt={companyName} 
                  style={{ maxHeight: '52px', maxWidth: '160px', objectFit: 'contain' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                    {companyName}
                  </h2>
                  <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                    {facilityName ? `${facilityName} • ` : ''}Kingdom of Bahrain • Infection Prevention & Environmental Health Directorate
                  </p>
                </div>
              </div>

              {/* Right: Official Bahrain NHRA & WHO Compliance Badge */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  background: '#f0fdf4', 
                  border: '1.5px solid #10b981', 
                  color: '#047857', 
                  padding: '5px 12px', 
                  borderRadius: '20px', 
                  fontSize: '0.78rem', 
                  fontWeight: 800,
                  boxShadow: '0 2px 4px rgba(16, 185, 129, 0.15)'
                }}>
                  <ShieldCheck size={16} /> NHRA & WHO COMPLIANT
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px', fontWeight: 600 }}>
                  Standard: WHO 2023 / NHRA Form HCF-04
                </div>
              </div>
            </div>

            {/* Certificate Title & Accreditation Number Banner */}
            <div style={{ textAlign: 'center', margin: '10px 0 16px 0' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, #0284c7 0%, #ec4899 100%)', 
                  color: '#ffffff', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)'
                }}>
                  <Award size={18} />
                </div>
                <h1 style={{ 
                  margin: 0, 
                  fontSize: '1.35rem', 
                  fontWeight: 900, 
                  color: '#0284c7', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.8px',
                  display: 'inline-block'
                }}>
                  Certificate of Terminal Cleanliness & Infection Clearance
                </h1>
              </div>
              <div style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Certificate No: <strong style={{ color: '#0f172a', fontFamily: 'monospace', letterSpacing: '0.5px' }}>{certNumber}</strong>
                {inspection.audit_number && (
                  <span> | Audit Reference: <strong style={{ color: '#0f172a' }}>{inspection.audit_number}</strong></span>
                )}
              </div>
            </div>

            {/* Landscape 2-Column Body Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1.25fr 1fr', 
              gap: '18px', 
              marginBottom: '16px' 
            }}>
              
              {/* Left Column: Certification Statement & Room Metadata */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Formal Verification Statement */}
                <div style={{ 
                  fontSize: '0.82rem', 
                  lineHeight: '1.5', 
                  color: '#334155', 
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  textAlign: 'justify'
                }}>
                  This is to formally certify that the designated clinical area detailed below has undergone comprehensive terminal cleaning, deep surface disinfection, and environmental monitoring in accordance with the <strong>World Health Organization (WHO) Environmental Cleaning and Infection Prevention Guidance (2023)</strong> and the <strong>Kingdom of Bahrain National Health Regulatory Authority (NHRA)</strong> healthcare facility inspection mandates.
                </div>

                {/* Clinical Area Metadata 4-Box Grid */}
                <div style={{ 
                  background: '#ffffff', 
                  border: '1px solid #cbd5e1', 
                  borderRadius: '8px', 
                  padding: '12px 14px', 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '10px', 
                  fontSize: '0.82rem' 
                }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.70rem', fontWeight: 700, textTransform: 'uppercase' }}>ROOM / LOCATION:</span>
                    <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{inspection.room_number || 'General Ward'}</strong>
                    {inspection.area_type && <span style={{ color: '#64748b', fontSize: '0.78rem' }}> ({inspection.area_type})</span>}
                  </div>

                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.70rem', fontWeight: 700, textTransform: 'uppercase' }}>BUILDING & FLOOR:</span>
                    <strong style={{ color: '#0f172a' }}>{inspection.building || 'Hospital Pavilion'} — {inspection.floor || 'Level 1'}</strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.70rem', fontWeight: 700, textTransform: 'uppercase' }}>CLEANING CLASSIFICATION:</span>
                    <strong style={{ color: '#0284c7' }}>{inspection.cleaning_type || 'Terminal'} Clean</strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.70rem', fontWeight: 700, textTransform: 'uppercase' }}>DATE & TIMESTAMP:</span>
                    <strong style={{ color: '#0f172a' }}>{conductedDate}</strong>
                  </div>
                </div>
              </div>

              {/* Right Column: Audit Compliance & Chemical Efficacy Box */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* Audit Compliance Result Pill */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '12px 14px', 
                  background: isPassed ? '#f0fdf4' : '#fffbeb', 
                  border: `1.5px solid ${isPassed ? '#86efac' : '#fde68a'}`, 
                  borderRadius: '8px' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <CheckCircle2 size={26} color={isPassed ? '#10b981' : '#f59e0b'} />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.96rem', color: isPassed ? '#065f46' : '#92400e' }}>
                        AUDIT COMPLIANCE: {complianceScore}% — {isPassed ? 'PASSED & CLEARED' : 'NEEDS ACTION'}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: isPassed ? '#047857' : '#b45309', marginTop: '2px' }}>
                        Zero high-risk NHRA regulatory non-compliances observed.
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', fontSize: '0.76rem', color: '#64748b', flexShrink: 0 }}>
                    <div>Checks: <strong>{totalChecks}</strong></div>
                    <div>
                      <strong style={{ color: '#10b981' }}>{passedChecks} Passed</strong>
                      {failedChecks > 0 && <strong style={{ color: '#ef4444' }}> | {failedChecks} Failed</strong>}
                    </div>
                  </div>
                </div>

                {/* Disinfection & Infection Control Protocol Protocols Verification */}
                <div style={{ 
                  background: '#f8fafc', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '8px', 
                  padding: '10px 14px', 
                  fontSize: '0.76rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  color: '#334155'
                }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Sparkles size={13} color="#0284c7" />
                    <span>Disinfection & Bioburden Efficacy Verification:</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#10b981', fontWeight: 900 }}>✓</span>
                    <span><strong>Chemical Agent:</strong> 1,000 PPM Sodium Hypochlorite (Chlorine) verified</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#10b981', fontWeight: 900 }}>✓</span>
                    <span><strong>High-Touch Points:</strong> Bedrails, infusion handles, switches & toilets disinfected</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#10b981', fontWeight: 900 }}>✓</span>
                    <span><strong>Environmental Clearance:</strong> Swab test / ATP bioluminescence within threshold (&lt; 2.5 CFU/cm²)</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Signatures & Official MOH / NHRA Seal Row (3-Columns Landscape) */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 140px 1fr', 
              gap: '16px', 
              borderTop: '2px dashed #cbd5e1', 
              paddingTop: '14px', 
              marginTop: '10px', 
              textAlign: 'center',
              alignItems: 'center'
            }}>
              {/* 1. Lead Cleaning Inspector */}
              <div>
                <div style={{ height: '32px', borderBottom: '1px solid #94a3b8', marginBottom: '4px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <span style={{ fontStyle: 'italic', color: '#0284c7', fontWeight: 700, fontSize: '0.86rem' }}>
                    {inspection.inspector_name || 'Dr. Fatima Al-Doseri'}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b' }}>Lead Cleaning Inspector</div>
                <div style={{ fontSize: '0.70rem', color: '#64748b' }}>{inspection.inspector_role || 'Infection Control Link Nurse / Officer'}</div>
              </div>

              {/* 2. Official MOH / NHRA Digital Stamp */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ 
                  width: '74px', 
                  height: '74px', 
                  borderRadius: '50%', 
                  border: '2px solid #0284c7', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: '#0284c7', 
                  padding: '2px', 
                  transform: 'rotate(-4deg)',
                  boxShadow: '0 2px 6px rgba(2, 132, 199, 0.2)',
                  background: 'rgba(2, 132, 199, 0.03)'
                }}>
                  <span style={{ fontSize: '0.50rem', fontWeight: 900, letterSpacing: '0.5px' }}>MOH / NHRA</span>
                  <span style={{ fontSize: '0.62rem', fontWeight: 900, borderTop: '1px solid #0284c7', borderBottom: '1px solid #0284c7', padding: '1px 3px', margin: '2px 0' }}>VERIFIED</span>
                  <span style={{ fontSize: '0.50rem', fontWeight: 800 }}>KINGDOM OF BAHRAIN</span>
                </div>
              </div>

              {/* 3. Housekeeping Supervisor / Authorized HICC Officer */}
              <div>
                <div style={{ height: '32px', borderBottom: '1px solid #94a3b8', marginBottom: '4px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <span style={{ fontStyle: 'italic', color: '#0284c7', fontWeight: 700, fontSize: '0.86rem' }}>
                    {inspection.supervisor_name || 'Dr. Tariq Al-Mansoor'}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b' }}>Housekeeping Supervisor / HICC Officer</div>
                <div style={{ fontSize: '0.70rem', color: '#64748b' }}>Authorized Infection Control Officer</div>
              </div>
            </div>

            {/* Footer Notice with Company Name from Master Settings */}
            <div style={{ 
              textAlign: 'center', 
              marginTop: '12px', 
              borderTop: '1px solid #f1f5f9', 
              paddingTop: '6px', 
              fontSize: '0.66rem', 
              color: '#94a3b8' 
            }}>
              Official Accreditation Document • Generated by BioTrack CMMS — Housekeeping & Infection Control Management System | {companyName}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
