export type UserRole = 'owner' | 'admin' | 'user';

export type UserAvailability = 'available' | 'busy' | 'on_leave' | 'offline';

export interface UserPermissions {
  view_crm: boolean;
  create_crm: boolean;
  edit_crm: boolean;
  delete_crm: boolean;
  export_crm: boolean;
  view_opportunity_value: boolean;
  manage_assignment_rules: boolean;
  manage_integrations: boolean;
  view_audit_log: boolean;
}

export interface User {
  id: string;
  workspace_id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  title: string;
  avatar_url?: string;
  availability: UserAvailability;
  max_open_leads: number;
  current_open_leads: number;
  permissions: UserPermissions;
  external_notification_destination?: {
    bizsms_phone?: string;
    slack_handle?: string;
    telegram_id?: string;
  };
  google_calendar_connected: boolean;
  google_calendar_email?: string;
  token_status?: 'valid' | 'expired' | 'disconnected';
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  industry: string;
  currency: string;
  currency_symbol: string;
  timezone: string;
  sla_acknowledgement_seconds: number; // e.g. 15 for fast demo, 900 for prod
  max_escalation_levels: number;
  backup_user_id: string;
  manager_user_id: string;
  round_robin_index: number;
}

export type LeadSource = 'web_form' | 'whatsapp' | 'manual_entry' | 'phone_call' | 'qr_code';

export type LeadStatus = 'unacknowledged' | 'acknowledged' | 'escalated' | 'reassigned' | 'converted' | 'lost';

export interface EscalationRecord {
  id: string;
  from_user_id: string;
  to_user_id: string;
  reason: string;
  timestamp: string;
  external_alert_sent: boolean;
  channel: 'BizSMS' | 'Twilio WhatsApp' | 'Slack' | 'Telegram';
}

export interface Lead {
  id: string;
  workspace_id: string;
  title: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  company_name?: string;
  source: LeadSource;
  status: LeadStatus;
  assigned_to_user_id: string;
  assigned_at: string;
  acknowledged_at?: string;
  acknowledgement_window_seconds: number;
  escalation_level: number; // 0 = initial, 1 = backup, 2 = manager/owner
  escalations: EscalationRecord[];
  last_action_at: string;
  notes: string[];
  custom_fields?: Record<string, any>;
  opportunity_id?: string;
  contact_id: string;
  value?: number;
  is_in_recovery?: boolean;
  recovery_reason?: string;
}

export interface Contact {
  id: string;
  workspace_id: string;
  name: string;
  email: string;
  phone: string;
  company_id?: string;
  company_name?: string;
  title?: string;
  assigned_user_id: string;
  opted_out_messaging: boolean;
  created_at: string;
  tags: string[];
}

export interface Company {
  id: string;
  workspace_id: string;
  name: string;
  industry: string;
  website?: string;
  phone?: string;
  address?: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  color: string;
  is_won?: boolean;
  is_lost?: boolean;
  required_field_keys?: string[]; // IDs of custom fields required before entering this stage
}

export interface Pipeline {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  stages: PipelineStage[];
}

export interface Opportunity {
  id: string;
  workspace_id: string;
  pipeline_id: string;
  stage_id: string;
  title: string;
  contact_id: string;
  company_id?: string;
  assigned_user_id: string;
  value: number;
  expected_close_date: string;
  created_at: string;
  custom_fields: Record<string, any>;
  payment_status: 'unpaid' | 'pending' | 'collected' | 'refunded';
  payment_amount_collected?: number;
  tags: string[];
}

export type CustomFieldType = 'text' | 'number' | 'date' | 'dropdown' | 'checkbox';

export interface CustomFieldDefinition {
  id: string;
  workspace_id: string;
  entity_type: 'opportunity' | 'contact';
  pipeline_id?: string; // if scoped to specific pipeline
  label: string;
  key: string;
  field_type: CustomFieldType;
  options?: string[]; // for dropdown
  required: boolean;
  help_text?: string;
}

export interface ChatMessage {
  id: string;
  workspace_id: string;
  contact_id: string;
  direction: 'inbound' | 'outbound';
  sender_number: string;
  recipient_number: string;
  body: string;
  timestamp: string;
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  error_message?: string;
  provider: 'WhatsApp Business' | 'Twilio Sandbox';
}

export interface PaymentRequest {
  id: string;
  workspace_id: string;
  opportunity_id: string;
  contact_id: string;
  amount: number;
  currency: string;
  provider: 'JazzCash' | 'Stripe';
  status: 'pending' | 'collected' | 'failed' | 'refunded';
  reference_id: string;
  checkout_url: string;
  requested_by_user_id: string;
  created_at: string;
  paid_at?: string;
  refunded_at?: string;
  idempotency_key: string;
}

export interface CalendarAppointment {
  id: string;
  workspace_id: string;
  title: string;
  contact_id: string;
  opportunity_id?: string;
  assigned_user_id: string;
  start_time: string;
  end_time: string;
  timezone: string;
  google_event_id: string;
  status: 'confirmed' | 'cancelled' | 'rescheduled';
  location_or_link: string;
  created_at: string;
}

export interface IntegrationConnection {
  id: string;
  workspace_id: string;
  type: 'whatsapp' | 'payments' | 'google_calendar' | 'bizsms_notifications';
  name: string;
  provider_name: string;
  status: 'connected' | 'disconnected' | 'degraded' | 'error';
  last_sync_at: string;
  last_error?: string;
  sandbox_mode: boolean;
  config_summary: string;
  limits_note: string;
}

export interface IntegrationSyncLog {
  id: string;
  workspace_id: string;
  integration_type: 'whatsapp' | 'payments' | 'google_calendar' | 'bizsms_notifications';
  direction: 'inbound_webhook' | 'outbound_api';
  event_type: string;
  reference_id: string;
  signature_valid: boolean;
  status: 'success' | 'failed' | 'retrying';
  payload_preview: string;
  timestamp: string;
  retry_count: number;
}

export interface AuditLogItem {
  id: string;
  workspace_id: string;
  timestamp: string;
  actor_user_id: string;
  actor_name: string;
  action_type: 
    | 'lead_created'
    | 'lead_assigned'
    | 'lead_acknowledged'
    | 'lead_escalated'
    | 'lead_reassigned_absence'
    | 'opportunity_stage_changed'
    | 'payment_received'
    | 'payment_refunded'
    | 'appointment_booked'
    | 'user_availability_changed'
    | 'role_permission_changed'
    | 'custom_field_created'
    | 'pipeline_stage_modified'
    | 'integration_updated'
    | 'record_deleted';
  target_type: 'lead' | 'contact' | 'opportunity' | 'user' | 'integration' | 'pipeline' | 'payment';
  target_id: string;
  target_label: string;
  details: string;
  before_value?: any;
  after_value?: any;
}

export interface SavedFilter {
  id: string;
  name: string;
  stage_id?: string;
  assigned_user_id?: string;
  min_value?: number;
  max_value?: number;
  tag?: string;
  status?: string;
}
