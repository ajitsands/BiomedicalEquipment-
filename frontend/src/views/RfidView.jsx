import React, { useState, useEffect, useRef } from 'react';
import { 
  fetchEquipments, 
  fetchDepartments, 
  fetchRfidLogs,
  fetchDahuaStatus,
  pollDahuaReader,
  triggerDahuaTap,
  setEquipmentTransitStatus
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
  Plus
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import NewReaderModal from '../components/NewReaderModal';

export default function RfidView({
  onViewPassport,
  onOpenRfidScanner,
  onShowToast,
  refreshKey = 0
}) {
  const { formatDateTime } = useSettings();
  const [equipments, setEquipments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [rfidLogs, setRfidLogs] = useState([]);
  const [dahuaData, setDahuaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');
  const [autoPoll, setAutoPoll] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTapping, setIsTapping] = useState(false);
  const [isNewReaderModalOpen, setIsNewReaderModalOpen] = useState(false);
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
      const [eqRes, deptRes, logRes, dahuaRes] = await Promise.all([
        fetchEquipments(),
        fetchDepartments(),
        fetchRfidLogs(),
        fetchDahuaStatus().catch(() => ({ reader: { is_online: false } }))
      ]);
      setEquipments(eqRes.data || []);
      setDepartments(deptRes.data || []);
      setRfidLogs(logRes.data || []);
      setDahuaData(dahuaRes || null);
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

      // 2. Fetch fresh logs and equipment locations
      const [logRes, eqRes, dahuaRes] = await Promise.all([
        fetchRfidLogs(),
        fetchEquipments(),
        fetchDahuaStatus().catch(() => null)
      ]);
      if (logRes && logRes.data) setRfidLogs(logRes.data);
      if (eqRes && eqRes.data) setEquipments(eqRes.data);
      if (dahuaRes) setDahuaData(dahuaRes);
    } catch (err) {
      // silent background failure
    }
  };

  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      await syncTelemetrySilently();
      onShowToast && onShowToast({ type: 'success', title: 'Telemetry Synced', message: 'RFID Gateway and Dahua Reader synchronized successfully.' });
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
      const res = await setEquipmentTransitStatus(eqId, targetDirection);
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

  // Find Anesthesia Workstation OT-2 tracked by Dahua reader
  const anesWorkstation = equipments.find(e => e.asset_id === 'BME-OT-ANES-008') || (dahuaData?.tracked_asset);
  const isAnesIn = anesWorkstation ? (anesWorkstation.transit_status === 'IN') : true;

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

  return (
    <div>
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '22px' }}>
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

      {/* Featured Dahua DHI-ASI1201M-MEP Access Control Gateway Panel */}
      <div className="card" style={{ 
        marginBottom: '24px', 
        border: '1.5px solid var(--color-primary)', 
        background: 'linear-gradient(135deg, rgba(37,99,235,0.04) 0%, rgba(14,165,233,0.02) 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span className="badge badge-primary" style={{ padding: '4px 10px', fontWeight: 700, letterSpacing: '0.5px' }}>
                HARDWARE ACCESS CONTROLLER
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
              onClick={() => handleTriggerDahuaTap('6F4244DB')}
              disabled={isTapping}
              style={{
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
                fontWeight: 700,
                padding: '10px 18px'
              }}
            >
              {isTapping ? (
                <RefreshCw size={16} className="spin-icon" />
              ) : isAnesIn ? (
                <DoorOpen size={16} />
              ) : (
                <DoorClosed size={16} />
              )}
              {isTapping ? 'Processing...' : isAnesIn ? 'Tap Card -> Move OUT of OT' : 'Tap Card -> Move IN to OT'}
            </button>
          </div>
        </div>

        {/* Dedicated Tracked Asset Details Card */}
        {anesWorkstation && (
          <div style={{ 
            marginTop: '16px', 
            padding: '14px 18px', 
            backgroundColor: 'var(--bg-surface)', 
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ 
                width: '46px', 
                height: '46px', 
                borderRadius: 'var(--radius-md)', 
                backgroundColor: isAnesIn ? 'rgba(34, 197, 94, 0.12)' : 'rgba(245, 158, 11, 0.15)',
                color: isAnesIn ? 'var(--color-success)' : '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {isAnesIn ? <DoorClosed size={24} /> : <DoorOpen size={24} />}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span 
                    style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--color-primary)', cursor: 'pointer' }}
                    onClick={() => onViewPassport(anesWorkstation.id)}
                  >
                    {anesWorkstation.name}
                  </span>
                  <code>{anesWorkstation.asset_id}</code>
                </div>

                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  RFID Hex: <code style={{ color: 'var(--color-primary)', fontWeight: 700 }}>6F4244DB</code> • 
                  Alias: <code>BMEOTANES008</code> • 
                  Wiegand: <code>1866613979</code>
                </div>
              </div>
            </div>

            {/* Live Location & Direction Status Badge */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginBottom: '4px' }}>
                <button
                  type="button"
                  className={`badge ${isAnesIn ? 'badge-success' : 'badge-warning'}`}
                  style={{ 
                    fontSize: '0.85rem', 
                    padding: '6px 12px', 
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    border: 'none'
                  }}
                  title="Click to toggle between IN and OUT"
                  onClick={() => handleToggleAssetStatus(anesWorkstation.id, isAnesIn ? 'OUT' : 'IN', anesWorkstation.name)}
                >
                  <span className="badge-dot" style={{ backgroundColor: isAnesIn ? '#16a34a' : '#d97706' }} />
                  {isAnesIn ? '🟢 IN DEPARTMENT' : '🟠 OUT (IN TRANSIT)'}
                </button>

                {!isAnesIn && (
                  <button
                    type="button"
                    className="btn btn-sm btn-success"
                    style={{ padding: '5px 12px', fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    onClick={() => handleToggleAssetStatus(anesWorkstation.id, 'IN', anesWorkstation.name)}
                    title="Mark equipment as present inside current department"
                  >
                    <CheckCircle2 size={14} />
                    Set IN Department
                  </button>
                )}
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Current Location: <strong style={{ color: 'var(--text-primary)' }}>{anesWorkstation.room_number || 'Station 1'}</strong> ({anesWorkstation.floor || 'Current Floor'})
              </div>
            </div>
          </div>
        )}
      </div>

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
        marginBottom: '24px'
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

        <div style={{ display: 'flex', gap: '20px', fontSize: '0.84rem' }}>
          <div>Total Tracked Assets: <strong style={{ color: 'var(--color-primary)' }}>{equipments.length}</strong></div>
          <div>Dahua Reader Node: <strong style={{ color: 'var(--color-success)' }}>192.168.8.108</strong></div>
          <div>Telemetry Status: <span className="badge badge-success"><span className="badge-dot" /> Live Monitoring</span></div>
        </div>
      </div>

      {/* Department & Floor Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        {departments.map((dept) => {
          const deptEquips = filteredEquipments.filter(e => e.department_id === dept.id);
          return (
            <div key={dept.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building2 size={18} style={{ color: 'var(--color-accent)' }} />
                    {dept.name}
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {dept.building} • <strong style={{ color: 'var(--color-primary)' }}>{dept.floor}</strong>
                  </div>
                </div>
                <span className="badge badge-info">{deptEquips.length} Devices Present</span>
              </div>

              {deptEquips.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  No biomedical equipment currently detected in this zone.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                  {deptEquips.map((eq) => {
                    const isTarget = eq.asset_id === 'BME-OT-ANES-008';
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
                                Dahua Monitored
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Asset ID: <code>{eq.asset_id}</code> • Room: <strong>{eq.room_number}</strong> {eq.bed_slot ? `(${eq.bed_slot})` : ''}
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

      {/* Live Movement Feed (All Timestamps strictly in System Settings Format & Timezone) */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Radio size={20} style={{ color: 'var(--color-accent)' }} />
            Live RFID Gateway Detection Telemetry
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Format & Timezone: <strong>System Settings</strong>
            </span>
            <span className="badge badge-success">
              <span className="badge-dot" /> Auto-Updating
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
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No RFID gateway scans logged yet.
                  </td>
                </tr>
              ) : (
                rfidLogs.slice(0, 15).map((log) => {
                  const isOut = log.movement_direction === 'OUT';
                  return (
                    <tr key={log.id} style={{ backgroundColor: log.raw_card_number === '6F4244DB' || log.equipment_id === 8 ? 'rgba(37,99,235,0.03)' : 'transparent' }}>
                      <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                        {/* Formatted using system setting timezone and date format */}
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
    </div>
  );
}
