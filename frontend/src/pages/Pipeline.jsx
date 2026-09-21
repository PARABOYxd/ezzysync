import React, { useEffect, useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Phone, MessageSquare, UserCheck, Search, X, Calendar } from 'lucide-react';
import * as leadService from '../services/leadService';
import LeadViewDrawer from '../components/lead/LeadViewDrawer.jsx';
import ConvertLeadDrawer from '../components/lead/ConvertLeadDrawer.jsx';
import { useToast } from '../hooks/useToast.jsx';

const STAGES = ['New', 'Contacted', 'Qualified', 'Negotiating', 'Won', 'Lost'];

const STAGE_HEADER_COLORS = {
  New: 'border-t-blue-500 text-blue-700 bg-blue-50/40',
  Contacted: 'border-t-indigo-500 text-indigo-700 bg-indigo-50/40',
  Qualified: 'border-t-amber-500 text-amber-700 bg-amber-50/40',
  Negotiating: 'border-t-brand-500 text-brand-700 bg-brand-50/40',
  Won: 'border-t-emerald-500 text-emerald-700 bg-emerald-50/40',
  Lost: 'border-t-rose-500 text-rose-700 bg-rose-50/40',
};

export default function Pipeline() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [viewingLead, setViewingLead] = useState(null);
  const [convertingLead, setConvertingLead] = useState(null);
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    leadService
      .getLeadsForPipeline()
      .then((data) => setLeads(data || []))
      .catch(() => toast.error('Could not load pipeline.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(load, [load]);

  // Filter leads by search and assigned agent
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      !searchQuery ||
      lead.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.interest?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone?.includes(searchQuery);

    const matchesAssigned =
      !assignedFilter ||
      lead.assignedTo?.toLowerCase().includes(assignedFilter.toLowerCase());

    return matchesSearch && matchesAssigned;
  });

  const columns = STAGES.reduce((acc, stage) => {
    acc[stage] = filteredLeads.filter((l) => l.stage === stage);
    return acc;
  }, {});

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStage = destination.droppableId;
    const lead = leads.find((l) => l.leadId === draggableId);
    if (!lead) return;

    // Optimistic update
    setLeads((prev) =>
      prev.map((l) => (l.leadId === draggableId ? { ...l, stage: newStage } : l))
    );

    if (newStage === 'Won' && !lead.convertedBookingId) {
      setConvertingLead({ ...lead, stage: newStage });
      return;
    }

    try {
      await leadService.updateLeadStage(draggableId, newStage);
    } catch {
      toast.error('Could not update lead stage.');
      load();
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              className="input pl-9 pr-8 h-9 text-xs"
              placeholder="Filter pipeline cards by customer, phone, package…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <input
            type="text"
            className="input w-36 h-9 text-xs shrink-0"
            placeholder="Agent name…"
            value={assignedFilter}
            onChange={(e) => setAssignedFilter(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>
            Total Active Deals: <b className="text-slate-800">{filteredLeads.length}</b>
          </span>
          {(searchQuery || assignedFilter) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setAssignedFilter('');
              }}
              className="btn-ghost text-xs h-8 px-2"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="skeleton h-[480px] rounded-xl" />
      ) : (
        /* True Horizontal Kanban Rail with continuous fixed column widths */
        <DragDropContext onDragEnd={handleDragEnd}>
          {/* Mobile Stage Selector Rail */}
          <div className="flex sm:hidden items-center gap-1.5 overflow-x-auto no-scrollbar py-1 mb-2">
            {STAGES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  const el = document.getElementById(`stage-${s}`);
                  el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }}
                className="px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <span>{s}</span>
                <span className="text-[10px] bg-slate-100 dark:bg-zinc-700 px-1.5 py-0.5 rounded-full font-bold">
                  {columns[s]?.length || 0}
                </span>
              </button>
            ))}
          </div>

          <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 min-h-[520px] snap-x snap-mandatory">
            {STAGES.map((stage) => {
              const stageDeals = columns[stage] || [];
              const headerColor = STAGE_HEADER_COLORS[stage] || 'border-t-slate-400 text-slate-700 bg-slate-50';

              return (
                <div
                  key={stage}
                  id={`stage-${stage}`}
                  className="w-[85vw] xs:w-72 sm:w-80 shrink-0 flex flex-col rounded-xl border border-slate-200/90 bg-slate-50/60 shadow-sm snap-center"
                >
                  {/* Column Header */}
                  <div
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-t-xl border-t-4 border-b border-slate-200/80 bg-white ${headerColor}`}
                  >
                    <h4 className="text-xs font-bold uppercase tracking-wider">{stage}</h4>
                    <span className="text-xs font-bold bg-slate-100 text-slate-700 rounded-full px-2 py-0.5">
                      {stageDeals.length}
                    </span>
                  </div>

                  {/* Droppable Column Area */}
                  <Droppable droppableId={stage}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 p-2.5 space-y-2.5 overflow-y-auto max-h-[640px] transition-colors ${
                          snapshot.isDraggingOver ? 'bg-brand-50/50 ring-2 ring-brand-400/40 rounded-b-xl' : ''
                        }`}
                      >
                        {stageDeals.map((lead, index) => {
                          const cleanPhone = (lead.phone || '').replace(/[^0-9]/g, '');
                          const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : null;

                          return (
                            <Draggable draggableId={lead.leadId} index={index} key={lead.leadId}>
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  onClick={() => setViewingLead(lead)}
                                  className={`bg-white rounded-lg border border-slate-200/80 p-3 shadow-sm hover:shadow-md transition-all cursor-pointer select-none group ${
                                    dragSnapshot.isDragging ? 'shadow-xl ring-2 ring-brand-500 rotate-1' : ''
                                  }`}
                                >
                                  {/* Lead Header */}
                                  <div className="flex items-start justify-between gap-2">
                                    <h5 className="font-semibold text-slate-800 text-xs truncate group-hover:text-brand-600 transition-colors">
                                      {lead.customerName}
                                    </h5>
                                    <span className="font-mono text-[10px] text-slate-400 shrink-0">
                                      {lead.leadId}
                                    </span>
                                  </div>

                                  {/* Interest / Destination */}
                                  <p className="text-[11px] text-slate-500 font-medium truncate mt-1">
                                    {lead.interest || 'Trip destination TBD'}
                                  </p>

                                  {/* Contact & Shortcuts */}
                                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-[10px]">
                                    <div className="flex items-center gap-2">
                                      {whatsappUrl && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(whatsappUrl, '_blank');
                                          }}
                                          className="text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
                                          title="Open WhatsApp"
                                        >
                                          <MessageSquare size={11} />
                                          <span>Chat</span>
                                        </button>
                                      )}
                                      {lead.phone && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(`tel:${lead.phone}`);
                                          }}
                                          className="text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                                          title="Call"
                                        >
                                          <Phone size={11} />
                                          <span>Call</span>
                                        </button>
                                      )}
                                    </div>

                                    {lead.assignedTo && (
                                      <div className="flex items-center gap-1 text-slate-500 font-medium truncate max-w-[110px]">
                                        <UserCheck size={11} />
                                        <span className="truncate">{lead.assignedTo}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                        {stageDeals.length === 0 && (
                          <div className="text-center py-10 border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
                            No deals in this stage
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {/* SlideOver Drawer for viewing card details */}
      <LeadViewDrawer
        open={!!viewingLead}
        lead={viewingLead}
        onClose={() => setViewingLead(null)}
        onRefresh={load}
        onConvert={setConvertingLead}
      />

      {/* Convert Lead to Booking Drawer */}
      <ConvertLeadDrawer
        open={!!convertingLead}
        lead={convertingLead}
        onClose={() => {
          setConvertingLead(null);
          load();
        }}
        onConverted={load}
      />
    </div>
  );
}
