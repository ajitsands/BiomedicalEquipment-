import React, { useState, useEffect, useRef } from 'react';
import { 
  fetchEquipments, 
  fetchDepartments, 
  fetchRfidLogs,
  fetchDahuaStatus,
  pollDahuaReader,
  triggerDahuaTap,
  setEquipmentTransitStatus,
  fetchReaders,
  assignReaderDepartment,
  deleteReader
} from '../services/api';
import { 
  Radio, 
  MapPin, 
  Building2, 
  Scan, 
  Layers, 
  Activity, 
  Search, 
  CheckCircle2, 
  Clock,
  Wifi,
  ArrowRightLeft,
  DoorOpen,
  DoorClosed,
  RefreshCw,
  Sliders,
  ShieldCheck,
  AlertCircle,
  Plus,
  Cpu,
  Trash2,
  X,
  ExternalLink,
  Check
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import NewReaderModal from '../components/NewReaderModal';
import AssignControllersModal from '../components/AssignControllersModal';

export default function RfidView({
  onViewPassport,
  onOpenRfidScanner,
  onShowToast,
  refreshKey = 0
}) {
  const { formatDateTime } = useSettings();
  const [activeTab, setActiveTab] = useState('controllers'); // 'controllers' | 'departments' | 'telemetry'
  const [equipments, setEquipments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [rfidLogs, setRfidLogs] = useState([]);
  const [readers, setReaders] = useState([]);
  const [dahuaData, setDahuaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');
  const [controllerFilter, setControllerFilter] = useState('');
  const [autoPoll, setAutoPoll] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTapping, setIsTapping] = useState(false);
  const [isNewReaderModalOpen, setIsNewReaderModalOpen] = useState(false);
  const [mappingDept, setMappingDept] = useState(null);
  const autoPollRef = useRef(autoPoll);

  useEffect(() => {
    autoPollRef.current = autoPoll;
  }, [autoPoll]);

  // Initial Load
  useEffect(() => {
    loadRfidData();
  }, [refreshKey]);

  // Real-time Polling Loop (Every 3 seconds) for live Dahua swipes & telemetry
  useEffect(() => {
    const timer = setInterval(() => {
      if (autoPollRef.current) {
        syncTelemetrySilently();
      }
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const loadRfidData = async () => {
    try {
      setLoading(true);
      const [eqRes, deptRes, logRes, dahuaRes, readersRes] = await Promise.all([
        fetchEquipments(),
        fetchDepartments(),
        fetchRfidLogs(),
        fetchDahuaStatus().catch(() => ({ reader: { is_online: false } })),
        fetchReaders().catch(() => ({ data: [] }))
      ]);
      setEquipments(eqRes.data || []);
      setDepartments(deptRes.data || []);
      setRfidLogs(logRes.data || []);
      setDahuaData(dahuaRes || null);
      setReaders(readersRes.data || []);
    } catch (err) {
      onShowToast && onShowToast({ type: 'error', title: 'Error', message: 'Failed to load RFID telemetry' });
    } finally {
      setLoading(false);
    }
  };

  const syncTelemetrySilently = async () => {
    try {
      // 1. Poll Dahua reader for any new hardware swipes
      const pollRes = await pollDahuaReader().catch(() => null);
      if (pollRes && pollRes.synced_event) {
        onShowToast && onShowToast({
          type: 'info',
          title: `RFID Reader Tap: ${pollRes.synced_event.direction}`,
          message: `${pollRes.synced_event.name} is now ${pollRes.synced_event.direction} (${pollRes.synced_event.room})`
        });
      }

      // 2. Fetch fresh logs, equipment locations, and reader nodes
      const [logRes, eqRes, dahuaRes, readersRes] = await Promise.all([
        fetchRfidLogs(),
        fetchEquipments(),
        fetchDahuaStatus().catch(() => null),
        fetchReaders().catch(() => null)
      ]);
      if (logRes && logRes.data) setRfidLogs(logRes.data);
      if (eqRes && eqRes.data) setEquipments(eqRes.data);
      if (dahuaRes) setDahuaData(dahuaRes);
      if (readersRes && readersRes.data) setReaders(readersRes.data);
    } catch (err) {
      // silent background failure
    }
  };

  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      await syncTelemetrySilently();
      onShowToast && onShowToast({ type: 'success', title: 'Telemetry Synced', message: 'RFID Gateway and Access Controllers synchronized successfully.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTriggerDahuaTap = async (card = '6F4244DB') => {
    try {
      setIsTapping(true);
      const res = await triggerDahuaTap(card);
      onShowToast && onShowToast({
        type: 'success',
        title: `Dahua Swipe Processed (${res.movement_direction})`,
        message: res.message
      });
      // Refresh state immediately
      await loadRfidData();
    } catch (err) {
      onShowToast && onShowToast({
        type: 'error',
        title: 'Swipe Failed',
        message: err.message || 'Could not process Dahua RFID swipe'
      });
    } finally {
      setIsTapping(false);
    }
  };

  const handleToggleAssetStatus = async (eqId, targetDirection, eqName) => {
    try {
      await setEquipmentTransitStatus(eqId, targetDirection);
      onShowToast && onShowToast({
        type: 'success',
        title: `Status Updated (${targetDirection})`,
        message: `${eqName || 'Asset'} is now marked ${targetDirection === 'IN' ? '🟢 IN Department' : '🟠 OUT / In Transit'}`
      });
      await loadRfidData();
    } catch (err) {
      onShowToast && onShowToast({
        type: 'error',
        title: 'Status Update Failed',
        message: err.message || 'Could not update asset presence status'
      });
    }
  };

  const handleAssignReader = async (readerId, departmentId) => {
    try {
      const deptIdVal = departmentId ? Number(departmentId) : null;
      await assignReaderDepartment(readerId, deptIdVal);
      onShowToast && onShowToast({
        type: 'success',
        title: 'Mapping Updated',
        message: 'Access Controller department mapping updated successfully.'
      });
      await loadRfidData();
    } catch (err) {
      onShowToast && onShowToast({
        type: 'error',
        title: 'Update Failed',
        message: err.message || 'Could not update controller mapping'
      });
    }
  };

  const handleDeleteReader = async (reader) => {
    if (!window.confirm(`Are you sure you want to deactivate Access Controller '${reader.name}' (${reader.ip_address})?`)) {
      return;
    }
    try {
      await deleteReader(reader.id);
      onShowToast && onShowToast({
        type: 'success',
        title: 'Reader Deactivated',
        message: `Node '${reader.name}' removed from active controllers.`
      });
      await loadRfidData();
    } catch (err) {
      onShowToast && onShowToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'Failed to deactivate reader'
      });
    }
  };

  // Dynamic active asset associated with Dahua reader / card 6F4244DB
  const activeAsset = equipments.find(e => e.rfid_tag_id === '6F4244DB' || e.rfid_card_hex === '6F4244DB') 
    || (dahuaData?.tracked_asset) 
    || equipments.find(e => e.asset_id === 'BME-OT-ESU-007') 
    || equipments.find(e => e.asset_id === 'BME-OT-ANES-008');
  const isActiveAssetIn = activeAsset ? (activeAsset.transit_status === 'IN') : true;

  // Filter equipments for zone directory
  const filteredEquipments = equipments.filter(eq => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return (
      eq.name.toLowerCase().includes(q) ||
      eq.asset_id.toLowerCase().includes(q) ||
      (eq.rfid_tag_id && eq.rfid_tag_id.toLowerCase().includes(q)) ||
      (eq.rfid_card_alias && eq.rfid_card_alias.toLowerCase().includes(q)) ||
      (eq.room_number && eq.room_number.toLowerCase().includes(q)) ||
      (eq.floor && eq.floor.toLowerCase().includes(q))
    );
  });

  // Filter readers for hardware tab
  const filteredReaders = readers.filter(r => {
    if (!controllerFilter) return true;
    const q = controllerFilter.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.ip_address.toLowerCase().includes(q) ||
      (r.door_zone && r.door_zone.toLowerCase().includes(q)) ||
      (r.department_name && r.department_name.toLowerCase().includes(q)) ||
      (r.device_model && r.device_model.toLowerCase().includes(q))
    );
  });

  return (
    <div>
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Radio size={24} style={{ color: 'var(--color-primary)' }} />
            RFID Asset Live Location Tracking
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '3px' }}>
            Real-time Building, Floor, Department & Door Access Telemetry via Dahua DHI-ASI1201M-MEP & UHF Gateways
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setAutoPoll(!autoPoll)}
            title="Toggle real-time auto-polling every 3 seconds"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              backgroundColor: autoPoll ? 'var(--color-success)' : 'var(--text-muted)' 
            }} />
            Auto-Sync: {autoPoll ? 'ON (3s)' : 'PAUSED'}
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleManualSync}
            disabled={isSyncing}
          >
            <RefreshCw size={14} className={isSyncing ? 'spin-icon' : ''} />
            Sync Now
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setIsNewReaderModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <Plus size={14} />
            Add Reader Node
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onOpenRfidScanner}
          >
            <Scan size={15} />
            RFID Zone Relocator
          </button>
        </div>
      </div>

      {/* 3 Dedicated Tabs Navigation Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        borderBottom: '2px solid var(--border-color)',
        marginBottom: '22px',
        overflowX: 'auto'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('controllers')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'controllers' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'controllers' ? 'var(--color-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'controllers' ? 800 : 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <Cpu size={18} />
          HARDWARE ACCESS CONTROLLER
          <span 
            className={`badge ${activeTab === 'controllers' ? 'badge-primary' : 'badge-neutral'}`}
            style={{ fontSize: '0.72rem', padding: '2px 8px' }}
          >
            {readers.length} Nodes
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('departments')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'departments' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'departments' ? 'var(--color-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'departments' ? 800 : 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <Building2 size={18} />
          Department and Assets
          <span 
            className={`badge ${activeTab === 'departments' ? 'badge-primary' : 'badge-neutral'}`}
            style={{ fontSize: '0.72rem', padding: '2px 8px' }}
          >
            {departments.length} Zones • {equipments.length} Assets
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('telemetry')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'telemetry' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'telemetry' ? 'var(--color-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'telemetry' ? 800 : 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <Activity size={18} />
          Live RFID Gateway Detection Telemetry
          <span 
            className={`badge ${activeTab === 'telemetry' ? 'badge-success' : 'badge-neutral'}`}
            style={{ fontSize: '0.72rem', padding: '2px 8px' }}
          >
            {rfidLogs.length} Events
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: HARDWARE ACCESS CONTROLLER */}
      {/* ========================================================================= */}
      {activeTab === 'controllers' && (
        <div>
          {/* Quick Trigger Hardware Banner for Live Dahua Controller */}
          <div className="card" style={{ 
            marginBottom: '22px', 
            border: '1.5px solid var(--color-primary)', 
            background: 'linear-gradient(135deg, rgba(37,99,235,0.05) 0%, rgba(14,165,233,0.03) 100%)',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span className="badge badge-primary" style={{ padding: '4px 10px', fontWeight: 700, letterSpacing: '0.5px' }}>
                    ACTIVE HARDWARE ACCESS CONTROLLER
                  </span>
                  <span className={`badge ${dahuaData?.reader?.is_online !== false ? 'badge-success' : 'badge-danger'}`} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span className="badge-dot" style={{ backgroundColor: dahuaData?.reader?.is_online !== false ? 'var(--color-success)' : 'var(--color-danger)' }} />
                    {dahuaData?.reader?.is_online !== false ? 'ONLINE (1ms)' : 'OFFLINE'}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    IP: 192.168.8.108:80
                  </span>
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)', margin: '4px 0' }}>
                  Dahua DHI-ASI1201M-MEP Access Control Reader
                </h3>
                <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                  Monitored Door: <strong>Operation Theatre Complex (OT Gate)</strong> • Serial: <code>{dahuaData?.reader?.serial_number || 'BK079FEPAJF07CD'}</code>
                </div>
              </div>

              {/* Quick Trigger Button */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleTriggerDahuaTap(activeAsset?.rfid_tag_id || '6F4244DB')}
                  disabled={isTapping}
                  style={{
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
                    fontWeight: 700,
                    padding: '10px 18px'
                  }}
                >
                  {isTapping ? (
                    <RefreshCw size={16} className="spin-icon" />
                  ) : isActiveAssetIn ? (
                    <DoorOpen size={16} />
                  ) : (
                    <DoorClosed size={16} />
                  )}
                  {isTapping ? 'Processing...' : isActiveAssetIn ? `Tap Card (${activeAsset?.rfid_tag_id || '6F4244DB'}) -> Move OUT` : `Tap Card (${activeAsset?.rfid_tag_id || '6F4244DB'}) -> Move IN`}
                </button>
              </div>
            </div>

            {/* Tracked Asset summary banner */}
            {activeAsset && (
              <div style={{ 
                marginTop: '14px', 
                padding: '12px 16px', 
                backgroundColor: 'var(--bg-surface)', 
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: 'var(--radius-md)', 
                    backgroundColor: isActiveAssetIn ? 'rgba(34, 197, 94, 0.12)' : 'rgba(245, 158, 11, 0.15)',
                    color: isActiveAssetIn ? 'var(--color-success)' : '#d97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {isActiveAssetIn ? <DoorClosed size={22} /> : <DoorOpen size={22} />}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span 
                        style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--color-primary)', cursor: 'pointer' }}
                        onClick={() => onViewPassport(activeAsset.id)}
                      >
                        {activeAsset.name}
                      </span>
                      <code>{activeAsset.asset_id}</code>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      RFID Hex: <code style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{activeAsset.rfid_tag_id || '6F4244DB'}</code>
                      {activeAsset.rfid_card_alias && <> • Alias: <code>{activeAsset.rfid_card_alias}</code></>}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className={`badge ${isActiveAssetIn ? 'badge-success' : 'badge-warning'}`}
                    style={{ 
                      fontSize: '0.82rem', 
                      padding: '6px 12px', 
                      fontWeight: 800,
                      cursor: 'pointer',
                      border: 'none'
                    }}
                    title="Click to toggle presence"
                    onClick={() => handleToggleAssetStatus(activeAsset.id, isActiveAssetIn ? 'OUT' : 'IN', activeAsset.name)}
                  >
                    <span className="badge-dot" style={{ backgroundColor: isActiveAssetIn ? '#16a34a' : '#d97706' }} />
                    {isActiveAssetIn ? '🟢 IN DEPARTMENT' : '🟠 OUT (IN TRANSIT)'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Controller Filter & Metrics Toolbar */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            flexWrap: 'wrap', 
            gap: '16px', 
            backgroundColor: 'var(--bg-surface)', 
            border: '1px solid var(--border-color)', 
            padding: '14px 20px', 
            borderRadius: 'var(--radius-lg)',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '380px' }} className="datatable-search-box">
              <Search size={16} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="datatable-search-input"
                placeholder="Search reader by name, IP, door zone, or department..."
                value={controllerFilter}
                onChange={(e) => setControllerFilter(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '20px', fontSize: '0.84rem', alignItems: 'center' }}>
              <div>Total Controllers: <strong style={{ color: 'var(--color-primary)' }}>{readers.length}</strong></div>
              <div>Online: <strong style={{ color: 'var(--color-success)' }}>{readers.filter(r => r.is_online).length}</strong></div>
              <div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setIsNewReaderModalOpen(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={14} />
                  Add Access Controller Node
                </button>
              </div>
            </div>
          </div>

          {/* All Registered Access Controllers Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '18px', marginBottom: '28px' }}>
            {filteredReaders.length === 0 ? (
              <div className="card" style={{ gridColumn: '1 / -1', padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No access controller reader nodes match your search query.
              </div>
            ) : (
              filteredReaders.map(reader => {
                const isDahua = reader.reader_type?.includes('Dahua') || reader.device_model?.includes('DHI');
                return (
                  <div 
                    key={reader.id} 
                    className="card"
                    style={{
                      border: reader.id === 5 || reader.ip_address === '192.168.8.109' ? '1.5px solid var(--color-primary)' : '1px solid var(--border-color)',
                      boxShadow: reader.id === 5 ? '0 4px 16px rgba(37,99,235,0.08)' : 'none',
                      position: 'relative'
                    }}
                  >
                    {/* Top Row: Title & Online Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="badge badge-primary" style={{ fontSize: '0.68rem', padding: '2px 7px' }}>
                            NODE #{reader.id}
                          </span>
                          <span className="badge badge-neutral" style={{ fontSize: '0.68rem' }}>
                            {reader.device_model || 'Access Controller'}
                          </span>
                        </div>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '6px', marginBottom: '2px' }}>
                          {reader.name}
                        </h4>
                      </div>

                      <span className={`badge ${reader.is_online ? 'badge-success' : 'badge-neutral'}`} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span className="badge-dot" style={{ backgroundColor: reader.is_online ? 'var(--color-success)' : 'var(--text-muted)' }} />
                        {reader.is_online ? 'ONLINE' : 'CONFIGURED'}
                      </span>
                    </div>

                    {/* Network & Physical Location Details */}
                    <div style={{ 
                      padding: '10px 12px', 
                      backgroundColor: 'var(--bg-subtle)', 
                      borderRadius: 'var(--radius-sm)', 
                      fontSize: '0.8rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '5px',
                      marginBottom: '12px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>IP Address:</span>
                        <code style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{reader.ip_address}:{reader.port || 80}</code>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Door Zone:</span>
                        <strong style={{ color: 'var(--text-primary)', textAlign: 'right', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={reader.door_zone}>
                          {reader.door_zone || 'Facility Access Gate'}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Facility:</span>
                        <span>{reader.building} • {reader.floor}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Active Assets Linked:</span>
                        <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>{reader.equipment_count || 0} Assets</span>
                      </div>
                    </div>

                    {/* Department Mapping Section */}
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Building2 size={13} style={{ color: 'var(--color-primary)' }} />
                        Assigned Department:
                      </div>

                      <select
                        className="form-control"
                        value={reader.department_id || ''}
                        onChange={(e) => handleAssignReader(reader.id, e.target.value)}
                        style={{ fontSize: '0.82rem', padding: '6px 10px', height: 'auto' }}
                      >
                        <option value="">-- Unassigned (Free Floating Node) --</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.building} • {d.floor})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Card Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        onClick={() => handleTriggerDahuaTap(activeAsset?.rfid_tag_id || '6F4244DB')}
                        title="Simulate / Trigger card scan at this node"
                      >
                        <Radio size={13} />
                        Test Swipe Tap
                      </button>

                      {reader.id !== 1 && (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          style={{ fontSize: '0.76rem', padding: '4px 8px' }}
                          onClick={() => handleDeleteReader(reader)}
                          title="Deactivate this controller node"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: Department and Assets */}
      {/* ========================================================================= */}
      {activeTab === 'departments' && (
        <div>
          {/* Quick Search & Summary Metrics */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            flexWrap: 'wrap', 
            gap: '16px', 
            backgroundColor: 'var(--bg-surface)', 
            border: '1px solid var(--border-color)', 
            padding: '14px 20px', 
            borderRadius: 'var(--radius-lg)',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '380px' }} className="datatable-search-box">
              <Search size={16} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="datatable-search-input"
                placeholder="Search by RFID Tag, Asset ID, Room or Floor..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '20px', fontSize: '0.84rem', alignItems: 'center' }}>
              <div>Total Zones: <strong style={{ color: 'var(--color-primary)' }}>{departments.length}</strong></div>
              <div>Tracked Equipment: <strong style={{ color: 'var(--color-success)' }}>{equipments.length}</strong></div>
              <div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={onOpenRfidScanner}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                  <Scan size={14} />
                  RFID Zone Relocator
                </button>
              </div>
            </div>
          </div>

          {/* Department Cards Grid with Multi-Controller Mappings */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '22px', marginBottom: '28px' }}>
            {departments.map((dept) => {
              const deptEquips = filteredEquipments.filter(e => Number(e.department_id) === Number(dept.id));
              // Find all Access Controllers mapped to this department
              const mappedControllers = readers.filter(r => Number(r.department_id) === Number(dept.id));

              return (
                <div key={dept.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                  {/* Department Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Building2 size={18} style={{ color: 'var(--color-primary)' }} />
                        {dept.name}
                      </h3>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {dept.building} • <strong style={{ color: 'var(--color-primary)' }}>{dept.floor}</strong>
                      </div>
                    </div>
                    <span className="badge badge-info">{deptEquips.length} Assets</span>
                  </div>

                  {/* Section: Mapped Access Controllers (One or More!) */}
                  <div style={{ 
                    marginBottom: '14px', 
                    padding: '10px 12px', 
                    backgroundColor: 'rgba(37, 99, 235, 0.04)', 
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(37, 99, 235, 0.15)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <ShieldCheck size={14} />
                        Mapped Access Controllers ({mappedControllers.length})
                      </span>

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.72rem', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => setMappingDept(dept)}
                        title="Assign or change mapped access controllers for this department"
                      >
                        <Plus size={12} />
                        Map Controller
                      </button>
                    </div>

                    {mappedControllers.length === 0 ? (
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 0' }}>
                        No hardware access controller assigned to this department yet.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {mappedControllers.map(ctrl => (
                          <div 
                            key={ctrl.id}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: 'var(--bg-surface)',
                              border: '1px solid var(--border-color)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '0.78rem'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className="badge-dot" style={{ backgroundColor: ctrl.is_online ? 'var(--color-success)' : 'var(--text-muted)' }} />
                              <strong>{ctrl.name}</strong>
                              <code style={{ fontSize: '0.72rem' }}>{ctrl.ip_address}</code>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleAssignReader(ctrl.id, null)}
                              title="Unmap this controller from department"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '2px',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section: Assets Present in Department */}
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Biomedical Equipment in Zone:
                  </div>

                  {deptEquips.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', flex: 1 }}>
                      No biomedical equipment currently detected in this zone.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto', flex: 1 }}>
                      {deptEquips.map((eq) => {
                        const isTarget = eq.rfid_tag_id === '6F4244DB' || eq.asset_id === 'BME-OT-ESU-007' || eq.asset_id === 'BME-OT-ANES-008';
                        const isEqIn = (eq.transit_status !== 'OUT');
                        return (
                          <div 
                            key={eq.id} 
                            style={{ 
                              padding: '10px 12px', 
                              borderRadius: 'var(--radius-sm)', 
                              backgroundColor: isTarget ? 'rgba(37,99,235,0.06)' : 'var(--bg-subtle)',
                              border: isTarget ? '1.5px solid var(--color-primary)' : '1px solid var(--border-color)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '10px'
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div 
                                  style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--color-primary)', cursor: 'pointer' }}
                                  onClick={() => onViewPassport(eq.id)}
                                >
                                  {eq.name}
                                </div>
                                {isTarget && (
                                  <span className="badge badge-primary" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                                    Active Monitored
                                  </span>
                                )}
                              </div>

                              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Asset ID: <code>{eq.asset_id}</code> • Room: <strong>{eq.room_number || 'Main'}</strong> {eq.bed_slot ? `(${eq.bed_slot})` : ''}
                              </div>
                              
                              <div style={{ fontSize: '0.72rem', color: 'var(--color-accent)', fontFamily: 'var(--font-mono)', marginTop: '1px' }}>
                                RFID Tag: {eq.rfid_tag_id} {eq.rfid_card_alias ? `(${eq.rfid_card_alias})` : ''}
                              </div>
                            </div>

                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                              <button
                                type="button"
                                className={`badge ${isEqIn ? 'badge-success' : 'badge-warning'}`}
                                style={{ 
                                  fontSize: '0.72rem', 
                                  cursor: 'pointer', 
                                  border: 'none', 
                                  padding: '3px 8px', 
                                  fontWeight: 700,
                                  borderRadius: 'var(--radius-sm)'
                                }}
                                title={`Click to mark as ${isEqIn ? 'OUT (In Transit)' : 'IN (Present in this Department)'}`}
                                onClick={() => handleToggleAssetStatus(eq.id, isEqIn ? 'OUT' : 'IN', eq.name)}
                              >
                                {isEqIn ? '🟢 IN' : '🟠 OUT'}
                              </button>
                              <span className={`badge ${
                                eq.status === 'Operational' ? 'badge-neutral' : 
                                eq.status === 'Under Breakdown' ? 'badge-danger' : 'badge-warning'
                              }`} style={{ fontSize: '0.68rem' }}>
                                {eq.status}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: Live RFID Gateway Detection Telemetry */}
      {/* ========================================================================= */}
      {activeTab === 'telemetry' && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Radio size={20} style={{ color: 'var(--color-accent)' }} />
                Live RFID Gateway Detection Telemetry
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Real-time antenna detection event stream with direction and signal strength
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Timezone: <strong>System Settings (Hospital Standard)</strong>
              </span>
              <span className="badge badge-success">
                <span className="badge-dot" /> Auto-Updating (3s)
              </span>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Detection Timestamp</th>
                  <th>Equipment Asset</th>
                  <th>Direction</th>
                  <th>RFID Card / Tag</th>
                  <th>Antenna Reader Node</th>
                  <th>Detected Zone / Location</th>
                  <th>Signal (RSSI)</th>
                </tr>
              </thead>
              <tbody>
                {rfidLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No RFID gateway scans logged yet.
                    </td>
                  </tr>
                ) : (
                  rfidLogs.slice(0, 25).map((log) => {
                    const isOut = log.movement_direction === 'OUT';
                    return (
                      <tr key={log.id} style={{ backgroundColor: log.raw_card_number === '6F4244DB' || log.equipment_id === 8 ? 'rgba(37,99,235,0.03)' : 'transparent' }}>
                        <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                          {log.formatted_scan_timestamp || formatDateTime(log.scan_timestamp, true)}
                        </td>
                        <td>
                          <strong 
                            style={{ color: 'var(--color-primary)', cursor: 'pointer' }}
                            onClick={() => onViewPassport(log.equipment_id)}
                          >
                            {log.equipment_name}
                          </strong>{' '}
                          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>({log.asset_id})</span>
                        </td>
                        <td>
                          <span className={`badge ${isOut ? 'badge-warning' : 'badge-success'}`} style={{ fontWeight: 700 }}>
                            {isOut ? '🟠 OUT (Exited)' : '🟢 IN (Entered)'}
                          </span>
                        </td>
                        <td>
                          <code>{log.raw_card_number || log.rfid_tag_id}</code>
                        </td>
                        <td>
                          <code>{log.reader_id}</code>
                          {log.reader_ip && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              IP: {log.reader_ip}
                            </div>
                          )}
                        </td>
                        <td>
                          {log.detected_department} • <strong>{log.detected_room}</strong>
                          {log.detected_floor && ` (${log.detected_floor})`}
                        </td>
                        <td>
                          <span className="badge badge-neutral">{log.signal_strength_rssi || -50} dBm</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Reader Node Modal */}
      <NewReaderModal
        isOpen={isNewReaderModalOpen}
        onClose={() => setIsNewReaderModalOpen(false)}
        onSuccess={() => {
          loadRfidData();
          onShowToast && onShowToast({
            type: 'success',
            title: 'Reader Configured',
            message: 'New access control reader node registered.'
          });
        }}
        onShowToast={onShowToast}
      />

      {/* Map Controllers to Department Modal */}
      <AssignControllersModal
        isOpen={!!mappingDept}
        department={mappingDept}
        readers={readers}
        onClose={() => setMappingDept(null)}
        onSuccess={() => {
          loadRfidData();
        }}
        onShowToast={onShowToast}
      />
    </div>
  );
}
