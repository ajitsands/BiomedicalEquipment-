import React, { useState } from 'react';
import Modal from './Modal';
import { 
  ShieldCheck, 
  Zap, 
  BookOpen, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Cpu, 
  FileText, 
  Activity, 
  Clock, 
  HeartPulse, 
  CheckSquare,
  Award,
  Layers,
  ChevronRight
} from 'lucide-react';

export default function WhoIecComplianceModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('iec62353');

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="WHO & IEC 62353 Clinical Standards & Compliance Specifications"
      icon={ShieldCheck}
      size="xl"
      maxWidth="1480px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.12) 0%, rgba(236, 72, 153, 0.08) 100%)',
          border: '1px solid rgba(2, 132, 199, 0.25)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Award size={13} /> IEC 62353:2014 Standard
              </span>
              <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <BookOpen size={13} /> WHO Technical Series
              </span>
              <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Zap size={13} /> Hospital CMMS Certified
              </span>
            </div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 800 }}>
              Biomedical Engineering Safety & Maintenance Governance
            </h3>
            <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)', maxWidth: '680px', lineHeight: 1.5 }}>
              This system implements the international safety protocols of <strong>IEC 62353</strong> (recurrent testing and testing after repair of medical electrical equipment) coupled with the <strong>World Health Organization (WHO) Medical Device Technical Series</strong> framework for lifecycle asset governance.
            </p>
          </div>
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Governing Standard</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-primary)' }}>
              IEC 62353 / WHO-HTM
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
              <CheckCircle2 size={13} /> Active in Application Engine
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          borderBottom: '1px solid var(--border-color)', 
          paddingBottom: '10px',
          overflowX: 'auto'
        }}>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'iec62353' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('iec62353')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Zap size={15} /> IEC 62353 Electrical Safety
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'schedules' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('schedules')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Calendar size={15} /> Testing Intervals (When to Test)
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'who' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('who')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <BookOpen size={15} /> WHO 3-Phase Framework
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'cmms_impl' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('cmms_impl')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Cpu size={15} /> Implementation in this App
          </button>
        </div>

        {/* TAB 1: IEC 62353 Electrical Safety */}
        {activeTab === 'iec62353' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ 
              backgroundColor: 'var(--bg-subtle)', 
              padding: '14px 18px', 
              borderRadius: 'var(--radius-md)',
              borderLeft: '4px solid var(--color-primary)',
              fontSize: '0.88rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5
            }}>
              <strong>What is IEC 62353?</strong><br />
              Unlike <em>IEC 60601-1</em> (which is only for type-testing new devices at the factory), <strong>IEC 62353</strong> is the dedicated international standard governing medical equipment <strong>during its operational hospital lifespan</strong> — specifically before initial clinical deployment, during periodic preventive maintenance (PM), and immediately following any corrective breakdown repair or part replacement.
            </div>

            <h4 style={{ margin: '8px 0 4px 0', fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckSquare size={16} style={{ color: 'var(--color-primary)' }} />
              IEC 62353 Standardized Test Battery & Mandatory Hospital Limits
            </h4>

            {/* Limits Table */}
            <div className="table-responsive" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              <table className="table" style={{ margin: 0, fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-subtle)' }}>
                    <th style={{ width: '60px' }}>Step</th>
                    <th>Safety Test Item</th>
                    <th style={{ width: '130px' }}>Equipment Class</th>
                    <th style={{ width: '140px' }}>Acceptable Limit</th>
                    <th>Clinical Safety Rationale</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong className="badge badge-primary">E1</strong></td>
                    <td>
                      <strong>Visual Safety Inspection</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Mains plug pins, power cord, strain relief, chassis, fuses</div>
                    </td>
                    <td>All Devices</td>
                    <td><span className="badge badge-success">Pass / Fail</span></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Pre-test safeguard. Ensures no damaged insulation, liquid ingress, or bypassed fuses before applying high test voltages.
                    </td>
                  </tr>

                  <tr>
                    <td><strong className="badge badge-primary">E2</strong></td>
                    <td>
                      <strong>Protective Earth Resistance (PE)</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Plug PE pin to accessible chassis with test current ≥ 200 mA</div>
                    </td>
                    <td><strong>Class I</strong> only</td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#0284c7' }}>
                        ≤ 0.30 Ω
                      </span>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>(≤ 0.50 Ω ME Systems)</div>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Ensures ground path has low enough impedance to safely trigger hospital circuit breakers in case of internal insulation fault.
                    </td>
                  </tr>

                  <tr>
                    <td><strong className="badge badge-primary">E3</strong></td>
                    <td>
                      <strong>Insulation Resistance (500V DC)</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Mains conductors shorted to protective earth / casing</div>
                    </td>
                    <td>Class I & II</td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#10b981' }}>
                        ≥ 2.0 MΩ (Class I)<br />≥ 7.0 MΩ (Class II)
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Verifies primary dielectric barrier has not deteriorated due to heat, age, dust, or humidity.
                    </td>
                  </tr>

                  <tr>
                    <td><strong className="badge badge-primary">E4</strong></td>
                    <td>
                      <strong>Equipment Leakage Current</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Total leakage from mains circuit to accessible enclosure</div>
                    </td>
                    <td>Class I & II</td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#f59e0b' }}>
                        ≤ 500 µA (Class I)<br />≤ 100 µA (Class II)
                      </span>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>(Alt Method: ≤ 1000 µA)</div>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Prevents macro-shock hazard to operating room and ICU clinical personnel when touching equipment casing.
                    </td>
                  </tr>

                  <tr>
                    <td><strong className="badge badge-primary">E5</strong></td>
                    <td>
                      <strong>Applied Part Leakage (Type CF)</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Cardiac Floating leads (ECG, Defibrillator paddles, Pacemaker)</div>
                    </td>
                    <td><strong>Type CF</strong> (Cardiac)</td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#ef4444' }}>
                        ≤ 50 µA
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <strong>Critical Micro-shock Prevention:</strong> Direct myocardial contact can induce ventricular fibrillation with currents as low as 10–50 µA.
                    </td>
                  </tr>

                  <tr>
                    <td><strong className="badge badge-primary">E6</strong></td>
                    <td>
                      <strong>Applied Part Leakage (Type BF)</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Body Floating leads (SpO2, NIBP, Ultrasound, Ventilators, Incubators)</div>
                    </td>
                    <td><strong>Type BF</strong> (Body)</td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#8b5cf6' }}>
                        ≤ 5000 µA
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Ensures patient-applied electrodes or conductive attachments do not leak current into patient skin or tissue.
                    </td>
                  </tr>

                  <tr>
                    <td><strong className="badge badge-primary">E7</strong></td>
                    <td>
                      <strong>Post-Safety Clinical Release</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Re-power at nominal voltage, verify alarms, cut-offs & zeroing</div>
                    </td>
                    <td>All Devices</td>
                    <td><span className="badge badge-success">Pass / Fail</span></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Confirms device boots normally, indicators operate, and clinical interlocks function before patient handover.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '12px 16px', 
              backgroundColor: 'rgba(239, 68, 68, 0.08)', 
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 'var(--radius-md)'
            }}>
              <AlertTriangle size={24} style={{ color: '#ef4444', flexShrink: 0 }} />
              <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                <strong>Automated Tolerance Enforcement:</strong> In this application, when a biomedical engineer inputs a test reading into the Checklist Runner, any value exceeding these limits (e.g., Earth Resistance &gt; 0.30 Ω or CF Leakage &gt; 50 µA) is immediately flagged in red and marks the inspection as <strong>Failed - Immediate Attention Required</strong>.
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Testing Intervals & Schedules */}
        {activeTab === 'schedules' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ 
              backgroundColor: 'var(--bg-subtle)', 
              padding: '14px 18px', 
              borderRadius: 'var(--radius-md)',
              borderLeft: '4px solid #10b981',
              fontSize: '0.88rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5
            }}>
              <strong>When Must These Tests Be Carried Out?</strong><br />
              Both <strong>IEC 62353</strong> and <strong>WHO Medical Equipment Maintenance Guidelines</strong> mandate that testing cannot be a one-time activity. Testing must occur across <strong>4 distinct operational schedules</strong>:
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              
              {/* Daily / Shift */}
              <div className="card" style={{ padding: '16px', borderTop: '3px solid #3b82f6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Clock size={18} style={{ color: '#3b82f6' }} />
                  <h4 style={{ margin: 0, fontSize: '0.95rem' }}>1. Pre-Use / Shift Check</h4>
                </div>
                <div className="badge badge-primary" style={{ marginBottom: '8px' }}>Every Shift / Each Patient</div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                  <strong>Performed by:</strong> Clinical Staff (Nurses, Doctors, OT Technicians).
                </p>
                <ul style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, paddingLeft: '18px', lineHeight: 1.45 }}>
                  <li>Visual inspection of mains plug & leads</li>
                  <li>Power-on self test (POST) verification</li>
                  <li>Audible & visual alarm check</li>
                  <li>Battery charge readiness</li>
                  <li>Accessories & probe cleanliness</li>
                </ul>
              </div>

              {/* Quarterly */}
              <div className="card" style={{ padding: '16px', borderTop: '3px solid #ef4444' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Activity size={18} style={{ color: '#ef4444' }} />
                  <h4 style={{ margin: 0, fontSize: '0.95rem' }}>2. Quarterly Recurrent PM</h4>
                </div>
                <div className="badge badge-danger" style={{ marginBottom: '8px' }}>Every 3 Months (Quarterly)</div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                  <strong>Performed by:</strong> Certified Biomedical Engineer.
                </p>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  <strong>Applied to Critical Life Support (16 Types):</strong>
                </div>
                <ul style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, paddingLeft: '18px', lineHeight: 1.45 }}>
                  <li>ICU Ventilators & Anaesthesia Workstations</li>
                  <li>Defibrillators & Resuscitation Units</li>
                  <li>Haemodialysis & Blood Bank Refrigeration</li>
                  <li>Digital X-Ray, CT & MRI Scanners</li>
                  <li>Full IEC 62353 safety + output calibration</li>
                </ul>
              </div>

              {/* Semi-Annual */}
              <div className="card" style={{ padding: '16px', borderTop: '3px solid #f59e0b' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <HeartPulse size={18} style={{ color: '#f59e0b' }} />
                  <h4 style={{ margin: 0, fontSize: '0.95rem' }}>3. Semi-Annual PM</h4>
                </div>
                <div className="badge badge-warning" style={{ marginBottom: '8px' }}>Every 6 Months (Semi-Annual)</div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                  <strong>Performed by:</strong> Certified Biomedical Engineer.
                </p>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  <strong>Applied to High-Priority Therapeutic:</strong>
                </div>
                <ul style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, paddingLeft: '18px', lineHeight: 1.45 }}>
                  <li>Multiparameter Patient Monitors</li>
                  <li>Infusion & Syringe Pumps</li>
                  <li>Infant Incubators & Radiant Warmers</li>
                  <li>Electrosurgical Units (Diathermy)</li>
                  <li>Blood Gas Analysers</li>
                </ul>
              </div>

              {/* Annual & Post-Repair */}
              <div className="card" style={{ padding: '16px', borderTop: '3px solid #10b981' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <ShieldCheck size={18} style={{ color: '#10b981' }} />
                  <h4 style={{ margin: 0, fontSize: '0.95rem' }}>4. Annual & Post-Repair</h4>
                </div>
                <div className="badge badge-success" style={{ marginBottom: '8px' }}>Every 12 Months / After Repair</div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                  <strong>Performed by:</strong> Certified Biomedical Engineer.
                </p>
                <ul style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, paddingLeft: '18px', lineHeight: 1.45 }}>
                  <li><strong>Annual:</strong> Diagnostic tools, ultrasound, suction, lab centrifuges, hospital beds, lights</li>
                  <li><strong>Test After Repair:</strong> Mandatory after any board swap, motor repair, power supply replacement or chassis opening</li>
                  <li>Pass sticker renewal with valid expiry date</li>
                </ul>
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: WHO 3-Phase Framework */}
        {activeTab === 'who' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ 
              backgroundColor: 'var(--bg-subtle)', 
              padding: '14px 18px', 
              borderRadius: 'var(--radius-md)',
              borderLeft: '4px solid #ec4899',
              fontSize: '0.88rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5
            }}>
              <strong>WHO Medical Device Technical Series Governance</strong><br />
              This system implements the healthcare technology management principles published in the official World Health Organization documents stored in this project:
              <ul style={{ margin: '6px 0 0 0', paddingLeft: '20px', fontSize: '0.82rem' }}>
                <li><em>WHO 9789241501392:</em> Introduction to Medical Equipment Inventory Management</li>
                <li><em>WHO 9789241501538:</em> Medical Equipment Maintenance Programme Overview</li>
                <li><em>WHO 9789241501415:</em> Computerized Maintenance Management System (CMMS)</li>
              </ul>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              <div className="card" style={{ padding: '16px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--color-primary)', marginBottom: '4px' }}>
                  Phase 1: User Pre-Use / Routine Check
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Daily / Shift by Clinical Operators
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                  Focuses on external condition, transducer cables, display functionality, self-test verification, and basic zeroing. Empowers nursing staff to catch faults before patient hookup.
                </p>
              </div>

              <div className="card" style={{ padding: '16px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#10b981', marginBottom: '4px' }}>
                  Phase 2: Technical Preventive Maintenance (PM)
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Scheduled (3, 6, 12 Months) by Biomedical Engineers
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                  Comprehensive internal cleaning, dust filtration, battery capacity assessment, sensor recalibration, pneumatic pressure testing, and full IEC 62353 electrical safety measurements.
                </p>
              </div>

              <div className="card" style={{ padding: '16px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#f59e0b', marginBottom: '4px' }}>
                  Phase 3: Corrective Maintenance / Breakdown
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Triggered by Fault Tickets & Complaints
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                  Structured troubleshooting linked to standardized WHO complaint fault codes (CMP-001 through CMP-016). Requires mandatory post-repair electrical safety sign-off before closing ticket.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Implementation in this App */}
        {activeTab === 'cmms_impl' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ 
              backgroundColor: 'var(--bg-subtle)', 
              padding: '14px 18px', 
              borderRadius: 'var(--radius-md)',
              borderLeft: '4px solid var(--color-primary)',
              fontSize: '0.88rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5
            }}>
              <strong>Architecture & Features Implemented in this CMMS:</strong>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              <div className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Layers size={18} style={{ color: 'var(--color-primary)' }} />
                  <strong style={{ fontSize: '0.9rem' }}>63 Equipment Master Templates</strong>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                  Every hospital equipment category has a pre-configured template with risk score, protection class (Class I / II), and applied part classification (BF / CF).
                </p>
              </div>

              <div className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Zap size={18} style={{ color: '#10b981' }} />
                  <strong style={{ fontSize: '0.9rem' }}>Live Tolerance Engine</strong>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                  The Checklist Runner evaluates numeric entries in real time against IEC 62353 min/max limits. Out-of-bounds readings turn red and trigger corrective escalation.
                </p>
              </div>

              <div className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Calendar size={18} style={{ color: '#f59e0b' }} />
                  <strong style={{ fontSize: '0.9rem' }}>Automated PM Recalculation</strong>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                  Upon successful sign-off, the system calculates the exact `next_pm_due_date` (90, 180, or 365 days) and updates the equipment health status.
                </p>
              </div>

              <div className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <FileText size={18} style={{ color: '#ec4899' }} />
                  <strong style={{ fontSize: '0.9rem' }}>Audit-Ready Passports & PDF</strong>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                  Instant export of official Asset Passports and Calibration / Electrical Safety Certificates meeting JCI, NHRA, CBAHI, and ISO 13485 auditor requirements.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close Specifications
          </button>
        </div>

      </div>
    </Modal>
  );
}
