import React, { useEffect, useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Phone, Mail, UserCheck } from 'lucide-react';
import * as leadService from '../services/leadService';
import LeadViewModal from '../components/lead/LeadViewModal.jsx';
import ConvertLeadDrawer from '../components/lead/ConvertLeadDrawer.jsx';
import { useToast } from '../hooks/useToast.jsx';

const STAGES = ['New', 'Contacted', 'Qualified', 'Negotiating', 'Won', 'Lost'];

const STAGE_HEADER_STYLES = {
  New: 'bg-blue-50 text-blue-700 border-blue-100',
  Contacted: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  Qualified: 'bg-amber-50 text-amber-700 border-amber-100',
  Negotiating: 'bg-brand-50 text-brand-700 border-brand-100',
  Won: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  Lost: 'bg-red-50 text-red-700 border-red-100',
};

export default function Pipeline() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingLead, setViewingLead] = useState(null);
  const [convertingLead, setConvertingLead] = useState(null);
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    leadService.getLeadsForPipeline()
      .then(setLeads)
      .catch(() => toast.error('Could not load pipeline.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(load, [load]);

  const columns = STAGES.reduce((acc, stage) => {
    acc[stage] = leads.filter((l) => l.stage === stage);
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
    setLeads((prev) => prev.map((l) => (l.leadId === draggableId ? { ...l, stage: newStage } : l)));

    if (newStage === 'Won' && !lead.convertedBookingId) {
      setConvertingLead({ ...lead, stage: newStage });
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

  if (loading) return <div className="skeleton h-96 rounded-2xl" />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">Drag a card between columns to update its pipeline stage. Dropping into "Won" starts the booking conversion.</p>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
          {STAGES.map((stage) => (
            <Droppable droppableId={stage} key={stage}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`rounded-2xl border p-2 min-h-[200px] transition-colors ${STAGE_HEADER_STYLES[stage]} ${snapshot.isDraggingOver ? 'ring-2 ring-brand-400' : ''}`}
                >
                  <div className="flex items-center justify-between px-2 py-1.5 mb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wide">{stage}</h4>
                    <span className="text-xs font-semibold bg-white/70 rounded-full px-2 py-0.5">{columns[stage].length}</span>
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
                            className={`bg-white rounded-xl border border-slate-200 p-3 shadow-sm cursor-pointer hover:shadow-md transition ${dragSnapshot.isDragging ? 'shadow-lg rotate-1' : ''}`}
                          >
                            <p className="font-semibold text-slate-800 text-sm truncate">{lead.customerName}</p>
                            <p className="text-xs text-slate-500 truncate mt-0.5">{lead.interest || 'General inquiry'}</p>
                            <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
                              <span className="flex items-center gap-1"><Phone size={10} /> {lead.phone}</span>
                            </div>
                            {lead.assignedTo && (
                              <div className="flex items-center gap-1 mt-1.5 text-[10px] text-slate-500">
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

      <LeadViewModal open={!!viewingLead} lead={viewingLead} onClose={() => setViewingLead(null)} onRefresh={load} />
      <ConvertLeadDrawer
        open={!!convertingLead}
        lead={convertingLead}
        onClose={() => { setConvertingLead(null); load(); }}
        onConverted={load}
      />
    </div>
  );
}
