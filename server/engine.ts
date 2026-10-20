import { db } from './db';
import { Lead, User, Contact, AuditLogItem, NotificationOutboxItem, IntegrationSyncLog, EscalationRecord } from './types';

export class LeadRecoveryEngine {
  private watchdogInterval: NodeJS.Timeout | null = null;
  private isProcessingWatchdog = false;

  constructor() {
    this.startWatchdog();
  }

  public startWatchdog(intervalMs = 1000) {
    if (this.watchdogInterval) clearInterval(this.watchdogInterval);
    this.watchdogInterval = setInterval(() => {
      this.checkSlaDeadlines().catch(err => {
        console.error('Error during SLA watchdog cycle:', err);
      });
    }, intervalMs);
    if (this.watchdogInterval.unref) {
      this.watchdogInterval.unref();
    }
  }

  public stopWatchdog() {
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
      this.watchdogInterval = null;
    }
  }

  // Authoritative background watchdog: detects timeouts strictly based on persisted server timestamps (F3.5 & Q5)
  public async checkSlaDeadlines(): Promise<number> {
    if (this.isProcessingWatchdog) return 0;
    this.isProcessingWatchdog = true;

    try {
      const now = Date.now();
      const allLeads = db.getLeads();
      const expiredLeads = allLeads.filter(l => 
        l.status === 'unacknowledged' && 
        new Date(l.sla_deadline_at).getTime() <= now
      );

      if (expiredLeads.length === 0) return 0;

      let escalatedCount = 0;
      for (const lead of expiredLeads) {
        const result = await this.escalateLead(
          lead.id, 
          `SLA window expired (${lead.acknowledgement_window_seconds}s timeout exceeded on server without rep acknowledgement).`,
          'system'
        );
        if (result.success) {
          escalatedCount++;
        }
      }

      return escalatedCount;
    } finally {
      this.isProcessingWatchdog = false;
    }
  }

  // Lead Intake & Distribution Engine (F3.1, F3.3)
  public async captureLead(data: {
    workspace_id: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    company_name?: string;
    source: Lead['source'];
    value?: number;
    notes?: string;
    custom_fields?: Record<string, any>;
    acting_user_id?: string;
  }): Promise<{ lead: Lead; assigned_user: User }> {
    return await db.transaction(async (schema) => {
      const workspace = schema.workspaces.find(w => w.id === data.workspace_id);
      if (!workspace) throw new Error(`Workspace ${data.workspace_id} not found.`);

      // 1. Contact matching (I1.5)
      let contact = schema.contacts.find(c => 
        c.workspace_id === data.workspace_id && 
        (c.phone === data.contact_phone || (data.contact_email && c.email === data.contact_email))
      );

      if (!contact) {
        contact = {
          id: `cnt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          workspace_id: data.workspace_id,
          name: data.contact_name,
          email: data.contact_email || `${data.contact_phone.replace(/\D/g, '')}@leadflow.inbound`,
          phone: data.contact_phone,
          company_name: data.company_name,
          assigned_user_id: '',
          opted_out_messaging: false,
          created_at: new Date().toISOString(),
          tags: [data.source, 'Inbound Lead']
        };
        schema.contacts.unshift(contact);
      }

      // 2. Round-Robin Distribution among Available staff respecting max open leads (F3.3)
      const eligibleUsers = schema.users.filter(u => 
        u.workspace_id === data.workspace_id && 
        u.availability === 'available' && 
        u.current_open_leads < u.max_open_leads
      );

      let assignedUserId = workspace.backup_user_id;
      if (eligibleUsers.length > 0) {
        const rrIndex = workspace.round_robin_index % eligibleUsers.length;
        assignedUserId = eligibleUsers[rrIndex].id;
        workspace.round_robin_index += 1;
      } else {
        // Fallback to manager when all reps are overloaded or unavailable
        assignedUserId = workspace.manager_user_id;
      }

      const assignedUser = schema.users.find(u => u.id === assignedUserId) || schema.users[0];
      assignedUser.current_open_leads += 1;

      // 3. Persisted timestamps & deadline
      const assignedAt = new Date().toISOString();
      const windowSec = workspace.sla_acknowledgement_seconds || 15;
      const deadlineAt = new Date(Date.now() + windowSec * 1000).toISOString();

      const newLead: Lead = {
        id: `lead-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        workspace_id: data.workspace_id,
        title: `${data.source === 'whatsapp' ? 'WhatsApp' : data.source === 'web_form' ? 'Web' : 'Direct'} Inquiry: ${data.contact_name}`,
        contact_name: data.contact_name,
        contact_email: contact.email,
        contact_phone: data.contact_phone,
        company_name: data.company_name,
        source: data.source,
        status: 'unacknowledged',
        assigned_to_user_id: assignedUserId,
        assigned_at: assignedAt,
        sla_deadline_at: deadlineAt,
        acknowledgement_window_seconds: windowSec,
        escalation_level: 0,
        escalations: [],
        last_action_at: assignedAt,
        notes: data.notes ? [data.notes] : [`Lead captured via ${data.source}. Auto-assigned to ${assignedUser.name}.`],
        custom_fields: data.custom_fields || {},
        contact_id: contact.id,
        value: data.value || 0,
        version: 1
      };

      schema.leads.unshift(newLead);

      // Audit log entry
      schema.audit_logs.unshift({
        id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        workspace_id: data.workspace_id,
        timestamp: assignedAt,
        actor_user_id: data.acting_user_id || 'system',
        actor_name: data.acting_user_id ? (schema.users.find(u => u.id === data.acting_user_id)?.name || 'User') : 'Lead Intake Engine',
        action_type: 'lead_created',
        target_type: 'lead',
        target_id: newLead.id,
        target_label: newLead.title,
        details: `Lead created from source "${data.source}". Round-robin assigned to ${assignedUser.name} (${assignedUser.title}). Persisted SLA deadline: ${deadlineAt}`,
        after_value: { assigned_to: assignedUser.name, deadline: deadlineAt, window_seconds: windowSec }
      });

      return { lead: newLead, assigned_user: assignedUser };
    });
  }

  // Acknowledge Lead (F3.4)
  public async acknowledgeLead(leadId: string, actingUserId: string): Promise<{ success: boolean; message: string; response_time_seconds?: number }> {
    return await db.transaction(async (schema) => {
      const lead = schema.leads.find(l => l.id === leadId);
      if (!lead) return { success: false, message: 'Lead not found' };

      // Idempotency: if already acknowledged, return cached state safely
      if (lead.status === 'acknowledged') {
        return { success: true, message: 'Lead was already acknowledged' };
      }

      const actingUser = schema.users.find(u => u.id === actingUserId) || schema.users[0];
      const ackTime = new Date().toISOString();
      const assignedTime = new Date(lead.assigned_at).getTime();
      const responseSeconds = Number(((Date.now() - assignedTime) / 1000).toFixed(1));

      lead.status = 'acknowledged';
      lead.acknowledged_at = ackTime;
      lead.is_in_recovery = false;
      lead.last_action_at = ackTime;
      lead.notes.push(`Acknowledged by ${actingUser.name} after ${responseSeconds}s.`);
      lead.version = (lead.version || 1) + 1;

      // Audit log entry
      schema.audit_logs.unshift({
        id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        workspace_id: lead.workspace_id,
        timestamp: ackTime,
        actor_user_id: actingUser.id,
        actor_name: actingUser.name,
        action_type: 'lead_acknowledged',
        target_type: 'lead',
        target_id: lead.id,
        target_label: lead.title,
        details: `Acknowledged by ${actingUser.name}. Time to first response: ${responseSeconds}s.`,
        after_value: { response_time_seconds: responseSeconds, acknowledged_at: ackTime }
      });

      return { success: true, message: 'Lead acknowledged successfully', response_time_seconds: responseSeconds };
    });
  }

  // Escalation Engine with Idempotency & Concurrency Protection (F3.5, F3.8, Q5)
  public async escalateLead(leadId: string, reason: string, actingUserId = 'system'): Promise<{ success: boolean; message: string; lead?: Lead }> {
    return await db.transaction(async (schema) => {
      const lead = schema.leads.find(l => l.id === leadId);
      if (!lead) return { success: false, message: 'Lead not found' };

      // Prevent duplicate escalation under concurrent requests or close timer firing (F3.8)
      if (lead.status === 'acknowledged') {
        return { success: false, message: 'Lead already acknowledged; escalation skipped.' };
      }

      const workspace = schema.workspaces.find(w => w.id === lead.workspace_id);
      if (!workspace) return { success: false, message: 'Workspace not found' };

      const fromUser = schema.users.find(u => u.id === lead.assigned_to_user_id);
      const nextLevel = lead.escalation_level + 1;

      // Select next recipient in chain: Level 1 -> backup, Level 2+ -> manager/owner
      let toUserId = workspace.manager_user_id;
      if (nextLevel === 1) {
        toUserId = workspace.backup_user_id;
      } else {
        toUserId = workspace.manager_user_id;
      }

      const toUser = schema.users.find(u => u.id === toUserId) || schema.users[0];

      // Update lead
      const timestamp = new Date().toISOString();
      const nextDeadline = new Date(Date.now() + lead.acknowledgement_window_seconds * 1000).toISOString();

      lead.status = 'escalated';
      lead.assigned_to_user_id = toUserId;
      lead.escalation_level = nextLevel;
      lead.is_in_recovery = true;
      lead.recovery_reason = reason;
      lead.sla_deadline_at = nextDeadline; // New deadline for next recipient
      lead.last_action_at = timestamp;
      lead.version = (lead.version || 1) + 1;

      const escalationHop: EscalationRecord = {
        id: `esc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        from_user_id: fromUser?.id || '',
        to_user_id: toUserId,
        reason,
        timestamp,
        external_alert_sent: true,
        channel: 'BizSMS'
      };

      lead.escalations.push(escalationHop);
      lead.notes.push(`Escalated to Level ${nextLevel} (${toUser.name}). Reason: ${reason}`);

      // Enqueue notification outbox item with bounded retry policy (I4, I5.5)
      const dest = toUser.external_notification_destination?.bizsms_phone || toUser.phone;
      const outboxItem: NotificationOutboxItem = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        workspace_id: lead.workspace_id,
        lead_id: lead.id,
        recipient: dest,
        channel: 'BizSMS',
        content: `[LEADFLOW ESCALATION ALERT] Lead "${lead.title}" is overdue! Reassigned to ${toUser.name}. Open: /leads/${lead.id}`,
        status: 'delivered', // simulated successful dispatch
        attempts: 1,
        max_attempts: 3,
        created_at: timestamp,
        dispatched_at: timestamp
      };
      schema.notification_outbox.unshift(outboxItem);

      // Record synchronization log (I5.4)
      schema.sync_logs.unshift({
        id: `slog-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        workspace_id: lead.workspace_id,
        integration_type: 'bizsms_notifications',
        direction: 'outbound_api',
        event_type: 'escalation.alert.sms',
        reference_id: `SMS-${Date.now().toString().slice(-6)}`,
        signature_valid: true,
        status: 'success',
        payload_preview: JSON.stringify({ to: dest, message: outboxItem.content, level: nextLevel }),
        timestamp,
        retry_count: 0
      });

      // Immutable audit log (F4.1)
      schema.audit_logs.unshift({
        id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        workspace_id: lead.workspace_id,
        timestamp,
        actor_user_id: actingUserId,
        actor_name: actingUserId === 'system' ? 'LeadFlow SLA Watchdog' : 'Manual Escalation',
        action_type: 'lead_escalated',
        target_type: 'lead',
        target_id: lead.id,
        target_label: lead.title,
        details: `Lead escalated from ${fromUser?.name || 'Rep'} to ${toUser.name}. Reason: ${reason}`,
        before_value: { assigned_to: fromUser?.name, level: lead.escalation_level - 1 },
        after_value: { assigned_to: toUser.name, level: nextLevel, is_in_recovery: true, outbox_id: outboxItem.id }
      });

      return { success: true, message: `Lead escalated to ${toUser.name}`, lead };
    });
  }

  // Absence Reassignment: Setting rep to On leave / Offline immediately reassigns their unacknowledged leads (F3.6)
  public async setAvailabilityAndReassign(userId: string, availability: User['availability'], actingUserId: string): Promise<{ success: boolean; reassignedCount: number }> {
    return await db.transaction(async (schema) => {
      const user = schema.users.find(u => u.id === userId);
      if (!user) return { success: false, reassignedCount: 0 };

      const prevStatus = user.availability;
      user.availability = availability;
      const timestamp = new Date().toISOString();

      schema.audit_logs.unshift({
        id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        workspace_id: user.workspace_id,
        timestamp,
        actor_user_id: actingUserId,
        actor_name: schema.users.find(u => u.id === actingUserId)?.name || 'Admin',
        action_type: 'user_availability_changed',
        target_type: 'user',
        target_id: user.id,
        target_label: user.name,
        details: `Availability changed from "${prevStatus}" to "${availability}"`,
        before_value: { availability: prevStatus },
        after_value: { availability }
      });

      let reassignedCount = 0;
      if (availability === 'on_leave' || availability === 'offline') {
        const unackLeads = schema.leads.filter(l => 
          l.workspace_id === user.workspace_id && 
          l.assigned_to_user_id === user.id && 
          l.status === 'unacknowledged'
        );

        if (unackLeads.length > 0) {
          const eligible = schema.users.filter(u => 
            u.workspace_id === user.workspace_id && 
            u.id !== user.id && 
            u.availability === 'available'
          );
          const workspace = schema.workspaces.find(w => w.id === user.workspace_id);
          const backupUser = eligible[0] || schema.users.find(u => u.id === workspace?.backup_user_id) || schema.users[0];

          for (const l of unackLeads) {
            l.assigned_to_user_id = backupUser.id;
            l.assigned_at = timestamp;
            l.sla_deadline_at = new Date(Date.now() + l.acknowledgement_window_seconds * 1000).toISOString();
            l.status = 'reassigned';
            l.last_action_at = timestamp;
            l.notes.push(`Reassigned to ${backupUser.name} due to ${user.name} going ${availability}.`);

            schema.audit_logs.unshift({
              id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              workspace_id: l.workspace_id,
              timestamp,
              actor_user_id: 'system',
              actor_name: 'Absence Protection Watchdog',
              action_type: 'lead_reassigned_absence',
              target_type: 'lead',
              target_id: l.id,
              target_label: l.title,
              details: `Instant reassignment from ${user.name} to ${backupUser.name} due to ${availability}.`,
              before_value: { assigned_to: user.name },
              after_value: { assigned_to: backupUser.name, reason: `Rep absence: ${availability}` }
            });
            reassignedCount++;
          }
        }
      }

      return { success: true, reassignedCount };
    });
  }
}

export const engine = new LeadRecoveryEngine();
