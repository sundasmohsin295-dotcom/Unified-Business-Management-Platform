import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, UserPlus, Sparkles } from 'lucide-react';
import { LeadSource } from '../../types';

interface NewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewLeadModal: React.FC<NewLeadModalProps> = ({ isOpen, onClose }) => {
  const { captureLead, activeWorkspace, currentUser } = useApp();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [source, setSource] = useState<LeadSource>('manual_entry');
  const [value, setValue] = useState<number>(3500000);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    captureLead({
      contact_name: name.trim(),
      contact_email: email.trim() || `${phone.replace(/\D/g, '')}@leadflow.demo`,
      contact_phone: phone.trim(),
      company_name: company.trim(),
      source,
      value: Number(value),
      notes: notes.trim()
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl bg-[var(--surface-main)] border border-[var(--surface-border)] p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[var(--primary-teal)]" />
            <h3 className="font-heading font-bold text-sm text-[var(--text-primary)]">
              Capture Inbound Lead
            </h3>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="text-[11px] text-[var(--text-muted)] block mb-1">Customer / Contact Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Mian Jahangir"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-teal)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-[var(--text-muted)] block mb-1">Mobile Phone *</label>
              <input
                type="text"
                required
                placeholder="+92 300 1234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-primary)] font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] text-[var(--text-muted)] block mb-1">Email Address</label>
              <input
                type="email"
                placeholder="customer@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-primary)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-[var(--text-muted)] block mb-1">Company / Organization</label>
              <input
                type="text"
                placeholder="Apex Commercial"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-primary)]"
              />
            </div>

            <div>
              <label className="text-[11px] text-[var(--text-muted)] block mb-1">Intake Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as LeadSource)}
                className="w-full px-2.5 py-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-primary)]"
              >
                <option value="web_form">Public Web Form</option>
                <option value="whatsapp">Twilio WhatsApp Sandbox</option>
                <option value="manual_entry">Manual Sales Entry</option>
                <option value="phone_call">Phone Inbound</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] text-[var(--text-muted)] block mb-1">Estimated Deal Worth ({activeWorkspace.currency})</label>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-primary)] font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] text-[var(--text-muted)] block mb-1">Initial Inquiry Note</label>
            <textarea
              rows={2}
              placeholder="Add customer requirements or project notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-primary)]"
            />
          </div>

          <div className="p-2.5 rounded bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[10px] text-[var(--text-muted)]">
            ⚡ Submitting will auto-assign via Round Robin to an available representative and start the {activeWorkspace.sla_acknowledgement_seconds}s SLA countdown.
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
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[var(--primary-teal)] text-white shadow-sm cursor-pointer"
            >
              Capture Lead & Start SLA
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
