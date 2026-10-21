import React, { useState, useEffect } from 'react';
import { 
  fetchEquipments, 
  fetchDepartments, 
  fetchRfidLogs 
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
  Clock 
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

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
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');

  useEffect(() => {
    loadRfidData();
  }, [refreshKey]);

  const loadRfidData = async () => {
    try {
      setLoading(true);
      const [eqRes, deptRes, logRes] = await Promise.all([
        fetchEquipments(),
        fetchDepartments(),
        fetchRfidLogs()
      ]);
      setEquipments(eqRes.data || []);
      setDepartments(deptRes.data || []);
      setRfidLogs(logRes.data || []);
    } catch (err) {
      onShowToast({ type: 'error', title: 'Error', message: 'Failed to load RFID telemetry' });
    } finally {
      setLoading(false);
    }
  };

  // Group equipments by Department and Floor
  const filteredEquipments = equipments.filter(eq => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return (
      eq.name.toLowerCase().includes(q) ||
      eq.asset_id.toLowerCase().includes(q) ||
      eq.rfid_tag_id.toLowerCase().includes(q) ||
      eq.room_number.toLowerCase().includes(q) ||
      eq.floor.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '22px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>RFID Asset Live Location Tracking</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Real-time Building, Floor, Department & Room Location Monitoring via UHF RFID Gateways
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onOpenRfidScanner}
        >
          <Scan size={15} />
          Simulate / Trigger RFID Reader Scan
        </button>
      </div>

      {/* Quick Search & Summary */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '360px' }} className="datatable-search-box">
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
          <div>RFID Antennas Active: <strong style={{ color: 'var(--color-success)' }}>12 Nodes</strong></div>
          <div>Telemetry Status: <span className="badge badge-success"><span className="badge-dot" /> Online</span></div>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                  {deptEquips.map((eq) => (
                    <div 
                      key={eq.id} 
                      style={{ 
                        padding: '10px 12px', 
                        borderRadius: 'var(--radius-sm)', 
                        backgroundColor: 'var(--bg-subtle)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px'
                      }}
                    >
                      <div>
                        <div 
                          style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--color-primary)', cursor: 'pointer' }}
                          onClick={() => onViewPassport(eq.id)}
                        >
                          {eq.name}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          Asset ID: <code>{eq.asset_id}</code> • Room: <strong>{eq.room_number}</strong> {eq.bed_slot ? `(${eq.bed_slot})` : ''}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>
                          Tag: {eq.rfid_tag_id}
                        </div>
                      </div>

                      <span className={`badge ${
                        eq.status === 'Operational' ? 'badge-success' : 
                        eq.status === 'Under Breakdown' ? 'badge-danger' : 'badge-warning'
                      }`} style={{ fontSize: '0.7rem' }}>
                        {eq.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Live Movement Feed */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Radio size={20} style={{ color: 'var(--color-accent)' }} />
            Live RFID Gateway Detection Telemetry
          </h3>
          <span className="badge badge-neutral">Auto-Refreshing</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Detection Timestamp</th>
                <th>Equipment Asset</th>
                <th>RFID EPC Tag</th>
                <th>Antenna Reader Node</th>
                <th>Detected Location</th>
                <th>Signal (RSSI)</th>
              </tr>
            </thead>
            <tbody>
              {rfidLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No RFID gateway scans logged yet.
                  </td>
                </tr>
              ) : (
                rfidLogs.slice(0, 8).map((log) => (
                  <tr key={log.id}>
                    <td>{formatDateTime(log.scan_timestamp)}</td>
                    <td>
                      <strong 
                        style={{ color: 'var(--color-primary)', cursor: 'pointer' }}
                        onClick={() => onViewPassport(log.equipment_id)}
                      >
                        {log.equipment_name}
                      </strong>{' '}
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>({log.asset_id})</span>
                    </td>
                    <td><code>{log.rfid_tag_id}</code></td>
                    <td><code>{log.reader_id}</code></td>
                    <td>
                      {log.detected_department} • <strong>{log.detected_room}</strong> ({log.detected_floor})
                    </td>
                    <td>
                      <span className="badge badge-success">{log.signal_strength_rssi} dBm</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
