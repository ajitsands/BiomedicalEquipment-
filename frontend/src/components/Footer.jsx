import React from 'react';
import { ShieldCheck, Smartphone, Sparkles, MessageSquare } from 'lucide-react';

export default function Footer({ theme, onOpenSandsSupport, onOpenComplianceModal }) {
  return (
    <footer className="app-footer">
      {/* Brand & Vendor Info */}
      <div 
        className="footer-powered-by"
        onClick={onOpenSandsSupport}
        style={{ 
          cursor: 'pointer', 
          userSelect: 'none',
          padding: '6px 12px',
          borderRadius: '10px',
          transition: 'all 0.2s ease'
        }}
        title="Click to view SaNDS Lab Vendor Support, WhatsApp & Products"
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(236, 72, 153, 0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <img 
          src={theme === 'dark' ? '/sands_logo_white.png' : '/sands_logo.png'} 
          alt="SanDS Lab Logo" 
          style={{ height: '34px', width: 'auto', objectFit: 'contain' }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <div>
          <span style={{ fontSize: '0.9rem' }}>
            Powered and Engineered by{' '}
            <strong className="footer-brand-gradient">
              SanDS Lab Middle East W.L.L
            </strong>
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '3px' }}>
            <span>Biomedical Asset Lifecycle & Maintenance</span>
            <span style={{ color: 'var(--border-color)' }}>•</span>
            <span className="footer-whatsapp-pill">
              <MessageSquare size={12} /> WhatsApp +973 35078079
            </span>
          </div>
        </div>
      </div>

      {/* Compliance & Mobile Ready Badges with Blue-Pink Combo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onOpenSandsSupport}
          className="footer-explore-btn"
          title="Explore SaNDS Lab Enterprise Solutions"
        >
          <Sparkles size={14} />
          <span>Explore Products</span>
        </button>

        <button
          type="button"
          onClick={onOpenComplianceModal}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            fontSize: '0.8rem', 
            color: '#0284c7',
            background: 'rgba(2, 132, 199, 0.08)',
            border: '1px solid rgba(2, 132, 199, 0.25)',
            padding: '5px 10px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.2s ease'
          }}
          title="Click to view WHO & IEC 62353 Compliance Details, Standards & Safety Limits"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(2, 132, 199, 0.16)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(2, 132, 199, 0.08)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <ShieldCheck size={16} style={{ color: '#0284c7' }} />
          <span>WHO & IEC 62353 Compliant</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <Smartphone size={16} style={{ color: '#ec4899' }} />
          <span>Phase 2 Mobile Ready (iOS / Android)</span>
        </div>

        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          © {new Date().getFullYear()} All Rights Reserved
        </div>
      </div>
    </footer>
  );
}
