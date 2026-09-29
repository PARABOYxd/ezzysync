import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, List, LayoutGrid, Phone, Mail, UserCheck, Upload, Send, History } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import LeadFilters from '../components/lead/LeadFilters.jsx';
import LeadTable from '../components/lead/LeadTable.jsx';
import LeadFormDrawer from '../components/lead/LeadFormDrawer.jsx';
import LeadViewDrawer from '../components/lead/LeadViewDrawer.jsx';
import ConvertLeadDrawer from '../components/lead/ConvertLeadDrawer.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import LeadPoolDrawer from '../components/lead/LeadPoolDrawer.jsx';
import ImportLeadsDrawer from '../components/lead/ImportLeadsDrawer.jsx';
import BroadcastLeadsDrawer from '../components/lead/BroadcastLeadsDrawer.jsx';
import BroadcastHistoryDrawer from '../components/lead/BroadcastHistoryDrawer.jsx';
import Pagination from '../components/common/Pagination.jsx';
import { LeadPriorityBadge } from '../components/common/StatusBadge.jsx';
import * as leadService from '../services/leadService';
import { useToast } from '../hooks/useToast.jsx';
import { usePermission } from '../hooks/usePermission.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { API_BASE_URL } from '../services/api';

const STAGES = ['New', 'Contacted', 'Negotiating', 'Won', 'Lost'];

const STAGE_HEADER_STYLES = {
  New: 'bg-blue-50/50 dark:bg-zinc-900 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-zinc-800',
  Contacted: 'bg-indigo-50/50 dark:bg-zinc-900 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-zinc-800',
  Negotiating: 'bg-[#FFF7ED] dark:bg-zinc-900 text-[#F97316] border-[#FFEDD5] dark:border-zinc-800',
  Won: 'bg-emerald-50/50 dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-zinc-800',
  Lost: 'bg-red-50/50 dark:bg-zinc-900 text-red-700 dark:text-red-400 border-red-100 dark:border-zinc-800',
};

