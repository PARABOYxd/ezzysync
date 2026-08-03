import React, { useEffect, useState, useCallback } from 'react';
import { Check, Phone, MessageSquare, Mail, Calendar, FileText, AlertCircle, Clock, ExternalLink } from 'lucide-react';
import Input from '../components/ui/Input.jsx';
import * as followUpService from '../services/followUpService';
import * as leadService from '../services/leadService';
import * as bookingService from '../services/bookingService';
import { SkeletonTableRows } from '../components/common/Skeleton.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { useToast } from '../hooks/useToast.jsx';
import CompleteFollowUpDrawer from '../components/followup/CompleteFollowUpDrawer.jsx';
import LeadViewDrawer from '../components/lead/LeadViewDrawer.jsx';
import LeadFormDrawer from '../components/lead/LeadFormDrawer.jsx';
import BookingFormDrawer from '../components/booking/BookingFormDrawer.jsx';
import { LeadStageBadge, FollowUpStatusBadge } from '../components/common/StatusBadge.jsx';

function getActivityIcon(type) {
  switch (type) {
    case 'call': return <Phone size={13} className="text-blue-600" />;
    case 'whatsapp': return <MessageSquare size={13} className="text-emerald-600" />;
    case 'email': return <Mail size={13} className="text-violet-600" />;
    case 'meeting': return <Calendar size={13} className="text-amber-600" />;
    default: return <FileText size={13} className="text-slate-500" />;
  }
}

