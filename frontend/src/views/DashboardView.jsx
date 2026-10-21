import React, { useState, useEffect } from 'react';
import { 
  fetchDashboardStats, 
  updateComplaint 
} from '../services/api';
import { 
  Layers, 
  Activity, 
  AlertOctagon, 
  CheckSquare, 
  Clock, 
  DollarSign, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowUpRight, 
  Radio, 
  Plus, 
  TrendingUp, 
  Building2, 
  CheckCircle2, 
  ExternalLink 
} from 'lucide-react';

export default function DashboardView({
  onViewEquipmentPassport,
  onOpenChecklistRunner,
  onOpenBookComplaint,
  onOpenNewEquipment,
  onOpenRfidScanner,
  onShowToast
}) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetchDashboardStats();
      setStats(res.data);
    } catch (err) {
      console.error(err);
      onShowToast({ type: 'error', title: 'Error', message: 'Failed to load dashboard metrics' });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickResolveTicket = async (ticket) => {
    try {
      await updateComplaint({
        id: ticket.id,
        status: 'Repaired & Verified',
        action_taken: 'Biomedical emergency response verification completed. Device tested and returned to clinical duty.',
        downtime_hours: 1.5,
        resolved_at: new Date().toISOString()
      });
      onShowToast({
        type: 'success',
        title: 'Ticket Resolved',
        message: `${ticket.ticket_number} marked as Repaired & Verified! Equipment returned to Operational status.`
      });
      loadDashboard();
    } catch (err) {
      onShowToast({ type: 'error', title: 'Update Failed', message: err.message });
    }
  };

  if (loading || !stats) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Activity size={36} className="animate-spin" style={{ margin: '0 auto 16px', color: 'var(--color-primary)' }} />
        <div style={{ fontWeight: 600 }}>Loading Hospital Clinical Engineering Analytics...</div>
      </div>
    );
  }

  const counts = stats.counts || {};
  const complaints = stats.complaints || {};
  const pmSchedules = stats.pm_schedules || {};
  const uptime = stats.uptime_percentage || 100.0;
  const recentComplaints = stats.recent_complaints || [];
  const recentMaintenance = stats.recent_maintenance || [];
  const departments = stats.departments || [];

  return (
    <div>
      {/* Welcome & Quick Action Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        flexWrap: 'wrap', 
        gap: '16px', 
        marginBottom: '28px' 
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Clinical Engineering Operations Center</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Real-time Biomedical Asset Tracking, WHO-Standard Preventive Maintenance & Breakdown Tickets
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={onOpenRfidScanner}
          >
            <Radio size={15} style={{ color: 'var(--color-accent)' }} />
            RFID Zone Scanner
          </button>
          <button 
            type="button" 
            className="btn btn-primary btn-sm"
            onClick={onOpenNewEquipment}
          >
            <Plus size={15} />
            Register Asset
          </button>
          <button 
            type="button" 
            className="btn-book-complaint btn-sm"
            onClick={() => onOpenBookComplaint(null)}
          >
            <AlertOctagon size={16} />
            Emergency Complaint
          </button>
        </div>
      </div>

      {/* Top Stat KPI Widgets */}
      <div className="stats-grid">
        <div className="stat-widget" style={{ '--widget-accent': '#0284c7', '--widget-bg': 'var(--color-primary-subtle)' }}>
          <div className="stat-icon-wrap">
            <Layers size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Equipment Master</span>
            <span className="stat-value">{counts.total_equipments || 0}</span>
            <span className="stat-subtitle">
              Valued at ${Number(counts.total_asset_value || 0).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="stat-widget" style={{ '--widget-accent': '#10b981', '--widget-bg': 'var(--color-success-subtle)' }}>
          <div className="stat-icon-wrap">
            <Activity size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Fleet Operational Uptime</span>
            <span className="stat-value">{uptime}%</span>
            <span className="stat-subtitle">
              {counts.operational || 0} of {counts.total_equipments || 0} units active
            </span>
          </div>
        </div>

        <div className="stat-widget" style={{ '--widget-accent': '#ef4444', '--widget-bg': 'var(--color-danger-subtle)' }}>
          <div className="stat-icon-wrap">
            <AlertOctagon size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Active Breakdown Tickets</span>
            <span className="stat-value">{complaints.active_complaints || 0}</span>
            <span className="stat-subtitle" style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
              {complaints.critical_active_complaints || 0} Critical Life-Support
            </span>
          </div>
        </div>

        <div className="stat-widget" style={{ '--widget-accent': '#f59e0b', '--widget-bg': 'var(--color-warning-subtle)' }}>
          <div className="stat-icon-wrap">
            <CheckSquare size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">PM Schedule Compliance</span>
            <span className="stat-value">{pmSchedules.pm_overdue || 0}</span>
            <span className="stat-subtitle">
              Overdue • {pmSchedules.pm_due_soon || 0} Due in 30 Days
            </span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        
        {/* Left: Active Breakdown Tickets */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <AlertOctagon size={20} style={{ color: 'var(--color-danger)' }} />
              Active Breakdown & Corrective Work Orders
            </h3>
            <span className="badge badge-danger">
              {recentComplaints.filter(c => c.status !== 'Closed' && c.status !== 'Repaired & Verified').length} Pending
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentComplaints.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                No active complaints. All hospital biomedical systems operating normally!
              </div>
            ) : (
              recentComplaints.map((c) => {
                const isResolved = c.status === 'Closed' || c.status === 'Repaired & Verified';
                return (
                  <div 
                    key={c.id} 
                    style={{ 
                      padding: '14px 16px', 
                      borderRadius: 'var(--radius-md)', 
                      border: '1px solid var(--border-color)',
                      backgroundColor: isResolved ? 'var(--bg-subtle)' : 'var(--bg-surface)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontFamily: 'var(--font-mono)' }}>{c.ticket_number}</strong>
                        <span className={`badge ${
                          c.priority.includes('Critical') ? 'badge-danger' : 
                          c.priority.includes('High') ? 'badge-warning' : 'badge-neutral'
                        }`}>
                          {c.priority}
                        </span>
                      </div>
                      <span className={`badge ${isResolved ? 'badge-success' : 'badge-danger'}`}>
                        {c.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                      <span 
                        style={{ cursor: 'pointer', color: 'var(--color-primary)', textDecoration: 'underline' }}
                        onClick={() => onViewEquipmentPassport(c.equipment_id)}
                      >
                        {c.equipment_name}
                      </span>{' '}
                      • {c.department_name} ({c.room_or_bed})
                    </div>

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {c.description}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color-subtle)', paddingTop: '6px' }}>
                      <div>Reported: {new Date(c.reported_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by {c.booked_by_name}</div>
                      {!isResolved && (
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm"
                          style={{ padding: '2px 8px', fontSize: '0.74rem' }}
                          onClick={() => handleQuickResolveTicket(c)}
                        >
                          <CheckCircle2 size={13} /> Mark Repaired & Ready
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Preventive Maintenance Activity */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <CheckSquare size={20} style={{ color: 'var(--color-primary)' }} />
              Recent PM Inspections & Calibrations
            </h3>
            <span className="badge badge-info">{recentMaintenance.length} Certified Logs</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentMaintenance.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                No maintenance records executed recently.
              </div>
            ) : (
              recentMaintenance.map((m) => (
                <div 
                  key={m.id} 
                  style={{ 
                    padding: '14px 16px', 
                    borderRadius: 'var(--radius-md)', 
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontFamily: 'var(--font-mono)' }}>{m.work_order_no}</strong>
                      <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                        {m.maintenance_type}
                      </span>
                    </div>
                    <span className={`badge ${m.overall_result.includes('Passed') ? 'badge-success' : 'badge-danger'}`}>
                      {m.overall_result}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                    <span 
                      style={{ cursor: 'pointer', color: 'var(--color-primary)', textDecoration: 'underline' }}
                      onClick={() => onViewEquipmentPassport(m.equipment_id)}
                    >
                      {m.equipment_name}
                    </span>{' '}
                    • {m.department_name}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <div>Inspector: <strong>{m.performed_by}</strong></div>
                    <div>Next Due: <strong style={{ color: 'var(--color-warning)' }}>{m.next_pm_due_date}</strong></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Hospital Department Equipment Distribution */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Building2 size={20} style={{ color: 'var(--color-accent)' }} />
            Hospital Department Asset Distribution & Status
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          {departments.map((d) => (
            <div 
              key={d.id} 
              style={{ 
                padding: '14px 16px', 
                borderRadius: 'var(--radius-md)', 
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-color)' 
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <strong style={{ fontSize: '0.92rem' }}>{d.name}</strong>
                <span className="badge badge-info">{d.total_devices || 0} Units</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {d.building} • {d.floor}
              </div>
              {d.breakdown_devices > 0 && (
                <div style={{ marginTop: '6px', fontSize: '0.76rem', color: 'var(--color-danger)', fontWeight: 600 }}>
                  ⚠️ {d.breakdown_devices} unit(s) under breakdown
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
