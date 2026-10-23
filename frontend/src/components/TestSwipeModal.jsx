import React, { useState } from 'react';
import Modal from './Modal';
import { Radio, Scan, CheckCircle2, ArrowRightLeft, ShieldCheck } from 'lucide-react';
import { triggerDahuaTap } from '../services/api';

export default function TestSwipeModal({
  isOpen,
  onClose,
  reader,
  equipments = [],
  onSuccess,
  onShowToast
}) {
  const [selectedCard, setSelectedCard] = useState('6F4244DB');
  const [customCard, setCustomCard] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!reader) return null;

  // Filter tracked equipments that have an RFID tag
  const rfidEquipments = equipments.filter(e => e.rfid_tag_id || e.rfid_card_hex);

  const handleSwipe = async () => {
    const cardToSwipe = customCard.trim() || selectedCard;
    if (!cardToSwipe) {
      onShowToast && onShowToast({ type: 'warning', title: 'Card Required', message: 'Please select or enter an RFID card' });
      return;
    }

    try {
      setIsProcessing(true);
      const res = await triggerDahuaTap(cardToSwipe, reader.ip_address, reader.id);
      onShowToast && onShowToast({
        type: 'success',
        title: `RFID Reader Tap: ${res.movement_direction}`,
        message: res.message
      });
      onSuccess && onSuccess(res);
      onClose();
    } catch (err) {
      onShowToast && onShowToast({
        type: 'error',
        title: 'Swipe Failed',
        message: err.message || 'Could not process RFID swipe at this reader'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Simulate RFID Scan on ${reader.name}`}
      icon={Radio}
      size="md"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isProcessing}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSwipe} disabled={isProcessing}>
            {isProcessing ? 'Processing Swipe...' : '⚡ Scan Card on This Reader'}
          </button>
        </>
      }
    >
      <div style={{ marginBottom: '16px' }}>
        {/* Reader summary box */}
        <div style={{ 
          padding: '12px 14px', 
          backgroundColor: 'rgba(37,99,235,0.05)', 
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(37,99,235,0.15)',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--color-primary)' }}>
              {reader.name}
            </span>
            <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
              ONLINE (IP: {reader.ip_address}:{reader.port || 80})
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Zone: <strong>{reader.door_zone || 'Door Gate'}</strong> • Department: <strong style={{ color: 'var(--color-primary)' }}>{reader.department_name || 'Unassigned'}</strong>
          </div>
        </div>

        <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
          Select the biomedical equipment RFID tag to simulate a badge/tag swipe at this entrance reader:
        </p>

        {/* Equipment Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto', marginBottom: '14px' }}>
          {rfidEquipments.map(eq => {
            const cardTag = eq.rfid_tag_id || eq.rfid_card_hex;
            const isSelected = selectedCard === cardTag && !customCard;
            const isCrossDept = reader.department_id && Number(eq.department_id) !== Number(reader.department_id);

            return (
              <div
                key={eq.id}
                onClick={() => { setSelectedCard(cardTag); setCustomCard(''); }}
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: isSelected ? '1.5px solid var(--color-primary)' : '1px solid var(--border-color)',
                  backgroundColor: isSelected ? 'rgba(37,99,235,0.06)' : 'var(--bg-surface)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  transition: 'all 0.15s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                      {eq.name}
                    </span>
                    <code>{eq.asset_id}</code>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    RFID Tag: <strong style={{ color: 'var(--color-primary)' }}>{cardTag}</strong> • Current Dept: <strong>{eq.department_name || `Dept #${eq.department_id}`}</strong>
                  </div>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <span className={`badge ${isOut ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '0.72rem' }}>
                    {isOut ? '🟠 OUT (In Transit)' : '🟢 IN'}
                  </span>
                  {isCrossDept ? (
                    <span style={{ fontSize: '0.68rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                      ⇄ Move to {reader.department_name}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {isOut ? 'Swipe will return to 🟢 IN' : 'Swipe will exit to 🟠 OUT'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Action Preview Callout */}
        {(() => {
          const activeEq = rfidEquipments.find(e => (e.rfid_tag_id === selectedCard || e.rfid_card_hex === selectedCard));
          if (!activeEq || customCard) return null;
          const isCross = reader.department_id && Number(activeEq.department_id) !== Number(reader.department_id);
          const isOut = activeEq.transit_status === 'OUT';

          return (
            <div style={{
              padding: '8px 12px',
              backgroundColor: isCross ? 'rgba(37, 99, 235, 0.08)' : (isOut ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)'),
              borderLeft: `4px solid ${isCross ? 'var(--color-primary)' : (isOut ? 'var(--color-success)' : 'var(--color-warning)')}`,
              borderRadius: 'var(--radius-sm)',
              marginBottom: '12px',
              fontSize: '0.78rem'
            }}>
              <strong>Action Preview: </strong>
              {isCross ? (
                <span>
                  Asset will <strong>relocate</strong> from <em>{activeEq.department_name || `Dept #${activeEq.department_id}`}</em> to <strong>{reader.department_name}</strong> and be marked as <strong style={{ color: 'var(--color-success)' }}>🟢 IN Department</strong>.
                </span>
              ) : isOut ? (
                <span>
                  Asset will <strong>return</strong> to <strong>{reader.department_name}</strong> and be marked as <strong style={{ color: 'var(--color-success)' }}>🟢 IN Department</strong>.
                </span>
              ) : (
                <span>
                  Asset will <strong>exit</strong> <strong>{reader.department_name}</strong> and be marked as <strong style={{ color: 'var(--color-warning)' }}>🟠 OUT (In Transit)</strong>.
                </span>
              )}
            </div>
          );
        })()}

        {/* Custom Card UID Input */}
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
            Or Enter Specific RFID Card / Tag UID:
          </label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. 6F4244DB or BMEOTANES008..."
            value={customCard}
            onChange={(e) => setCustomCard(e.target.value)}
            style={{ fontSize: '0.84rem' }}
          />
        </div>
      </div>
    </Modal>
  );
}