export default function FollowUps() {
  const [items, setItems] = useState([]);
  const [doneItems, setDoneItems] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignedTo, setAssignedTo] = useState('');
  const [activeFollowUp, setActiveFollowUp] = useState(null);
  const [viewingLead, setViewingLead] = useState(null);
  const [editingLead, setEditingLead] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);
  const [editLoadingId, setEditLoadingId] = useState(null);
  const [currentSegment, setCurrentSegment] = useState('pending'); // 'pending', 'all', 'priority', 'new', 'no-action'
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const dueItems = await followUpService.getDueFollowUps({ overdue: true, dueToday: true, assignedTo });
      setItems(dueItems);

      const completedItems = await followUpService.getCompletedFollowUps({ assignedTo });
      setDoneItems(completedItems);

      const leadData = await leadService.getLeads({ limit: 100 });
      const activeLeads = (leadData.leads || []).filter(l => 
        l.stage !== 'Won' && 
        l.stage !== 'Lost'
      );
      
      const committedLeadIds = new Set(dueItems.filter(i => i.source_type === 'lead').map(i => String(i.source_id)));
      
      const hasFutureFollowUp = (lead) => {
        if (!lead.nextFollowUpDate) return false;
        const date = new Date(lead.nextFollowUpDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date >= today;
      };

      const nurturing = activeLeads.filter(l => 
        !committedLeadIds.has(String(l.leadId)) && 
        !hasFutureFollowUp(l)
      );
      nurturing.sort((a, b) => {
        const timeA = new Date(a.updatedAt || a.createdAt).getTime();
        const timeB = new Date(b.updatedAt || b.createdAt).getTime();
        return timeA - timeB; // Oldest first
      });
      setLeads(nurturing);
    } catch (err) {
      toast.error('Could not load follow-up queues.');
    } finally {
      setLoading(false);
    }
  }, [assignedTo, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const isOverdue = (dateStr) => new Date(dateStr) < new Date(new Date().toDateString());

  const getIdleDays = (lead) => {
    const lastActive = new Date(lead.updatedAt || lead.createdAt);
    const diffTime = Math.abs(new Date() - lastActive);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isNoActionLead = (lead) => {
    return lead.stage === 'New' || !lead.nextFollowUpDate;
  };

  const getConsolidatedRows = () => {
    const committedRows = items.map(item => ({
      id: `committed-${item.id}`,
      originalId: item.id,
      type: 'committed',
      customerName: item.customer_name,
      sourceType: item.source_type,
      sourceId: item.source_id,
      note: item.note,
      activityType: item.activity_type,
      assignedTo: item.assigned_to,
      dueDate: item.next_follow_up_date,
      overdue: isOverdue(item.next_follow_up_date),
      idleDays: null,
      noAction: item.note === 'Nurturing check-in',
      phone: item.customer_phone,
      email: item.customer_email,
      stage: null,
      // A scheduled next-follow-up date always wins - it's a committed
      // action, not a nurture queue item.
      status: 'Scheduled',
    }));

    const nurturingRows = leads.map(lead => ({
      id: `nurture-${lead.leadId}`,
      originalId: lead.leadId,
      type: 'nurture',
      customerName: lead.customerName,
      sourceType: 'lead',
      sourceId: lead.leadId,
      note: 'Nurturing check-in',
      activityType: 'call',
      assignedTo: lead.assignedTo,
      dueDate: null,
      overdue: false,
      idleDays: getIdleDays(lead),
      noAction: isNoActionLead(lead),
      phone: lead.phone,
      email: lead.email,
      stage: lead.stage,
      // followUpCount includes the auto-logged "Lead created via..." entry,
      // so >1 means a real follow-up action has been taken before.
      status: (lead.followUpCount || 0) > 1 ? 'Followup' : 'New',
    }));

    const doneRows = doneItems.map(item => ({
      id: `done-${item.id}`,
      originalId: item.id,
      type: 'done',
      customerName: item.customer_name,
      sourceType: item.source_type,
      sourceId: item.source_id,
      note: item.note,
      activityType: item.activity_type,
      assignedTo: item.assigned_to,
      dueDate: null,
      overdue: false,
      idleDays: null,
      noAction: false,
      phone: item.customer_phone,
      email: item.customer_email,
      stage: null,
      status: 'Done',
      completedAt: item.created_at,
    }));

    if (currentSegment === 'priority') {
      return committedRows;
    }
    if (currentSegment === 'new') {
      return nurturingRows.filter(r => r.stage === 'New');
    }
    if (currentSegment === 'no-action') {
      const noActionCommitted = committedRows.filter(r => r.noAction);
      const noActionNurture = nurturingRows.filter(r => r.noAction);
      return [...noActionCommitted, ...noActionNurture];
    }
    if (currentSegment === 'all') {
      return [...committedRows, ...nurturingRows, ...doneRows];
    }

    // 'pending' - everyone who still needs a follow-up (the old default "All" tab)
    return [...committedRows, ...nurturingRows];
  };

  const rows = getConsolidatedRows();

  const handleDoneClick = (row) => {
    if (row.type === 'committed') {
      const originalItem = items.find(i => i.id === row.originalId);
      setActiveFollowUp(originalItem);
    } else {
      setActiveFollowUp({
        id: null,
        customer_name: row.customerName,
        note: 'Nurturing check-in',
        assigned_to: row.assignedTo,
        source_type: 'lead',
        source_id: row.sourceId,
        customer_phone: row.phone,
        customer_email: row.email
      });
    }
  };

  // Opens the edit drawer inline, right here on the Follow-ups page,
  // instead of navigating to /leads or /bookings - row data from the
  // consolidated table is partial (esp. for committed rows), so fetch the
  // full record by id first.
  const handleEditClick = async (row) => {
    setEditLoadingId(row.id);
    try {
      if (row.sourceType === 'booking') {
        const booking = await bookingService.getBooking(row.sourceId);
        setEditingBooking(booking);
      } else {
        const lead = await leadService.getLead(row.sourceId);
        setEditingLead(lead);
      }
    } catch {
      toast.error('Could not load details to edit.');
    } finally {
      setEditLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 select-none">
      {/* Top Controls: Filter & Segments */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="w-full max-w-xs">
          <Input placeholder="Filter by assigned team member…" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} />
        </div>
        <div className="flex gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-zinc-800/60 border border-slate-200/50 dark:border-zinc-800/40">
          {[
            { id: 'pending', label: 'Pending Leads' },
            { id: 'all', label: 'All' },
            { id: 'priority', label: 'Priority Today' },
            { id: 'new', label: 'New Leads' },
            { id: 'no-action', label: 'No Action Taken' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentSegment(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                currentSegment === tab.id
                  ? 'bg-white dark:bg-zinc-900 text-[#F97316] shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Unified Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50/60">
                <th className="py-3 px-4 font-medium">Customer</th>
                <th className="py-3 px-4 font-medium">Note / Action</th>
                <th className="py-3 px-4 font-medium">Assigned To</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium">Due</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <SkeletonTableRows rows={6} cols={6} />}
              {!loading && rows.map((row) => {
                return (
                  <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-medium">
                      <div>
                        <p className="text-slate-700">{row.customerName}</p>
                        <button
                          onClick={() => handleEditClick(row)}
                          disabled={editLoadingId === row.id}
                          className="text-xs text-brand-600 hover:underline disabled:opacity-50 disabled:cursor-wait"
                          title={`Edit ${row.customerName}'s details`}
                        >
                          {editLoadingId === row.id ? 'Loading…' : (row.phone || '-')}
                        </button>
                        {row.noAction && (
                          <p className="text-[10px] text-rose-500 font-semibold mt-0.5 animate-pulse">Nothing happened yet</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      <span className="flex items-center gap-1.5">
                        {getActivityIcon(row.activityType)} {row.note}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{row.assignedTo || '-'}</td>
                    <td className="py-3 px-4"><FollowUpStatusBadge status={row.status} /></td>
                    <td className="py-3 px-4">
                      {row.type === 'done' ? (
                        <span className="badge-tint px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-50 text-emerald-600 border border-emerald-100">
                          Completed ({new Date(row.completedAt).toLocaleDateString('en-IN')})
                        </span>
                      ) : row.dueDate ? (
                        <span className={`badge-tint px-2 py-0.5 text-[10px] font-bold rounded ${
                          row.overdue
                            ? 'bg-rose-50 text-rose-600 border border-rose-100'
                            : 'bg-amber-50 text-amber-600 border border-amber-100'
                        }`}>
                          {row.overdue ? 'Overdue' : 'Today'} ({new Date(row.dueDate).toLocaleDateString('en-IN')})
                        </span>
                      ) : (
                        <span className={`badge-tint px-2 py-0.5 text-[10px] font-bold rounded ${
                          row.idleDays >= 5
                            ? 'bg-red-50 text-red-600 border border-red-100'
                            : row.idleDays >= 2
                            ? 'bg-amber-50 text-amber-600 border border-amber-100'
                            : 'bg-slate-50 text-slate-600 border border-slate-200'
                        }`}>
                          {row.idleDays === 0 ? 'Updated today' : `Idle for ${row.idleDays} days`}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end items-center gap-2">
                        {row.phone && (
                          <a
                            href={`tel:${row.phone}`}
                            title={`Call ${row.customerName}`}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition shrink-0"
                          >
                            <Phone size={13} />
                          </a>
                        )}
                        {row.phone && (
                          <a
                            href={`https://wa.me/${row.phone.replace(/[^\d]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            title="WhatsApp Chat"
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition shrink-0"
                          >
                            <MessageSquare size={13} />
                          </a>
                        )}
                        {row.type !== 'done' && (
                          <button
                            onClick={() => handleDoneClick(row)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#F97316] text-white hover:bg-[#ea580c] shrink-0 shadow-sm ml-1"
                          >
                            <Check size={13} /> Done
                          </button>
                        )}
                        {row.sourceType === 'lead' && (
                          <button
                            onClick={() => setViewingLead({ leadId: row.sourceId, customerName: row.customerName })}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 ml-1 shrink-0"
                          >
                            <ExternalLink size={12} /> Open Lead
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && rows.length === 0 && (
          <EmptyState title="No follow-ups found" message="All caught up for this filter segment!" />
        )}
      </div>

      <CompleteFollowUpDrawer
        open={!!activeFollowUp}
        onClose={() => setActiveFollowUp(null)}
        followUp={activeFollowUp}
        onCompleted={load}
      />

      <LeadViewDrawer
        open={!!viewingLead}
        lead={viewingLead}
        onClose={() => setViewingLead(null)}
        onRefresh={load}
      />

      <LeadFormDrawer
        open={!!editingLead}
        lead={editingLead}
        onClose={() => setEditingLead(null)}
        onSaved={load}
      />

      <BookingFormDrawer
        open={!!editingBooking}
        booking={editingBooking}
        onClose={() => setEditingBooking(null)}
        onSaved={load}
      />
    </div>
  );
}
