import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Building2, 
  Sun, 
  Moon, 
  Plus, 
  Clock, 
  ShieldAlert,
  ChevronDown,
  Sparkles,
  PhoneCall,
  CheckCircle2,
  AlertCircle,
  Coffee,
  Check
} from 'lucide-react';
import { UserAvailability } from '../../types';

interface HeaderProps {
  onOpenNewLeadModal: () => void;
  onOpenWhatsAppSimulator: () => void;
}

const SCREEN_TITLES: Record<string, string> = {
  command_center: 'Operations Command Center',
  pipeline: 'CRM Pipeline Studio',
  customer_360: 'Customer 360',
  recovery_queue: 'Lead Recovery Queue',
  integrations: 'Integration Observatory',
  team: 'Team & Permissions',
  audit_log: 'Audit Log',
  settings: 'Settings & Studio',
};

export const Header: React.FC<HeaderProps> = ({ onOpenNewLeadModal, onOpenWhatsAppSimulator }) => {
  const { 
    workspaces, 
    activeWorkspaceId, 
    switchWorkspace, 
    users, 
    currentUserId, 
    currentUser, 
    switchUser, 
    setUserAvailability,
    theme, 
    toggleTheme,
    leads,
    activeWorkspace,
    activeTab
  } = useApp();

  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  // Active unacknowledged leads count in current workspace
  const unackCount = leads.filter(l => l.workspace_id === activeWorkspaceId && l.status === 'unacknowledged').length;
  const recoveryCount = leads.filter(l => l.workspace_id === activeWorkspaceId && l.is_in_recovery).length;

  const currentScreenTitle = SCREEN_TITLES[activeTab] || 'Workspace';

  const availabilityConfig: Record<UserAvailability, { label: string; dotColor: string; bg: string; icon: React.ReactNode }> = {
    available: {
      label: 'Available',
      dotColor: 'bg-emerald-500',
      bg: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      icon: <CheckCircle2 className="w-3 h-3 text-emerald-600" />
    },
    busy: {
      label: 'Busy (Capped)',
      dotColor: 'bg-amber-500',
      bg: 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/30',
      icon: <AlertCircle className="w-3 h-3 text-amber-600" />
    },
    on_leave: {
      label: 'On Leave (Auto-Reassigned)',
      dotColor: 'bg-purple-500',
      bg: 'text-purple-700 dark:text-purple-400 bg-purple-500/10 border-purple-500/30',
      icon: <Coffee className="w-3 h-3 text-purple-600" />
    },
    offline: {
      label: 'Offline',
      dotColor: 'bg-neutral-400',
      bg: 'text-neutral-600 dark:text-neutral-400 bg-neutral-500/10 border-neutral-500/30',
      icon: <span className="w-2.5 h-2.5 rounded-full bg-neutral-400 inline-block" />
    }
  };

  const handleStatusChange = (status: UserAvailability) => {
    setUserAvailability(currentUser.id, status);
    setStatusMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--surface-border)] bg-[var(--surface-main)] px-4 lg:px-8 py-2.5 transition-colors duration-150">
      <div className="flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark + Breadcrumb Context + Workspace Switcher */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--primary-teal)] text-white font-bold text-sm shadow-sm ring-1 ring-[var(--surface-border)]">
              LF
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-heading font-bold text-base leading-tight tracking-tight text-[var(--text-primary)]">
                LeadFlow
              </span>
              <span className="text-[10px] text-[var(--text-muted)] font-mono leading-none">
                Unified Ops
              </span>
            </div>
          </div>

          <span className="text-[var(--text-subtle)] text-xs hidden md:inline">/</span>

          {/* Multi-Tenant Workspace Selector */}
          <div className="relative">
            <button
              onClick={() => { setWorkspaceMenuOpen(!workspaceMenuOpen); setUserMenuOpen(false); setStatusMenuOpen(false); }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] text-[var(--text-primary)] transition-all cursor-pointer"
              title="Switch Workspace (Tenant Isolation)"
              aria-expanded={workspaceMenuOpen}
            >
              <Building2 className="w-3.5 h-3.5 text-[var(--primary-teal)]" />
              <span className="max-w-[130px] md:max-w-[180px] truncate font-medium">
                {activeWorkspace.name}
              </span>
              {recoveryCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title={`${recoveryCount} in recovery queue`} />
              )}
              <ChevronDown className="w-3 h-3 text-[var(--text-muted)] ml-0.5" />
            </button>

            {workspaceMenuOpen && (
              <div 
                className="absolute left-0 mt-1.5 w-72 rounded-xl bg-[var(--surface-main)] border border-[var(--surface-border)] shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                onClick={() => setWorkspaceMenuOpen(false)}
              >
                <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider text-[var(--text-muted)] border-b border-[var(--surface-border)] flex justify-between items-center">
                  <span>TENANT WORKSPACE</span>
                  <span className="text-[9px] uppercase font-mono">Isolated Data</span>
                </div>
                {workspaces.map((ws) => {
                  const wsLeads = leads.filter(l => l.workspace_id === ws.id);
                  const wsUnack = wsLeads.filter(l => l.status === 'unacknowledged').length;
                  const wsRec = wsLeads.filter(l => l.is_in_recovery).length;

                  return (
                    <button
                      key={ws.id}
                      onClick={() => switchWorkspace(ws.id)}
                      className={`w-full text-left px-3 py-2.5 text-xs flex items-center justify-between hover:bg-[var(--surface-subtle)] cursor-pointer transition-colors ${
                        ws.id === activeWorkspaceId ? 'font-semibold text-[var(--primary-teal)] bg-[var(--surface-subtle)]' : 'text-[var(--text-primary)]'
                      }`}
                    >
                      <div className="truncate mr-2">
                        <div className="font-medium truncate flex items-center gap-1.5">
                          <span>{ws.name}</span>
                          {ws.id === activeWorkspaceId && (
                            <span className="text-[9px] bg-[var(--primary-teal-light)] text-[var(--primary-teal)] font-mono px-1 py-0.2 rounded font-semibold">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] font-mono">
                          {ws.currency} · {ws.timezone}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {wsRec > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/15 text-rose-600 dark:text-rose-400 font-semibold font-mono">
                            {wsRec} rec
                          </span>
                        )}
                        {wsUnack > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono">
                            {wsUnack} sla
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <span className="text-[var(--text-subtle)] text-xs hidden lg:inline">/</span>

          {/* Current Screen Breadcrumb */}
          <span className="hidden lg:inline text-xs font-medium text-[var(--text-muted)] truncate max-w-[200px]">
            {currentScreenTitle}
          </span>
        </div>

        {/* Zone 2: Navigation Shortcuts & Live SLA Ticker */}
        <div className="hidden xl:flex items-center gap-3 text-xs">
          {unackCount > 0 ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-mono text-[11px] animate-pulse">
              <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} />
              <span>{unackCount} Lead(s) in SLA Countdown</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] px-2.5 py-1 rounded-md bg-[var(--surface-subtle)] border border-[var(--surface-border)]">
              <span className="w-2 h-2 rounded-full bg-[var(--status-success)] inline-block"></span>
              <span className="font-mono text-[11px]">SLA Healthy (0 Pending)</span>
            </div>
          )}

          {recoveryCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 font-medium text-[11px]">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              <span>{recoveryCount} in Recovery</span>
            </div>
          )}
        </div>

        {/* Zone 3: Actions, Persona Switcher & Theme */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Quick Intake Trigger */}
          <button
            onClick={onOpenNewLeadModal}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--primary-teal)] text-white hover:opacity-95 shadow-sm tactile-button cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Lead</span>
          </button>

          <button
            onClick={onOpenWhatsAppSimulator}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] text-[var(--text-primary)] cursor-pointer"
            title="Simulate incoming WhatsApp customer inquiry webhook"
          >
            <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden md:inline font-mono text-[11px]">WhatsApp</span>
          </button>

          {/* Quick Availability Status Selector for Acting User */}
          <div className="relative">
            <button
              onClick={() => { setStatusMenuOpen(!statusMenuOpen); setUserMenuOpen(false); setWorkspaceMenuOpen(false); }}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${availabilityConfig[currentUser.availability]?.bg || ''}`}
              title="Click to toggle rep availability status (tests automated absence reassignment)"
              aria-label="Toggle user availability status"
            >
              <span className={`w-2 h-2 rounded-full ${availabilityConfig[currentUser.availability]?.dotColor || 'bg-neutral-400'}`} />
              <span className="hidden md:inline capitalize text-[11px]">
                {currentUser.availability.replace('_', ' ')}
              </span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {statusMenuOpen && (
              <div 
                className="absolute right-0 mt-1.5 w-56 rounded-xl bg-[var(--surface-main)] border border-[var(--surface-border)] shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100"
                onClick={() => setStatusMenuOpen(false)}
              >
                <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--text-muted)] border-b border-[var(--surface-border)]">
                  SET YOUR AVAILABILITY
                </div>
                {(['available', 'busy', 'on_leave', 'offline'] as UserAvailability[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusChange(st)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[var(--surface-subtle)] cursor-pointer ${
                      currentUser.availability === st ? 'font-semibold text-[var(--primary-teal)] bg-[var(--surface-subtle)]' : 'text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${availabilityConfig[st].dotColor}`} />
                      <span className="capitalize">{st.replace('_', ' ')}</span>
                    </div>
                    {currentUser.availability === st && <Check className="w-3.5 h-3.5 text-[var(--primary-teal)]" />}
                  </button>
                ))}
                <div className="p-2 border-t border-[var(--surface-border)] bg-[var(--surface-subtle)] text-[10px] text-[var(--text-muted)] leading-tight">
                  💡 Switching to <b>On Leave</b> triggers immediate automated reassignment of open leads.
                </div>
              </div>
            )}
          </div>

          {/* Active Persona / Role Switcher */}
          <div className="relative">
            <button
              onClick={() => { setUserMenuOpen(!userMenuOpen); setWorkspaceMenuOpen(false); setStatusMenuOpen(false); }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] text-xs cursor-pointer"
              title="Switch Active User & Permissions Role"
              aria-label="User profile and role menu"
            >
              <div className="w-6 h-6 rounded-full bg-[var(--primary-teal)] text-white flex items-center justify-center text-[10px] font-bold">
                {currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className="hidden sm:block text-left">
                <span className="font-semibold block leading-tight text-[var(--text-primary)] max-w-[110px] truncate">{currentUser.name}</span>
                <span className="text-[10px] text-[var(--text-muted)] block capitalize leading-none font-mono">{currentUser.role}</span>
              </div>
              <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />
            </button>

            {userMenuOpen && (
              <div 
                className="absolute right-0 mt-1.5 w-72 rounded-xl bg-[var(--surface-main)] border border-[var(--surface-border)] shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                onClick={() => setUserMenuOpen(false)}
              >
                <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--text-muted)] border-b border-[var(--surface-border)] flex justify-between items-center">
                  <span>SWITCH ACTING USER</span>
                  <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-[var(--surface-subtle)]">
                    {currentUser.role}
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-[var(--surface-border)]/50">
                  {users.filter(u => u.workspace_id === activeWorkspaceId).map((u) => (
                    <button
                      key={u.id}
                      onClick={() => switchUser(u.id)}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[var(--surface-subtle)] cursor-pointer transition-colors ${
                        u.id === currentUserId ? 'bg-[var(--surface-subtle)] text-[var(--primary-teal)] font-medium' : 'text-[var(--text-primary)]'
                      }`}
                    >
                      <div>
                        <div className="font-medium text-[var(--text-primary)]">{u.name}</div>
                        <div className="text-[10px] text-[var(--text-muted)]">{u.title} · <span className="capitalize font-mono">{u.role}</span></div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded capitalize ${
                          u.availability === 'available' ? 'bg-emerald-500/10 text-emerald-600' :
                          u.availability === 'busy' ? 'bg-amber-500/10 text-amber-600' :
                          u.availability === 'on_leave' ? 'bg-purple-500/10 text-purple-600' : 'bg-neutral-500/10 text-neutral-500'
                        }`}>
                          {u.availability.replace('_', ' ')}
                        </span>
                        {!u.permissions.view_opportunity_value && (
                          <div className="text-[9px] text-amber-600">Values Masked</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* High-Contrast Accessible Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--primary-teal)]"
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode (Current: ${theme})`}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4 text-slate-700" />
            ) : (
              <Sun className="w-4 h-4 text-[#D7F36A]" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
