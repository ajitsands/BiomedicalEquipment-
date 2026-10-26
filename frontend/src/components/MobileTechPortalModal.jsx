import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { 
  fetchMyAssignedTasks, 
  scanEquipmentByQr, 
  fetchChecklistTemplates, 
  submitPmPhase,
  uploadPaperWorksheetPhoto
} from '../services/api';
import confetti from 'canvas-confetti';
import { 
  Smartphone, 
  QrCode, 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  UserCheck, 
  Zap, 
  Wrench, 
  FileText, 
  Upload, 
  Image as ImageIcon,
  CheckSquare, 
  RefreshCw,
  Search,
  User,
  ArrowRight,
  XCircle,
  X
} from 'lucide-react';

export default function MobileTechPortalModal({
  isOpen,
  onClose,
  onShowToast,
  onOpenPrintWorksheet
}) {
  const { currentUser, allEmployees, switchUser } = useAuth();
  const { formatDate } = useSettings();

  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks', 'scan', 'runner'
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // My Tasks
  const [myTasks, setMyTasks] = useState([]);
  const [taskSummary, setTaskSummary] = useState({ total: 0, pending: 0, completed: 0 });

  // Camera QR Scanner State
  const videoRef = useRef(null);
  const qrFileInputRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [manualQrInput, setManualQrInput] = useState('');
  const [searchingQr, setSearchingQr] = useState(false);

  // Active Runner State
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [activeEquipment, setActiveEquipment] = useState(null);
  const [phaseItems, setPhaseItems] = useState([]);
  const [answers, setAnswers] = useState({});
  const [engineerNotes, setEngineerNotes] = useState('');
  const [paperPhotoFile, setPaperPhotoFile] = useState(null);
  const [paperPhotoPreview, setPaperPhotoPreview] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadedPaperUrl, setUploadedPaperUrl] = useState(null);
  const [useTouchSign, setUseTouchSign] = useState(false);

  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Load My Tasks when open or user changes
  useEffect(() => {
    if (isOpen) {
      loadMyTasks();
    }
  }, [isOpen, currentUser]);

  const loadMyTasks = async () => {
    try {
      setLoading(true);
      const empId = currentUser?.id || null;
      const badge = currentUser?.employee_code || null;
      const res = await fetchMyAssignedTasks(empId, badge, 'ALL');
      if (res && res.status === 'success') {
        setMyTasks(res.data.tasks || []);
        setTaskSummary({
          total: res.data.total_tasks || 0,
          pending: res.data.pending_count || 0,
          completed: res.data.completed_count || 0
        });
      }
    } catch (err) {
      console.warn('Error loading my tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Camera QR Code Stream & Barcode Detection
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (activeTab === 'scan' && isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [activeTab, isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      // Check if navigator.mediaDevices is supported (insecure HTTP on mobile IP disables this)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        throw new Error(
          !isLocal
            ? 'Live camera preview requires HTTPS on mobile networks. Tap "📸 Snap QR with Phone Camera" below.'
            : 'Camera access not supported on this browser'
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('webkit-playsinline', 'true');
        videoRef.current.muted = true;
        videoRef.current.defaultMuted = true;
        await videoRef.current.play().catch(e => console.warn('Video play caught:', e));
        setCameraActive(true);

        // Native BarcodeDetector loop if supported (Chrome on Android)
        if ('BarcodeDetector' in window) {
          try {
            const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code', 'code_128', 'ean_13'] });
            scanIntervalRef.current = setInterval(async () => {
              if (videoRef.current && videoRef.current.readyState >= 2) {
                try {
                  const codes = await barcodeDetector.detect(videoRef.current);
                  if (codes && codes.length > 0 && codes[0].rawValue) {
                    clearInterval(scanIntervalRef.current);
                    stopCamera();
                    handleResolveQr(codes[0].rawValue);
                  }
                } catch {
                  // ignore frame detect error
                }
              }
            }, 500);
          } catch (e) {
            console.log('Barcode detector setup:', e);
          }
        }
      }
    } catch (err) {
      console.warn('Camera error:', err);
      setCameraError(err.message || 'Unable to access device camera');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Direct Phone Camera Snap handler (Works 100% reliably even over plain HTTP on LAN)
  const handleQrPhotoCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Attempt client-side QR recognition if BarcodeDetector is available
      if ('BarcodeDetector' in window) {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await img.decode();
        const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code', 'code_128', 'ean_13'] });
        const codes = await barcodeDetector.detect(img);
        if (codes && codes.length > 0 && codes[0].rawValue) {
          if (onShowToast) onShowToast({ type: 'success', title: 'QR Detected', message: `Token: ${codes[0].rawValue}` });
          handleResolveQr(codes[0].rawValue);
          return;
        }
      }
    } catch (detectErr) {
      console.warn('Photo barcode error:', detectErr);
    }

    // Fallback: If not decoded, prompt technician to tap their device from the list
    if (onShowToast) {
      onShowToast({
        type: 'info',
        title: 'Photo Captured',
        message: 'Tap your device directly from the list below to start phase inspection.'
      });
    }
  };

  const handleResolveQr = async (token) => {
    const cleanToken = (token || manualQrInput).trim();
    if (!cleanToken) {
      if (onShowToast) onShowToast({ type: 'warning', title: 'Required', message: 'Enter or scan asset QR code' });
      return;
    }

    try {
      setSearchingQr(true);
      const res = await scanEquipmentByQr(cleanToken);
      if (res && res.status === 'success') {
        stopCamera();
        const eq = res.data.equipment;
        const phases = res.data.phases || [];
        
        // Find phase assigned to current user, or the first pending phase
        let targetPhase = phases.find(p => p.assigned_employee_id === currentUser?.id || p.assigned_employee_badge === currentUser?.employee_code);
        if (!targetPhase) {
          targetPhase = phases.find(p => p.status !== 'Completed') || phases[0];
        }

        if (targetPhase) {
          startPhaseInspection(targetPhase, eq);
        } else {
          if (onShowToast) onShowToast({ type: 'info', title: 'Asset Found', message: `Device: ${eq.name} (${eq.asset_id})` });
        }
      }
    } catch (err) {
      if (onShowToast) onShowToast({ type: 'error', title: 'QR Scan Error', message: err.message });
    } finally {
      setSearchingQr(false);
    }
  };

  // --------------------------------------------------------------------------
  // Start Phase Inspection
  // --------------------------------------------------------------------------
  const startPhaseInspection = async (task, eqObj = null) => {
    try {
      setLoading(true);
      setActiveAssignment(task);
      const equipment = eqObj || {
        id: task.equipment_id,
        asset_id: task.asset_id,
        name: task.equipment_name,
        brand: task.brand,
        model_number: task.model_number,
        serial_number: task.serial_number,
        department_name: task.department_name,
        equipment_type_id: task.equipment_type_id
      };
      setActiveEquipment(equipment);

      // Fetch template items
      const res = await fetchChecklistTemplates(false, equipment.equipment_type_id || null);
      const allItems = res.items || [];

      // Filter for this specific phase
      const filtered = allItems.filter(item => {
        if (task.phase_key === 'PRE_USE') return item.checklist_phase === 'User pre-use / routine check';
        if (task.phase_key === 'PM_TECH') return item.checklist_phase === 'Preventive maintenance / technical inspection' && item.category !== 'Electrical Safety Test';
        if (task.phase_key === 'ELECTRICAL') return item.checklist_phase === 'Electrical Safety (IEC 62353)' || item.category === 'Electrical Safety Test';
        if (task.phase_key === 'CORRECTIVE') return item.checklist_phase === 'Complaint / corrective maintenance';
        return true;
      });

      setPhaseItems(filtered);

      // Initial answers (Default null - user MUST explicitly click Pass, Fail, or N/A)
      const init = {};
      filtered.forEach(it => {
        init[it.id] = {
          status: null,
          measuredValue: '',
          remarks: ''
        };
      });
      setAnswers(init);
      setEngineerNotes(task.engineer_notes || '');
      setPaperPhotoPreview(task.paper_scanned_photo_url || null);
      setUploadedPaperUrl(task.paper_scanned_photo_url || null);

      setActiveTab('runner');
    } catch (err) {
      if (onShowToast) onShowToast({ type: 'error', title: 'Error', message: 'Failed to load phase checklist' });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (itemId, newStatus) => {
    setAnswers(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], status: newStatus }
    }));
  };

  const handleValueChange = (itemId, val, item) => {
    let currentStatus = answers[itemId]?.status || null;
    if (item.check_type === 'numeric' && val !== '') {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        if ((item.min_value !== null && num < item.min_value) || (item.max_value !== null && num > item.max_value)) {
          currentStatus = 'Fail';
        } else if (!currentStatus) {
          currentStatus = 'Pass';
        }
      }
    }
    setAnswers(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], measuredValue: val, status: currentStatus }
    }));
  };

  // --------------------------------------------------------------------------
  // Camera Photograph of Physical Paper Worksheet
  // --------------------------------------------------------------------------
  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPaperPhotoFile(file);
    const localPreview = URL.createObjectURL(file);
    setPaperPhotoPreview(localPreview);

    // Auto upload
    try {
      setUploadingPhoto(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('equipment_id', activeEquipment?.id || activeAssignment?.equipment_id || 0);
      formData.append('pm_assignment_id', activeAssignment?.id || 0);
      formData.append('document_type', 'Calibration Certificate');
      formData.append('file_title', `Signed Worksheet - ${activeAssignment?.phase_name || 'PM Phase'}`);

      const res = await uploadPaperWorksheetPhoto(formData);
      if (res && res.file_path) {
        setUploadedPaperUrl(res.file_path);
        if (onShowToast) {
          onShowToast({
            type: 'success',
            title: 'Paper Photo Attached',
            message: 'Signed worksheet photographed and linked to this PM record!'
          });
        }
      }
    } catch (err) {
      if (onShowToast) onShowToast({ type: 'error', title: 'Upload Failed', message: err.message });
    } finally {
      setUploadingPhoto(false);
    }
  };

  // --------------------------------------------------------------------------
  // Submit Completed Phase
  // --------------------------------------------------------------------------
  const handleSubmitPhase = async () => {
    // Validate: ALL items must have a status chosen (Pass, Fail, or N/A)
    const unselected = phaseItems.filter(it => !answers[it.id] || answers[it.id].status === null || answers[it.id].status === undefined);
    if (unselected.length > 0) {
      if (onShowToast) {
        onShowToast({
          type: 'warning',
          title: 'Evaluation Incomplete',
          message: `Please select Pass, Fail, or N/A for all ${phaseItems.length} items. (${unselected.length} items still not selected).`
        });
      }
      const firstEl = document.getElementById(`step-card-${unselected[0].id}`);
      if (firstEl) {
        firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        assignment_id: activeAssignment?.id,
        equipment_id: activeEquipment?.id || activeAssignment?.equipment_id,
        phase_key: activeAssignment?.phase_key,
        completed_by: currentUser?.full_name || 'Biomedical Engineer',
        technician_badge: currentUser?.employee_code || 'SAND-BME-01',
        signature_data: useTouchSign ? 'DIGITAL_TOUCH_SIGNATURE_VERIFIED' : `BADGE_CONFIRMED_${currentUser?.employee_code || 'BME'}`,
        paper_scanned_photo_url: uploadedPaperUrl,
        engineer_notes: engineerNotes,
        items_answers: Object.entries(answers).map(([id, a]) => ({
          checklist_item_id: Number(id),
          status: a.status,
          measured_value: a.measuredValue,
          remarks: a.remarks
        }))
      };

      const res = await submitPmPhase(payload);

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });

      if (onShowToast) {
        onShowToast({
          type: 'success',
          title: 'Phase Completed!',
          message: res.data?.all_phases_completed
            ? `All 4 phases complete! Master PM Work Order: ${res.data.work_order_no}`
            : `Phase verified successfully (${res.data.completed_phases} of ${res.data.total_phases} phases done)`
        });
      }

      // Refresh tasks and return to tasks tab
      loadMyTasks();
      setActiveTab('tasks');
      setActiveAssignment(null);
    } catch (err) {
      if (onShowToast) onShowToast({ type: 'error', title: 'Submit Failed', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mobile Biomedical Tech Portal & Field Runner"
      icon={Smartphone}
      size="lg"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Logged in: <strong>{currentUser?.full_name || 'Technician'}</strong> ({currentUser?.role || 'Staff'})
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Close Portal
          </button>
        </div>
      }
    >
      {/* Active Staff Bar & Tab Switcher */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(14, 165, 233, 0.04) 100%)',
        border: '1px solid rgba(2, 132, 199, 0.2)',
        borderRadius: '10px',
        padding: '10px 14px',
        marginBottom: '14px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            borderRadius: '50%', 
            background: '#0284c7', 
            color: '#fff', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '12px'
          }}>
            {currentUser?.full_name?.slice(0, 2)?.toUpperCase() || 'BM'}
          </div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {currentUser?.full_name || 'Field Technician'}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Badge: <code>{currentUser?.employee_code || 'STAFF'}</code> • {currentUser?.designation || currentUser?.role || 'Technician'}
            </div>
          </div>
        </div>

        {/* Quick Staff Switcher Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Switch:</span>
          <select
            className="form-control"
            style={{ fontSize: '0.78rem', padding: '4px 8px', maxWidth: '170px' }}
            value={currentUser?.id || ''}
            onChange={(e) => {
              const emp = allEmployees.find(em => String(em.id) === String(e.target.value));
              if (emp) switchUser(emp);
            }}
          >
            {allEmployees.map(e => (
              <option key={e.id} value={e.id}>
                {e.full_name} ({e.role})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mobile Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'tasks' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('tasks')}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <CheckSquare size={14} />
          <span>My Tasks ({taskSummary.pending} Due)</span>
        </button>

        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'scan' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('scan')}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <QrCode size={14} />
          <span>Scan Asset QR</span>
        </button>

        {activeAssignment && (
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'runner' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('runner')}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Zap size={14} />
            <span>Active Phase</span>
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: MY ASSIGNED TASKS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'tasks' && (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
              <RefreshCw className="spin" size={24} style={{ margin: '0 auto 8px' }} />
              <div>Loading your assigned tasks...</div>
            </div>
          ) : myTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 20px', background: 'var(--card-bg, #f8fafc)', borderRadius: '8px' }}>
              <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>No pending tasks assigned to you</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                You have verified all assigned PM phases or Admin has not assigned new jobs for your badge today.
              </p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setActiveTab('scan')}
                style={{ marginTop: '10px' }}
              >
                <QrCode size={13} style={{ marginRight: '4px' }} /> Scan Equipment QR
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {myTasks.map((task) => {
                const isDone = task.status === 'Completed';

                return (
                  <div
                    key={task.id}
                    style={{
                      background: 'var(--card-bg, #fff)',
                      border: `1px solid ${isDone ? '#10b981' : 'var(--border-color, #e2e8f0)'}`,
                      borderLeft: `4px solid ${isDone ? '#10b981' : '#0284c7'}`,
                      borderRadius: '8px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ 
                          fontSize: '0.72rem', 
                          fontWeight: 700, 
                          padding: '2px 8px', 
                          borderRadius: '10px',
                          background: isDone ? '#10b98122' : '#0284c722',
                          color: isDone ? '#059669' : '#0284c7'
                        }}>
                          {task.phase_name}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Due: {formatDate(task.pm_due_date)}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.98rem', fontWeight: 800, marginTop: '4px', color: 'var(--text-primary)' }}>
                        {task.equipment_name} ({task.asset_id})
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        📍 {task.department_name} • {task.brand} {task.model_number} • SN: {task.serial_number || 'N/A'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {/* Print A4 Worksheet button if tech cannot carry phone into OT */}
                      {onOpenPrintWorksheet && (
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => {
                            onOpenPrintWorksheet(task, task.pm_due_date, task.phase_key, {
                              name: task.assigned_employee_name,
                              badge: task.assigned_employee_badge
                            });
                          }}
                          title="Print A4 paper worksheet for sterile room"
                          style={{ fontSize: '0.76rem', padding: '4px 8px' }}
                        >
                          <FileText size={13} />
                          <span>A4 Paper</span>
                        </button>
                      )}

                      <button
                        type="button"
                        className={`btn btn-sm ${isDone ? 'btn-secondary' : 'btn-primary'}`}
                        onClick={() => startPhaseInspection(task)}
                        style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        {isDone ? (
                          <>
                            <CheckCircle2 size={13} color="#059669" />
                            <span>Verified</span>
                          </>
                        ) : (
                          <>
                            <ArrowRight size={13} />
                            <span>Start Inspection</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: CAMERA QR SCANNER & 1-TAP ASSET SELECTOR */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'scan' && (
        <div>
          {/* Native Mobile Camera Snap Input (Runs directly on phone camera app) */}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={qrFileInputRef}
            style={{ display: 'none' }}
            onChange={handleQrPhotoCapture}
          />

          {/* Primary Action: Direct Smartphone Camera Snap */}
          <div style={{ marginBottom: '14px', textAlign: 'center' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => qrFileInputRef.current?.click()}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '0.96rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                borderRadius: '8px',
                boxShadow: '0 3px 10px rgba(2, 132, 199, 0.3)'
              }}
            >
              <Camera size={19} />
              <span>📸 Open Phone Camera to Scan</span>
            </button>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Opens your smartphone camera to take a photo of the physical asset QR tag
            </div>
          </div>

          {/* Live Video Preview Box (WebRTC) */}
          <div style={{ 
            background: '#0f172a', 
            borderRadius: '12px', 
            overflow: 'hidden', 
            position: 'relative', 
            minHeight: '230px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '14px',
            border: '2px solid #0284c7'
          }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                maxHeight: '280px',
                objectFit: 'cover'
              }}
            />

            {/* Viewfinder Target Frame */}
            <div style={{
              position: 'absolute',
              width: '160px',
              height: '160px',
              border: '2px solid rgba(2, 132, 199, 0.85)',
              borderRadius: '12px',
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none'
            }}>
              <div style={{ width: '100%', height: '2px', background: '#0284c7', opacity: 0.8 }} />
            </div>

            {cameraError && (
              <div style={{ position: 'absolute', color: '#fff', padding: '16px', fontSize: '0.82rem', textAlign: 'center', maxWidth: '320px' }}>
                <Camera size={28} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontWeight: 600 }}>Camera Stream Notice</div>
                <div style={{ fontSize: '0.74rem', color: '#cbd5e1', marginTop: '4px', lineHeight: 1.35 }}>
                  {cameraError}
                </div>
              </div>
            )}
          </div>

          {/* Manual QR / Asset ID Search */}
          <div style={{ display: 'flex', gap: '8px', maxWidth: '440px', margin: '0 auto 20px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Enter QR token or Asset ID (e.g. BME-ICU-VENT-001)"
              value={manualQrInput}
              onChange={(e) => setManualQrInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleResolveQr()}
              style={{ fontSize: '0.84rem' }}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleResolveQr()}
              disabled={searchingQr}
              style={{ flexShrink: 0, fontSize: '0.84rem' }}
            >
              {searchingQr ? 'Searching...' : 'Lookup'}
            </button>
          </div>

          {/* ⚡ Quick Select Today's Assigned Equipment (No Camera Needed) */}
          <div style={{ 
            background: 'var(--bg-subtle, #f8fafc)', 
            border: '1px solid var(--border-color, #e2e8f0)', 
            borderRadius: '10px', 
            padding: '12px 14px' 
          }}>
            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={15} color="#0284c7" />
              <span>⚡ Quick Select Assigned Equipment (1-Tap Runner)</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
              If in hospital ward without QR scanner, tap your device directly below to start:
            </div>

            {myTasks.length === 0 ? (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '8px' }}>
                No active tasks assigned to your badge today.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {myTasks.map(task => {
                  const isDone = task.status === 'Completed';
                  return (
                    <div
                      key={task.id}
                      style={{
                        background: 'var(--bg-surface, #fff)',
                        border: '1px solid var(--border-color, #e2e8f0)',
                        borderLeft: `3px solid ${isDone ? '#10b981' : '#0284c7'}`,
                        borderRadius: '6px',
                        padding: '8px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {task.equipment_name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          <code>{task.asset_id}</code> • {task.phase_name} • 📍 {task.department_name}
                        </div>
                      </div>

                      <button
                        type="button"
                        className={`btn btn-xs ${isDone ? 'btn-secondary' : 'btn-primary'}`}
                        onClick={() => startPhaseInspection(task)}
                        style={{ fontSize: '0.75rem', padding: '4px 10px', flexShrink: 0 }}
                      >
                        {isDone ? 'View' : 'Run'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: STEP-BY-STEP PHASE RUNNER & PHOTO ATTACHMENT */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'runner' && activeAssignment && (() => {
        const totalItemsCount = phaseItems.length;
        const passItemsCount = phaseItems.filter(it => answers[it.id]?.status === 'Pass').length;
        const failItemsCount = phaseItems.filter(it => answers[it.id]?.status === 'Fail').length;
        const naItemsCount = phaseItems.filter(it => answers[it.id]?.status === 'N/A').length;
        const evaluatedItemsCount = passItemsCount + failItemsCount + naItemsCount;
        const pendingItemsCount = totalItemsCount - evaluatedItemsCount;
        const isAllEvaluated = totalItemsCount > 0 && pendingItemsCount === 0;

        return (
          <div>
            {/* Header */}
            <div style={{
              background: 'var(--card-bg, #f8fafc)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '8px',
              padding: '12px 14px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Executing: {activeAssignment.phase_name}
                </span>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {activeEquipment?.name} ({activeEquipment?.asset_id})
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  📍 {activeEquipment?.department_name} • {activeEquipment?.brand} {activeEquipment?.model_number}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                {onOpenPrintWorksheet && (
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => {
                      onOpenPrintWorksheet(activeEquipment, activeAssignment.pm_due_date, activeAssignment.phase_key);
                    }}
                    title="Print A4 paper worksheet"
                    style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <FileText size={13} />
                    <span>Print A4</span>
                  </button>
                )}
              </div>
            </div>

            {/* Live Progress & Selection Status Banner */}
            <div style={{
              background: isAllEvaluated ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
              border: `1px solid ${isAllEvaluated ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              <div>
                <div style={{ 
                  fontSize: '0.86rem', 
                  fontWeight: 800, 
                  color: isAllEvaluated ? '#059669' : '#b45309',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  {isAllEvaluated ? (
                    <>
                      <CheckCircle2 size={16} color="#059669" />
                      <span>All Items Evaluated ({evaluatedItemsCount}/{totalItemsCount})</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={16} color="#d97706" />
                      <span>Decision Required on All Items ({evaluatedItemsCount}/{totalItemsCount} Done)</span>
                    </>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {pendingItemsCount > 0 
                    ? `Tap Pass, Fail, or N/A for each item below. (${pendingItemsCount} item${pendingItemsCount > 1 ? 's' : ''} remaining)` 
                    : `Ready to sign off: ${passItemsCount} Pass, ${failItemsCount} Fail, ${naItemsCount} N/A.`}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '5px' }}>
                <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>{passItemsCount} Pass</span>
                <span className="badge badge-danger" style={{ fontSize: '0.72rem' }}>{failItemsCount} Fail</span>
                <span className="badge badge-secondary" style={{ fontSize: '0.72rem' }}>{naItemsCount} N/A</span>
              </div>
            </div>

            {/* Checklist Items list - Responsive Mobile Touch Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {phaseItems.map((item, idx) => {
                const ans = answers[item.id] || { status: null, measuredValue: '', remarks: '' };
                const isNumeric = item.check_type === 'numeric';
                const isUnselected = ans.status === null || ans.status === undefined;

                const cardBorderLeft = isUnselected
                  ? '4px solid #f59e0b'
                  : ans.status === 'Pass'
                  ? '4px solid #10b981'
                  : ans.status === 'Fail'
                  ? '4px solid #ef4444'
                  : '4px solid #64748b';

                return (
                  <div
                    key={item.id}
                    id={`step-card-${item.id}`}
                    className="checklist-item-card"
                    style={{
                      background: 'var(--bg-surface, #fff)',
                      border: '1px solid var(--border-color, #e2e8f0)',
                      borderLeft: cardBorderLeft,
                      borderRadius: '8px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      boxShadow: isUnselected ? '0 1px 3px rgba(245, 158, 11, 0.08)' : '0 1px 3px rgba(0,0,0,0.03)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* Item Title & Acceptance Standard */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.35 }}>
                          <span style={{ 
                            color: '#0284c7', 
                            fontWeight: 800,
                            background: 'rgba(2, 132, 199, 0.08)',
                            padding: '2px 7px',
                            borderRadius: '5px',
                            marginRight: '6px',
                            fontSize: '0.8rem'
                          }}>
                            #{item.step_number || idx + 1}
                          </span>
                          {item.title}
                        </div>

                        {item.expected_result && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.35 }}>
                            <strong>Acceptance Standard:</strong> {item.expected_result}
                          </div>
                        )}
                      </div>

                      {/* Status indicator tag */}
                      {isUnselected && (
                        <span style={{ 
                          fontSize: '0.72rem', 
                          color: '#b45309', 
                          background: '#fef3c7', 
                          border: '1px solid #fde68a',
                          padding: '2px 6px', 
                          borderRadius: '4px', 
                          fontWeight: 700,
                          flexShrink: 0
                        }}>
                          Select One
                        </span>
                      )}
                    </div>

                    {/* Reading box for numeric tests */}
                    {isNumeric && (
                      <div style={{ 
                        marginTop: '2px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        background: 'var(--bg-subtle, #f8fafc)',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color, #e2e8f0)'
                      }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Measured Reading:</span>
                        <input
                          type="number"
                          step="any"
                          className="form-control"
                          style={{ width: '110px', padding: '4px 8px', fontSize: '0.84rem' }}
                          placeholder="Reading"
                          value={ans.measuredValue}
                          onChange={(e) => handleValueChange(item.id, e.target.value, item)}
                        />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                          {item.unit || 'units'}
                        </span>
                      </div>
                    )}

                    {/* Responsive Full-Width 3-Button Touch Grid (Pass / Fail / N/A) */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: '6px',
                      width: '100%',
                      marginTop: '4px'
                    }}>
                      <button
                        type="button"
                        className={`toggle-btn pass ${ans.status === 'Pass' ? 'active' : ''}`}
                        onClick={() => handleStatusChange(item.id, 'Pass')}
                        style={{
                          padding: '9px 8px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          minHeight: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          border: ans.status === 'Pass' ? '2px solid #059669' : '1px solid var(--border-color, #cbd5e1)',
                          background: ans.status === 'Pass' ? '#10b981' : 'var(--bg-surface, #ffffff)',
                          color: ans.status === 'Pass' ? '#ffffff' : 'var(--text-primary, #334155)',
                          boxShadow: ans.status === 'Pass' ? '0 2px 6px rgba(16, 185, 129, 0.35)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        Pass
                      </button>

                      <button
                        type="button"
                        className={`toggle-btn fail ${ans.status === 'Fail' ? 'active' : ''}`}
                        onClick={() => handleStatusChange(item.id, 'Fail')}
                        style={{
                          padding: '9px 8px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          minHeight: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          border: ans.status === 'Fail' ? '2px solid #dc2626' : '1px solid var(--border-color, #cbd5e1)',
                          background: ans.status === 'Fail' ? '#ef4444' : 'var(--bg-surface, #ffffff)',
                          color: ans.status === 'Fail' ? '#ffffff' : 'var(--text-primary, #334155)',
                          boxShadow: ans.status === 'Fail' ? '0 2px 6px rgba(239, 68, 68, 0.35)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        Fail
                      </button>

                      <button
                        type="button"
                        className={`toggle-btn na ${ans.status === 'N/A' ? 'active' : ''}`}
                        onClick={() => handleStatusChange(item.id, 'N/A')}
                        style={{
                          padding: '9px 8px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          minHeight: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          border: ans.status === 'N/A' ? '2px solid #475569' : '1px solid var(--border-color, #cbd5e1)',
                          background: ans.status === 'N/A' ? '#64748b' : 'var(--bg-surface, #ffffff)',
                          color: ans.status === 'N/A' ? '#ffffff' : 'var(--text-primary, #334155)',
                          boxShadow: ans.status === 'N/A' ? '0 2px 6px rgba(100, 116, 139, 0.35)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        N/A
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ------------------------------------------------------------- */}
            {/* CAMERA PAPER WORKSHEET UPLOAD (Sterile Area Photo Attachment) */}
            {/* ------------------------------------------------------------- */}
            <div style={{
              background: 'rgba(2, 132, 199, 0.05)',
              border: '1px dashed rgba(2, 132, 199, 0.4)',
              borderRadius: '8px',
              padding: '12px 14px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Camera size={16} />
                    <span>Attach Photo of Signed Physical Paper (When leaving sterile area)</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    If phones were restricted in OT/ICU, take a photo of the signed A4 paper now to archive.
                  </div>
                </div>

                <div>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handlePhotoSelect}
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Camera size={14} color="#0284c7" />
                    <span>{uploadingPhoto ? 'Uploading...' : 'Take Photo of Paper'}</span>
                  </button>
                </div>
              </div>

              {/* Thumbnail Preview of Captured Paper */}
              {paperPhotoPreview && (
                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img
                    src={paperPhotoPreview}
                    alt="Signed Paper Preview"
                    style={{
                      width: '60px',
                      height: '75px',
                      objectFit: 'cover',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1'
                    }}
                  />
                  <div style={{ fontSize: '0.76rem', color: '#059669', fontWeight: 600 }}>
                    ✓ Signed physical paper attached to this PM record!
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Technician Observations & Findings</label>
              <textarea
                className="form-control"
                rows={2}
                value={engineerNotes}
                onChange={(e) => setEngineerNotes(e.target.value)}
                placeholder="e.g. Cleaned filters, lubricated joints, calibrated sensors, satisfactory condition."
              />
            </div>

            {/* Submit Button */}
            <button
              type="button"
              className={`btn ${isAllEvaluated ? 'btn-primary' : 'btn-warning'}`}
              onClick={handleSubmitPhase}
              disabled={submitting}
              style={{ 
                width: '100%', 
                padding: '12px 16px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px', 
                fontWeight: 700,
                fontSize: '0.94rem',
                borderRadius: '8px'
              }}
            >
              <CheckCircle2 size={17} />
              <span>
                {submitting 
                  ? 'Submitting Verification...' 
                  : isAllEvaluated 
                  ? `Sign-Off & Complete ${activeAssignment.phase_name}` 
                  : `Complete All Items to Sign-Off (${pendingItemsCount} Unselected)`}
              </span>
            </button>
          </div>
        );
      })()}
    </Modal>
  );
}
