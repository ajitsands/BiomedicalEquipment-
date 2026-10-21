import React from 'react';
import Modal from './Modal';
import { 
  MapPin, 
  Headphones, 
  PhoneCall, 
  MessageCircle, 
  Mail, 
  Globe, 
  Sparkles, 
  ExternalLink 
} from 'lucide-react';

export default function SandsSupportModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const phoneNumber = '+973 35078079';
  const cleanPhone = '97335078079';
  const websiteUrl = 'https://sandslab.com';
  const productsUrl = 'https://sandslab.com/products';
  const supportEmail = 'support@sandslab.com';
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=Hello%20SanDS%20Lab%20Support%2C%20I%20am%20inquiring%20about%20BioTrack%20CMMS%20and%20Biomedical%20Solutions.`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="SaNDS Lab Help Line & Vendor Support"
      size="sm"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            style={{ minWidth: '90px' }}
          >
            Close
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Logo Card with subtle border */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
        }}>
          <img 
            src="/sands_logo.png" 
            alt="SaNDS Lab Middle East W.L.L." 
            style={{ maxHeight: '64px', width: 'auto', objectFit: 'contain' }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>

        {/* Company Title & Location Badge */}
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ 
            margin: '0 0 6px 0', 
            fontSize: '1.3rem', 
            fontWeight: 800, 
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em'
          }}>
            SaNDS Lab Middle East W.L.L.
          </h2>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '6px', 
            padding: '4px 14px', 
            borderRadius: '999px', 
            backgroundColor: 'rgba(238, 242, 255, 0.85)', 
            border: '1px solid #c7d2fe', 
            color: '#4f46e5', 
            fontSize: '0.82rem', 
            fontWeight: 600 
          }}>
            <MapPin size={14} style={{ color: '#6366f1' }} />
            <span>Salmabad, Kingdom of Bahrain</span>
          </div>
        </div>

        {/* Direct Vendor Help Line Status Banner */}
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #86efac',
          borderRadius: '14px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            flexShrink: 0,
            boxShadow: '0 4px 10px rgba(22, 163, 74, 0.25)'
          }}>
            <Headphones size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#166534', fontSize: '0.9rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }}></span>
              Direct Vendor Help Line Available
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px', lineHeight: 1.35 }}>
              For Software Key Activation, License Renewal, or Technical Assistance:
            </div>
          </div>
        </div>

        {/* 1. Phone Call Action Button */}
        <a
          href={`tel:${cleanPhone}`}
          style={{
            textDecoration: 'none',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            borderRadius: '12px',
            padding: '13px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 99, 235, 0.35)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.25)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <PhoneCall size={18} style={{ color: '#ffffff' }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.94rem', color: '#ffffff' }}>
                Call Help Line Hotline
              </div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.9)' }}>
                {phoneNumber} • Voice Call Support
              </div>
            </div>
          </div>
          <ExternalLink size={18} style={{ color: 'rgba(255, 255, 255, 0.85)' }} />
        </a>

        {/* 2. WhatsApp Action Button */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            textDecoration: 'none',
            backgroundColor: '#16a34a',
            color: '#ffffff',
            borderRadius: '12px',
            padding: '13px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(22, 163, 74, 0.35)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(22, 163, 74, 0.25)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <MessageCircle size={18} style={{ color: '#ffffff' }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.94rem', color: '#ffffff' }}>
                Instant WhatsApp Chat
              </div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.9)' }}>
                {phoneNumber} • Live Instant Assistance
              </div>
            </div>
          </div>
          <ExternalLink size={18} style={{ color: 'rgba(255, 255, 255, 0.85)' }} />
        </a>

        {/* 3. Email Support Card */}
        <a
          href={`mailto:${supportEmail}?subject=BioTrack%20CMMS%20Support%20Inquiry`}
          style={{
            textDecoration: 'none',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            borderRadius: '12px',
            padding: '13px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-xs)',
            transition: 'all 0.15s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.borderColor = 'var(--color-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = 'var(--border-color)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'rgba(244, 63, 94, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Mail size={18} style={{ color: '#f43f5e' }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--text-primary)' }}>
                Email Vendor Support
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {supportEmail}
              </div>
            </div>
          </div>
          <ExternalLink size={18} style={{ color: 'var(--text-muted)' }} />
        </a>

        {/* 4. Dual Outlined Buttons (Website & Explore Products) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '2px' }}>
          <a
            href={websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline"
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 14px',
              fontSize: '0.86rem',
              fontWeight: 600,
              borderRadius: '10px'
            }}
          >
            <Globe size={16} style={{ color: 'var(--color-primary)' }} />
            <span>www.sandslab.com</span>
          </a>

          <a
            href={productsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline"
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 14px',
              fontSize: '0.86rem',
              fontWeight: 600,
              borderRadius: '10px'
            }}
          >
            <Sparkles size={16} style={{ color: '#ec4899' }} />
            <span>Explore Products</span>
          </a>
        </div>

      </div>
    </Modal>
  );
}
