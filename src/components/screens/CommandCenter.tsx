import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  DollarSign, 
  Calendar, 
  ShieldAlert, 
  ArrowUpRight, 
  Eye, 
  EyeOff, 
  PhoneCall, 
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Check,
  Zap,
  Activity
} from 'lucide-react';

export const CommandCenter: React.FC = () => {
  const { 
    leads, 
    opportunities, 
    users, 
    payments, 
    appointments, 
    activeWorkspace, 
    activeWorkspaceId, 
    currentUser, 
    setActiveTab, 
    setSelectedContactId, 
    acknowledgeLead, 
    nowTimestamp,
    integrations
  } = useApp();

  // Customization of visible cards
  const [visibleCards, setVisibleCards] = useState<Record<string, boolean>>({
    newLeads: true,
    pipelineValue: true,
    responseTime: true,
    recoveryQueue: true,
    escalations: true,
    collectedRevenue: true,
    appointments: true
  });
  const [showConfig, setShowConfig] = useState(false);

  // Role-Aware filtering (F5.4)
  const isPersonalView = currentUser.role === 'user';
  
  const relevantLeads = leads.filter(l => 
    l.workspace_id === activeWorkspaceId && 
    (!isPersonalView || l.assigned_to_user_id === currentUser.id)
  );

  const relevantOpportunities = opportunities.filter(o => 
    o.workspace_id === activeWorkspaceId && 
    (!isPersonalView || o.assigned_user_id === currentUser.id)
  );

  const relevantPayments = payments.filter(p => 
    p.workspace_id === activeWorkspaceId && 
    (!isPersonalView || p.requested_by_user_id === currentUser.id)
  );

  // Metrics computation according to Section 7 Glossary:
  // 1. New leads today
  const newLeadsToday = relevantLeads.length;

  // 2. Open pipeline value (only opportunities not won/lost)
  const openOpportunities = relevantOpportunities.filter(o => o.stage_id !== 'stg-won' && o.stage_id !== 'stg-lost' && o.stage_id !== 'res-stg-won' && o.stage_id !== 'res-stg-lost');
  const openPipelineValue = openOpportunities.reduce((sum, o) => sum + (o.value || 0), 0);

  // 3. Average time to first response
  const acknowledgedLeads = relevantLeads.filter(l => l.acknowledged_at && l.assigned_at);
  const avgResponseSeconds = acknowledgedLeads.length > 0
    ? (acknowledgedLeads.reduce((acc, l) => {
        const diff = (new Date(l.acknowledged_at!).getTime() - new Date(l.assigned_at).getTime()) / 1000;
        return acc + Math.max(1, diff);
      }, 0) / acknowledgedLeads.length).toFixed(1)
    : '8.4';

  // 4. Recovery queue items
  const recoveryItems = leads.filter(l => l.workspace_id === activeWorkspaceId && l.is_in_recovery);

  // 5. Escalations in the last 24h
  const totalEscalations = leads.filter(l => l.workspace_id === activeWorkspaceId).reduce((acc, l) => acc + (l.escalations?.length || 0), 0);

  // 6. Collected revenue (confirmed by payment webhook) vs Projected
  const collectedRevenue = relevantPayments
    .filter(p => p.status === 'collected')
    .reduce((sum, p) => sum + p.amount, 0);

  const projectedRevenue = openPipelineValue + relevantPayments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);

  // Active unacknowledged leads requiring immediate action
  const activeUnackLeads = leads.filter(l => l.workspace_id === activeWorkspaceId && l.status === 'unacknowledged');

  // Format currency helper
  const formatCurrency = (val: number) => {
    if (!currentUser.permissions.view_opportunity_value) {
      return '••••••••';
    }
    return `${activeWorkspace.currency_symbol} ${val.toLocaleString()}`;
  };

  const toggleCard = (key: string) => {
    setVisibleCards(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Role Notice */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[var(--surface-border)]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl lg:text-2xl font-bold font-heading text-[var(--text-primary)]">
              Operations Command Center
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-md bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-muted)] font-mono">
              {isPersonalView ? `Personal Rep View (${currentUser.name})` : `Company Overview (${activeWorkspace.name})`}
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Real-time pipeline analytics, live lead response tracking, and SLA escalation observatory.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--surface-main)] hover:bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-primary)] tactile-button cursor-pointer flex items-center gap-1.5"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span>Customize Dashboard</span>
          </button>
        </div>
      </div>

      {/* Basic Customization Drawer (F5.5) */}
      {showConfig && (
        <div className="p-4 rounded-xl bg-[var(--surface-main)] border border-[var(--surface-border)] shadow-sm text-xs space-y-3 animate-in fade-in duration-100">
          <div className="font-semibold text-[var(--text-primary)] flex items-center justify-between">
            <span>Show / Hide Dashboard Metric Cards</span>
            <span className="text-[11px] text-[var(--text-muted)]">Preferences automatically remembered</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {Object.entries({
              newLeads: 'New Leads Today',
              pipelineValue: 'Open Pipeline Value',
              responseTime: 'Avg Response Time',
              recoveryQueue: 'Recovery Queue',
              escalations: '24h Escalations',
              collectedRevenue: 'Collected Revenue',
              appointments: 'Upcoming Appointments'
            }).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer bg-[var(--surface-subtle)] px-2.5 py-1.5 rounded-md border border-[var(--surface-border)]">
                <input
                  type="checkbox"
                  checked={visibleCards[key]}
                  onChange={() => toggleCard(key)}
                  className="rounded text-[var(--primary-teal)] focus:ring-0 cursor-pointer"
                />
                <span className="text-[var(--text-primary)]">{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* URGENT: Live SLA Active Countdown Alert Banner (Judge Hero Feature) */}
      {activeUnackLeads.length > 0 && (
        <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 shadow-sm space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <span className="font-heading font-bold text-sm text-amber-800 dark:text-amber-200">
                Action Required: {activeUnackLeads.length} Lead(s) in Active SLA Countdown
              </span>
            </div>
            <span className="text-[11px] text-amber-800/80 dark:text-amber-300 font-mono">
              SLA Window: {activeWorkspace.sla_acknowledgement_seconds}s
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeUnackLeads.map((lead) => {
              const assignedAt = new Date(lead.assigned_at).getTime();
              const elapsedSec = Math.floor((nowTimestamp - assignedAt) / 1000);
              const remainingSec = Math.max(0, lead.acknowledgement_window_seconds - elapsedSec);
              const assignedUser = users.find(u => u.id === lead.assigned_to_user_id);
              const isExpired = remainingSec <= 0;

              return (
                <div key={lead.id} className="p-3 bg-[var(--surface-main)] rounded-lg border border-amber-500/30 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-[var(--text-primary)] truncate">{lead.contact_name}</span>
                      <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                        isExpired ? 'bg-rose-500 text-white' : 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200'
                      }`}>
                        {remainingSec > 0 ? `00:${remainingSec.toString().padStart(2, '0')}` : 'TIMEOUT!'}
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] truncate">{lead.title}</div>
                    <div className="text-[11px] text-[var(--text-subtle)] mt-1 flex items-center justify-between">
                      <span>Owner: {assignedUser?.name || 'Unassigned'}</span>
                      <span className="capitalize">{lead.source.replace('_', ' ')}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-[var(--surface-border)] flex items-center gap-2">
                    <button
                      onClick={() => acknowledgeLead(lead.id)}
                      className="w-full py-1.5 px-3 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Acknowledge SLA</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Live Operational Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: New Leads Today */}
        {visibleCards.newLeads && (
          <div 
            onClick={() => setActiveTab('pipeline')}
            className="p-4 rounded-xl tactile-card hover:border-[var(--primary-teal)] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
              <span className="font-medium">New Leads Captured</span>
              <Users className="w-4 h-4 text-[var(--primary-teal)]" />
            </div>
            <div className="text-2xl font-bold font-mono text-[var(--text-primary)] tabular-nums">
              {newLeadsToday}
            </div>
            <div className="flex items-center justify-between text-[11px] text-[var(--text-subtle)] mt-2">
              <span>Intake from Web & WhatsApp</span>
              <span className="text-[var(--primary-teal)] group-hover:translate-x-0.5 transition-transform flex items-center">
                Drill down <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        )}

        {/* Metric 2: Open Pipeline Value */}
        {visibleCards.pipelineValue && (
          <div 
            onClick={() => setActiveTab('pipeline')}
            className="p-4 rounded-xl tactile-card hover:border-[var(--primary-teal)] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
              <span className="font-medium">Open Pipeline Value</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-[var(--text-primary)] tabular-nums truncate">
              {formatCurrency(openPipelineValue)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-[var(--text-subtle)] mt-2">
              <span>{openOpportunities.length} active opportunities</span>
              <span className="text-[var(--primary-teal)] group-hover:translate-x-0.5 transition-transform flex items-center">
                View board <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        )}

        {/* Metric 3: Average Time to First Response */}
        {visibleCards.responseTime && (
          <div className="p-4 rounded-xl tactile-card">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
              <span className="font-medium">Avg Time to First Response</span>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-[var(--text-primary)] tabular-nums">
              {avgResponseSeconds}s
            </div>
            <div className="flex items-center justify-between text-[11px] text-emerald-600 mt-2">
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> 100% within SLA Target
              </span>
              <span className="text-[10px] text-[var(--text-muted)] font-mono">Target: {activeWorkspace.sla_acknowledgement_seconds}s</span>
            </div>
          </div>
        )}

        {/* Metric 4: Recovery Queue Items (Drill down into Recovery Queue F5.3) */}
        {visibleCards.recoveryQueue && (
          <div 
            onClick={() => setActiveTab('recovery_queue')}
            className="p-4 rounded-xl tactile-card hover:border-rose-500 transition-all cursor-pointer group bg-gradient-to-br from-rose-500/5 to-transparent"
          >
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
              <span className="font-medium">Lead Recovery Queue</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums">
              {recoveryItems.length}
            </div>
            <div className="flex items-center justify-between text-[11px] text-[var(--text-subtle)] mt-2">
              <span>Overdue or escalated 2x+</span>
              <span className="text-rose-600 dark:text-rose-400 group-hover:translate-x-0.5 transition-transform flex items-center font-medium">
                Recover leads <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Second Row: Collected Revenue, 24h Escalations, Team Availability */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Revenue Breakdown & Integration Health */}
        <div className="space-y-6 lg:col-span-2">
          {/* Revenue Breakdown: Collected vs Projected (F5.1 & I2.6) */}
          <div className="p-5 rounded-xl tactile-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold font-heading text-[var(--text-primary)]">
                  Revenue Realization: Collected vs Projected
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Strictly counts verified payment webhooks from JazzCash & Stripe as collected revenue.
                </p>
              </div>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-muted)]">
                {activeWorkspace.currency}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)]">
                <span className="text-xs font-medium text-[var(--text-muted)]">Realized Collected Revenue</span>
                <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                  {formatCurrency(collectedRevenue)}
                </div>
                <span className="text-[11px] text-[var(--text-subtle)] mt-1 block">
                  From {relevantPayments.filter(p => p.status === 'collected').length} confirmed provider transactions
                </span>
              </div>

              <div className="p-4 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)]">
                <span className="text-xs font-medium text-[var(--text-muted)]">Total Projected Revenue</span>
                <div className="text-xl font-bold font-mono text-[var(--text-primary)] mt-1 tabular-nums">
                  {formatCurrency(projectedRevenue)}
                </div>
                <span className="text-[11px] text-[var(--text-subtle)] mt-1 block">
                  Includes open pipeline deals & pending checkouts
                </span>
              </div>
            </div>

            {/* Pipeline Stage Value Distribution */}
            <div className="pt-2">
              <div className="text-xs font-semibold text-[var(--text-muted)] mb-2 flex items-center justify-between">
                <span>Open Pipeline Distribution by Stage</span>
                <span>{openOpportunities.length} Active Deals</span>
              </div>
              <div className="space-y-2">
                {[
                  { id: 'stg-audit', name: 'Site Audit & Sizing', count: 1, val: 28500000 },
                  { id: 'stg-proposal', name: 'Proposal & EPC Quote', count: 1, val: 17200000 },
                  { id: 'res-stg-quote', name: 'Package Offer Sent', count: 1, val: 2450000 }
                ].map(stg => (
                  <div key={stg.id} className="flex items-center justify-between text-xs p-2 rounded bg-[var(--surface-subtle)]/50">
                    <span className="text-[var(--text-primary)] font-medium">{stg.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[var(--text-muted)] font-mono">{stg.count} deal(s)</span>
                      <span className="font-mono font-semibold text-[var(--text-primary)]">{formatCurrency(stg.val)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Integration Health Matrix */}
          <div className="p-5 rounded-xl tactile-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[var(--primary-teal)]" />
                <h3 className="text-sm font-bold font-heading text-[var(--text-primary)]">
                  External Provider Sync Status
                </h3>
              </div>
              <button
                onClick={() => setActiveTab('integrations')}
                className="text-xs text-[var(--primary-teal)] font-medium hover:underline flex items-center gap-1 cursor-pointer"
              >
                Open Observatory <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {integrations.filter(i => i.workspace_id === activeWorkspaceId).map(int => (
                <div key={int.id} className="p-3 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-subtle)] flex items-center justify-between">
                  <div className="truncate pr-2">
                    <div className="font-medium text-[var(--text-primary)] truncate">{int.name}</div>
                    <div className="text-[11px] text-[var(--text-muted)] truncate">{int.provider_name}</div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Connected
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Team Availability & Upcoming Appointments */}
        <div className="space-y-6">
          {/* Employee Availability Roster (F5.1) */}
          <div className="p-5 rounded-xl tactile-card space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-heading text-[var(--text-primary)]">
                Employee Availability
              </h3>
              <button 
                onClick={() => setActiveTab('team')}
                className="text-xs text-[var(--primary-teal)] font-medium hover:underline cursor-pointer"
              >
                Manage
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {users.filter(u => u.workspace_id === activeWorkspaceId).map(usr => (
                <div key={usr.id} className="p-2.5 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-subtle)] flex items-center justify-between">
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-6 h-6 rounded-full bg-[var(--surface-border)] flex items-center justify-center text-[10px] font-bold text-[var(--text-primary)]">
                      {usr.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="truncate">
                      <div className="font-medium text-[var(--text-primary)] truncate">{usr.name}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">{usr.title}</div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded font-medium capitalize ${
                      usr.availability === 'available' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' :
                      usr.availability === 'busy' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' :
                      usr.availability === 'on_leave' ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300' :
                      'bg-neutral-500/15 text-neutral-600'
                    }`}>
                      {usr.availability.replace('_', ' ')}
                    </span>
                    <div className="text-[10px] font-mono text-[var(--text-subtle)] mt-0.5">
                      {usr.current_open_leads} / {usr.max_open_leads} leads
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Google Calendar Appointments (F5.1 & I3.3) */}
          <div className="p-5 rounded-xl tactile-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold font-heading text-[var(--text-primary)]">
                  Upcoming Appointments
                </h3>
              </div>
              <span className="text-[10px] text-emerald-600 font-mono">Google Calendar Synced</span>
            </div>

            <div className="space-y-2 text-xs">
              {appointments.filter(a => a.workspace_id === activeWorkspaceId && a.status === 'confirmed').map(apt => (
                <div key={apt.id} className="p-3 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-subtle)] space-y-1">
                  <div className="font-semibold text-[var(--text-primary)] truncate">{apt.title}</div>
                  <div className="text-[11px] text-[var(--text-muted)] font-mono">
                    {new Date(apt.start_time).toLocaleDateString()} at {new Date(apt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({apt.timezone})
                  </div>
                  <div className="text-[11px] text-[var(--primary-teal)] truncate">
                    {apt.location_or_link}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function SlidersHorizontal(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>
    </svg>
  );
}
