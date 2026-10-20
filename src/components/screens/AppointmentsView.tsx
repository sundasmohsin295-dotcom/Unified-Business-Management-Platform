import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User as UserIcon, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  ExternalLink, 
  Video, 
  MapPin, 
  Filter, 
  CalendarDays,
  ShieldCheck,
  X
} from 'lucide-react';
import { CalendarAppointment } from '../../types';

export const AppointmentsView: React.FC = () => {
  const { 
    appointments, 
    contacts, 
    opportunities, 
    users, 
    activeWorkspace, 
    activeWorkspaceId, 
    currentUser, 
    bookAppointment, 
    cancelAppointment, 
    showToast 
  } = useApp();

  const [filterRep, setFilterRep] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);

  // Form states
  const [aptTitle, setAptTitle] = useState('Commercial Solar Technical Roof Feasibility');
  const [selectedContactId, setSelectedContactId] = useState(contacts[0]?.id || '');
  const [selectedRepId, setSelectedRepId] = useState(currentUser.id);
  const [aptDate, setAptDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [aptTime, setAptTime] = useState('11:00');
  const [aptDuration, setAptDuration] = useState('60');
  const [locationType, setLocationType] = useState<'meet' | 'site'>('meet');
  const [customLocation, setCustomLocation] = useState('Plot 44, Quaid-e-Azam Industrial Estate, Lahore');

  const workspaceAppointments = appointments.filter(a => {
    if (a.workspace_id !== activeWorkspaceId) return false;
    if (filterRep !== 'all' && a.assigned_user_id !== filterRep) return false;
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    return true;
  });

  const workspaceContacts = contacts.filter(c => c.workspace_id === activeWorkspaceId);
  const workspaceUsers = users.filter(u => u.workspace_id === activeWorkspaceId);

  // Conflict detection preview
  const checkConflict = (repId: string, startIso: string, endIso: string) => {
    const start = new Date(startIso).getTime();
    const end = new Date(endIso).getTime();
    return appointments.find(a => {
      if (a.workspace_id !== activeWorkspaceId) return false;
      if (a.assigned_user_id !== repId) return false;
      if (a.status === 'cancelled') return false;
      const aStart = new Date(a.start_time).getTime();
      const aEnd = new Date(a.end_time).getTime();
      return start < aEnd && end > aStart;
    });
  };

  const handleBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContactId) {
      showToast('Please select a contact for the consultation', 'warning');
      return;
    }

    const startIso = new Date(`${aptDate}T${aptTime}:00`).toISOString();
    const endIso = new Date(new Date(`${aptDate}T${aptTime}:00`).getTime() + Number(aptDuration) * 60000).toISOString();
    const targetContact = workspaceContacts.find(c => c.id === selectedContactId);
    const targetOpp = opportunities.find(o => o.contact_id === selectedContactId);

    const locationString = locationType === 'meet' 
      ? `Google Meet: https://meet.google.com/lf-${Math.random().toString(36).substring(2, 6)}`
      : customLocation;

    const result = bookAppointment({
      title: aptTitle,
      contact_id: selectedContactId,
      opportunity_id: targetOpp?.id,
      assigned_user_id: selectedRepId,
      start_time: startIso,
      end_time: endIso,
      timezone: activeWorkspace.timezone,
      location_or_link: locationString
    });

    if (result.success) {
      setIsBookModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[var(--surface-border)]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl lg:text-2xl font-bold font-heading text-[var(--text-primary)]">
              Appointments & Calendar Operations
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--primary-teal-light)] text-[var(--primary-teal)] border border-[var(--primary-teal)]/30 font-mono">
              Google Calendar Sync Active
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Server-synchronized schedule with real-time two-way conflict checking, timezone alignment, and automated audit logs.
          </p>
        </div>

        <button
          onClick={() => setIsBookModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--primary-teal)] hover:opacity-95 text-white font-semibold text-xs tactile-button cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Schedule Consultation</span>
        </button>
      </div>

      {/* Integration Status Bar */}
      <div className="p-3.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-subtle)] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <CalendarIcon className="w-4 h-4 text-[var(--primary-teal)]" />
          <span className="font-medium text-[var(--text-primary)]">Google Calendar API:</span>
          <span className="text-[var(--text-muted)]">Connected with OAuth 2.0 (Two-Way Conflict Engine Active)</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--text-muted)]">
          <span>Timezone: {activeWorkspace.timezone}</span>
          <span>·</span>
          <span>Workspace: {activeWorkspace.name}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="text-[var(--text-muted)]">Filter Rep:</span>
          <select
            value={filterRep}
            onChange={(e) => setFilterRep(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-[var(--surface-main)] border border-[var(--surface-border)] text-xs text-[var(--text-primary)] cursor-pointer"
          >
            <option value="all">All Sales Representatives</option>
            {workspaceUsers.map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.title})</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-[var(--text-muted)]">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-[var(--surface-main)] border border-[var(--surface-border)] text-xs text-[var(--text-primary)] cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Appointments List */}
      <div className="space-y-3">
        {workspaceAppointments.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-[var(--surface-border)] bg-[var(--surface-main)] text-xs text-[var(--text-muted)]">
            No appointments found matching your filters.
          </div>
        ) : (
          workspaceAppointments.map(apt => {
            const contact = workspaceContacts.find(c => c.id === apt.contact_id);
            const rep = workspaceUsers.find(u => u.id === apt.assigned_user_id);
            const isCancelled = apt.status === 'cancelled';
            const startDate = new Date(apt.start_time);
            const endDate = new Date(apt.end_time);

            return (
              <div 
                key={apt.id} 
                className={`p-4 rounded-xl tactile-card flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                  isCancelled ? 'opacity-60 bg-[var(--surface-subtle)]' : ''
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className={`p-3 rounded-lg shrink-0 ${
                    isCancelled ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400' : 'bg-[var(--primary-teal-light)] text-[var(--primary-teal)]'
                  }`}>
                    <CalendarDays className="w-5 h-5" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-heading font-bold text-sm text-[var(--text-primary)]">
                        {apt.title}
                      </h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        apt.status === 'confirmed' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' :
                        apt.status === 'cancelled' ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30' :
                        'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        {apt.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Clock className="w-3.5 h-3.5" />
                        {startDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}, {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <UserIcon className="w-3.5 h-3.5" />
                        {contact?.name || 'Prospect'} ({contact?.phone})
                      </span>
                      <span>·</span>
                      <span className="font-medium text-[var(--text-primary)]">
                        Assigned: {rep?.name || 'Representative'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1 text-xs">
                      {apt.location_or_link.includes('http') ? (
                        <a 
                          href={apt.location_or_link.split(' ')[1] || apt.location_or_link} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[var(--primary-teal)] hover:underline font-mono text-[11px]"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Google Meet Room</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="flex items-center gap-1 text-[var(--text-muted)] font-mono text-[11px]">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{apt.location_or_link}</span>
                        </span>
                      )}
                      <span className="text-[10px] text-[var(--text-subtle)] font-mono">
                        Event ID: {apt.google_event_id}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  {!isCancelled && (
                    <button
                      onClick={() => cancelAppointment(apt.id)}
                      className="px-2.5 py-1.5 rounded-lg border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-medium cursor-pointer transition-colors"
                    >
                      Cancel Meeting
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Schedule Consultation Modal */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-[var(--surface-main)] border border-[var(--surface-border)] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--surface-border)]">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-[var(--primary-teal)]" />
                <h2 className="font-heading font-bold text-base text-[var(--text-primary)]">
                  Schedule Consultation & Site Audit
                </h2>
              </div>
              <button 
                onClick={() => setIsBookModalOpen(false)}
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBookSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-[11px] font-medium text-[var(--text-muted)] block mb-1">Meeting Title</label>
                <input
                  type="text"
                  required
                  value={aptTitle}
                  onChange={(e) => setAptTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-primary)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-[var(--text-muted)] block mb-1">Customer / Contact</label>
                  <select
                    required
                    value={selectedContactId}
                    onChange={(e) => setSelectedContactId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-primary)]"
                  >
                    {workspaceContacts.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.company_name || c.phone})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[var(--text-muted)] block mb-1">Assigned Representative</label>
                  <select
                    required
                    value={selectedRepId}
                    onChange={(e) => setSelectedRepId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-primary)]"
                  >
                    {workspaceUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.title})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-[var(--text-muted)] block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={aptDate}
                    onChange={(e) => setAptDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-primary)] font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[var(--text-muted)] block mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={aptTime}
                    onChange={(e) => setAptTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-primary)] font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[var(--text-muted)] block mb-1">Duration</label>
                  <select
                    value={aptDuration}
                    onChange={(e) => setAptDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-primary)]"
                  >
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-[var(--text-muted)] block mb-1">Location / Format</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setLocationType('meet')}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium cursor-pointer ${
                      locationType === 'meet' ? 'border-[var(--primary-teal)] bg-[var(--primary-teal-light)] text-[var(--primary-teal)] font-semibold' : 'border-[var(--surface-border)] text-[var(--text-muted)]'
                    }`}
                  >
                    Google Meet (Virtual)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocationType('site')}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium cursor-pointer ${
                      locationType === 'site' ? 'border-[var(--primary-teal)] bg-[var(--primary-teal-light)] text-[var(--primary-teal)] font-semibold' : 'border-[var(--surface-border)] text-[var(--text-muted)]'
                    }`}
                  >
                    Physical / On-Site
                  </button>
                </div>

                {locationType === 'site' && (
                  <input
                    type="text"
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-primary)]"
                    placeholder="Enter physical address or facility location"
                  />
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[var(--surface-border)] text-[var(--text-muted)] hover:bg-[var(--surface-subtle)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[var(--primary-teal)] text-white font-semibold tactile-button cursor-pointer"
                >
                  Confirm & Sync Calendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
