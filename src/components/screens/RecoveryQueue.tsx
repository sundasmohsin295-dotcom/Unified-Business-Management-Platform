import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  AlertTriangle, 
  ShieldAlert, 
  UserCheck, 
  Clock, 
  PhoneCall, 
  MessageSquare, 
  ArrowRight, 
  CheckCircle, 
  Users, 
  Sparkles,
  AlertCircle,
  ExternalLink,
  Send,
  Zap
} from 'lucide-react';
import { Lead } from '../../types';

export const RecoveryQueue: React.FC = () => {
  const { 
    leads, 
    users, 
    activeWorkspace, 
    activeWorkspaceId, 
    currentUser, 
    acknowledgeLead, 
    reassignLead, 
    escalateLead,
    setSelectedContactId, 
    setActiveTab, 
    nowTimestamp, 
    showToast 
  } = useApp();

  const [selectedLeadForReassign, setSelectedLeadForReassign] = useState<Lead | null>(null);
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [reassignReason, setReassignReason] = useState<string>('Manual recovery reallocation');

  // Filter for leads in recovery (F3.7):
  // 1. Explicitly flagged is_in_recovery
  // 2. Escalated 1+ times
  // 3. Status is 'unacknowledged' beyond its window
  const recoveryLeads = leads.filter(l => {
    if (l.workspace_id !== activeWorkspaceId) return false;
    if (l.is_in_recovery) return true;
    if (l.escalation_level > 0) return true;
    if (l.status === 'escalated') return true;
    
    // Check if unacknowledged beyond window
    if (l.status === 'unacknowledged') {
      const assignedAt = new Date(l.assigned_at).getTime();
      const elapsed = (nowTimestamp - assignedAt) / 1000;
      if (elapsed > l.acknowledgement_window_seconds) return true;
    }
    return false;
  });

  const handleExecuteReassign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadForReassign || !targetUserId) return;
    reassignLead(selectedLeadForReassign.id, targetUserId, reassignReason);
    setSelectedLeadForReassign(null);
  };

  const handleSendUrgentAlert = (lead: Lead) => {
    const owner = users.find(u => u.id === lead.assigned_to_user_id);
    const dest = owner?.external_notification_destination?.bizsms_phone || owner?.phone || '+92 300 0000000';
    showToast(`⚡ High-Priority BizSMS dispatch re-sent to ${owner?.name} (${dest})`, 'info');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[var(--surface-border)]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl lg:text-2xl font-bold font-heading text-[var(--text-primary)]">
              Lead Recovery Queue
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
              {recoveryLeads.length} At Risk
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Failsafe holding area for unacknowledged leads, multi-escalated inquiries, and orphaned opportunities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[var(--text-muted)] font-mono">
            Zero-Lead-Loss Architecture Active
          </span>
        </div>
      </div>

      {/* SLA Protection Protocol Banner */}
      <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-heading font-bold text-sm text-[var(--text-primary)] block">
              Automated Escalation & Protection Protocol
            </span>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
              When an assigned representative fails to acknowledge within {activeWorkspace.sla_acknowledgement_seconds}s, the lead immediately escalates to a backup, alerts their phone via BizSMS, and appears here with an immutable audit footprint.
            </p>
          </div>
        </div>
      </div>

      {/* Recovery Queue Records */}
      {recoveryLeads.length === 0 ? (
        <div className="p-12 text-center rounded-xl tactile-card space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h3 className="font-heading font-bold text-sm text-[var(--text-primary)]">
            Zero Lost Leads — Recovery Queue Clear!
          </h3>
          <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
            All captured inbound leads have been acknowledged within their SLA windows. You can use the Judge Live Evaluator bar above to inject a simulated lead and observe the timeout cycle.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {recoveryLeads.map((lead) => {
            const assignedUser = users.find(u => u.id === lead.assigned_to_user_id);
            const assignedAt = new Date(lead.assigned_at).getTime();
            const elapsedSeconds = Math.floor((nowTimestamp - assignedAt) / 1000);
            const isOverdue = elapsedSeconds > lead.acknowledgement_window_seconds;

            return (
              <div
                key={lead.id}
                className="p-5 rounded-xl tactile-card border-l-4 border-l-rose-500 space-y-4 hover:border-[var(--primary-teal)] transition-all"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-heading font-bold text-base text-[var(--text-primary)]">
                        {lead.contact_name}
                      </h3>
                      <span className="text-xs text-[var(--text-muted)]">·</span>
                      <span className="text-xs text-[var(--text-muted)] font-medium">
                        {lead.company_name || 'Individual Prospect'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--surface-border)] capitalize">
                        Source: {lead.source.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                        Level {lead.escalation_level} Escalation
                      </span>
                    </div>

                    <div className="text-xs text-rose-700 dark:text-rose-300 font-medium mt-1 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{lead.recovery_reason || 'Unacknowledged beyond SLA window.'}</span>
                    </div>
                  </div>

                  {/* Overdue Timer Indicator */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-right">
                      <span className="text-[10px] text-rose-600 block uppercase font-mono">Overdue Duration</span>
                      <span className="text-sm font-mono font-bold text-rose-700 dark:text-rose-300 tabular-nums">
                        +{Math.floor(elapsedSeconds / 60)}m {(elapsedSeconds % 60).toString().padStart(2, '0')}s
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dossier Details & Escalation Chain */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-lg bg-[var(--surface-subtle)] text-xs">
                  <div>
                    <span className="text-[10px] text-[var(--text-subtle)] block uppercase font-medium">Current Accountable Owner</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-semibold text-[var(--text-primary)]">{assignedUser?.name || 'Unassigned'}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">({assignedUser?.title})</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-[var(--text-subtle)] block uppercase font-medium">Customer Contact Details</span>
                    <div className="font-mono text-[var(--text-primary)] mt-0.5 truncate">
                      {lead.contact_phone} · {lead.contact_email}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-[var(--text-subtle)] block uppercase font-medium">Estimated Deal Worth</span>
                    <div className="font-mono font-bold text-[var(--text-primary)] mt-0.5">
                      {currentUser.permissions.view_opportunity_value ? `${activeWorkspace.currency_symbol} ${(lead.value || 0).toLocaleString()}` : '••••••••'}
                    </div>
                  </div>
                </div>

                {/* Escalation Trail Audit (F3.5 & F3.9) */}
                {lead.escalations && lead.escalations.length > 0 && (
                  <div className="space-y-1.5 text-xs">
                    <span className="text-[10px] text-[var(--text-subtle)] block uppercase font-medium">Escalation Hop History</span>
                    <div className="space-y-1">
                      {lead.escalations.map((esc, idx) => {
                        const from = users.find(u => u.id === esc.from_user_id)?.name || 'Rep';
                        const to = users.find(u => u.id === esc.to_user_id)?.name || 'Backup';

                        return (
                          <div key={idx} className="flex items-center justify-between p-2 rounded bg-[var(--surface-main)] border border-[var(--surface-border)] text-[11px]">
                            <div className="flex items-center gap-2 truncate">
                              <span className="font-medium text-[var(--text-primary)]">{from}</span>
                              <ArrowRight className="w-3 h-3 text-[var(--text-subtle)]" />
                              <span className="font-semibold text-[var(--primary-teal)]">{to}</span>
                              <span className="text-[var(--text-muted)] truncate">— {esc.reason}</span>
                            </div>
                            <span className="text-[10px] font-mono text-[var(--text-subtle)] shrink-0 ml-2">
                              {esc.channel} Alert Dispatched
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Actions Toolbar (Acknowledge, Reassign, Call, WhatsApp) */}
                <div className="pt-2 border-t border-[var(--surface-border)] flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => acknowledgeLead(lead.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 tactile-button cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Acknowledge on Behalf</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedLeadForReassign(lead);
                        setTargetUserId(users.find(u => u.workspace_id === activeWorkspaceId && u.availability === 'available')?.id || users[0].id);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] text-[var(--text-primary)] font-medium flex items-center gap-1.5 tactile-button cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Manual Reassign</span>
                    </button>

                    <button
                      onClick={() => handleSendUrgentAlert(lead)}
                      className="px-3 py-1.5 rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Dispatch BizSMS Alert</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedContactId(lead.contact_id);
                        setActiveTab('customer_360');
                      }}
                      className="text-[var(--primary-teal)] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <span>Open Customer 360</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MANUAL REASSIGNMENT MODAL */}
      {selectedLeadForReassign && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl bg-[var(--surface-main)] border border-[var(--surface-border)] p-5 shadow-2xl space-y-4">
            <h3 className="font-heading font-bold text-sm text-[var(--text-primary)]">
              Reassign Lead: {selectedLeadForReassign.contact_name}
            </h3>

            <form onSubmit={handleExecuteReassign} className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-[var(--text-primary)] block mb-1">Select New Owner</label>
                <select
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-primary)]"
                >
                  {users.filter(u => u.workspace_id === activeWorkspaceId).map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.availability} · {u.current_open_leads}/{u.max_open_leads} leads)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-medium text-[var(--text-primary)] block mb-1">Reassignment Reason (Logged to Audit Trail)</label>
                <input
                  type="text"
                  required
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-primary)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--surface-border)]">
                <button
                  type="button"
                  onClick={() => setSelectedLeadForReassign(null)}
                  className="px-3 py-1.5 rounded-lg text-xs bg-[var(--surface-subtle)] text-[var(--text-primary)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[var(--primary-teal)] text-white shadow-sm cursor-pointer"
                >
                  Confirm Reassignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
