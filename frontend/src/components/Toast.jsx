import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export default function ToastContainer({ toasts = [], onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        let Icon = CheckCircle2;
        let colorClass = 'success';

        if (toast.type === 'error' || toast.type === 'danger') {
          Icon = AlertCircle;
          colorClass = 'danger';
        } else if (toast.type === 'warning') {
          Icon = AlertTriangle;
          colorClass = 'warning';
        } else if (toast.type === 'info') {
          Icon = Info;
          colorClass = 'info';
        }

        return (
          <div key={toast.id} className={`toast-card ${colorClass}`}>
            <Icon size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              {toast.title && (
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '2px' }}>
                  {toast.title}
                </div>
              )}
              <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                {toast.message}
              </div>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
