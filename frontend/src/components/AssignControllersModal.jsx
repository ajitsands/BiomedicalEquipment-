import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Radio, ShieldCheck, Check, Plus, AlertCircle } from 'lucide-react';
import { batchAssignReadersToDepartment, assignReaderDepartment } from '../services/api';

export default function AssignControllersModal({
  isOpen,
  onClose,
  department,
  readers = [],
  onSuccess,
  onShowToast
}) {
  const [selectedReaderIds, setSelectedReaderIds] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (department && isOpen) {
      // Find all readers currently assigned to this department
      const currentIds = readers
        .filter(r => Number(r.department_id) === Number(department.id))
        .map(r => r.id);
      setSelectedReaderIds(currentIds);
    }
  }, [department, isOpen, readers]);

  if (!department) return null;

  const toggleReader = (readerId) => {
    setSelectedReaderIds(prev => 
      prev.includes(readerId) 
        ? prev.filter(id => id !== readerId)
        : [...prev, readerId]
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // Update mappings:
      // 1. Assign selected readers to this department
      // 2. Any readers that were previously assigned to this department but now unselected get unassigned (department_id = null)
      const previouslyAssigned = readers
        .filter(r => Number(r.department_id) === Number(department.id))
        .map(r => r.id);
      
      const unselected = previouslyAssigned.filter(id => !selectedReaderIds.includes(id));
      const newlySelected = selectedReaderIds.filter(id => !previouslyAssigned.includes(id));

      const promises = [];

      for (const id of unselected) {
        promises.push(assignReaderDepartment(id, null));
      }
      for (const id of newlySelected) {
        promises.push(assignReaderDepartment(id, department.id));
      }

      await Promise.all(promises);

      onShowToast && onShowToast({
        type: 'success',
        title: 'Controllers Mapped',
        message: `Updated Access Controller mappings for ${department.name}.`
      });

      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      onShowToast && onShowToast({
        type: 'error',
        title: 'Mapping Failed',
        message: err.message || 'Could not update controller mappings'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign Access Controllers — ${department.name}`}
      icon={ShieldCheck}
      size="md"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : `Save Mappings (${selectedReaderIds.length} Selected)`}
          </button>
        </>
      }
    >
      <div style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          Select the Hardware Access Controllers & RFID Reader Nodes to monitor zone entrances and exits for{' '}
          <strong>{department.name}</strong> ({department.building} • {department.floor}).
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '380px', overflowY: 'auto' }}>
          {readers.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No reader nodes available. Please register a reader node first.
            </div>
          ) : (
            readers.map(reader => {
              const isSelected = selectedReaderIds.includes(reader.id);
              const isMappedToOther = reader.department_id && Number(reader.department_id) !== Number(department.id);

              return (
                <div
                  key={reader.id}
                  onClick={() => toggleReader(reader.id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: isSelected ? '1.5px solid var(--color-primary)' : '1px solid var(--border-color)',
                    backgroundColor: isSelected ? 'rgba(37,99,235,0.06)' : 'var(--bg-surface)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '4px',
                        border: isSelected ? '2px solid var(--color-primary)' : '2px solid var(--border-color)',
                        backgroundColor: isSelected ? 'var(--color-primary)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        flexShrink: 0
                      }}
                    >
                      {isSelected && <Check size={14} strokeWidth={3} />}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          {reader.name}
                        </span>
                        <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                          {reader.device_model || 'Dahua'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        IP: <code style={{ color: 'var(--color-primary)' }}>{reader.ip_address}:{reader.port || 80}</code>
                        {reader.door_zone && <> • Zone: <strong>{reader.door_zone}</strong></>}
                      </div>

                      {isMappedToOther && !isSelected && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-warning)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertCircle size={12} />
                          Currently assigned to: {reader.department_name} (Selecting will reassign here)
                        </div>
                      )}
                    </div>
                  </div>

                  <span className={`badge ${reader.is_online ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: '0.72rem' }}>
                    {reader.is_online ? 'ONLINE' : 'CONFIGURED'}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
