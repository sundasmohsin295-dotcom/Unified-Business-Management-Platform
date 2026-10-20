import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Users, 
  ShieldCheck, 
  UserCheck, 
  Sliders, 
  Check, 
  X, 
  AlertTriangle, 
  Phone, 
  Mail, 
  Key, 
  RotateCcw,
  Sparkles,
  Zap,
  Info
} from 'lucide-react';
import { User, UserAvailability, UserPermissions } from '../../types';

export const TeamPermissions: React.FC = () => {
  const { 
    users, 
    activeWorkspace, 
    activeWorkspaceId, 
    currentUser, 
    setUserAvailability, 
    updateUserPermissions, 
    updateWorkspaceSettings,
    showToast 
  } = useApp();

  const [selectedUserForPerms, setSelectedUserForPerms] = useState<User | null>(null);

  const workspaceUsers = users.filter(u => u.workspace_id === activeWorkspaceId);

  const handleToggleAvailability = (userId: string, newAvailability: UserAvailability) => {
    setUserAvailability(userId, newAvailability);
  };

  const handleTogglePermission = (userId: string, key: keyof UserPermissions, currentValue: boolean) => {
    updateUserPermissions(userId, { [key]: !currentValue });
    if (selectedUserForPerms && selectedUserForPerms.id === userId) {
      setSelectedUserForPerms({
        ...selectedUserForPerms,
        permissions: { ...selectedUserForPerms.permissions, [key]: !currentValue }
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[var(--surface-border)]">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold font-heading text-[var(--text-primary)]">
            Team & Permissions Studio
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Configure employee availability statuses, automated round-robin thresholds, and granular server-enforced role permissions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-muted)] font-mono">
            {workspaceUsers.length} Active Staff in Workspace
          </span>
        </div>
      </div>

      {/* SLA Assignment Configuration Strip (F3.3 & F3.5) */}
      <div className="p-4 rounded-xl tactile-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <h3 className="font-heading font-bold text-xs text-[var(--text-primary)]">
              Lead Distribution & Escalation Rules (F3.3)
            </h3>
          </div>
          <span className="text-[11px] text-[var(--text-muted)] font-mono">Auto Round-Robin Active</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)]">
            <span className="text-[11px] text-[var(--text-muted)] block mb-1">Acknowledgement SLA Window</span>
            <div className="flex items-center gap-2">
              <select
                value={activeWorkspace.sla_acknowledgement_seconds}
                onChange={(e) => updateWorkspaceSettings({ sla_acknowledgement_seconds: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 rounded bg-[var(--surface-main)] border border-[var(--surface-border)] text-xs text-[var(--text-primary)] font-mono"
              >
                <option value={10}>10 Seconds (Instant Demo)</option>
                <option value={15}>15 Seconds (Default Fast Demo)</option>
                <option value={30}>30 Seconds (Rapid Response)</option>
                <option value={60}>60 Seconds (1 Minute)</option>
                <option value={900}>900 Seconds (15 Minutes Prod)</option>
              </select>
            </div>
            <span className="text-[10px] text-[var(--text-subtle)] mt-1 block">
              Timeout triggers immediate Level 1 escalation.
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)]">
            <span className="text-[11px] text-[var(--text-muted)] block mb-1">Designated Backup Rep (Level 1)</span>
            <select
              value={activeWorkspace.backup_user_id}
              onChange={(e) => updateWorkspaceSettings({ backup_user_id: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded bg-[var(--surface-main)] border border-[var(--surface-border)] text-xs text-[var(--text-primary)]"
            >
              {workspaceUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.title})</option>
              ))}
            </select>
            <span className="text-[10px] text-[var(--text-subtle)] mt-1 block">
              Receives lead if primary rep exceeds window.
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)]">
            <span className="text-[11px] text-[var(--text-muted)] block mb-1">Escalation Manager / Owner (Level 2)</span>
            <select
              value={activeWorkspace.manager_user_id}
              onChange={(e) => updateWorkspaceSettings({ manager_user_id: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded bg-[var(--surface-main)] border border-[var(--surface-border)] text-xs text-[var(--text-primary)]"
            >
              {workspaceUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role.toUpperCase()})</option>
              ))}
            </select>
            <span className="text-[10px] text-[var(--text-subtle)] mt-1 block">
              Alerted via BizSMS if backup rep also times out.
            </span>
          </div>
        </div>
      </div>

      {/* Employee Availability & Capacity Roster (F3.2, F3.3, F3.6) */}
      <div className="rounded-xl tactile-card overflow-hidden">
        <div className="p-4 bg-[var(--surface-subtle)] border-b border-[var(--surface-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div>
            <h3 className="font-heading font-bold text-sm text-[var(--text-primary)]">
              Live Employee Roster & Instant Absence Reassignment (F3.6)
            </h3>
            <span className="text-[11px] text-[var(--text-muted)]">
              Changing status to "On leave" or "Offline" immediately reassigns that user's unacknowledged leads.
            </span>
          </div>
          <span className="text-[10px] text-purple-700 dark:text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded font-mono">
            Absence Watchdog Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-subtle)]/60 border-b border-[var(--surface-border)] text-[var(--text-muted)] font-semibold">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Base Level</th>
                <th className="px-4 py-3">Availability Status</th>
                <th className="px-4 py-3">Open Lead Load</th>
                <th className="px-4 py-3">Notification Alert Destination</th>
                <th className="px-4 py-3 text-right">Permissions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--surface-border)]">
              {workspaceUsers.map((usr) => (
                <tr key={usr.id} className="hover:bg-[var(--surface-subtle)]/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[var(--surface-border)] flex items-center justify-center font-bold text-xs text-[var(--text-primary)]">
                        {usr.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="font-semibold text-[var(--text-primary)]">{usr.name}</div>
                        <div className="text-[11px] text-[var(--text-muted)]">{usr.title}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      usr.role === 'owner' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30' :
                      usr.role === 'admin' ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30' :
                      'bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--surface-border)]'
                    }`}>
                      {usr.role}
                    </span>
                  </td>

                  {/* Availability Dropdown with immediate absence reassignment trigger (F3.6) */}
                  <td className="px-4 py-3">
                    <select
                      value={usr.availability}
                      onChange={(e) => handleToggleAvailability(usr.id, e.target.value as UserAvailability)}
                      className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer border ${
                        usr.availability === 'available' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-semibold' :
                        usr.availability === 'busy' ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300' :
                        usr.availability === 'on_leave' ? 'bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300 font-bold' :
                        'bg-neutral-500/10 border-neutral-500/30 text-neutral-600'
                      }`}
                    >
                      <option value="available">● Available (Receives Leads)</option>
                      <option value="busy">● Busy (Paused)</option>
                      <option value="on_leave">● On leave (Reassign Leads)</option>
                      <option value="offline">● Offline</option>
                    </select>
                  </td>

                  {/* Load vs Max (F3.3) */}
                  <td className="px-4 py-3 font-mono tabular-nums">
                    <span className={usr.current_open_leads >= usr.max_open_leads ? 'text-rose-600 font-bold' : 'text-[var(--text-primary)]'}>
                      {usr.current_open_leads} / {usr.max_open_leads} leads
                    </span>
                  </td>

                  {/* Destination */}
                  <td className="px-4 py-3 font-mono text-[11px] text-[var(--text-muted)]">
                    {usr.external_notification_destination?.bizsms_phone || usr.phone}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedUserForPerms(usr)}
                      className="text-[var(--primary-teal)] hover:underline font-medium cursor-pointer"
                    >
                      Edit Matrix
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PERMISSIONS MATRIX MODAL (F1.3 & F1.4) */}
      {selectedUserForPerms && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl bg-[var(--surface-main)] border border-[var(--surface-border)] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-sm text-[var(--text-primary)]">
                  Configurable Permissions: {selectedUserForPerms.name}
                </h3>
                <span className="text-xs text-[var(--text-muted)]">
                  Base Level: <strong className="uppercase">{selectedUserForPerms.role}</strong> (Permissions decoupled from role name)
                </span>
              </div>
              <button
                onClick={() => setSelectedUserForPerms(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer text-xs"
              >
                Close
              </button>
            </div>

            <div className="space-y-2 pt-2 divide-y divide-[var(--surface-border)] text-xs">
              {[
                { key: 'view_crm', label: 'View CRM Records', desc: 'Can view contacts, companies and opportunities' },
                { key: 'create_crm', label: 'Create CRM Records', desc: 'Can create new contacts and deals' },
                { key: 'edit_crm', label: 'Edit CRM Records', desc: 'Can modify opportunity stages and details' },
                { key: 'delete_crm', label: 'Delete CRM Records', desc: 'Can permanently remove records' },
                { key: 'export_crm', label: 'Export CRM Records', desc: 'Can download CRM data to CSV format' },
                { key: 'view_opportunity_value', label: 'View Opportunity Value (Field Protection F1.4)', desc: 'If turned off, deal values are masked with •••••• everywhere' },
                { key: 'manage_assignment_rules', label: 'Manage Assignment Rules & SLA', desc: 'Can configure round-robin and escalation chain' },
                { key: 'manage_integrations', label: 'Manage Integrations', desc: 'Can configure API keys, webhooks, and calendar' },
                { key: 'view_audit_log', label: 'View Audit Log', desc: 'Can inspect immutable company event logs' }
              ].map(({ key, label, desc }) => {
                const isEnabled = (selectedUserForPerms.permissions as any)[key] ?? false;

                return (
                  <div key={key} className="pt-2 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-[var(--text-primary)]">{label}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">{desc}</div>
                    </div>

                    <button
                      onClick={() => handleTogglePermission(selectedUserForPerms.id, key as keyof UserPermissions, isEnabled)}
                      className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                        isEnabled
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--surface-border)]'
                      }`}
                    >
                      {isEnabled ? 'Granted' : 'Denied'}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[var(--surface-border)] flex items-center justify-between text-xs">
              <span className="text-[11px] text-[var(--text-subtle)]">Changes enforced server-side on API calls</span>
              <button
                onClick={() => setSelectedUserForPerms(null)}
                className="px-4 py-1.5 rounded-lg bg-[var(--primary-teal)] text-white font-medium shadow-sm cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
