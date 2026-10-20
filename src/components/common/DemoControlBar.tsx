import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Play, 
  FastForward, 
  PhoneCall, 
  UserX, 
  CreditCard, 
  Sliders, 
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Send
} from 'lucide-react';

interface DemoControlBarProps {
  onOpenNewLeadModal: () => void;
  onOpenWhatsAppSimulator: () => void;
}

export const DemoControlBar: React.FC<DemoControlBarProps> = ({ 
  onOpenNewLeadModal, 
  onOpenWhatsAppSimulator 
}) => {
  const { 
    activeWorkspace, 
    updateWorkspaceSettings, 
    simulationSpeed, 
    setSimulationSpeed,
    users,
    setUserAvailability,
    payments,
    simulatePaymentWebhook,
    captureLead,
    showToast,
    leads
  } = useApp();

  const [expanded, setExpanded] = useState(false);

  // Quick 1-click test triggers:
  const handleQuickLead = () => {
    captureLead({
      contact_name: 'Engr. Haris Farooq',
      contact_email: 'haris@farooqmills.com',
      contact_phone: '+92 302 9988112',
      company_name: 'Farooq Weaving & Spinning',
      source: 'web_form',
      value: 8500000,
      notes: 'Submitted via commercial rooftop calculator. Requesting urgent solar feasibility survey.'
    });
  };

  const handleTestAbsenceReassign = () => {
    // Find an available rep with leads or pick Hamza/Sara
    const rep = users.find(u => u.workspace_id === activeWorkspace.id && u.role === 'user' && u.availability === 'available') || users[2];
    if (rep) {
      setUserAvailability(rep.id, 'on_leave');
    }
  };

  const handleTestPaymentWebhook = () => {
    // Find pending payment
    const pendingPayment = payments.find(p => p.workspace_id === activeWorkspace.id && p.status === 'pending');
    if (pendingPayment) {
      simulatePaymentWebhook(pendingPayment.id, 'collected');
    } else {
      // Pick first payment to test refund or re-trigger
      const firstPayment = payments.find(p => p.workspace_id === activeWorkspace.id);
      if (firstPayment) {
        simulatePaymentWebhook(firstPayment.id, firstPayment.status === 'collected' ? 'refunded' : 'collected');
      } else {
        showToast('No pending payment request found to simulate webhook.', 'warning');
      }
    }
  };

  return (
    <aside aria-label="Competition Evaluation Suite" className="w-full bg-[var(--surface-subtle)] border-b border-[var(--surface-border)] px-4 py-2 text-xs transition-colors duration-150">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Judge Tour Badge & Core Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--accent-citrus-subtle)] border border-[var(--accent-citrus-dark)]/40 text-[var(--text-primary)] font-semibold text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-[var(--primary-teal)]" />
            <span className="font-heading">Judge Live Evaluator</span>
          </div>

          <button
            onClick={handleQuickLead}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--surface-main)] hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] font-medium text-[var(--text-primary)] tactile-button cursor-pointer"
            title="Inject an immediate inbound web lead to test round-robin and active countdown"
          >
            <Play className="w-3 h-3 text-[var(--primary-teal)] fill-[var(--primary-teal)]" />
            <span>+ Quick Web Lead</span>
          </button>

          <button
            onClick={onOpenWhatsAppSimulator}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--surface-main)] hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] font-medium text-[var(--text-primary)] tactile-button cursor-pointer"
            title="Simulate inbound WhatsApp customer message webhook"
          >
            <PhoneCall className="w-3 h-3 text-emerald-600" />
            <span>Simulate WhatsApp Webhook</span>
          </button>

          <button
            onClick={handleTestAbsenceReassign}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--surface-main)] hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] font-medium text-[var(--text-primary)] tactile-button cursor-pointer"
            title="Mark rep as On Leave to trigger instantaneous automatic lead reassignment"
          >
            <UserX className="w-3 h-3 text-purple-600" />
            <span>Test Rep Absence (On Leave)</span>
          </button>

          <button
            onClick={async () => {
              try {
                const res = await fetch('/api/demo/advance-sla', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ seconds: 15 })
                });
                if (res.ok) {
                  const data = await res.json();
                  showToast(`⚡ Advanced server clock by 15s: ${data.escalated_count} lead(s) escalated by watchdog!`, 'warning');
                }
              } catch (e) {
                showToast('Failed to advance SLA clock', 'error');
              }
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-medium text-[11px] tactile-button cursor-pointer"
            title="Authoritatively advance server-persisted deadline to trigger watchdog escalation immediately"
          >
            <FastForward className="w-3 h-3 text-amber-600" />
            <span>Fast Forward 15s (Timeout SLA)</span>
          </button>

          <button
            onClick={async () => {
              if (confirm('Reset database to clean verified initial seed state?')) {
                try {
                  const res = await fetch('/api/demo/reset', { method: 'POST' });
                  if (res.ok) {
                    showToast('Database reset to clean verified seed state', 'success');
                    window.location.reload();
                  }
                } catch (e) {
                  showToast('Failed to reset database', 'error');
                }
              }
            }}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] text-[var(--text-muted)] text-[10px] cursor-pointer"
            title="Reset database to deterministic initial seed data"
          >
            <span>Reset Seed</span>
          </button>
        </div>

        {/* Right: SLA Timing Configuration in Seconds */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] font-mono">
            <span>SLA Window:</span>
            <select
              value={activeWorkspace.sla_acknowledgement_seconds}
              onChange={(e) => updateWorkspaceSettings({ sla_acknowledgement_seconds: Number(e.target.value) })}
              className="bg-[var(--surface-main)] border border-[var(--surface-border)] rounded px-1.5 py-0.5 text-xs text-[var(--text-primary)] cursor-pointer"
            >
              <option value={10}>10s (Instant Demo)</option>
              <option value={15}>15s (Default Fast Demo)</option>
              <option value={30}>30s (Rapid)</option>
              <option value={60}>60s (1 Minute)</option>
              <option value={900}>15m (Production)</option>
            </select>
          </div>

          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-[var(--text-muted)]">Clock:</span>
            <button
              onClick={() => setSimulationSpeed(1)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer ${
                simulationSpeed === 1 ? 'bg-[var(--primary-teal)] text-white' : 'bg-[var(--surface-main)] text-[var(--text-muted)]'
              }`}
            >
              1x
            </button>
            <button
              onClick={() => setSimulationSpeed(5)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer ${
                simulationSpeed === 5 ? 'bg-[var(--primary-teal)] text-white' : 'bg-[var(--surface-main)] text-[var(--text-muted)]'
              }`}
            >
              5x
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
