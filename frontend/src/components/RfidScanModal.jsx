import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import SelectSearch from './SelectSearch';
import { 
  scanRfidTag, 
  fetchEquipments, 
  fetchDepartments 
} from '../services/api';
import { Radio, MapPin, Scan, CheckCircle2 } from 'lucide-react';

export default function RfidScanModal({
  isOpen,
  onClose,
  preselectedEquipment = null,
  onSuccess,
  onShowToast
}) {
  const [equipments, setEquipments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [departmentId, setDepartmentId] = useState(1);
  const [building, setBuilding] = useState('Critical Care Tower A');
  const [floor, setFloor] = useState('3rd Floor');
  const [room, setRoom] = useState('ICU Room 303 (Relocated)');
  const [readerId, setReaderId] = useState('READER-GATEWAY-ZONE-3B');
  const [signalStrength, setSignalStrength] = useState(-58);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (preselectedEquipment) {
      setSelectedEquipmentId(preselectedEquipment.id);
      setSelectedTag(preselectedEquipment.rfid_tag_id);
    }
  }, [preselectedEquipment]);

  const loadData = async () => {
    try {
      const [eqRes, deptRes] = await Promise.all([
        fetchEquipments(),
        fetchDepartments()
      ]);
      setEquipments(eqRes.data || []);
      setDepartments(deptRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEquipmentChange = (val, opt) => {
    setSelectedEquipmentId(val);
    if (opt) {
      setSelectedTag(opt.rfid_tag_id);
    }
  };

  const handleDeptChange = (e) => {
    const id = Number(e.target.value);
    setDepartmentId(id);
    const d = departments.find(dept => dept.id === id);
    if (d) {
      setBuilding(d.building);
      setFloor(d.floor);
    }
  };

  const handleTriggerScan = async (e) => {
    e.preventDefault();
    if (!selectedEquipmentId && !selectedTag) {
      onShowToast({ type: 'warning', title: 'Required', message: 'Please select an equipment to scan' });
      return;
    }

    try {
      setScanning(true);
      const res = await scanRfidTag({
        equipment_id: selectedEquipmentId ? Number(selectedEquipmentId) : undefined,
        rfid_tag_id: selectedTag,
        reader_id: readerId,
        building,
        floor,
        room_number: room,
        department_id: departmentId,
        signal_strength_rssi: signalStrength
      });

      onShowToast({
        type: 'success',
        title: 'RFID Scan Processed',
        message: `${res.equipment_name} detected and relocated to ${room} (${floor})`
      });

      onSuccess && onSuccess(res);
      onClose();
    } catch (err) {
      onShowToast({ type: 'error', title: 'Scan Failed', message: err.message });
    } finally {
      setScanning(false);
    }
  };

  if (!isOpen) return null;

  const equipmentOptions = equipments.map(eq => ({
    value: eq.id,
    label: `${eq.name} (${eq.asset_id})`,
    subLabel: `Current: ${eq.department_name} • ${eq.room_number} • RFID: ${eq.rfid_tag_id}`,
    rfid_tag_id: eq.rfid_tag_id
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="RFID Tag Live Reader & Scanner Simulator"
      icon={Radio}
      size="md"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={scanning}>
            Cancel
          </button>
          <button 
            type="button" 
            className="btn btn-primary btn-sm" 
            onClick={handleTriggerScan}
            disabled={scanning || (!selectedEquipmentId && !selectedTag)}
          >
            <Scan size={15} />
            {scanning ? 'Transmitting Scan...' : 'Trigger RFID Zone Scan'}
          </button>
        </div>
      }
    >
      <form onSubmit={handleTriggerScan}>
        <div style={{ 
          backgroundColor: 'var(--color-primary-subtle)', 
          padding: '12px 16px', 
          borderRadius: 'var(--radius-sm)', 
          marginBottom: '16px',
          fontSize: '0.84rem',
          color: 'var(--color-primary-text)'
        }}>
          <strong>UHF RFID Gateway Antenna:</strong> Detects medical equipment moving across hospital departments, wards, and operating suites in real time.
        </div>

        <div className="form-group">
          <label className="form-label">Select Equipment to Scan</label>
          <SelectSearch
            options={equipmentOptions}
            value={selectedEquipmentId}
            onChange={handleEquipmentChange}
            placeholder="Select equipment or RFID tag..."
            subLabelKey="subLabel"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">RFID Antenna Node ID</label>
            <input
              type="text"
              className="form-control"
              value={readerId}
              onChange={(e) => setReaderId(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Signal Strength (RSSI)</label>
            <input
              type="number"
              className="form-control"
              value={signalStrength}
              onChange={(e) => setSignalStrength(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Target Detected Department</label>
          <select className="form-control" value={departmentId} onChange={handleDeptChange}>
            {departments.map(d => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.building} - {d.floor})
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Building / Pavilion</label>
            <input
              type="text"
              className="form-control"
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Floor</label>
            <input
              type="text"
              className="form-control"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Detected Room / Bay / Station</label>
          <input
            type="text"
            className="form-control"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder="e.g. OT Suite 2, Bed Bay 4, Recovery"
          />
        </div>
      </form>
    </Modal>
  );
}
