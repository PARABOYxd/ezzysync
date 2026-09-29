import React, { useEffect, useState, useCallback } from 'react';
import { Check, Phone, MessageSquare, Mail, Calendar, FileText, ExternalLink, Search } from 'lucide-react';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/common/Table.jsx';
import Input from '../components/ui/Input.jsx';
import * as followUpService from '../services/followUpService';
import * as leadService from '../services/leadService';
import * as bookingService from '../services/bookingService';
import { SkeletonTableRows } from '../components/common/Skeleton.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Pagination from '../components/common/Pagination.jsx';
import { useToast } from '../hooks/useToast.jsx';
import CompleteFollowUpDrawer from '../components/followup/CompleteFollowUpDrawer.jsx';
import LeadViewDrawer from '../components/lead/LeadViewDrawer.jsx';
import LeadFormDrawer from '../components/lead/LeadFormDrawer.jsx';
import BookingFormDrawer from '../components/booking/BookingFormDrawer.jsx';
import { LeadStageBadge, FollowUpStatusBadge } from '../components/common/StatusBadge.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useNavigate } from 'react-router-dom';
import { daysUntil, dueLabel, formatDate } from '../utils/formatters';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const isTeamMember = user?.role === 'TEAM_MEMBER';
  const [items, setItems] = useState([]);
  const [doneItems, setDoneItems] = useState([]);
  const [leads, setLeads] = useState([]);
  const [confirmingBookings, setConfirmingBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignedTo, setAssignedTo] = useState('');
  const [localSearch, setLocalSearch] = useState('');
  const [search, setSearch] = useState('');
  const [activeFollowUp, setActiveFollowUp] = useState(null);
  const [viewingLead, setViewingLead] = useState(null);
  const [editingLead, setEditingLead] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);
  const [editLoadingId, setEditLoadingId] = useState(null);
  const [currentSegment, setCurrentSegment] = useState('pending'); // 'pending', 'all', 'priority', 'new', 'no-action'
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const toast = useToast();

  // Debounce search input typing before querying backend
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch]);

  useEffect(() => {
    setPage(1);
  }, [currentSegment, assignedTo, search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // The four lists are independent - fetched together, not one after another.
      const [dueItems, completedItems, leadData, bookingData] = await Promise.all([
        followUpService.getDueFollowUps({ assignedTo, search }),
        followUpService.getCompletedFollowUps({ assignedTo, search }),
        leadService.getLeads({ search, assignedTo, limit: 30 }),
        bookingService.getBookings({ search, limit: 30 }),
      ]);
      setItems(dueItems);
      setDoneItems(completedItems);

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

      // Bookings checking for travelStatus === 'Confirming'
      const activeBookings = (bookingData.bookings || []).filter(b => b.travelStatus === 'Confirming');
      
      const committedBookingIds = new Set(dueItems.filter(i => i.source_type === 'booking').map(i => String(i.source_id)));
      
      const hasFutureFollowUpBooking = (b) => {
        if (!b.nextFollowUpDate) return false;
        const date = new Date(b.nextFollowUpDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date >= today;
      };
      
      const nurturingBookings = activeBookings.filter(b => 
        !committedBookingIds.has(String(b.bookingId)) && 
        !hasFutureFollowUpBooking(b)
      );
      nurturingBookings.sort((a, b) => {
        const timeA = new Date(a.updatedAt || a.createdAt).getTime();
        const timeB = new Date(b.updatedAt || b.createdAt).getTime();
        return timeA - timeB; // Oldest first
      });
      setConfirmingBookings(nurturingBookings);
    } catch (err) {
      toast.error('Could not load follow-up queues.');
    } finally {
      setLoading(false);
    }
  }, [assignedTo, search]);

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
    const committedRows = items.map(item => {
      const days = daysUntil(item.next_follow_up_date);
      const isToday = days === 0;
      const isPendingOverdue = days !== null && days < 0;

      return {
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
        overdue: isPendingOverdue,
        isToday: isToday,
        idleDays: null,
        noAction: item.note === 'Nurturing check-in',
        phone: item.customer_phone,
        email: item.customer_email,
        stage: null,
        status: 'Scheduled',
      };
    });

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
      isToday: false,
      idleDays: getIdleDays(lead),
      noAction: isNoActionLead(lead),
      phone: lead.phone,
      email: lead.email,
      stage: lead.stage,
      status: (lead.followUpCount || 0) > 1 ? 'Followup' : 'New',
    }));

    const confirmingRows = confirmingBookings.map(b => ({
      id: `confirming-${b.bookingId}`,
      originalId: b.bookingId,
      type: 'nurture-booking',
      customerName: b.customerName,
      sourceType: 'booking',
      sourceId: b.bookingId,
      note: 'Confirming check-in',
      activityType: 'call',
      assignedTo: b.teamMember,
      dueDate: null,
      overdue: false,
      isToday: false,
      idleDays: getIdleDays(b),
      noAction: true,
      phone: b.phone,
      email: b.email,
      stage: b.travelStatus,
      status: 'Confirming',
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
      isToday: false,
      idleDays: null,
      noAction: false,
      phone: item.customer_phone,
      email: item.customer_email,
      stage: null,
      status: 'Done',
      completedAt: item.created_at,
    }));

    let filtered = [];
    if (currentSegment === 'priority') {
      filtered = committedRows.filter(r => r.overdue || r.isToday);
    } else if (currentSegment === 'new') {
      filtered = nurturingRows.filter(r => r.stage === 'New');
    } else if (currentSegment === 'no-action') {
      const noActionCommitted = committedRows.filter(r => r.noAction);
      const noActionNurture = nurturingRows.filter(r => r.noAction);
      filtered = [...noActionCommitted, ...noActionNurture, ...confirmingRows];
    } else if (currentSegment === 'all') {
      filtered = [...committedRows, ...nurturingRows, ...confirmingRows, ...doneRows];
    } else {
      // 'pending' - everyone who still needs a follow-up
      filtered = [...committedRows, ...nurturingRows, ...confirmingRows];
    }

    // Apply staff filter if specified
    if (assignedTo && assignedTo.trim()) {
      const a = assignedTo.trim().toLowerCase();
      filtered = filtered.filter(r => (r.assignedTo || '').toLowerCase().includes(a));
    }

    // Apply universal search (Customer Name, Phone, Notes, Staff)
    const q = search.trim().toLowerCase();
    if (q) {
      const tokens = q.split(/\s+/).filter(Boolean);
      filtered = filtered.filter(r => {
        const customer = (r.customerName || '').toLowerCase();
        const phone = (r.phone || '').replace(/\D/g, '');
        const rawPhone = (r.phone || '').toLowerCase();
        const assigned = (r.assignedTo || '').toLowerCase();
        const note = (r.note || '').toLowerCase();
        const haystack = `${customer} ${rawPhone} ${phone} ${assigned} ${note}`;

        // 1. Direct whole-query match
        if (haystack.includes(q)) return true;

        // 2. All tokens match
        if (tokens.every(t => haystack.includes(t))) return true;

        // 3. Typo-tolerant word match (if user typed multiple words e.g. "sumit kasar", match if significant token >= 3 chars matches)
        return tokens.some(t => t.length >= 3 && (customer.includes(t) || assigned.includes(t) || phone.includes(t)));
      });
    }

    return filtered;
  };

  const rows = getConsolidatedRows();
  const totalCount = rows.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const pagedRows = rows.slice((page - 1) * pageSize, page * pageSize);

  const handleDoneClick = (row) => {
    if (row.type === 'committed') {
      const originalItem = items.find(i => i.id === row.originalId);
      setActiveFollowUp(originalItem);
    } else {
      setActiveFollowUp({
        id: null,
        customer_name: row.customerName,
        note: row.type === 'nurture-booking' ? 'Confirming check-in' : 'Nurturing check-in',
        assigned_to: row.assignedTo,
        source_type: row.sourceType,
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
      if (row.sourceType === 'booking' || row.type === 'nurture-booking') {
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

  const renderCustomer = (row) => (
    <div className="min-w-0">
      <p className="text-slate-700 dark:text-zinc-200 font-medium">{row.customerName}</p>
      <button
        onClick={() => handleEditClick(row)}
        disabled={editLoadingId === row.id}
        className="text-xs text-brand-600 dark:text-brand-400 hover:underline disabled:opacity-50 disabled:cursor-wait"
        title={`Edit ${row.customerName}'s details`}
      >
        {editLoadingId === row.id ? 'Loading…' : (row.phone || '-')}
      </button>
      {row.noAction && (
        <p className="text-[10px] text-rose-500 font-semibold mt-0.5">Nothing happened yet</p>
      )}
    </div>
  );

  const badge = 'badge-tint inline-block px-2 py-0.5 text-[10px] font-bold rounded border';
  const TONE = {
    rose: 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/50',
    amber: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/50',
    blue: 'bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 border-sky-100 dark:border-sky-900/50',
    slate: 'bg-slate-50 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700/50',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50',
  };

  const renderDue = (row) => {
    if (row.type === 'done') {
      return <span className={`${badge} ${TONE.emerald}`}>Done · {formatDate(row.completedAt)}</span>;
    }
    if (row.dueDate) {
      const tone = row.overdue ? TONE.rose : row.isToday ? TONE.amber : TONE.blue;
      return (
        <span className={`${badge} ${tone}`} title={formatDate(row.dueDate)}>
          {dueLabel(row.dueDate)} · {formatDate(row.dueDate)}
        </span>
      );
    }
    const tone = row.idleDays >= 5 ? TONE.rose : row.idleDays >= 2 ? TONE.amber : TONE.slate;
    return (
      <span className={`${badge} ${tone}`}>
        {row.idleDays === 0 ? 'Updated today' : `Idle ${plural(row.idleDays, 'day')}`}
      </span>
    );
  };

  const iconBtn = 'p-2 rounded-lg transition shrink-0 cursor-pointer';
  const renderActions = (row) => (
    <div className="flex justify-end items-center gap-1.5">
      {row.phone && (
        <a href={`tel:${row.phone}`} title={`Call ${row.customerName}`} aria-label={`Call ${row.customerName}`}
          className={`${iconBtn} bg-blue-50 text-blue-600 hover:bg-blue-100`}>
          <Phone size={14} />
        </a>
      )}
      {row.phone && (
        <button type="button" title="Open in WhatsApp Live Chat" aria-label="Open in WhatsApp Live Chat"
          onClick={() => navigate(`/whatsapp-chat?phone=${encodeURIComponent(row.phone.replace(/[^\d]/g, ''))}`)}
          className={`${iconBtn} bg-emerald-50 text-emerald-600 hover:bg-emerald-100`}>
          <MessageSquare size={14} />
        </button>
      )}
      {row.sourceType === 'lead' && (
        <button type="button" title="Open Lead" aria-label="Open Lead"
          onClick={() => setViewingLead({ leadId: row.sourceId, customerName: row.customerName })}
          className={`${iconBtn} bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300`}>
          <ExternalLink size={14} />
        </button>
      )}
      {row.type === 'nurture-booking' && (
        <button type="button" title="Open Booking" aria-label="Open Booking"
          onClick={() => handleEditClick(row)}
          className={`${iconBtn} bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300`}>
          <ExternalLink size={14} />
        </button>
      )}
      {row.type !== 'done' && (
        <button type="button" onClick={() => handleDoneClick(row)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#F97316] text-white hover:bg-[#ea580c] shrink-0 shadow-sm">
          <Check size={13} /> Done
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-6 select-none">
      {/* Top Controls: Universal Search, Staff Filter & Segments */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Universal Search Bar */}
          <div className="w-full sm:w-72">
            <Input 
              icon={Search}
              placeholder="Search customer, phone, staff…" 
              value={localSearch} 
              onChange={(e) => setLocalSearch(e.target.value)} 
            />
          </div>
          {/* Staff Filter for Admins */}
          {!isTeamMember && (
            <div className="w-full sm:w-56">
              <Input 
                placeholder="Filter by staff member…" 
                value={assignedTo} 
                onChange={(e) => setAssignedTo(e.target.value)} 
              />
            </div>
          )}
        </div>
        <div className="flex gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-zinc-800/60 border border-slate-200/50 dark:border-zinc-800/40 overflow-x-auto no-scrollbar w-full lg:w-auto max-w-full">
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
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
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

      {/* Unified list: a table on desktop, cards on a phone (the table's
          Done button sat off-screen at 390px, and this is the page agents
          open on their phones between calls). */}
      <div className="card p-0 overflow-hidden">
        <div className="hidden md:block">
          <Table>
            <Thead>
              <Th>Customer</Th>
              <Th>Note / Action</Th>
              {!isTeamMember && <Th>Assigned To</Th>}
              <Th>Status</Th>
              <Th>Due</Th>
              <Th className="text-right">Actions</Th>
            </Thead>
            <Tbody>
              {loading && <SkeletonTableRows rows={6} cols={isTeamMember ? 5 : 6} />}
              {!loading && pagedRows.map((row) => (
                <Tr key={row.id}>
                  <Td>{renderCustomer(row)}</Td>
                  <Td className="text-slate-500 dark:text-zinc-400">
                    <span className="flex items-start gap-1.5 max-w-md">
                      <span className="mt-0.5 shrink-0">{getActivityIcon(row.activityType)}</span>
                      <span className="line-clamp-2" title={row.note}>{row.note}</span>
                    </span>
                  </Td>
                  {!isTeamMember && <Td className="text-slate-500 dark:text-zinc-400 whitespace-nowrap">{row.assignedTo || '-'}</Td>}
                  <Td><FollowUpStatusBadge status={row.status} /></Td>
                  <Td className="whitespace-nowrap">{renderDue(row)}</Td>
                  <Td>{renderActions(row)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>

        <div className="block md:hidden divide-y divide-slate-100 dark:divide-zinc-800">
          {loading && <p className="p-4 text-sm text-slate-400">Loading follow-ups…</p>}
          {!loading && pagedRows.map((row) => (
            <div key={row.id} className="p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                {renderCustomer(row)}
                <div className="shrink-0">{renderDue(row)}</div>
              </div>
              <p className="flex items-start gap-1.5 text-sm text-slate-600 dark:text-zinc-300">
                <span className="mt-0.5 shrink-0">{getActivityIcon(row.activityType)}</span>
                <span>{row.note}</span>
              </p>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 text-xs text-slate-400">
                  <FollowUpStatusBadge status={row.status} />
                  {!isTeamMember && row.assignedTo && <span className="truncate">{row.assignedTo}</span>}
                </div>
                {renderActions(row)}
              </div>
            </div>
          ))}
        </div>

        {!loading && rows.length === 0 && (
          <EmptyState title="No follow-ups found" message="All caught up for this filter segment!" />
        )}
      </div>

      {!loading && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalCount={totalCount}
          limit={pageSize}
          itemName="follow-ups"
          onPageChange={setPage}
          className="mt-4 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm"
        />
      )}

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
        onEdit={(l) => {
          setViewingLead(null);
          setEditingLead(l);
        }}
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
