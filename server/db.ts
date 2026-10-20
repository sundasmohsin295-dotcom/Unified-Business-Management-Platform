import fs from 'fs';
import path from 'path';
import { DatabaseSchema, Workspace, User, Lead, Contact, Company, Pipeline, Opportunity, CustomFieldDefinition, ChatMessage, PaymentRequest, CalendarAppointment, IntegrationConnection, IntegrationSyncLog, NotificationOutboxItem, AuditLogItem, SavedFilter } from './types';
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
} from '../src/mockData/initialData';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'leadflow-db.json');

class Database {
  private data: DatabaseSchema;
  private writeLock: Promise<void> = Promise.resolve();
  private isInitialized = false;

  constructor() {
    this.data = this.getDefaultState();
    this.init();
  }

  private getDefaultState(): DatabaseSchema {
    // Map initial leads with authoritative server-side deadline
    const seededLeads: Lead[] = INITIAL_LEADS.map(l => {
      const assignedAt = l.assigned_at;
      const windowSec = l.acknowledgement_window_seconds || 15;
      const deadlineAt = new Date(new Date(assignedAt).getTime() + windowSec * 1000).toISOString();
      return {
        ...l,
        sla_deadline_at: deadlineAt,
        version: 1
      };
    });

    return {
      workspaces: JSON.parse(JSON.stringify(INITIAL_WORKSPACES)),
      users: JSON.parse(JSON.stringify(INITIAL_USERS)),
      leads: seededLeads,
      contacts: JSON.parse(JSON.stringify(INITIAL_CONTACTS)),
      companies: JSON.parse(JSON.stringify(INITIAL_COMPANIES)),
      pipelines: JSON.parse(JSON.stringify(INITIAL_PIPELINES)),
      opportunities: JSON.parse(JSON.stringify(INITIAL_OPPORTUNITIES)),
      custom_fields: JSON.parse(JSON.stringify(INITIAL_CUSTOM_FIELDS)),
      chat_messages: JSON.parse(JSON.stringify(INITIAL_CHAT_MESSAGES)),
      payments: JSON.parse(JSON.stringify(INITIAL_PAYMENTS)),
      appointments: JSON.parse(JSON.stringify(INITIAL_APPOINTMENTS)),
      integrations: JSON.parse(JSON.stringify(INITIAL_INTEGRATIONS)),
      sync_logs: JSON.parse(JSON.stringify(INITIAL_SYNC_LOGS)),
      notification_outbox: [],
      audit_logs: JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS)),
      saved_filters: JSON.parse(JSON.stringify(INITIAL_SAVED_FILTERS)),
      processed_idempotency_keys: {}
    };
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(content);
        // Validate basic integrity
        if (parsed.workspaces && parsed.leads) {
          this.data = parsed;
          this.isInitialized = true;
          return;
        }
      }

      // Write initial default state
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
      this.isInitialized = true;
    } catch (err) {
      console.error('Error initializing database file, falling back to memory state:', err);
      this.isInitialized = true;
    }
  }

  private queue: Promise<any> = Promise.resolve();

  // Atomic file write using temporary file replacement to prevent corrupt reads
  private async saveToDisk(): Promise<void> {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpFile = `${DB_FILE}.tmp.${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const content = JSON.stringify(this.data, null, 2);
      await fs.promises.writeFile(tmpFile, content, 'utf-8');
      await fs.promises.rename(tmpFile, DB_FILE);
    } catch (err) {
      console.error('Failed to write database file atomically:', err);
    }
  }

  public resetToSeed(): void {
    this.data = this.getDefaultState();
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to reset db file:', e);
    }
  }

  private isInsideTransaction = false;

  // Transaction helper: strictly sequential FIFO execution with atomic file persist and re-entrant support
  public async transaction<T>(mutator: (data: DatabaseSchema) => T | Promise<T>): Promise<T> {
    if (this.isInsideTransaction) {
      return await mutator(this.data);
    }

    const next = this.queue.then(async () => {
      this.isInsideTransaction = true;
      try {
        const result = await mutator(this.data);
        await this.saveToDisk();
        return result;
      } finally {
        this.isInsideTransaction = false;
      }
    });
    this.queue = next.catch(() => {});
    return next;
  }

  // Direct read getters (return deep copies to prevent external mutations)
  public getWorkspaces(): Workspace[] {
    return JSON.parse(JSON.stringify(this.data.workspaces));
  }

  public getWorkspace(id: string): Workspace | undefined {
    const ws = this.data.workspaces.find(w => w.id === id);
    return ws ? JSON.parse(JSON.stringify(ws)) : undefined;
  }

  public getUsers(workspaceId?: string): User[] {
    const list = workspaceId ? this.data.users.filter(u => u.workspace_id === workspaceId) : this.data.users;
    return JSON.parse(JSON.stringify(list));
  }

  public getUser(id: string): User | undefined {
    const u = this.data.users.find(usr => usr.id === id);
    return u ? JSON.parse(JSON.stringify(u)) : undefined;
  }

  public getLeads(workspaceId?: string): Lead[] {
    const list = workspaceId ? this.data.leads.filter(l => l.workspace_id === workspaceId) : this.data.leads;
    return JSON.parse(JSON.stringify(list));
  }

  public getLead(id: string): Lead | undefined {
    const l = this.data.leads.find(lead => lead.id === id);
    return l ? JSON.parse(JSON.stringify(l)) : undefined;
  }

  public getOpportunities(workspaceId?: string): Opportunity[] {
    const list = workspaceId ? this.data.opportunities.filter(o => o.workspace_id === workspaceId) : this.data.opportunities;
    return JSON.parse(JSON.stringify(list));
  }

  public getContacts(workspaceId?: string): Contact[] {
    const list = workspaceId ? this.data.contacts.filter(c => c.workspace_id === workspaceId) : this.data.contacts;
    return JSON.parse(JSON.stringify(list));
  }

  public getCompanies(workspaceId?: string): Company[] {
    const list = workspaceId ? this.data.companies.filter(c => c.workspace_id === workspaceId) : this.data.companies;
    return JSON.parse(JSON.stringify(list));
  }

  public getPipelines(workspaceId?: string): Pipeline[] {
    const list = workspaceId ? this.data.pipelines.filter(p => p.workspace_id === workspaceId) : this.data.pipelines;
    return JSON.parse(JSON.stringify(list));
  }

  public getCustomFields(workspaceId?: string): CustomFieldDefinition[] {
    const list = workspaceId ? this.data.custom_fields.filter(cf => cf.workspace_id === workspaceId) : this.data.custom_fields;
    return JSON.parse(JSON.stringify(list));
  }

  public getChatMessages(workspaceId?: string, contactId?: string): ChatMessage[] {
    let list = workspaceId ? this.data.chat_messages.filter(m => m.workspace_id === workspaceId) : this.data.chat_messages;
    if (contactId) {
      list = list.filter(m => m.contact_id === contactId);
    }
    return JSON.parse(JSON.stringify(list));
  }

  public getPayments(workspaceId?: string): PaymentRequest[] {
    const list = workspaceId ? this.data.payments.filter(p => p.workspace_id === workspaceId) : this.data.payments;
    return JSON.parse(JSON.stringify(list));
  }

  public getAppointments(workspaceId?: string): CalendarAppointment[] {
    const list = workspaceId ? this.data.appointments.filter(a => a.workspace_id === workspaceId) : this.data.appointments;
    return JSON.parse(JSON.stringify(list));
  }

  public getIntegrations(workspaceId?: string): IntegrationConnection[] {
    const list = workspaceId ? this.data.integrations.filter(i => i.workspace_id === workspaceId) : this.data.integrations;
    return JSON.parse(JSON.stringify(list));
  }

  public getSyncLogs(workspaceId?: string): IntegrationSyncLog[] {
    const list = workspaceId ? this.data.sync_logs.filter(l => l.workspace_id === workspaceId) : this.data.sync_logs;
    return JSON.parse(JSON.stringify(list));
  }

  public getNotificationOutbox(workspaceId?: string): NotificationOutboxItem[] {
    const list = workspaceId ? this.data.notification_outbox.filter(n => n.workspace_id === workspaceId) : this.data.notification_outbox;
    return JSON.parse(JSON.stringify(list));
  }

  public getAuditLogs(workspaceId?: string): AuditLogItem[] {
    const list = workspaceId ? this.data.audit_logs.filter(a => a.workspace_id === workspaceId) : this.data.audit_logs;
    return JSON.parse(JSON.stringify(list));
  }

  public getSavedFilters(workspaceId?: string): SavedFilter[] {
    return JSON.parse(JSON.stringify(this.data.saved_filters));
  }

  // Idempotency check helper
  public getIdempotentResponse(key: string): any | null {
    const record = this.data.processed_idempotency_keys[key];
    return record ? record.response : null;
  }

  public setIdempotentResponse(key: string, response: any): void {
    this.data.processed_idempotency_keys[key] = {
      timestamp: new Date().toISOString(),
      response
    };
  }
}

export const db = new Database();
