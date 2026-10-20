import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  LayoutDashboard, 
  KanbanSquare, 
  UserCheck, 
  AlertTriangle, 
  Radio, 
  Users, 
  ShieldCheck, 
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  Zap,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, leads, activeWorkspaceId, currentUser } = useApp();
  const [collapsed, setCollapsed] = useState(false);

  // Metric badges
  const recoveryLeadsCount = leads.filter(l => l.workspace_id === activeWorkspaceId && l.is_in_recovery).length;
  const unackCount = leads.filter(l => l.workspace_id === activeWorkspaceId && l.status === 'unacknowledged').length;

  const operationItems = [
    {
      id: 'command_center',
      label: 'Command Center',
      icon: LayoutDashboard,
      badge: unackCount > 0 ? `${unackCount} SLA` : null,
      badgeColor: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
    },
    {
      id: 'pipeline',
      label: 'CRM Pipeline Studio',
      icon: KanbanSquare,
      permission: currentUser.permissions.view_crm
    },
    {
      id: 'customer_360',
      label: 'Customer 360',
      icon: UserCheck,
      permission: currentUser.permissions.view_crm
    },
    {
      id: 'recovery_queue',
      label: 'Lead Recovery Queue',
      icon: AlertTriangle,
      badge: recoveryLeadsCount > 0 ? `${recoveryLeadsCount}` : null,
      badgeColor: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-bold animate-pulse'
    }
  ];

  const managementItems = [
    {
      id: 'integrations',
      label: 'Integration Observatory',
      icon: Radio,
      badge: '4 Live',
      badgeColor: 'bg-[var(--primary-teal-light)] text-[var(--primary-teal)]'
    },
    {
      id: 'team',
      label: 'Team & Permissions',
      icon: Users
    },
    {
      id: 'audit_log',
      label: 'Audit Log',
      icon: ShieldCheck,
      permission: currentUser.permissions.view_audit_log
    },
    {
      id: 'settings',
      label: 'Settings & Studio',
      icon: SlidersHorizontal
    }
  ];

interface NavItem {
  id: string;
  label: string;
  icon: any;
  badge?: string | null;
  badgeColor?: string;
  permission?: boolean;
}

  const renderNavGroup = (title: string, items: NavItem[]) => (
    <div className="space-y-1">
      {!collapsed && (
        <div className="px-3 pb-1 text-[10px] font-bold tracking-wider text-[var(--text-subtle)] uppercase">
          {title}
        </div>
      )}
      <div className="space-y-1">
        {items.map((item) => {
          if (item.permission === false) return null;
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center ${collapsed ? 'justify-center py-2.5 px-2' : 'justify-between px-3 py-2.5'} rounded-lg text-xs font-medium transition-all cursor-pointer relative ${
                isActive 
                  ? 'bg-[var(--primary-teal)] text-white shadow-sm font-semibold' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]'
              }`}
            >
              {/* Citrus accent indicator on active item */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-5 bg-[#D7F36A] rounded-r-md shadow-sm" />
              )}

              <div className="flex items-center gap-3 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[var(--text-muted)]'}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </div>

              {!collapsed && (
                <div className="flex items-center gap-1.5 shrink-0">
                  {item.badge && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${item.badgeColor || 'bg-slate-100 text-slate-700'}`}>
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#D7F36A]" />}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-full md:w-64 lg:w-72'} shrink-0 border-r border-[var(--surface-border)] bg-[var(--surface-main)] flex flex-col justify-between p-3 lg:p-4 transition-all duration-200`}>
      <div className="space-y-5">
        {/* Collapse toggle header */}
        <div className="flex items-center justify-between px-1">
          {!collapsed && (
            <span className="text-[11px] font-semibold text-[var(--text-primary)] font-heading">
              NAVIGATION
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer ml-auto"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Section 1: Operations */}
        {renderNavGroup('Operations', operationItems)}

        {/* Divider */}
        <hr className="border-t border-[var(--surface-border)]/60 my-2" />

        {/* Section 2: Management & Controls */}
        {renderNavGroup('Management', managementItems)}

        {/* SLA Guarantee callout card (hidden when collapsed) */}
        {!collapsed && (
          <div className="p-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-subtle)] tactile-inset-box text-xs mt-3">
            <div className="flex items-center gap-2 mb-1 text-[var(--primary-teal)] font-semibold font-heading">
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Zero-Lead-Loss SLA</span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Inbound leads enter countdown immediately. Timeout triggers instant backup escalation + SMS dispatch.
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className={`pt-3 border-t border-[var(--surface-border)] text-[11px] text-[var(--text-subtle)] flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed ? (
          <>
            <span className="font-mono text-[10px]">Tidal Graphite v3.8</span>
            <span className="text-[10px] text-[var(--primary-teal)] font-medium font-mono">Server Enforced</span>
          </>
        ) : (
          <span className="font-mono text-[10px] text-[var(--primary-teal)]">LF</span>
        )}
      </div>
    </aside>
  );
};
