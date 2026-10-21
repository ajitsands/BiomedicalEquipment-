import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  icon: Icon = null,
  size = 'md', // 'sm', 'md', 'lg', 'xl'
  children,
  footer = null,
  maxWidth = null,
  style = {}
}) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cardStyle = {
    ...style,
    ...(maxWidth ? { maxWidth } : {})
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className={`modal-content-card modal-${size}`} 
        style={cardStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header-bar">
          <div className="modal-title-group">
            {Icon && (
              <div style={{ 
                width: '36px', 
                height: '36px', 
                borderRadius: '8px', 
                backgroundColor: 'var(--color-primary-subtle)', 
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Icon size={20} />
              </div>
            )}
            <h3 style={{ fontSize: '1.18rem', fontWeight: 700 }}>{title}</h3>
          </div>
          <button 
            type="button" 
            className="btn btn-secondary btn-icon" 
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body-scroll">
          {children}
        </div>

        {footer && (
          <div className="modal-footer-bar">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
