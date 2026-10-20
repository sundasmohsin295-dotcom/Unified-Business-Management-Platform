import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  KanbanSquare, 
  ListFilter, 
  Plus, 
  Download, 
  Search, 
  SlidersHorizontal, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Building2, 
  User as UserIcon, 
  Calendar, 
  X,
  Lock,
  Tag,
  DollarSign
} from 'lucide-react';
import { Opportunity, PipelineStage } from '../../types';

export const PipelineStudio: React.FC = () => {
  const { 
    pipelines, 
    activePipelineId, 
    setActivePipelineId, 
    opportunities, 
    contacts, 
    companies, 
    users, 
    activeWorkspace, 
    activeWorkspaceId, 
    currentUser, 
    updateOpportunityStage, 
    customFields, 
    updateOpportunity, 
    createOpportunity,
    exportCRMRecords,
    savedFilters,
    setSelectedContactId,
    setActiveTab,
    showToast
  } = useApp();

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOwnerFilter, setSelectedOwnerFilter] = useState<string>('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [activeFilterId, setActiveFilterId] = useState<string>('flt-1');

  // Blocking Required Fields Modal
  const [blockingModalData, setBlockingModalData] = useState<{
    opp: Opportunity;
    targetStage: PipelineStage;
    missingFields: string[];
    valuesToFill: Record<string, any>;
  } | null>(null);

  // New Deal Modal
  const [isNewDealOpen, setIsNewDealOpen] = useState(false);
  const [newDealForm, setNewDealForm] = useState({
    title: '',
    contact_id: '',
    value: 5000000,
    expected_close_date: new Date(Date.now() + 86400000 * 20).toISOString().split('T')[0],
    tags: 'High Priority'
  });

  const activePipeline = pipelines.find(p => p.id === activePipelineId) || pipelines[0];

  // Pipeline scoped custom fields (F2.3)
  const pipelineFields = customFields.filter(cf => 
    cf.workspace_id === activeWorkspaceId && 
    (!cf.pipeline_id || cf.pipeline_id === activePipelineId)
  );

  // Filter opportunities (F2.6)
  const filteredOpportunities = opportunities.filter(opp => {
    if (opp.workspace_id !== activeWorkspaceId) return false;
    if (opp.pipeline_id !== activePipelineId) return false;

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = opp.title.toLowerCase().includes(q);
      const contact = contacts.find(c => c.id === opp.contact_id);
      const matchContact = contact?.name.toLowerCase().includes(q) || false;
      if (!matchTitle && !matchContact) return false;
    }

    // Owner filter
    if (selectedOwnerFilter !== 'all' && opp.assigned_user_id !== selectedOwnerFilter) {
      return false;
    }

    // Tag filter
    if (selectedTagFilter !== 'all' && !opp.tags?.includes(selectedTagFilter)) {
      return false;
    }

    // Saved filter presets
    if (activeFilterId === 'flt-2' && opp.value < 10000000) return false;
    if (activeFilterId === 'flt-3' && opp.assigned_user_id !== currentUser.id) return false;
    if (activeFilterId === 'flt-4' && opp.stage_id !== 'stg-audit') return false;

    return true;
  });

  // Stage transition handler with blocking validation (F2.4)
  const handleStageMove = (opp: Opportunity, targetStage: PipelineStage) => {
    if (opp.stage_id === targetStage.id) return;

    // Check required fields
    if (targetStage.required_field_keys && targetStage.required_field_keys.length > 0) {
      const missingKeys = targetStage.required_field_keys.filter(key => {
        const val = opp.custom_fields?.[key] ?? opp.custom_fields?.[key.replace('cf_', '')];
        return val === undefined || val === null || val === '';
      });

      if (missingKeys.length > 0) {
        // Open modal to block and allow filling immediately!
        setBlockingModalData({
          opp,
          targetStage,
          missingFields: missingKeys,
          valuesToFill: {}
        });
        return;
      }
    }

    // Allowed: update stage
    updateOpportunityStage(opp.id, targetStage.id);
  };

  // Submit filled required fields
  const handleCompleteRequiredFields = () => {
    if (!blockingModalData) return;
    const { opp, targetStage, valuesToFill } = blockingModalData;

    // Merge into opp custom fields
    const updatedCustom = { ...opp.custom_fields, ...valuesToFill };
    updateOpportunity(opp.id, { custom_fields: updatedCustom });
    updateOpportunityStage(opp.id, targetStage.id);
    setBlockingModalData(null);
  };

  const handleCreateNewDeal = (e: React.FormEvent) => {
    e.preventDefault();
    createOpportunity({
      pipeline_id: activePipelineId,
      stage_id: activePipeline.stages[0].id,
      title: newDealForm.title,
      contact_id: newDealForm.contact_id || contacts[0]?.id || '',
      value: Number(newDealForm.value),
      expected_close_date: newDealForm.expected_close_date,
      assigned_user_id: currentUser.id,
      tags: newDealForm.tags.split(',').map(t => t.trim())
    });
    setIsNewDealOpen(false);
    setNewDealForm({
      title: '',
      contact_id: '',
      value: 5000000,
      expected_close_date: new Date(Date.now() + 86400000 * 20).toISOString().split('T')[0],
      tags: 'High Priority'
    });
  };

  const formatValue = (val: number) => {
    if (!currentUser.permissions.view_opportunity_value) {
      return '••••••••';
    }
    return `${activeWorkspace.currency_symbol} ${val.toLocaleString()}`;
  };

  return (
    <div className="space-y-5">
      {/* Top Header: Pipeline Selector & Global CRM Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[var(--surface-border)]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl lg:text-2xl font-bold font-heading text-[var(--text-primary)]">
              CRM Pipeline Studio
            </h1>
            {/* Pipeline Scoping Switcher (F2.3) */}
            <div className="flex items-center bg-[var(--surface-subtle)] p-1 rounded-lg border border-[var(--surface-border)]">
              {pipelines.filter(p => p.workspace_id === activeWorkspaceId).map(p => (
                <button
                  key={p.id}
                  onClick={() => setActivePipelineId(p.id)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    p.id === activePipelineId 
                      ? 'bg-[var(--surface-main)] text-[var(--text-primary)] shadow-sm font-semibold' 
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {activePipeline.description} · Different custom field configurations per pipeline.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Export Records CSV (F1.3 Server-enforced) */}
          <button
            onClick={exportCRMRecords}
            disabled={!currentUser.permissions.export_crm}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 cursor-pointer tactile-button ${
              currentUser.permissions.export_crm 
                ? 'bg-[var(--surface-main)] hover:bg-[var(--surface-subtle)] border-[var(--surface-border)] text-[var(--text-primary)]' 
                : 'opacity-40 cursor-not-allowed bg-[var(--surface-subtle)] text-[var(--text-muted)]'
            }`}
            title={currentUser.permissions.export_crm ? 'Export Opportunities to CSV' : 'Export permission required'}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsNewDealOpen(true)}
            disabled={!currentUser.permissions.create_crm}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--primary-teal)] text-white hover:opacity-95 shadow-sm tactile-button flex items-center gap-1.5 cursor-pointer ${
              !currentUser.permissions.create_crm ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ New Opportunity</span>
          </button>
        </div>
      </div>

      {/* Filter & View Mode Controls Bar (F2.6 Multi-Criteria Filtering & Saved Lists) */}
      <div className="p-3.5 rounded-xl tactile-card flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search deals or contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-primary)] placeholder-[var(--text-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-teal)] text-xs"
            />
          </div>

          {/* Owner Filter */}
          <select
            value={selectedOwnerFilter}
            onChange={(e) => setSelectedOwnerFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-primary)] cursor-pointer"
          >
            <option value="all">All Assignees</option>
            {users.filter(u => u.workspace_id === activeWorkspaceId).map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>

          {/* Tag Filter */}
          <select
            value={selectedTagFilter}
            onChange={(e) => setSelectedTagFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-primary)] cursor-pointer"
          >
            <option value="all">All Tags</option>
            <option value="High Priority">High Priority</option>
            <option value="LESCO High Voltage">LESCO High Voltage</option>
            <option value="Financed By Meezan Bank">Financed By Meezan Bank</option>
            <option value="DHA Villa">DHA Villa</option>
          </select>

          {/* Saved Filter Presets */}
          <div className="flex items-center gap-1 pl-2 border-l border-[var(--surface-border)]">
            <span className="text-[10px] text-[var(--text-subtle)] uppercase">Saved:</span>
            {savedFilters.map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFilterId(f.id)}
                className={`px-2 py-1 rounded text-[11px] transition-colors cursor-pointer ${
                  activeFilterId === f.id 
                    ? 'bg-[var(--primary-teal-light)] text-[var(--primary-teal)] font-medium border border-[var(--primary-teal)]/30' 
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>

        {/* View Switcher: Kanban vs Table */}
        <div className="flex items-center gap-1 bg-[var(--surface-subtle)] p-1 rounded-lg border border-[var(--surface-border)] self-end md:self-auto">
          <button
            onClick={() => setViewMode('kanban')}
            className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
              viewMode === 'kanban' ? 'bg-[var(--surface-main)] text-[var(--text-primary)] shadow-sm font-semibold' : 'text-[var(--text-muted)]'
            }`}
          >
            Kanban Board
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
              viewMode === 'list' ? 'bg-[var(--surface-main)] text-[var(--text-primary)] shadow-sm font-semibold' : 'text-[var(--text-muted)]'
            }`}
          >
            Table List
          </button>
        </div>
      </div>

      {/* KANBAN BOARD VIEW (F2.5) */}
      {viewMode === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1">
          {activePipeline.stages.map((stage) => {
            const stageDeals = filteredOpportunities.filter(o => o.stage_id === stage.id);
            const stageTotalValue = stageDeals.reduce((sum, o) => sum + (o.value || 0), 0);

            return (
              <div 
                key={stage.id} 
                className="w-80 shrink-0 flex flex-col rounded-xl bg-[var(--surface-subtle)] border border-[var(--surface-border)] p-3 space-y-3"
              >
                {/* Stage Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[var(--surface-border)]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }}></span>
                    <span className="font-heading font-bold text-xs text-[var(--text-primary)] truncate max-w-[150px]">
                      {stage.name}
                    </span>
                    <span className="px-1.5 py-0.2 bg-[var(--surface-main)] rounded text-[10px] font-mono text-[var(--text-muted)] border border-[var(--surface-border)]">
                      {stageDeals.length}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono font-semibold text-[var(--text-primary)] tabular-nums">
                    {formatValue(stageTotalValue)}
                  </span>
                </div>

                {/* Required Fields Badge Notice (F2.4) */}
                {stage.required_field_keys && stage.required_field_keys.length > 0 && (
                  <div className="flex items-center gap-1.5 text-[10px] text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                    <Lock className="w-3 h-3 shrink-0" />
                    <span>Requires: {stage.required_field_keys.map(k => customFields.find(cf => cf.id === k)?.label || k).join(', ')}</span>
                  </div>
                )}

                {/* Deals in Stage */}
                <div className="space-y-2.5 flex-1 min-h-[300px]">
                  {stageDeals.length === 0 ? (
                    <div className="h-28 border border-dashed border-[var(--surface-border)] rounded-lg flex items-center justify-center text-[11px] text-[var(--text-subtle)]">
                      No opportunities
                    </div>
                  ) : (
                    stageDeals.map((opp) => {
                      const contact = contacts.find(c => c.id === opp.contact_id);
                      const assignedUser = users.find(u => u.id === opp.assigned_user_id);

                      return (
                        <div
                          key={opp.id}
                          className="p-3 bg-[var(--surface-main)] rounded-lg border border-[var(--surface-border)] shadow-sm tactile-button hover:border-[var(--primary-teal)] space-y-2 cursor-pointer transition-all"
                          onClick={() => {
                            setSelectedContactId(opp.contact_id);
                            setActiveTab('customer_360');
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-xs text-[var(--text-primary)] line-clamp-2 leading-snug">
                              {opp.title}
                            </span>
                          </div>

                          <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 truncate">
                            <UserIcon className="w-3 h-3 text-[var(--text-subtle)]" />
                            <span className="truncate">{contact?.name || 'Unknown Contact'}</span>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--surface-border)]">
                            <span className="font-mono font-bold text-[var(--text-primary)] tabular-nums">
                              {formatValue(opp.value)}
                            </span>
                            <span className="text-[10px] text-[var(--text-subtle)]">
                              {assignedUser?.name.split(' ')[0]}
                            </span>
                          </div>

                          {/* Quick Stage Progression Dropdown / Buttons */}
                          <div className="pt-1 flex items-center justify-between gap-1">
                            <span className="text-[10px] text-[var(--text-subtle)]">Move to:</span>
                            <select
                              value={opp.stage_id}
                              onChange={(e) => {
                                e.stopPropagation();
                                const target = activePipeline.stages.find(s => s.id === e.target.value);
                                if (target) handleStageMove(opp, target);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] bg-[var(--surface-subtle)] border border-[var(--surface-border)] rounded px-1.5 py-0.5 text-[var(--text-primary)] cursor-pointer"
                            >
                              {activePipeline.stages.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE LIST VIEW (F2.1 & F2.6) */
        <div className="rounded-xl tactile-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--surface-subtle)] border-b border-[var(--surface-border)] text-[var(--text-muted)] font-semibold">
                <tr>
                  <th className="px-4 py-3">Opportunity Title</th>
                  <th className="px-4 py-3">Contact / Company</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Close Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--surface-border)]">
                {filteredOpportunities.map(opp => {
                  const contact = contacts.find(c => c.id === opp.contact_id);
                  const stage = activePipeline.stages.find(s => s.id === opp.stage_id);
                  const owner = users.find(u => u.id === opp.assigned_user_id);

                  return (
                    <tr key={opp.id} className="hover:bg-[var(--surface-subtle)]/60 transition-colors">
                      <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                        {opp.title}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">
                        <div>{contact?.name}</div>
                        <div className="text-[10px] text-[var(--text-subtle)]">{contact?.company_name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span 
                          className="px-2 py-0.5 rounded text-[11px] font-medium"
                          style={{ backgroundColor: `${stage?.color}20`, color: stage?.color }}
                        >
                          {stage?.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-[var(--text-primary)] tabular-nums">
                        {formatValue(opp.value)}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">
                        {owner?.name}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-subtle)] font-mono">
                        {opp.expected_close_date}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedContactId(opp.contact_id);
                            setActiveTab('customer_360');
                          }}
                          className="text-[var(--primary-teal)] hover:underline font-medium cursor-pointer"
                        >
                          View 360
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BLOCKING REQUIRED FIELDS MODAL (F2.4 Acceptance Criteria) */}
      {blockingModalData && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl bg-[var(--surface-main)] border border-[var(--surface-border)] p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="font-heading font-bold text-sm text-[var(--text-primary)]">
                    Required Fields Required for "{blockingModalData.targetStage.name}"
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Stage progression is strictly validated on the server. Please fill required fields to proceed.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setBlockingModalData(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 pt-2">
              {blockingModalData.missingFields.map(key => {
                const fieldDef = customFields.find(cf => cf.id === key || cf.key === key);
                const label = fieldDef?.label || key;

                return (
                  <div key={key} className="space-y-1">
                    <label className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1">
                      <span>{label}</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type={fieldDef?.field_type === 'number' ? 'number' : 'text'}
                      placeholder={`Enter ${label}...`}
                      value={blockingModalData.valuesToFill[fieldDef?.key || key] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBlockingModalData({
                          ...blockingModalData,
                          valuesToFill: {
                            ...blockingModalData.valuesToFill,
                            [fieldDef?.key || key]: fieldDef?.field_type === 'number' ? Number(val) : val
                          }
                        });
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-teal)]"
                    />
                    {fieldDef?.help_text && (
                      <span className="text-[10px] text-[var(--text-subtle)]">{fieldDef.help_text}</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--surface-border)]">
              <button
                onClick={() => setBlockingModalData(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteRequiredFields}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[var(--primary-teal)] hover:opacity-90 text-white shadow-sm cursor-pointer"
              >
                Save & Progress Stage
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW OPPORTUNITY MODAL */}
      {isNewDealOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl bg-[var(--surface-main)] border border-[var(--surface-border)] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-sm text-[var(--text-primary)]">
                Create New Opportunity
              </h3>
              <button onClick={() => setIsNewDealOpen(false)} className="text-[var(--text-muted)] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewDeal} className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-[var(--text-primary)] block mb-1">Opportunity Title</label>
                <input
                  type="text"
                  required
                  value={newDealForm.title}
                  onChange={(e) => setNewDealForm({ ...newDealForm, title: e.target.value })}
                  placeholder="e.g. 50kW Commercial Rooftop Array"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-teal)]"
                />
              </div>

              <div>
                <label className="font-medium text-[var(--text-primary)] block mb-1">Related Contact</label>
                <select
                  value={newDealForm.contact_id}
                  onChange={(e) => setNewDealForm({ ...newDealForm, contact_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-primary)]"
                >
                  {contacts.filter(c => c.workspace_id === activeWorkspaceId).map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.company_name || 'Individual'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-medium text-[var(--text-primary)] block mb-1">Estimated Value ({activeWorkspace.currency})</label>
                <input
                  type="number"
                  required
                  value={newDealForm.value}
                  onChange={(e) => setNewDealForm({ ...newDealForm, value: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-primary)] font-mono"
                />
              </div>

              <div>
                <label className="font-medium text-[var(--text-primary)] block mb-1">Expected Close Date</label>
                <input
                  type="date"
                  required
                  value={newDealForm.expected_close_date}
                  onChange={(e) => setNewDealForm({ ...newDealForm, expected_close_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="font-medium text-[var(--text-primary)] block mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={newDealForm.tags}
                  onChange={(e) => setNewDealForm({ ...newDealForm, tags: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-border)] text-[var(--text-primary)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--surface-border)]">
                <button
                  type="button"
                  onClick={() => setIsNewDealOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs bg-[var(--surface-subtle)] text-[var(--text-primary)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[var(--primary-teal)] text-white shadow-sm cursor-pointer"
                >
                  Create Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
