import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  SlidersHorizontal, 
  Building2, 
  Plus, 
  Code, 
  Globe, 
  Moon, 
  Sun, 
  Laptop, 
  Check, 
  Save, 
  Trash2,
  Lock,
  Layers,
  Sparkles
} from 'lucide-react';
import { CustomFieldType, PipelineStage } from '../../types';

export const SettingsView: React.FC = () => {
  const { 
    activeWorkspace, 
    activeWorkspaceId, 
    updateWorkspaceSettings, 
    customFields, 
    createCustomField, 
    pipelines, 
    activePipelineId, 
    theme, 
    setTheme, 
    currentUser, 
    captureLead,
    showToast 
  } = useApp();

  const [workspaceName, setWorkspaceName] = useState(activeWorkspace.name);
  const [currency, setCurrency] = useState(activeWorkspace.currency);
  const [timezone, setTimezone] = useState(activeWorkspace.timezone);

  // New Custom Field state (F2.2)
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState<CustomFieldType>('text');
  const [fieldEntity, setFieldEntity] = useState<'opportunity' | 'contact'>('opportunity');
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldOptions, setFieldOptions] = useState('');

  // Public Lead Form Test state
  const [publicName, setPublicName] = useState('Ali Raza');
  const [publicEmail, setPublicEmail] = useState('ali.raza@pakistanindustrial.pk');
  const [publicPhone, setPublicPhone] = useState('+92 300 4455221');
  const [publicCompany, setPublicCompany] = useState('Raza Textile Processing');
  const [publicNotes, setPublicNotes] = useState('Inquiring about 100kW grid-tied commercial rooftop installation.');

  const handleSaveWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    updateWorkspaceSettings({
      name: workspaceName,
      currency,
      currency_symbol: currency === 'PKR' ? '₨' : '$',
      timezone
    });
  };

  const handleCreateField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldLabel.trim()) return;

    createCustomField({
      label: fieldLabel.trim(),
      key: fieldLabel.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      field_type: fieldType,
      entity_type: fieldEntity,
      pipeline_id: activePipelineId,
      required: fieldRequired,
      options: fieldType === 'dropdown' ? fieldOptions.split(',').map(o => o.trim()) : undefined
    });

    setFieldLabel('');
    setFieldOptions('');
  };

  const handlePublicFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    captureLead({
      contact_name: publicName,
      contact_email: publicEmail,
      contact_phone: publicPhone,
      company_name: publicCompany,
      source: 'web_form',
      notes: publicNotes,
      value: 7500000
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[var(--surface-border)]">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold font-heading text-[var(--text-primary)]">
            Workspace Settings & Schema Studio
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Tenant configuration, no-code custom field builder, public web intake generator, and visual preferences.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: Tenant Workspace Configuration */}
        <div className="p-5 rounded-xl tactile-card space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[var(--primary-teal)]" />
            <h3 className="font-heading font-bold text-sm text-[var(--text-primary)]">
              Workspace Environment ({activeWorkspace.name})
            </h3>
          </div>

          <form onSubmit={handleSaveWorkspace} className="space-y-3 text-xs">
            <div>
              <label className="text-[11px] text-[var(--text-muted)] block mb-1">Company / Workspace Name</label>
              <input
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-primary)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-[var(--text-muted)] block mb-1">Primary Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-primary)] font-mono"
                >
                  <option value="PKR">PKR (Pakistani Rupee - ₨)</option>
                  <option value="USD">USD (US Dollar - $)</option>
                  <option value="EUR">EUR (Euro - €)</option>
                  <option value="GBP">GBP (British Pound - £)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-[var(--text-muted)] block mb-1">Business Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-primary)] font-mono"
                >
                  <option value="Asia/Karachi">Asia/Karachi (PKT +05:00)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST +04:00)</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[var(--primary-teal)] text-white font-semibold text-xs tactile-button cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Workspace</span>
              </button>
            </div>
          </form>
        </div>

        {/* Panel 2: Theme & Visual System (Tidal Graphite) */}
        <div className="p-5 rounded-xl tactile-card space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--primary-teal)]" />
            <h3 className="font-heading font-bold text-sm text-[var(--text-primary)]">
              Appearance & Design System
            </h3>
          </div>

          <div className="text-xs space-y-3">
            <span className="text-[var(--text-muted)] block">
              Active Palette: <strong>Tidal Graphite</strong> (Warm Ivory #F6F5EF in Light, Dark Teal #142521 in Dark, Primary Teal #087F70, Citrus Accent #D7F36A).
            </span>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => setTheme('light')}
                className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                  theme === 'light'
                    ? 'border-[var(--primary-teal)] bg-[var(--surface-subtle)] font-semibold'
                    : 'border-[var(--surface-border)] hover:bg-[var(--surface-subtle)] text-[var(--text-muted)]'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span className="text-xs text-[var(--text-primary)]">Warm Ivory (Light)</span>
                </div>
                <div className="text-[10px] text-[var(--text-subtle)]">
                  #F6F5EF canvas with crisp contrast
                </div>
              </button>

              <button
                onClick={() => setTheme('dark')}
                className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                  theme === 'dark'
                    ? 'border-[var(--primary-teal)] bg-[var(--surface-subtle)] font-semibold'
                    : 'border-[var(--surface-border)] hover:bg-[var(--surface-subtle)] text-[var(--text-muted)]'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Moon className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-[var(--text-primary)]">Tidal Slate (Dark)</span>
                </div>
                <div className="text-[10px] text-[var(--text-subtle)]">
                  #142521 background with #1D332C surfaces
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Panel 3: No-Code Custom Field Creator (F2.2 & F2.3) */}
        <div className="p-5 rounded-xl tactile-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[var(--primary-teal)]" />
              <h3 className="font-heading font-bold text-sm text-[var(--text-primary)]">
                Custom CRM Fields Builder (F2.2)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[var(--text-muted)]">Instant UI Propagation</span>
          </div>

          <form onSubmit={handleCreateField} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-[var(--text-muted)] block mb-1">Field Label</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Inverter Serial Number"
                  value={fieldLabel}
                  onChange={(e) => setFieldLabel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="text-[11px] text-[var(--text-muted)] block mb-1">Field Type</label>
                <select
                  value={fieldType}
                  onChange={(e) => setFieldType(e.target.value as CustomFieldType)}
                  className="w-full px-2.5 py-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-primary)]"
                >
                  <option value="text">Single Line Text</option>
                  <option value="number">Numeric Value</option>
                  <option value="date">Date Picker</option>
                  <option value="dropdown">Dropdown Select</option>
                  <option value="checkbox">Boolean Checkbox</option>
                </select>
              </div>
            </div>

            {fieldType === 'dropdown' && (
              <div>
                <label className="text-[11px] text-[var(--text-muted)] block mb-1">Dropdown Options (comma separated)</label>
                <input
                  type="text"
                  placeholder="Option 1, Option 2, Option 3"
                  value={fieldOptions}
                  onChange={(e) => setFieldOptions(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-primary)]"
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fieldRequired}
                  onChange={(e) => setFieldRequired(e.target.checked)}
                  className="rounded text-[var(--primary-teal)]"
                />
                <span className="text-[var(--text-primary)]">Required Field</span>
              </label>

              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[var(--primary-teal)] text-white font-semibold text-xs tactile-button cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Field</span>
              </button>
            </div>
          </form>

          {/* List of active custom fields */}
          <div className="pt-2 border-t border-[var(--surface-border)] space-y-1.5 text-xs">
            <span className="text-[10px] text-[var(--text-subtle)] block uppercase font-medium">Configured Fields in Workspace</span>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {customFields.filter(cf => cf.workspace_id === activeWorkspaceId).map(cf => (
                <div key={cf.id} className="p-2 rounded bg-[var(--surface-subtle)] border border-[var(--surface-border)] flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-[var(--text-primary)]">{cf.label}</span>
                    <span className="text-[10px] text-[var(--text-muted)] ml-2 font-mono">({cf.field_type})</span>
                  </div>
                  {cf.required && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold">
                      Required
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel 4: Public Lead Web Form Generator & Simulator (F3.1) */}
        <div className="p-5 rounded-xl tactile-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-600" />
              <h3 className="font-heading font-bold text-sm text-[var(--text-primary)]">
                Public Website Lead Intake Form (F3.1)
              </h3>
            </div>
            <span className="text-[10px] text-emerald-600 font-mono">Live Inbound Webhook</span>
          </div>

          <p className="text-xs text-[var(--text-muted)]">
            Simulate a public customer filling out your website quote form. Submitting triggers immediate round-robin assignment and the real-time SLA countdown.
          </p>

          <form onSubmit={handlePublicFormSubmit} className="space-y-3 text-xs p-3 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)]">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-[var(--text-muted)] block">Customer Name</label>
                <input
                  type="text"
                  required
                  value={publicName}
                  onChange={(e) => setPublicName(e.target.value)}
                  className="w-full px-2 py-1.5 rounded bg-[var(--surface-main)] border border-[var(--surface-border)] text-xs text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="text-[10px] text-[var(--text-muted)] block">Phone Number</label>
                <input
                  type="text"
                  required
                  value={publicPhone}
                  onChange={(e) => setPublicPhone(e.target.value)}
                  className="w-full px-2 py-1.5 rounded bg-[var(--surface-main)] border border-[var(--surface-border)] text-xs text-[var(--text-primary)] font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-[var(--text-muted)] block">Company</label>
                <input
                  type="text"
                  value={publicCompany}
                  onChange={(e) => setPublicCompany(e.target.value)}
                  className="w-full px-2 py-1.5 rounded bg-[var(--surface-main)] border border-[var(--surface-border)] text-xs text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="text-[10px] text-[var(--text-muted)] block">Email</label>
                <input
                  type="email"
                  required
                  value={publicEmail}
                  onChange={(e) => setPublicEmail(e.target.value)}
                  className="w-full px-2 py-1.5 rounded bg-[var(--surface-main)] border border-[var(--surface-border)] text-xs text-[var(--text-primary)]"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-[var(--text-muted)] block">Inquiry Details</label>
              <textarea
                rows={2}
                value={publicNotes}
                onChange={(e) => setPublicNotes(e.target.value)}
                className="w-full px-2 py-1.5 rounded bg-[var(--surface-main)] border border-[var(--surface-border)] text-xs text-[var(--text-primary)]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Submit Web Inquiry & Trigger SLA Timer</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