export default function Leads() {
  const { user } = useAuth();
  const isTeamMember = user?.role === 'TEAM_MEMBER';
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState(localStorage.getItem('leads_view_mode') || 'table');
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '', stage: '', priority: '', assignedTo: '', createdFrom: '', createdTo: '', sort: 'newest', page: 1, limit: 10,
  });

  const [pagination, setPagination] = useState({ totalCount: 0, totalPages: 1, currentPage: 1, limit: 10 });

  const [formOpen, setFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [viewingLead, setViewingLead] = useState(null);
  const [convertingLead, setConvertingLead] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [poolCount, setPoolCount] = useState(0);
  const [poolOpen, setPoolOpen] = useState(false);
  const socketRef = useRef(null);

  const [importOpen, setImportOpen] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastHistoryOpen, setBroadcastHistoryOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const toast = useToast();

  const toggleSelect = (leadId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId); else next.add(leadId);
      return next;
    });
  };
  const toggleSelectAll = (ids, select) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (select ? next.add(id) : next.delete(id)));
      return next;
    });
  };
  const selectedLeads = leads.filter((l) => selectedIds.has(l.leadId));

  const changeViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('leads_view_mode', mode);
  };

  const load = useCallback(() => {
    setLoading(true);
    // If in pipeline mode, load all active leads for Kanban
    if (viewMode === 'pipeline') {
      leadService.getLeadsForPipeline()
        .then((data) => {
          setLeads(data || []);
        })
        .catch(() => toast.error('Could not load pipeline.'))
        .finally(() => setLoading(false));
    } else {
      leadService
        .getLeads(filters)
        .then((data) => {
          setLeads(data.leads || []);
          setPagination(data.pagination || { totalCount: 0, totalPages: 1, currentPage: 1, limit: 10 });
        })
        .catch(() => toast.error('Could not load leads.'))
        .finally(() => setLoading(false));
    }
  }, [filters, viewMode]);

  useEffect(load, [load]);

  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  // WebSocket Connection - only reconnects if tenant changes, not on filter updates
  useEffect(() => {
    // Initial fetch of unassigned leads
    leadService.getLeadPool()
      .then((poolLeads) => {
        setPoolCount(poolLeads.length);
      })
      .catch(() => {});

    const apiVal = API_BASE_URL;
    const wsUrl = apiVal.replace(/^http/, 'ws').replace(/\/api$/, '');
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      if (user?.tenantId) {
        socket.send(JSON.stringify({ type: 'join', tenantId: user.tenantId }));
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'LEAD_POOL_UPDATED') {
          setPoolCount(data.count || 0);
          loadRef.current?.(); // Refresh the list
        }
      } catch (err) {
        console.error('Error parsing WS message', err);
      }
    };

    return () => {
      socket.close();
    };
  }, [user?.tenantId]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await leadService.deleteLead(deleteTarget.leadId);
      toast.success('Lead deleted.');
      setDeleteTarget(null);
      load();
    } catch {
      toast.error('Could not delete lead.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStage = destination.droppableId;
    const lead = leads.find((l) => l.leadId === draggableId);
    if (!lead) return;

    // Optimistic update
    setLeads((prev) => prev.map((l) => (l.leadId === draggableId ? { ...l, stage: newStage } : l)));

    if (newStage === 'Won' && !lead.convertedBookingId) {
      setConvertingLead({ ...lead, stage: newStage, originalStage: source.droppableId });
      return;
    }

    try {
      await leadService.updateLeadStage(draggableId, newStage);
    } catch (err) {
      toast.error('Could not update lead stage.');
      // Rollback optimistic update
      setLeads((prev) => prev.map((l) => (l.leadId === draggableId ? { ...l, stage: source.droppableId } : l)));
    }
  };

  const columns = STAGES.reduce((acc, stage) => {
    acc[stage] = leads.filter((l) => l.stage === stage);
    return acc;
  }, {});

  const canCreate = usePermission('leads', 'create');
  const handleFiltersChange = (newFilters) => setFilters({ ...newFilters, page: 1 });

  return (
    <div className="space-y-5">
      {/* Top Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
            <span>Leads</span>
            <span className="text-xs bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 font-semibold px-2 py-0.5 rounded-full">
              {viewMode === 'pipeline' ? leads.length : pagination.totalCount}
            </span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 relative">
          {/* Lead Pool badge - pulses only while there are leads waiting to be claimed */}
          <button
            type="button"
            onClick={() => setPoolOpen(!poolOpen)}
            className={`${poolCount > 0 ? 'animate-pulse' : ''} bg-brand-50 border border-brand-200 text-brand-700 cursor-pointer hover:bg-brand-100 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm flex items-center gap-1.5 transition whitespace-nowrap`}
          >
            <span className="h-2 w-2 rounded-full bg-brand-600 block"></span>
            Lead Pool ({poolCount})
          </button>
          <LeadPoolDrawer isOpen={poolOpen} onClose={() => setPoolOpen(false)} onLeadClaimed={load} onPoolCountChange={setPoolCount} poolCount={poolCount} />

          {/* Segmented control for List / Pipeline */}
          <div className="flex items-center bg-slate-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-slate-200 dark:border-zinc-700">
            <button 
              onClick={() => changeViewMode('table')} 
              className={`p-1.5 rounded-md flex items-center gap-1.5 text-xs font-semibold transition ${
                viewMode === 'table' ? 'bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 shadow-xs' : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600'
              }`}
            >
              <List size={14} />
              <span>Table</span>
            </button>
            <button 
              onClick={() => changeViewMode('pipeline')} 
              className={`p-1.5 rounded-md flex items-center gap-1.5 text-xs font-semibold transition ${
                viewMode === 'pipeline' ? 'bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 shadow-xs' : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600'
              }`}
            >
              <LayoutGrid size={14} />
              <span>Kanban</span>
            </button>
          </div>

          {canCreate && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setImportOpen(true)}
              title="Bring your old leads in from an Excel or CSV file"
            >
              <Upload size={16} /> Import
            </button>
          )}
          <button type="button" className="btn-secondary" onClick={() => setBroadcastHistoryOpen(true)} aria-label="Broadcast History" title="Broadcast History">
            <History size={16} /> <span className="hidden sm:inline">Broadcast History</span>
          </button>
          {canCreate && (
            <button className="btn-primary" onClick={() => { setEditingLead(null); setFormOpen(true); }}>
              <Plus size={16} /> Add Lead
            </button>
          )}
        </div>
      </div>

      {viewMode === 'table' ? (
        <>
          <div className="flex items-center justify-between">
            <LeadFilters filters={filters} onChange={handleFiltersChange} />
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between bg-brand-50 border border-brand-200 rounded-xl px-4 py-2.5">
              <span className="text-xs font-semibold text-brand-700">{selectedIds.size} lead{selectedIds.size === 1 ? '' : 's'} selected</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setSelectedIds(new Set())} className="text-xs text-slate-500 hover:text-slate-700">
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setBroadcastOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm transition"
                >
                  <Send size={13} /> Message Selected
                </button>
              </div>
            </div>
          )}

          <LeadTable
            leads={leads}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            loading={loading}
            onView={setViewingLead}
            onEdit={(l) => { setEditingLead(l); setFormOpen(true); }}
            onDelete={setDeleteTarget}
            onConvert={setConvertingLead}
          />

          {!loading && (
            <Pagination
              currentPage={filters.page}
              totalPages={pagination.totalPages}
              totalCount={pagination.totalCount}
              limit={filters.limit}
              itemName="leads"
              onPageChange={(p) => setFilters((prev) => ({ ...prev, page: p }))}
              className="mt-4 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm"
            />
          )}
        </>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-slate-400 dark:text-zinc-500 font-medium">Drag cards between columns to change enquiry stages. Dropping into "Won" initiates bookings.</p>
          
          {loading ? (
            <div className="skeleton h-96 rounded-2xl" />
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="flex flex-row overflow-x-auto gap-4 items-start pb-4 w-full no-scrollbar">
                {STAGES.map((stage) => (
                  <Droppable droppableId={stage} key={stage}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`rounded-2xl border p-2 min-h-[480px] w-[240px] shrink-0 transition-colors ${STAGE_HEADER_STYLES[stage]} ${snapshot.isDraggingOver ? 'ring-2 ring-brand-400' : ''}`}
                      >
                        <div className="flex items-center justify-between px-2 py-1.5 mb-2">
                          <h4 className="text-xs font-bold uppercase tracking-wide">{stage}</h4>
                          <span className="text-xs font-semibold bg-white/70 dark:bg-zinc-800/80 rounded-full px-2 py-0.5">{columns[stage].length}</span>
                        </div>
                        <div className="space-y-2">
                          {columns[stage].map((lead, index) => (
                            <Draggable draggableId={lead.leadId} index={index} key={lead.leadId}>
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  onClick={() => setViewingLead(lead)}
                                  className={`bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-3 shadow-sm cursor-pointer hover:shadow-md transition select-none ${dragSnapshot.isDragging ? 'shadow-lg rotate-1' : ''}`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="font-semibold text-slate-800 dark:text-zinc-100 text-sm truncate">{lead.customerName}</p>
                                    <LeadPriorityBadge priority={lead.priority} />
                                  </div>
                                  <p className="text-xs text-slate-500 dark:text-zinc-400 truncate mt-0.5">{lead.interest || 'General inquiry'}</p>
                                  {(lead.departureDate || lead.travelers) && (
                                    <div className="flex items-center gap-2 mt-1 text-[10px] text-brand-600 dark:text-brand-400 font-medium">
                                      {lead.departureDate && <span>📅 {lead.departureDate}</span>}
                                      {lead.travelers && <span>👥 {lead.travelers} pax</span>}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400 dark:text-zinc-500">
                                    <span className="flex items-center gap-1"><Phone size={10} /> {lead.phone}</span>
                                  </div>
                                  {!isTeamMember && lead.assignedTo && (
                                    <div className="flex items-center gap-1 mt-1.5 text-[10px] text-slate-500 dark:text-zinc-400">
                                      <UserCheck size={10} /> {lead.assignedTo}
                                    </div>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                ))}
              </div>
            </DragDropContext>
          )}
        </div>
      )}

      <ImportLeadsDrawer open={importOpen} onClose={() => setImportOpen(false)} onImported={load} />
      <LeadFormDrawer open={formOpen} lead={editingLead} onClose={() => setFormOpen(false)} onSaved={load} onConvert={setConvertingLead} />
      <LeadViewDrawer
        open={!!viewingLead}
        lead={viewingLead}
        onClose={() => setViewingLead(null)}
        onRefresh={load}
        onEdit={(l) => {
          setViewingLead(null);
          setEditingLead(l);
          setFormOpen(true);
        }}
      />
      <ConvertLeadDrawer 
        open={!!convertingLead} 
        lead={convertingLead} 
        onClose={() => {
          if (convertingLead && convertingLead.originalStage) {
            setLeads((prev) => prev.map((l) => (l.leadId === convertingLead.leadId ? { ...l, stage: convertingLead.originalStage } : l)));
          }
          setConvertingLead(null);
        }} 
        onConverted={() => {
          setConvertingLead(null);
          load();
        }} 
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete lead?"
        message={`This will remove "${deleteTarget?.customerName}"'s lead from the active pipeline.`}
      />
      <BroadcastLeadsDrawer
        open={broadcastOpen}
        onClose={() => setBroadcastOpen(false)}
        leads={selectedLeads}
        onSent={() => setSelectedIds(new Set())}
      />
      <BroadcastHistoryDrawer open={broadcastHistoryOpen} onClose={() => setBroadcastHistoryOpen(false)} />
    </div>
  );
}
