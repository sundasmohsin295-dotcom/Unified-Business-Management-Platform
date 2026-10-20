import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  User as UserIcon, 
  Calendar, 
  FileText, 
  Lock, 
  AlertCircle,
  Eye,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { AuditLogItem } from '../../types';

export const AuditLogView: React.FC = () => {
  const { auditLogs, activeWorkspace, activeWorkspaceId, currentUser } = useApp();

  const [selectedItem, setSelectedItem] = useState<AuditLogItem | null>(null);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Check permission (F4.2)
  if (!currentUser.permissions.view_audit_log) {
    return (
      <div className="p-12 text-center rounded-xl tactile-card space-y-3">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="font-heading font-bold text-sm text-[var(--text-primary)]">
          Access Restricted: Audit Log
        </h3>
        <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
          Your current user role ({currentUser.role.toUpperCase()}) does not possess the "view_audit_log" permission. Contact the Workspace Owner to request access.
        </p>
      </div>
    );
  }

  const workspaceLogs = auditLogs.filter(log => {
    if (log.workspace_id !== activeWorkspaceId) return false;
    if (filterAction !== 'all' && log.action_type !== filterAction) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchDetails = log.details.toLowerCase().includes(q);
      const matchTarget = log.target_label.toLowerCase().includes(q);
      const matchActor = log.actor_name.toLowerCase().includes(q);
      if (!matchDetails && !matchTarget && !matchActor) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[var(--surface-border)]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl lg:text-2xl font-bold font-heading text-[var(--text-primary)]">
              Immutable Audit Log & Compliance Ledger
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
              Tamper Resistant (F4.3)
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Complete chronological record of lead transitions, SLA escalations, staff availability toggles, and permission alterations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[var(--text-muted)]">
            {workspaceLogs.length} Events Recorded
          </span>
        </div>
      </div>

      {/* Filter & Search Bar (F4.2) */}
      <div className="p-3.5 rounded-xl tactile-card flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search audit trail by actor, target or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-primary)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--primary-teal)]"
            />
          </div>

          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-primary)] cursor-pointer"
          >
            <option value="all">All Action Types</option>
            <option value="lead_created">Lead Intake</option>
            <option value="lead_assigned">Lead Assignment</option>
            <option value="lead_acknowledged">Lead Acknowledged</option>
            <option value="lead_escalated">SLA Escalations</option>
            <option value="lead_reassigned_absence">Absence Reassignments</option>
            <option value="user_availability_changed">Availability Status Change</option>
            <option value="opportunity_stage_changed">Stage Shifts</option>
            <option value="payment_received">Payment Collections</option>
            <option value="role_permission_changed">Permissions Altered</option>
          </select>
        </div>

        <span className="text-[11px] text-[var(--text-subtle)] font-mono self-end md:self-auto">
          Read-Only Server Ledger
        </span>
      </div>

      {/* Immutable Table (F4.1 & F4.3) */}
      <div className="rounded-xl tactile-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-subtle)] border-b border-[var(--surface-border)] text-[var(--text-muted)] font-semibold">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor / Engine</th>
                <th className="px-4 py-3">Action Type</th>
                <th className="px-4 py-3">Target Entity</th>
                <th className="px-4 py-3">Audit Details</th>
                <th className="px-4 py-3 text-right">State Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--surface-border)] font-mono">
              {workspaceLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[var(--surface-subtle)]/40 transition-colors">
                  <td className="px-4 py-3 text-[var(--text-subtle)] whitespace-nowrap text-[11px]">
                    {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>

                  <td className="px-4 py-3 font-sans font-semibold text-[var(--text-primary)] whitespace-nowrap">
                    {log.actor_name}
                  </td>

                  <td className="px-4 py-3 font-sans whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize ${
                      log.action_type.includes('escalated') ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/20' :
                      log.action_type.includes('acknowledged') ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' :
                      log.action_type.includes('reassigned') ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400' :
                      'bg-[var(--surface-subtle)] text-[var(--text-muted)]'
                    }`}>
                      {log.action_type.replace(/_/g, ' ')}
                    </span>
                  </td>

                  <td className="px-4 py-3 font-sans text-[var(--text-primary)] truncate max-w-[150px]">
                    {log.target_label}
                  </td>

                  <td className="px-4 py-3 font-sans text-[var(--text-muted)] text-xs">
                    {log.details}
                  </td>

                  <td className="px-4 py-3 text-right font-sans">
                    {(log.before_value || log.after_value) && (
                      <button
                        onClick={() => setSelectedItem(log)}
                        className="text-[var(--primary-teal)] hover:underline font-medium text-[11px] cursor-pointer"
                      >
                        Inspect Diff
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* STATE DIFF MODAL */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl bg-[var(--surface-main)] border border-[var(--surface-border)] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-sm text-[var(--text-primary)]">
                  Audit State Transition (Before vs After)
                </h3>
                <span className="text-[11px] font-mono text-[var(--text-muted)]">
                  {selectedItem.target_label} · {new Date(selectedItem.timestamp).toLocaleString()}
                </span>
              </div>
              <button 
                onClick={() => setSelectedItem(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer text-xs"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 bg-[var(--surface-subtle)] rounded-lg border border-[var(--surface-border)] overflow-x-auto max-h-60">
                <span className="text-[10px] text-rose-600 font-bold block mb-1 uppercase font-sans">Before Value</span>
                <pre className="text-[11px]">{JSON.stringify(selectedItem.before_value || 'None (Initial state)', null, 2)}</pre>
              </div>

              <div className="p-3 bg-[var(--surface-subtle)] rounded-lg border border-[var(--surface-border)] overflow-x-auto max-h-60">
                <span className="text-[10px] text-emerald-600 font-bold block mb-1 uppercase font-sans">After Value</span>
                <pre className="text-[11px]">{JSON.stringify(selectedItem.after_value || 'None', null, 2)}</pre>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[var(--surface-border)]">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-1.5 rounded-lg bg-[var(--primary-teal)] text-white text-xs font-semibold cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
