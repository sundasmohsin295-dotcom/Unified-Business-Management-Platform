import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, PhoneCall, Send, ShieldCheck } from 'lucide-react';

interface WhatsAppSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsAppSimulatorModal: React.FC<WhatsAppSimulatorModalProps> = ({ isOpen, onClose }) => {
  const { simulateInboundWhatsApp, contacts, activeWorkspaceId, showToast } = useApp();

  const [phone, setPhone] = useState('+92 300 8899221');
  const [name, setName] = useState('Chaudhry Rizwan');
  const [message, setMessage] = useState('Assalam-o-Alaikum, we need a quote for an 80kW solar inverter system for our packaging factory.');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !message.trim()) return;

    simulateInboundWhatsApp(phone.trim(), message.trim(), name.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl bg-[var(--surface-main)] border border-[var(--surface-border)] p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-emerald-600" />
            <h3 className="font-heading font-bold text-sm text-[var(--text-primary)]">
              Simulate Inbound WhatsApp Webhook (I1)
            </h3>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[var(--text-muted)]">
          Simulates a real customer WhatsApp message reaching the Twilio / WhatsApp Business Platform webhook. If from a new number, an inbound lead is automatically created and assigned!
        </p>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="text-[11px] text-[var(--text-muted)] block mb-1">Customer Mobile Number</label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-primary)] font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] text-[var(--text-muted)] block mb-1">Sender Name (if new contact)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-primary)]"
            />
          </div>

          <div>
            <label className="text-[11px] text-[var(--text-muted)] block mb-1">Incoming WhatsApp Message Body</label>
            <textarea
              rows={3}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-primary)]"
            />
          </div>

          <div className="p-2.5 rounded bg-[var(--surface-subtle)] border border-[var(--surface-border)] flex items-center justify-between text-[10px] text-[var(--text-subtle)]">
            <span>Webhook: POST /api/webhooks/whatsapp</span>
            <span className="text-emerald-600 font-medium">HMAC Verification Active</span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--surface-border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs bg-[var(--surface-subtle)] text-[var(--text-primary)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Simulate Webhook Dispatch</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
