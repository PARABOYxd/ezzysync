import React, { useEffect, useState } from 'react';
import { Briefcase, CalendarPlus, Loader2, Pencil, Users, CalendarDays, Target, FileText, MapPin } from 'lucide-react';
import * as leadService from '../../../services/leadService';
import { useToast } from '../../../hooks/useToast.jsx';
import { mediaTypeOf, mediaNameOf } from '../../../utils/whatsappMessageFormatters';
import LeadQuickControls from './LeadQuickControls.jsx';
import AtAGlance from './AtAGlance.jsx';
import { inputCls, sectionTitleCls } from './helpers';

function Detail({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <Icon className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" />
      <span className="text-slate-500 w-16 shrink-0">{label}</span>
      <span className={`font-medium min-w-0 break-words ${value ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 italic'}`}>
        {value || 'Not set'}
      </span>
    </div>
  );
}

export default function LeadTab({
  chat, users, onChanged, onCreateLead, creatingLead, onCreateBooking, creatingBooking, chatMediaFiles, onViewMedia,
  waitingSince, onGoToTab,
}) {
  const toast = useToast();
  const leadId = chat.formatted_lead_id;
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEditing(false);
    if (!leadId) { setLead(null); return undefined; }
    let alive = true;
    setLoading(true);
    leadService.getLead(leadId)
      .then((l) => { if (alive) setLead(l); })
      .catch(() => { if (alive) setLead(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // Re-read when the chat's context shows the lead changed underneath us:
    // a quick edit in the header, or the AI filling in the trip after "Create lead".
  }, [leadId, chat.lead_stage, chat.lead_assigned_to, chat.lead_interest, chat.customer_name]);

  const startEdit = () => {
    setForm({
      customerName: lead?.customerName || chat.customer_name || '',
      phone: lead?.phone || chat.phone || '',
      interest: lead?.interest || '',
      travelers: lead?.travelers || '',
      departureDate: lead?.departureDate || '',
      notes: lead?.notes || '',
    });
    setEditing(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await leadService.updateLead(leadId, {
        customerName: form.customerName.trim(),
        phone: form.phone.trim(),
        interest: form.interest.trim(),
        travelers: form.travelers ? Number(form.travelers) : null,
        departureDate: form.departureDate,
        notes: form.notes.trim(),
      });
      setLead(updated);
      setEditing(false);
      toast.success('Lead details saved & rectified.');
      onChanged?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save the lead.');
    } finally {
      setSaving(false);
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-5">
      <AtAGlance chat={chat} waitingSince={waitingSince} onGoToTab={onGoToTab} />

      {!leadId ? (
        <div className="p-4 rounded-xl border border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 text-center space-y-2.5">
          <Briefcase className="w-6 h-6 mx-auto text-amber-500" />
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">No CRM Lead Linked</p>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">Rectify this conversation by creating and linking a CRM lead so follow-ups, quotes, and trip stages are tracked.</p>
          </div>
          <button
            type="button"
            disabled={creatingLead}
            onClick={onCreateLead}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {creatingLead ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Briefcase className="w-3.5 h-3.5" />}
            Rectify &amp; Add CRM Lead
          </button>
        </div>
      ) : (
        <>
          {/* Status banner verifying lead is added */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">CRM Lead Added: {leadId}</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-200 font-semibold">{chat.lead_stage || 'New'}</span>
          </div>

          {/* On wide screens stage and owner live in the chat header; this copy
              is only for when the header hides them. */}
          <div className="space-y-2 lg:hidden">
            <h4 className={sectionTitleCls}>Stage &amp; owner</h4>
            <LeadQuickControls chat={chat} users={users} onChanged={onChanged} onCreateLead={onCreateLead} creatingLead={creatingLead} layout="grid" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className={sectionTitleCls}>Lead &amp; Trip Details</h4>
              {!editing && lead && (
                <button type="button" onClick={startEdit} className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer">
                  <Pencil className="w-3 h-3" /> Edit / Rectify
                </button>
              )}
            </div>

            {loading && !lead ? (
              <div className="space-y-2 animate-pulse">
                {[0, 1, 2].map((i) => <div key={i} className="h-3 rounded bg-slate-100 dark:bg-slate-800" />)}
              </div>
            ) : editing ? (
              <form onSubmit={save} className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    Customer Name
                    <input className={`${inputCls} mt-1`} value={form.customerName} onChange={set('customerName')} placeholder="Full Name" required />
                  </label>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    Phone
                    <input className={`${inputCls} mt-1`} value={form.phone} onChange={set('phone')} placeholder="Phone number" required />
                  </label>
                </div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Looking for
                  <input className={`${inputCls} mt-1`} value={form.interest} onChange={set('interest')} placeholder="e.g. Goa 4N/5D family trip" />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    Travellers
                    <input className={`${inputCls} mt-1`} type="number" min="1" value={form.travelers} onChange={set('travelers')} />
                  </label>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    Travel date
                    <input
                      className={`${inputCls} mt-1`}
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={form.departureDate || ''}
                      onKeyDown={(e) => {
                        if (e.key !== 'Tab' && e.key !== 'Enter') {
                          e.preventDefault();
                        }
                      }}
                      onClick={(e) => {
                        try { e.target.showPicker?.(); } catch (_) {}
                      }}
                      onChange={set('departureDate')}
                    />
                  </label>
                </div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Notes
                  <textarea className={`${inputCls} mt-1 resize-none`} rows={3} value={form.notes} onChange={set('notes')} placeholder="Budget, hotel preference, kids' ages…" />
                </label>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setEditing(false)} className="flex-1 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1">
                    {saving && <Loader2 className="w-3 h-3 animate-spin" />} Save &amp; Rectify
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <Detail icon={Target} label="Customer" value={lead?.customerName || chat.customer_name} />
                <Detail icon={Users} label="Phone" value={lead?.phone || chat.phone} />
                <Detail icon={Target} label="Looking for" value={lead?.interest} />
                <Detail icon={Users} label="Travellers" value={lead?.travelers ? `${lead.travelers} pax` : ''} />
                <Detail icon={CalendarDays} label="Travel" value={lead?.departureDate ? new Date(lead.departureDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''} />
                {chat.booking_pickup && <Detail icon={MapPin} label="Pickup" value={chat.booking_pickup} />}
                <Detail icon={FileText} label="Notes" value={lead?.notes} />
              </div>
            )}
          </div>

          {!chat.booking_trip && (
            <button
              type="button"
              disabled={creatingBooking}
              onClick={onCreateBooking}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer"
              title="Convert this lead into a booking, pre-filled from what's already known"
            >
              {creatingBooking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarPlus className="w-3.5 h-3.5" />}
              Convert to booking
            </button>
          )}
        </>
      )}

      {/* Files shared in this chat */}
      <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className={sectionTitleCls}>Shared files</h4>
          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">{chatMediaFiles.length}</span>
        </div>
        {chatMediaFiles.length === 0 ? (
          <p className="text-[11px] text-slate-400">Photos, PDFs and vouchers sent in this chat show up here.</p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
            {chatMediaFiles.map((m) => {
              const isImg = m.message_type === 'image' || mediaTypeOf(m).startsWith('image/');
              return (
                <button
                  key={m.id || m.message_id}
                  type="button"
                  onClick={() => onViewMedia(m)}
                  className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:opacity-90 transition-opacity cursor-pointer"
                  title={mediaNameOf(m)}
                >
                  {isImg ? (
                    <img src={m.media_url} alt={mediaNameOf(m)} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-1 text-slate-500">
                      <FileText className="w-5 h-5 mb-0.5 text-rose-500" />
                      <span className="text-[8px] truncate w-full text-center px-0.5 font-medium">{mediaNameOf(m)}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
