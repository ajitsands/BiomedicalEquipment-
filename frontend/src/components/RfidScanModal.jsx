import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import SelectSearch from './SelectSearch';
import NewReaderModal from './NewReaderModal';
import { 
  scanRfidTag, 
  fetchEquipments, 
  fetchDepartments,
  fetchReaders
} from '../services/api';
import { Radio, MapPin, Scan, CheckCircle2, Plus } from 'lucide-react';

export default function RfidScanModal({
  isOpen,
  onClose,
  preselectedEquipment = null,
  onSuccess,
  onShowToast
}) {
  const [equipments, setEquipments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [readers, setReaders] = useState([]);
  const [isNewReaderModalOpen, setIsNewReaderModalOpen] = useState(false);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [departmentId, setDepartmentId] = useState(1);
  const [building, setBuilding] = useState('Critical Care Tower A');
  const [floor, setFloor] = useState('3rd Floor');
  const [room, setRoom] = useState('ICU Room 303 (Relocated)');
  const [readerId, setReaderId] = useState('DHI-ASI1201M-MEP');
  const [readerIp, setReaderIp] = useState('192.168.8.108');
  const [movementDirection, setMovementDirection] = useState('IN');
  const [signalStrength, setSignalStrength] = useState(-52);
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
      if (preselectedEquipment.department_id) {
        setDepartmentId(preselectedEquipment.department_id);
      }
      if (preselectedEquipment.room_number) {
        setRoom(preselectedEquipment.room_number);
      }
    }
  }, [preselectedEquipment]);

  const loadData = async () => {
    try {
      const [eqRes, deptRes, readerRes] = await Promise.all([
        fetchEquipments(),
        fetchDepartments(),
        fetchReaders().catch(() => ({ data: [] }))
      ]);
      setEquipments(eqRes.data || []);
      setDepartments(deptRes.data || []);
      if (readerRes && readerRes.data && readerRes.data.length > 0) {
        setReaders(readerRes.data);
      } else {
        setReaders([
          { value: 'DHI-ASI1201M-MEP', label: 'DHI-ASI1201M-MEP (192.168.8.108)', ip_address: '192.168.8.108', subLabel: 'OT Suite 2 Door Gate • IP: 192.168.8.108' },
          { value: 'READER-OT-HUB-02', label: 'READER-OT-HUB-02 (OT Complex)', ip_address: '192.168.8.109', subLabel: 'Surgical Pavilion B • 2nd Floor' },
          { value: 'READER-ICU-NODE-3A', label: 'READER-ICU-NODE-3A (Tower A)', ip_address: '192.168.8.110', subLabel: 'Critical Care Tower A • 3rd Floor' },
          { value: 'READER-ER-GATEWAY-1', label: 'READER-ER-GATEWAY-1 (Ground Floor)', ip_address: '192.168.8.111', subLabel: 'Emergency & Trauma • Ground Floor' }
        ]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadReadersList = async () => {
    try {
      const res = await fetchReaders();
      if (res && res.data && res.data.length > 0) {
        setReaders(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEquipmentChange = (val, opt) => {
    setSelectedEquipmentId(val);
    if (opt) {
      setSelectedTag(opt.rfid_tag_id);
      if (opt.department_id) setDepartmentId(opt.department_id);
      if (opt.room_number) setRoom(opt.room_number);
    }
  };

  const handleDeptChange = (e) => {
    const id = Number(e.target.value);
    setDepartmentId(id);
    const d = departments.find(dept => dept.id === id);
    if (d) {
      setBuilding(d.building);
      setFloor(d.floor);
      // Auto-suggest appropriate room for the chosen department
      if (d.name.includes('Outpatient') || d.code === 'OPD') {
        setRoom('OPD Consultation Room 102');
      } else if (d.name.includes('Operation') || d.code === 'OT') {
        setRoom('OT Suite 2');
      } else if (d.name.includes('Intensive Care') || d.code === 'ICU') {
        setRoom('ICU Bay 1');
      } else if (d.name.includes('Emergency') || d.code === 'ER') {
        setRoom('Trauma Bay 01');
      } else {
        setRoom(`${d.name} Station`);
      }
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
        reader_ip: readerIp,
        movement_direction: movementDirection === 'AUTO' ? undefined : movementDirection,
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
    <>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>RFID Reader Node</label>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ padding: '2px 8px', fontSize: '0.72rem', height: '22px', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={() => setIsNewReaderModalOpen(true)}
              >
                <Plus size={12} /> Add Reader Node
              </button>
            </div>
            <SelectSearch
              options={readers}
              value={readerId}
              onChange={(val, opt) => {
                setReaderId(val);
                if (opt && opt.ip_address) {
                  setReaderIp(opt.ip_address);
                }
              }}
              placeholder="Select RFID Reader Node..."
              subLabelKey="subLabel"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Asset Presence in Department</label>
            <select 
              className="form-control"
              value={movementDirection}
              onChange={(e) => setMovementDirection(e.target.value)}
            >
              <option value="IN">🟢 Present IN Department (Placed in Room)</option>
              <option value="OUT">🟠 Moving OUT (In Transit / Corridor Gate)</option>
              <option value="AUTO">⚡ Auto Toggle (Invert Current State)</option>
            </select>
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
    <NewReaderModal
      isOpen={isNewReaderModalOpen}
      onClose={() => setIsNewReaderModalOpen(false)}
      onSuccess={(newReader) => {
        loadReadersList();
        if (newReader && newReader.value) {
          setReaderId(newReader.value);
          if (newReader.ip_address) setReaderIp(newReader.ip_address);
        }
      }}
      onShowToast={onShowToast}
    />
  </>
  );
}
