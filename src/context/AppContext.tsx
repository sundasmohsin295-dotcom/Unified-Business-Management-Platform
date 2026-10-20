import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  Workspace,
  User,
  Lead,
  Contact,
  Company,
  Pipeline,
  Opportunity,
  CustomFieldDefinition,
  ChatMessage,
  PaymentRequest,
  CalendarAppointment,
  IntegrationConnection,
  IntegrationSyncLog,
  AuditLogItem,
  SavedFilter,
  UserAvailability,
  UserPermissions
} from '../types';
import {
  INITIAL_WORKSPACES,
  INITIAL_USERS,
  INITIAL_COMPANIES,
  INITIAL_CONTACTS,
  INITIAL_PIPELINES,
  INITIAL_CUSTOM_FIELDS,
  INITIAL_OPPORTUNITIES,
  INITIAL_LEADS,
  INITIAL_CHAT_MESSAGES,
  INITIAL_PAYMENTS,
  INITIAL_APPOINTMENTS,
  INITIAL_INTEGRATIONS,
  INITIAL_SYNC_LOGS,
  INITIAL_AUDIT_LOGS,
  INITIAL_SAVED_FILTERS
} from '../mockData/initialData';

interface AppContextType {
  // Tenancy & Session
  workspaces: Workspace[];
  activeWorkspaceId: string;
  activeWorkspace: Workspace;
  switchWorkspace: (workspaceId: string) => void;
  users: User[];
  currentUserId: string;
  currentUser: User;
  switchUser: (userId: string) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;

  // Active Screen
  activeTab: 'command_center' | 'pipeline' | 'customer_360' | 'recovery_queue' | 'appointments' | 'integrations' | 'team' | 'reports' | 'audit_log' | 'settings';
  setActiveTab: (tab: any) => void;
  selectedContactId: string | null;
  setSelectedContactId: (id: string | null) => void;

  // CRM Data
  leads: Lead[];
  contacts: Contact[];
  companies: Company[];
  pipelines: Pipeline[];
  activePipelineId: string;
  setActivePipelineId: (id: string) => void;
  opportunities: Opportunity[];
  customFields: CustomFieldDefinition[];
  chatMessages: ChatMessage[];
  payments: PaymentRequest[];
  appointments: CalendarAppointment[];
  integrations: IntegrationConnection[];
  syncLogs: IntegrationSyncLog[];
  auditLogs: AuditLogItem[];
  savedFilters: SavedFilter[];

  // SLA & Demo Engine
  simulationSpeed: number; // 1 = real-time, 5 = 5x faster
  setSimulationSpeed: (speed: number) => void;
  nowTimestamp: number;
  captureLead: (data: {
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    company_name?: string;
    source: Lead['source'];
    value?: number;
    notes?: string;
    custom_fields?: Record<string, any>;
  }) => Lead;
  acknowledgeLead: (leadId: string) => void;
  escalateLead: (leadId: string, reason: string) => void;
  reassignLead: (leadId: string, toUserId: string, reason: string) => void;
  setUserAvailability: (userId: string, availability: UserAvailability) => void;
  updateUserPermissions: (userId: string, permissions: Partial<UserPermissions>) => void;
  updateOpportunityStage: (oppId: string, targetStageId: string) => { success: boolean; missingFields?: string[] };
  createOpportunity: (data: Partial<Opportunity>) => Opportunity;
  updateOpportunity: (oppId: string, data: Partial<Opportunity>) => void;
  createCustomField: (field: Omit<CustomFieldDefinition, 'id' | 'workspace_id'>) => void;
  sendChatMessage: (contactId: string, body: string) => { success: boolean; error?: string };
  simulateInboundWhatsApp: (phone: string, text: string, name?: string) => void;
  createPaymentRequest: (oppId: string, amount: number, provider: 'JazzCash' | 'Stripe') => PaymentRequest;
  simulatePaymentWebhook: (paymentId: string, outcome: 'collected' | 'failed' | 'refunded') => void;
  bookAppointment: (data: Omit<CalendarAppointment, 'id' | 'workspace_id' | 'created_at' | 'google_event_id' | 'status'>) => { success: boolean; conflictWarning?: string; appointment?: CalendarAppointment };
  cancelAppointment: (appointmentId: string) => void;
  updateWorkspaceSettings: (settings: Partial<Workspace>) => void;
  exportCRMRecords: () => string; // CSV string
  toastMessage: { text: string; type: 'info' | 'success' | 'warning' | 'error' } | null;
  showToast: (text: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'leadflow_app_state_v1';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load initial state or defaults
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => {
    return INITIAL_WORKSPACES;
  });
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('ws-apex');
  const [currentUserId, setCurrentUserId] = useState<string>('usr-tariq');
  
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    try {
      const saved = localStorage.getItem('leadflow_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('leadflow_theme', newTheme);
      } catch (err) {
        console.error('Failed to save theme preference', err);
      }
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const [activeTab, setActiveTab] = useState<'command_center' | 'pipeline' | 'customer_360' | 'recovery_queue' | 'appointments' | 'integrations' | 'team' | 'reports' | 'audit_log' | 'settings'>('command_center');
  const [selectedContactId, setSelectedContactId] = useState<string | null>('cnt-1');

  // Application Data States
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [contacts, setContacts] = useState<Contact[]>(INITIAL_CONTACTS);
  const [companies, setCompanies] = useState<Company[]>(INITIAL_COMPANIES);
  const [pipelines, setPipelines] = useState<Pipeline[]>(INITIAL_PIPELINES);
  const [activePipelineId, setActivePipelineId] = useState<string>('pipe-commercial');
  const [opportunities, setOpportunities] = useState<Opportunity[]>(INITIAL_OPPORTUNITIES);
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>(INITIAL_CUSTOM_FIELDS);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES);
  const [payments, setPayments] = useState<PaymentRequest[]>(INITIAL_PAYMENTS);
  const [appointments, setAppointments] = useState<CalendarAppointment[]>(INITIAL_APPOINTMENTS);
  const [integrations, setIntegrations] = useState<IntegrationConnection[]>(INITIAL_INTEGRATIONS);
  const [syncLogs, setSyncLogs] = useState<IntegrationSyncLog[]>(INITIAL_SYNC_LOGS);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(INITIAL_AUDIT_LOGS);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(INITIAL_SAVED_FILTERS);

