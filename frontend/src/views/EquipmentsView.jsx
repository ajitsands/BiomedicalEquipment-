import React, { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import SelectSearch from '../components/SelectSearch';
import { 
  fetchEquipments, 
  fetchDepartments, 
  deleteEquipment 
} from '../services/api';
import { 
  Layers, 
  Plus, 
  Eye, 
  CheckSquare, 
  AlertOctagon, 
  Radio, 
  QrCode, 
  Trash2, 
  MapPin, 
  ShieldCheck, 
  Clock 
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export default function EquipmentsView({
  onViewPassport,
  onRunChecklist,
  onBookComplaint,
  onOpenNewEquipment,
  onOpenRfidScanner,
  onShowToast,
  refreshKey = 0
}) {
  const { formatDate, formatCurrency } = useSettings();
  const [equipments, setEquipments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedWarranty, setSelectedWarranty] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedDept, selectedWarranty, selectedStatus, refreshKey]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [eqRes, deptRes] = await Promise.all([
        fetchEquipments({
          department_id: selectedDept || undefined,
          warranty_status: selectedWarranty || undefined,
          status: selectedStatus || undefined
        }),
        fetchDepartments()
      ]);
      setEquipments(eqRes.data || []);
      setDepartments(deptRes.data || []);
    } catch (err) {
      onShowToast({ type: 'error', title: 'Error', message: 'Failed to load equipments' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to decommission/delete ${name}?`)) return;
    try {
      await deleteEquipment(id);
      onShowToast({ type: 'success', title: 'Deleted', message: `${name} removed from registry.` });
      loadData();
    } catch (err) {
      onShowToast({ type: 'error', title: 'Failed', message: err.message });
    }
  };

  const columns = [
    {
      id: 'asset_id',
      header: 'Asset ID / QR',
      accessor: 'asset_id',
      render: (row) => (
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-primary)' }}>
            {row.asset_id}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <QrCode size={12} />
            <span>{row.qr_code_token.slice(0, 16)}...</span>
          </div>
        </div>
      )
    },
    {
      id: 'name',
      header: 'Equipment Specs & Model',
      accessor: 'name',
      render: (row) => (
        <div>
          <div 
            style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--color-primary)' }}
            onClick={() => onViewPassport(row.id)}
            title="Click to view complete 360° Asset Passport"
          >
            {row.name}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {row.brand} • {row.model_number} (SN: {row.serial_number})
          </div>
        </div>
      )
    },
    {
      id: 'category',
      header: 'Type & Risk Class',
      accessor: 'equipment_type_name',
      render: (row) => (
        <div>
          <div style={{ fontSize: '0.84rem', fontWeight: 500 }}>{row.equipment_type_name}</div>
          <div style={{ marginTop: '2px' }}>
            <span className={`badge ${
              row.risk_classification?.includes('High') ? 'badge-danger' : 
              row.risk_classification?.includes('Medium') ? 'badge-warning' : 'badge-neutral'
            }`} style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
              {row.risk_classification}
            </span>
          </div>
        </div>
      )
    },
    {
      id: 'location',
      header: 'Department & Floor',
      accessor: 'department_name',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MapPin size={13} style={{ color: 'var(--color-primary)' }} />
            {row.department_name}
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
            {row.floor} • {row.room_number} {row.bed_slot ? `(${row.bed_slot})` : ''}
          </div>
        </div>
      )
    },
    {
      id: 'rfid',
      header: 'RFID Tag Live ID',
      accessor: 'rfid_tag_id',
      render: (row) => (
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
            {row.rfid_tag_id}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Radio size={11} />
            <span>Active UHF</span>
          </div>
        </div>
      )
    },
    {
      id: 'warranty',
      header: 'Warranty / AMC',
      accessor: 'warranty_status',
      render: (row) => (
        <div>
          <span className={`badge ${row.warranty_status === 'Under Warranty' ? 'badge-success' : 'badge-purple'}`}>
            {row.warranty_status}
          </span>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {row.contract_type}
          </div>
        </div>
      )
    },
    {
      id: 'status',
      header: 'Operational Status',
      accessor: 'status',
      render: (row) => (
        <span className={`badge ${
          row.status === 'Operational' ? 'badge-success' : 
          row.status === 'Under Breakdown' ? 'badge-danger' : 
          row.status === 'Calibration Due' ? 'badge-warning' : 'badge-info'
        }`}>
          <span className="badge-dot" />
          {row.status}
        </span>
      )
    },
    {
      id: 'next_pm',
      header: 'Next PM Due',
      accessor: 'next_pm_due_date',
      render: (row) => {
        const isOverdue = row.next_pm_due_date && new Date(row.next_pm_due_date) < new Date();
        return (
          <div style={{ color: isOverdue ? 'var(--color-danger)' : 'inherit', fontWeight: isOverdue ? 700 : 500 }}>
            {formatDate(row.next_pm_due_date)}
            {isOverdue && <div style={{ fontSize: '0.72rem' }}>⚠️ Overdue</div>}
          </div>
        );
      }
    },
    {
      id: 'actions',
      header: 'Quick Actions',
      sortable: false,
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-icon btn-sm"
            onClick={() => onViewPassport(row.id)}
            title="View Complete Asset Passport"
          >
            <Eye size={15} />
          </button>
          <button
            type="button"
            className="btn btn-outline-primary btn-icon btn-sm"
            onClick={() => onRunChecklist(row)}
            title="Execute WHO PM Checklist"
          >
            <CheckSquare size={15} />
          </button>
          <button
            type="button"
            className="btn btn-danger btn-icon btn-sm"
            onClick={() => onBookComplaint(row)}
            title="Book Breakdown Complaint"
          >
            <AlertOctagon size={15} />
          </button>
        </div>
      )
    }
  ];

  const deptOptions = [
    { value: '', label: 'All Hospital Departments' },
    ...departments.map(d => ({ value: d.id, label: `${d.name} (${d.floor})` }))
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '22px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Biomedical Equipment Master Register</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Comprehensive Asset Passport, QR Code Generator, RFID Tag Mapping, and Lifecycle History
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onOpenRfidScanner}
          >
            <Radio size={15} style={{ color: 'var(--color-accent)' }} />
            RFID Relocator
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onOpenNewEquipment}
          >
            <Plus size={15} />
            Register New Asset
          </button>
        </div>
      </div>

      {/* Advanced Filter Toolbar */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        flexWrap: 'wrap', 
        backgroundColor: 'var(--bg-surface)', 
        border: '1px solid var(--border-color)', 
        padding: '14px 18px', 
        borderRadius: 'var(--radius-lg)',
        marginBottom: '20px'
      }}>
        <div style={{ minWidth: '240px' }}>
          <SelectSearch
            options={deptOptions}
            value={selectedDept}
            onChange={(val) => setSelectedDept(val)}
            placeholder="Filter by Department..."
          />
        </div>

        <select
          className="form-control"
          style={{ width: '190px' }}
          value={selectedWarranty}
          onChange={(e) => setSelectedWarranty(e.target.value)}
        >
          <option value="">All Warranty Statuses</option>
          <option value="Under Warranty">Under Warranty</option>
          <option value="Out of Warranty">Out of Warranty / AMC</option>
        </select>

        <select
          className="form-control"
          style={{ width: '190px' }}
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="">All Operational Statuses</option>
          <option value="Operational">Operational</option>
          <option value="Under Breakdown">Under Breakdown</option>
          <option value="Calibration Due">Calibration Due</option>
          <option value="Under Maintenance">Under Maintenance</option>
        </select>

        {(selectedDept || selectedWarranty || selectedStatus) && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setSelectedDept('');
              setSelectedWarranty('');
              setSelectedStatus('');
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Reusable DataTable */}
      <DataTable
        columns={columns}
        data={equipments}
        keyField="id"
        searchPlaceholder="Instant search by Asset ID, Model, Serial, RFID tag, or Name..."
        defaultPageSize={10}
        exportTitle="Biomedical_Equipments_Master"
      />
    </div>
  );
}