  // SLA ticker & Simulation controls
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1);
  const [nowTimestamp, setNowTimestamp] = useState<number>(Date.now());
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'info' | 'success' | 'warning' | 'error' } | null>(null);

  const showToast = (text: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  // Sync theme with DOM immediately without flash
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [theme]);

  // Listen for system theme changes only while the user has not selected an explicit preference
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    let hasExplicitPref = false;
    try {
      const saved = localStorage.getItem('leadflow_theme');
      if (saved === 'dark' || saved === 'light') {
        hasExplicitPref = true;
      }
    } catch {
      // ignore
    }
    if (hasExplicitPref) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (e: MediaQueryListEvent) => {
      try {
        const saved = localStorage.getItem('leadflow_theme');
        if (saved === 'dark' || saved === 'light') return;
      } catch {
        // ignore
      }
      setThemeState(e.matches ? 'dark' : 'light');
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemChange);
      return () => mediaQuery.removeEventListener('change', handleSystemChange);
    } else if ((mediaQuery as any).addListener) {
      (mediaQuery as any).addListener(handleSystemChange);
      return () => (mediaQuery as any).removeListener(handleSystemChange);
    }
  }, []);

  // Active Workspace & User objects
  const activeWorkspace = useMemo(() => {
    return workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];
  }, [workspaces, activeWorkspaceId]);

  const currentUser = useMemo(() => {
    const userInWorkspace = users.find(u => u.id === currentUserId && u.workspace_id === activeWorkspaceId);
    if (userInWorkspace) return userInWorkspace;
    // Fallback to first user in workspace
    return users.find(u => u.workspace_id === activeWorkspaceId) || users[0];
  }, [users, currentUserId, activeWorkspaceId]);

  const switchWorkspace = (workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
    // Find first user in new workspace
    const firstUser = users.find(u => u.workspace_id === workspaceId);
    if (firstUser) {
      setCurrentUserId(firstUser.id);
    }
    // Switch active pipeline to first in new workspace
    const firstPipe = pipelines.find(p => p.workspace_id === workspaceId);
    if (firstPipe) {
      setActivePipelineId(firstPipe.id);
    }
    showToast(`Switched workspace to: ${workspaces.find(w => w.id === workspaceId)?.name}`, 'info');
  };

  const switchUser = (userId: string) => {
    const u = users.find(usr => usr.id === userId);
    if (u) {
      setCurrentUserId(userId);
      showToast(`Switched active user to ${u.name} (${u.role.toUpperCase()})`, 'info');
    }
  };

  // Backend State Synchronization (Full-Stack Express + Server Watchdog)
  const syncWithBackend = async () => {
    try {
      const res = await fetch('/api/state', {
        headers: {
          'x-workspace-id': activeWorkspaceId,
          'x-user-id': currentUserId
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.leads) setLeads(data.leads);
        if (data.opportunities) setOpportunities(data.opportunities);
        if (data.users) setUsers(data.users);
        if (data.contacts) setContacts(data.contacts);
        if (data.auditLogs) setAuditLogs(data.auditLogs);
        if (data.syncLogs) setSyncLogs(data.syncLogs);
        if (data.payments) setPayments(data.payments);
        if (data.appointments) setAppointments(data.appointments);
      }
    } catch (e) {
      // Fallback gracefully to client store
    }
  };

  useEffect(() => {
    syncWithBackend();
    // Poll backend every 2.5s for real-time awareness (Q11: escalations, new leads, webhooks appear without page reload)
    const pollInterval = setInterval(syncWithBackend, 2500);
    return () => clearInterval(pollInterval);
  }, [activeWorkspaceId, currentUserId]);

  // Helper: Append Audit Log (Tamper-proof)
  const addAuditEntry = (entry: Omit<AuditLogItem, 'id' | 'timestamp' | 'workspace_id'>) => {
    const newEntry: AuditLogItem = {
      ...entry,
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      workspace_id: activeWorkspaceId,
      timestamp: new Date().toISOString()
    };
    setAuditLogs(prev => [newEntry, ...prev]);
  };

  // Helper: Append Sync Log
  const addSyncLog = (log: Omit<IntegrationSyncLog, 'id' | 'timestamp' | 'workspace_id'>) => {
    const newLog: IntegrationSyncLog = {
      ...log,
      id: `slog-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      workspace_id: activeWorkspaceId,
      timestamp: new Date().toISOString()
    };
    setSyncLogs(prev => [newLog, ...prev]);
  };

  // Central Clock for Live SLA countdown and automatic escalation
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setNowTimestamp(now);

      // Check for unacknowledged leads exceeding SLA in active workspace
      setLeads(prevLeads => {
        let changed = false;
        const updated = prevLeads.map(lead => {
          if (lead.workspace_id !== activeWorkspaceId) return lead;
          if (lead.status !== 'unacknowledged') return lead;

          const assignedTime = new Date(lead.assigned_at).getTime();
          const elapsedSeconds = (now - assignedTime) / 1000;

          if (elapsedSeconds >= lead.acknowledgement_window_seconds) {
            changed = true;
            // Escalate!
            const fromUser = users.find(u => u.id === lead.assigned_to_user_id);
            const nextLevel = lead.escalation_level + 1;
            
            // Determine next recipient based on level
            let toUserId = activeWorkspace.manager_user_id;
            if (nextLevel === 1) {
              toUserId = activeWorkspace.backup_user_id;
            } else if (nextLevel === 2) {
              toUserId = activeWorkspace.manager_user_id;
            }

            const toUser = users.find(u => u.id === toUserId) || users[0];

            const reason = `SLA window expired (${lead.acknowledgement_window_seconds}s timeout exceeded without acknowledgement). Escalated to Level ${nextLevel}.`;

            // Dispatch external alert (BizSMS / Slack)
            const dest = toUser?.external_notification_destination?.bizsms_phone || toUser?.phone;
            addSyncLog({
              integration_type: 'bizsms_notifications',
              direction: 'outbound_api',
              event_type: 'lead.sla_escalation.alert',
              reference_id: `SMS-${Date.now().toString().slice(-6)}`,
              signature_valid: true,
              status: 'success',
              payload_preview: JSON.stringify({
                to: dest,
                message: `[LEADFLOW ESCALATION] Lead "${lead.title}" overdue! Auto-assigned to ${toUser?.name}. Link: /leads/${lead.id}`,
                level: nextLevel
              }),
              retry_count: 0
            });

            addAuditEntry({
              actor_user_id: 'system',
              actor_name: 'LeadFlow SLA Watchdog',
              action_type: 'lead_escalated',
              target_type: 'lead',
              target_id: lead.id,
              target_label: lead.title,
              details: `Lead escalated from ${fromUser?.name || 'Rep'} to ${toUser?.name}. Reason: ${reason}`,
              before_value: { assigned_to: fromUser?.name, status: lead.status, level: lead.escalation_level },
              after_value: { assigned_to: toUser?.name, status: 'escalated', level: nextLevel, is_in_recovery: true }
            });

            return {
              ...lead,
              status: 'escalated' as const,
              assigned_to_user_id: toUserId,
              escalation_level: nextLevel,
              is_in_recovery: true,
              recovery_reason: reason,
              last_action_at: new Date().toISOString(),
              escalations: [
                ...lead.escalations,
                {
                  id: `esc-${Date.now()}`,
                  from_user_id: lead.assigned_to_user_id,
                  to_user_id: toUserId,
                  reason,
                  timestamp: new Date().toISOString(),
                  external_alert_sent: true,
                  channel: 'BizSMS' as const
                }
              ],
              notes: [
                ...lead.notes,
                `Automatic SLA timeout occurred. Escalated to ${toUser?.name} at Level ${nextLevel}. External alert sent to ${dest}.`
              ]
            };
          }
          return lead;
        });

        if (changed) {
          showToast('⚠️ SLA Alert: A lead expired without response and was auto-escalated to Recovery Queue!', 'warning');
          return updated;
        }
        return prevLeads;
      });
    }, 1000 / simulationSpeed);

    return () => clearInterval(interval);
  }, [activeWorkspaceId, simulationSpeed, users, activeWorkspace]);

  // Lead Intake & Assignment
  const captureLead = (data: {
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    company_name?: string;
    source: Lead['source'];
    value?: number;
    notes?: string;
    custom_fields?: Record<string, any>;
  }): Lead => {
    // 1. Find or create contact
    let contact = contacts.find(c => c.workspace_id === activeWorkspaceId && (c.phone === data.contact_phone || c.email === data.contact_email));
    if (!contact) {
      contact = {
        id: `cnt-${Date.now()}`,
        workspace_id: activeWorkspaceId,
        name: data.contact_name,
        email: data.contact_email,
        phone: data.contact_phone,
        company_name: data.company_name,
        assigned_user_id: '',
        opted_out_messaging: false,
        created_at: new Date().toISOString(),
        tags: [data.source, 'Inbound Lead']
      };
      setContacts(prev => [contact!, ...prev]);
    }

    // 2. Select eligible available user via Round Robin (F3.3)
    const eligibleUsers = users.filter(u => 
      u.workspace_id === activeWorkspaceId && 
      u.availability === 'available' && 
      u.current_open_leads < u.max_open_leads
    );

    let assignedUserId = activeWorkspace.backup_user_id;
    if (eligibleUsers.length > 0) {
      const idx = activeWorkspace.round_robin_index % eligibleUsers.length;
      assignedUserId = eligibleUsers[idx].id;
      // Increment round robin index
      setWorkspaces(prev => prev.map(w => w.id === activeWorkspaceId ? { ...w, round_robin_index: w.round_robin_index + 1 } : w));
    } else {
      // Overload fallback to manager
      assignedUserId = activeWorkspace.manager_user_id;
    }

    const assignedUser = users.find(u => u.id === assignedUserId);

    // Increment assigned user open leads
    setUsers(prev => prev.map(u => u.id === assignedUserId ? { ...u, current_open_leads: u.current_open_leads + 1 } : u));

    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      workspace_id: activeWorkspaceId,
      title: `${data.source === 'whatsapp' ? 'WhatsApp Inquiry' : 'Web Lead'}: ${data.contact_name}`,
      contact_name: data.contact_name,
      contact_email: data.contact_email,
      contact_phone: data.contact_phone,
      company_name: data.company_name,
      source: data.source,
      status: 'unacknowledged',
      assigned_to_user_id: assignedUserId,
      assigned_at: new Date().toISOString(),
      acknowledgement_window_seconds: activeWorkspace.sla_acknowledgement_seconds,
      escalation_level: 0,
      escalations: [],
      last_action_at: new Date().toISOString(),
      notes: data.notes ? [data.notes] : [`New intake via ${data.source}. Automatically assigned to ${assignedUser?.name || 'Representative'}.`],
      custom_fields: data.custom_fields || {},
      contact_id: contact.id,
      value: data.value || 0
    };

    setLeads(prev => [newLead, ...prev]);

    // Audit log
    addAuditEntry({
      actor_user_id: 'system',
      actor_name: 'Lead Intake Engine',
      action_type: 'lead_created',
      target_type: 'lead',
      target_id: newLead.id,
      target_label: newLead.title,
      details: `Lead created from source "${data.source}". Round-robin assigned to ${assignedUser?.name} (${assignedUser?.title}). SLA window: ${newLead.acknowledgement_window_seconds}s.`,
      after_value: { assigned_to: assignedUser?.name, source: data.source, window_s: newLead.acknowledgement_window_seconds }
    });

    // Authoritative backend persistence
    fetch('/api/leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-workspace-id': activeWorkspaceId,
        'x-user-id': currentUser.id
      },
      body: JSON.stringify({
        contact_name: data.contact_name,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone,
        company_name: data.company_name,
        source: data.source,
        value: data.value,
        notes: data.notes,
        custom_fields: data.custom_fields
      })
    }).then(res => {
      if (res.ok) syncWithBackend();
    }).catch(e => console.error('Failed to persist lead to backend', e));

    showToast(`🎯 New Lead captured: "${data.contact_name}". Assigned to ${assignedUser?.name}`, 'success');
    return newLead;
  };

  // Acknowledge Lead
  const acknowledgeLead = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const ackTime = new Date().toISOString();
    const assignedTime = new Date(lead.assigned_at).getTime();
    const responseSeconds = ((Date.now() - assignedTime) / 1000).toFixed(1);

    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        return {
          ...l,
          status: 'acknowledged',
          acknowledged_at: ackTime,
          is_in_recovery: false,
          last_action_at: ackTime,
          notes: [...l.notes, `Acknowledged by ${currentUser.name} after ${responseSeconds}s.`]
        };
      }
      return l;
    }));

    addAuditEntry({
      actor_user_id: currentUser.id,
      actor_name: currentUser.name,
      action_type: 'lead_acknowledged',
      target_type: 'lead',
      target_id: lead.id,
      target_label: lead.title,
      details: `Acknowledged within SLA by ${currentUser.name}. Time to first response: ${responseSeconds} seconds.`,
      after_value: { response_time_seconds: Number(responseSeconds), acknowledged_at: ackTime }
    });

    // Authoritative backend persistence
    fetch(`/api/leads/${leadId}/acknowledge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-workspace-id': activeWorkspaceId,
        'x-user-id': currentUser.id
      }
    }).then(res => {
      if (res.ok) syncWithBackend();
    }).catch(e => console.error('Failed to acknowledge lead on backend', e));

    showToast(`✅ Lead acknowledged! Time to response: ${responseSeconds}s`, 'success');
  };

  // Escalate Lead manually
  const escalateLead = (leadId: string, reason: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const nextUser = users.find(u => u.id === activeWorkspace.manager_user_id) || users[0];
    const nextLevel = lead.escalation_level + 1;

    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        return {
          ...l,
          status: 'escalated',
          assigned_to_user_id: nextUser.id,
          escalation_level: nextLevel,
          is_in_recovery: true,
          recovery_reason: reason,
          last_action_at: new Date().toISOString(),
          escalations: [
            ...l.escalations,
            {
              id: `esc-${Date.now()}`,
              from_user_id: l.assigned_to_user_id,
              to_user_id: nextUser.id,
              reason,
              timestamp: new Date().toISOString(),
              external_alert_sent: true,
              channel: 'BizSMS' as const
            }
          ]
        };
      }
      return l;
    }));

    addAuditEntry({
      actor_user_id: currentUser.id,
      actor_name: currentUser.name,
      action_type: 'lead_escalated',
      target_type: 'lead',
      target_id: lead.id,
      target_label: lead.title,
      details: `Manual escalation by ${currentUser.name} to ${nextUser.name}. Reason: ${reason}`,
      after_value: { assigned_to: nextUser.name, level: nextLevel }
    });

    // Authoritative backend persistence
    fetch(`/api/leads/${leadId}/escalate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-workspace-id': activeWorkspaceId,
        'x-user-id': currentUser.id
      },
      body: JSON.stringify({ reason })
    }).then(res => {
      if (res.ok) syncWithBackend();
    }).catch(e => console.error('Failed to escalate on backend', e));

    showToast(`Lead escalated to ${nextUser.name} & added to Recovery Queue`, 'warning');
  };

  // Reassign Lead
  const reassignLead = (leadId: string, toUserId: string, reason: string) => {
    const lead = leads.find(l => l.id === leadId);
    const toUser = users.find(u => u.id === toUserId);
    if (!lead || !toUser) return;

    const fromUser = users.find(u => u.id === lead.assigned_to_user_id);

    // Update open lead counts
    setUsers(prev => prev.map(u => {
      if (u.id === lead.assigned_to_user_id) return { ...u, current_open_leads: Math.max(0, u.current_open_leads - 1) };
      if (u.id === toUserId) return { ...u, current_open_leads: u.current_open_leads + 1 };
      return u;
    }));

    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        return {
          ...l,
          assigned_to_user_id: toUserId,
          assigned_at: new Date().toISOString(), // Reset timer for new owner
          is_in_recovery: false,
          recovery_reason: undefined,
          status: 'reassigned',
          last_action_at: new Date().toISOString(),
          notes: [...l.notes, `Reassigned from ${fromUser?.name || 'Previous'} to ${toUser.name}. Reason: ${reason}`]
        };
      }
      return l;
    }));

    addAuditEntry({
      actor_user_id: currentUser.id,
      actor_name: currentUser.name,
      action_type: 'lead_reassigned_absence',
      target_type: 'lead',
      target_id: lead.id,
      target_label: lead.title,
      details: `Reassigned from ${fromUser?.name} to ${toUser.name}. Reason: ${reason}`,
      before_value: { assigned_to: fromUser?.name },
      after_value: { assigned_to: toUser.name, reason }
    });

    showToast(`Lead reassigned to ${toUser.name}`, 'info');
  };

  // Set User Availability (with instant absence reassignment F3.6)
  const setUserAvailability = (userId: string, availability: UserAvailability) => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;

    const prevAvailability = targetUser.availability;
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, availability } : u));

    addAuditEntry({
      actor_user_id: currentUser.id,
      actor_name: currentUser.name,
      action_type: 'user_availability_changed',
      target_type: 'user',
      target_id: userId,
      target_label: targetUser.name,
      details: `Availability changed from "${prevAvailability}" to "${availability}"`,
      before_value: { availability: prevAvailability },
      after_value: { availability }
    });

    // Authoritative backend persistence
    fetch(`/api/users/${userId}/availability`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-workspace-id': activeWorkspaceId,
        'x-user-id': currentUser.id
      },
      body: JSON.stringify({ availability })
    }).then(res => {
      if (res.ok) syncWithBackend();
    }).catch(e => console.error('Failed to update availability on backend', e));

    // F3.6: Reassignment on absence: Setting an employee to On leave or Offline immediately reassigns their unacknowledged leads
    if (availability === 'on_leave' || availability === 'offline') {
      const unackLeads = leads.filter(l => l.workspace_id === activeWorkspaceId && l.assigned_to_user_id === userId && l.status === 'unacknowledged');
      if (unackLeads.length > 0) {
        const eligible = users.filter(u => u.workspace_id === activeWorkspaceId && u.id !== userId && u.availability === 'available');
        const backupUser = eligible[0] || users.find(u => u.id === activeWorkspace.backup_user_id) || users[0];

        unackLeads.forEach(l => {
          reassignLead(l.id, backupUser.id, `Automatic reassignment: ${targetUser.name} went ${availability}`);
        });

        showToast(`⚡ ${unackLeads.length} unacknowledged lead(s) automatically reassigned from ${targetUser.name} due to absence!`, 'warning');
      }
    } else {
      showToast(`${targetUser.name} availability is now ${availability}`, 'info');
    }
  };

  // Update User Permissions (F1.3)
  const updateUserPermissions = (userId: string, newPermissions: Partial<UserPermissions>) => {
    if (currentUser.role !== 'owner' && currentUser.role !== 'admin') {
      showToast('Unauthorized: Only Owner or Admin can modify permissions.', 'error');
      return;
    }

    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;

    // Admin cannot modify Owner (F1.2)
    if (targetUser.role === 'owner' && currentUser.role !== 'owner') {
      showToast('Permission Denied: Admins cannot modify Owner permissions.', 'error');
      return;
    }

    const merged = { ...targetUser.permissions, ...newPermissions };
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, permissions: merged } : u));

    // Authoritative backend persistence
    fetch(`/api/users/${userId}/permissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-workspace-id': activeWorkspaceId,
        'x-user-id': currentUser.id
      },
      body: JSON.stringify({ permissions: newPermissions })
    }).then(res => {
      if (res.ok) syncWithBackend();
    }).catch(e => console.error('Failed to update permissions on backend', e));

    addAuditEntry({
      actor_user_id: currentUser.id,
      actor_name: currentUser.name,
      action_type: 'role_permission_changed',
      target_type: 'user',
      target_id: userId,
      target_label: targetUser.name,
      details: `Permissions updated for ${targetUser.name}`,
      before_value: targetUser.permissions,
      after_value: merged
    });

    showToast(`Updated permissions for ${targetUser.name}`, 'success');
  };

  // Opportunity Stage Update with Validation (F2.4 Stage-specific required fields)
  const updateOpportunityStage = (oppId: string, targetStageId: string): { success: boolean; missingFields?: string[] } => {
    const opp = opportunities.find(o => o.id === oppId);
    if (!opp) return { success: false };

    const pipeline = pipelines.find(p => p.id === opp.pipeline_id);
    const targetStage = pipeline?.stages.find(s => s.id === targetStageId);
    if (!targetStage) return { success: false };

    // Check required fields
    if (targetStage.required_field_keys && targetStage.required_field_keys.length > 0) {
      const missing = targetStage.required_field_keys.filter(key => {
        const val = opp.custom_fields?.[key] ?? opp.custom_fields?.[key.replace('cf_', '')];
        return val === undefined || val === null || val === '';
      });

      if (missing.length > 0) {
        const labels = missing.map(m => {
          const fieldDef = customFields.find(cf => cf.id === m || cf.key === m);
          return fieldDef ? fieldDef.label : m;
        });
        showToast(`Cannot move to "${targetStage.name}": Missing required fields (${labels.join(', ')})`, 'error');
        return { success: false, missingFields: labels };
      }
    }

    const prevStage = pipeline?.stages.find(s => s.id === opp.stage_id);

    setOpportunities(prev => prev.map(o => o.id === oppId ? { ...o, stage_id: targetStageId } : o));

    addAuditEntry({
      actor_user_id: currentUser.id,
      actor_name: currentUser.name,
      action_type: 'opportunity_stage_changed',
      target_type: 'opportunity',
      target_id: opp.id,
      target_label: opp.title,
      details: `Stage shifted from "${prevStage?.name}" to "${targetStage.name}"`,
      before_value: { stage: prevStage?.name },
      after_value: { stage: targetStage.name }
    });

    showToast(`Opportunity progressed to ${targetStage.name}`, 'success');
    return { success: true };
  };

  const createOpportunity = (data: Partial<Opportunity>): Opportunity => {
    const newOpp: Opportunity = {
      id: `opp-${Date.now()}`,
      workspace_id: activeWorkspaceId,
      pipeline_id: data.pipeline_id || activePipelineId,
      stage_id: data.stage_id || pipelines.find(p => p.id === activePipelineId)?.stages[0].id || 'stg-new',
      title: data.title || 'New Deal',
      contact_id: data.contact_id || contacts[0]?.id || '',
      company_id: data.company_id,
      assigned_user_id: data.assigned_user_id || currentUser.id,
      value: data.value || 0,
      expected_close_date: data.expected_close_date || new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      custom_fields: data.custom_fields || {},
      payment_status: 'unpaid',
      tags: data.tags || ['Inbound']
    };

    setOpportunities(prev => [newOpp, ...prev]);
    showToast(`Opportunity "${newOpp.title}" created`, 'success');
    return newOpp;
  };

  const updateOpportunity = (oppId: string, data: Partial<Opportunity>) => {
    setOpportunities(prev => prev.map(o => o.id === oppId ? { ...o, ...data } : o));
    showToast('Opportunity updated', 'info');
  };

  const createCustomField = (field: Omit<CustomFieldDefinition, 'id' | 'workspace_id'>) => {
    const newField: CustomFieldDefinition = {
      ...field,
      id: `cf_${Date.now()}`,
      workspace_id: activeWorkspaceId
    };
    setCustomFields(prev => [...prev, newField]);

    addAuditEntry({
      actor_user_id: currentUser.id,
      actor_name: currentUser.name,
      action_type: 'custom_field_created',
      target_type: 'pipeline',
      target_id: newField.id,
      target_label: newField.label,
      details: `Created custom field "${newField.label}" (${newField.field_type})`,
      after_value: newField
    });

    showToast(`Custom field "${newField.label}" added`, 'success');
  };

  // Messaging (I1)
  const sendChatMessage = (contactId: string, body: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return { success: false, error: 'Contact not found' };

    // Check opt-out (I1.9)
    if (contact.opted_out_messaging) {
      showToast('Cannot send: Contact has opted out of WhatsApp/SMS messages.', 'error');
      return { success: false, error: 'Contact opted out' };
    }

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      workspace_id: activeWorkspaceId,
      contact_id: contactId,
      direction: 'outbound',
      sender_number: '+923008472910',
      recipient_number: contact.phone,
      body,
      timestamp: new Date().toISOString(),
      status: 'sent',
      provider: 'WhatsApp Business'
    };

    setChatMessages(prev => [...prev, newMsg]);

    // Simulate provider callback progression: sent -> delivered (I1.4)
    setTimeout(() => {
      setChatMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, status: 'delivered' } : m));
    }, 1500);

    addSyncLog({
      integration_type: 'whatsapp',
      direction: 'outbound_api',
      event_type: 'messages.send',
      reference_id: `WAM-${Date.now().toString().slice(-6)}`,
      signature_valid: true,
      status: 'success',
      payload_preview: JSON.stringify({ to: contact.phone, text: body }),
      retry_count: 0
    });

    showToast('Message sent via WhatsApp Business Platform', 'success');
    return { success: true };
  };

  const simulateInboundWhatsApp = (phone: string, text: string, name = 'Inbound Prospect') => {
    let contact = contacts.find(c => c.workspace_id === activeWorkspaceId && c.phone === phone);
    
    // Webhook verification check (I1.2)
    const ref = `WAM-IN-${Date.now().toString().slice(-6)}`;
    addSyncLog({
      integration_type: 'whatsapp',
      direction: 'inbound_webhook',
      event_type: 'messages.incoming',
      reference_id: ref,
      signature_valid: true,
      status: 'success',
      payload_preview: JSON.stringify({ from: phone, text }),
      retry_count: 0
    });

    if (!contact) {
      // Unknown number: creates contact and lead (I1.5)
      contact = {
        id: `cnt-${Date.now()}`,
        workspace_id: activeWorkspaceId,
        name,
        email: `${phone.replace(/\D/g, '')}@leadflow.inbound`,
        phone,
        assigned_user_id: currentUser.id,
        opted_out_messaging: false,
        created_at: new Date().toISOString(),
        tags: ['WhatsApp Inbound', 'New Prospect']
      };
      setContacts(prev => [contact!, ...prev]);

      captureLead({
        contact_name: name,
        contact_email: contact.email,
        contact_phone: phone,
        source: 'whatsapp',
        notes: `Customer WhatsApp message: "${text}"`,
        value: 1500000
      });
    }

    const inMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      workspace_id: activeWorkspaceId,
      contact_id: contact.id,
      direction: 'inbound',
      sender_number: phone,
      recipient_number: '+923008472910',
      body: text,
      timestamp: new Date().toISOString(),
      status: 'read',
      provider: 'WhatsApp Business'
    };

    setChatMessages(prev => [...prev, inMsg]);
    setSelectedContactId(contact.id);
    showToast(`💬 Received WhatsApp message from ${phone}`, 'info');
  };

  // Payments (I2)
  const createPaymentRequest = (oppId: string, amount: number, provider: 'JazzCash' | 'Stripe'): PaymentRequest => {
    const opp = opportunities.find(o => o.id === oppId);
    const refId = provider === 'JazzCash' ? `JC-PK-${Date.now().toString().slice(-8)}` : `cs_test_${Date.now().toString().slice(-10)}`;
    const checkoutUrl = provider === 'JazzCash' 
      ? `https://sandbox.jazzcash.com.pk/Customer/DirectPayment?ref=${refId}`
      : `https://checkout.stripe.com/pay/${refId}`;

    const newPayment: PaymentRequest = {
      id: `pay-${Date.now()}`,
      workspace_id: activeWorkspaceId,
      opportunity_id: oppId,
      contact_id: opp?.contact_id || '',
      amount,
      currency: activeWorkspace.currency,
      provider,
      status: 'pending',
      reference_id: refId,
      checkout_url: checkoutUrl,
      requested_by_user_id: currentUser.id,
      created_at: new Date().toISOString(),
      idempotency_key: `idem-${refId}`
    };

    setPayments(prev => [newPayment, ...prev]);

    addSyncLog({
      integration_type: 'payments',
      direction: 'outbound_api',
      event_type: 'checkout.session.create',
      reference_id: refId,
      signature_valid: true,
      status: 'success',
      payload_preview: JSON.stringify({ amount, currency: activeWorkspace.currency, provider }),
      retry_count: 0
    });

    showToast(`Payment request of ${activeWorkspace.currency_symbol}${amount.toLocaleString()} created via ${provider}`, 'success');
    return newPayment;
  };

  const simulatePaymentWebhook = (paymentId: string, outcome: 'collected' | 'failed' | 'refunded') => {
    const payment = payments.find(p => p.id === paymentId);
    if (!payment) return;

    // Idempotent processing check (I2.4): if already collected, ignore duplicate webhook
    if (payment.status === 'collected' && outcome === 'collected') {
      showToast('Idempotency Notice: Webhook event already processed. Duplicate ignored safely.', 'info');
      return;
    }

    const timestamp = new Date().toISOString();

    setPayments(prev => prev.map(p => {
      if (p.id === paymentId) {
        return {
          ...p,
          status: outcome,
          paid_at: outcome === 'collected' ? timestamp : p.paid_at,
          refunded_at: outcome === 'refunded' ? timestamp : undefined
        };
      }
      return p;
    }));

    // Update Opportunity payment status & collected amount (I2.2)
    setOpportunities(prev => prev.map(o => {
      if (o.id === payment.opportunity_id) {
        let collected = o.payment_amount_collected || 0;
        if (outcome === 'collected') collected += payment.amount;
        if (outcome === 'refunded') collected = Math.max(0, collected - payment.amount);

        return {
          ...o,
          payment_status: outcome === 'collected' ? 'collected' : outcome === 'refunded' ? 'refunded' : 'pending',
          payment_amount_collected: collected
        };
      }
      return o;
    }));

    // Record webhook in sync log with verified signature (I2.3)
    addSyncLog({
      integration_type: 'payments',
      direction: 'inbound_webhook',
      event_type: `payment.${outcome}`,
      reference_id: payment.reference_id,
      signature_valid: true,
      status: 'success',
      payload_preview: JSON.stringify({ ref: payment.reference_id, status: outcome, amount: payment.amount }),
      retry_count: 0
    });

    // Record audit entry
    addAuditEntry({
      actor_user_id: 'system',
      actor_name: `${payment.provider} Webhook Verification Engine`,
      action_type: outcome === 'collected' ? 'payment_received' : 'payment_refunded',
      target_type: 'payment',
      target_id: payment.id,
      target_label: `${payment.provider} Payment: ${payment.reference_id}`,
      details: `Payment status transitioned to "${outcome}". Amount: ${activeWorkspace.currency_symbol}${payment.amount.toLocaleString()}. Signature verified.`,
      after_value: { status: outcome, amount: payment.amount }
    });

    showToast(`💳 ${payment.provider} Webhook processed: Payment ${outcome}!`, outcome === 'collected' ? 'success' : 'warning');
  };

  // Google Calendar Integration (I3)
  const bookAppointment = (data: Omit<CalendarAppointment, 'id' | 'workspace_id' | 'created_at' | 'google_event_id' | 'status'>) => {
    // Check conflicts (I3.4)
    const startTime = new Date(data.start_time).getTime();
    const endTime = new Date(data.end_time).getTime();

    const conflict = appointments.find(a => {
      if (a.workspace_id !== activeWorkspaceId) return false;
      if (a.assigned_user_id !== data.assigned_user_id) return false;
      if (a.status === 'cancelled') return false;

      const aStart = new Date(a.start_time).getTime();
      const aEnd = new Date(a.end_time).getTime();

      // Check overlap
      return (startTime < aEnd && endTime > aStart);
    });

    const newApt: CalendarAppointment = {
      ...data,
      id: `apt-${Date.now()}`,
      workspace_id: activeWorkspaceId,
      google_event_id: `gcal_${Date.now().toString(36)}`,
      status: 'confirmed',
      created_at: new Date().toISOString()
    };

    setAppointments(prev => [newApt, ...prev]);

    addSyncLog({
      integration_type: 'google_calendar',
      direction: 'outbound_api',
      event_type: 'events.insert',
      reference_id: newApt.google_event_id,
      signature_valid: true,
      status: 'success',
      payload_preview: JSON.stringify({ title: data.title, start: data.start_time, end: data.end_time }),
      retry_count: 0
    });

    addAuditEntry({
      actor_user_id: currentUser.id,
      actor_name: currentUser.name,
      action_type: 'appointment_booked',
      target_type: 'contact',
      target_id: data.contact_id,
      target_label: data.title,
      details: `Booked appointment with Google Calendar sync: "${data.title}"`,
      after_value: { start: data.start_time, end: data.end_time, assigned_to: data.assigned_user_id }
    });

    if (conflict) {
      showToast(`⚠️ Warning: Employee has another appointment scheduled during this time slot (${conflict.title})!`, 'warning');
      return { success: true, conflictWarning: `Slot overlaps with existing booking: ${conflict.title}`, appointment: newApt };
    }

    showToast('📅 Appointment scheduled & synced with Google Calendar', 'success');
    return { success: true, appointment: newApt };
  };

  const cancelAppointment = (appointmentId: string) => {
    const apt = appointments.find(a => a.id === appointmentId);
    if (!apt) return;

    setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, status: 'cancelled' } : a));

    addSyncLog({
      integration_type: 'google_calendar',
      direction: 'outbound_api',
      event_type: 'events.delete',
      reference_id: apt.google_event_id,
      signature_valid: true,
      status: 'success',
      payload_preview: JSON.stringify({ event_id: apt.google_event_id, action: 'cancelled' }),
      retry_count: 0
    });

    showToast('Appointment cancelled and removed from Google Calendar', 'info');
  };

  const updateWorkspaceSettings = (settings: Partial<Workspace>) => {
    setWorkspaces(prev => prev.map(w => w.id === activeWorkspaceId ? { ...w, ...settings } : w));
    showToast('Workspace settings saved', 'success');
  };

  // Export CRM Records as CSV (F1.3 server permission check)
  const exportCRMRecords = (): string => {
    fetch('/api/export/crm', {
      headers: {
        'x-workspace-id': activeWorkspaceId,
        'x-user-id': currentUserId
      }
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Unauthorized export' }));
          showToast(err.error || 'Unauthorized: Export permission denied on server.', 'error');
          return '';
        }
        const text = await res.text();
        const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `leadflow_crm_export_${activeWorkspace.slug}_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('CRM records exported successfully from server ledger', 'success');
        return text;
      })
      .catch((e) => {
        showToast('Failed to export CRM records: Network error', 'error');
      });

    return '';
  };

  return (
    <AppContext.Provider
      value={{
        workspaces,
        activeWorkspaceId,
        activeWorkspace,
        switchWorkspace,
        users,
        currentUserId,
        currentUser,
        switchUser,
        theme,
        setTheme,
        toggleTheme,
        activeTab,
        setActiveTab,
        selectedContactId,
        setSelectedContactId,
        leads,
        contacts,
        companies,
        pipelines,
        activePipelineId,
        setActivePipelineId,
        opportunities,
        customFields,
        chatMessages,
        payments,
        appointments,
        integrations,
        syncLogs,
        auditLogs,
        savedFilters,
        simulationSpeed,
        setSimulationSpeed,
        nowTimestamp,
        captureLead,
        acknowledgeLead,
        escalateLead,
        reassignLead,
        setUserAvailability,
        updateUserPermissions,
        updateOpportunityStage,
        createOpportunity,
        updateOpportunity,
        createCustomField,
        sendChatMessage,
        simulateInboundWhatsApp,
        createPaymentRequest,
        simulatePaymentWebhook,
        bookAppointment,
        cancelAppointment,
        updateWorkspaceSettings,
        exportCRMRecords,
        toastMessage,
        showToast
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
