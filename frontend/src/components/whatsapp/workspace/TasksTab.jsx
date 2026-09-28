import React, { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, Plus, StickyNote, CalendarClock, ListChecks } from 'lucide-react';
import * as leadService from '../../../services/leadService';
import * as bookingService from '../../../services/bookingService';
import { markFollowUpDone } from '../../../services/followUpService';
import { useToast } from '../../../hooks/useToast.jsx';
import { ACTIVITY_TYPES, dueState, dueLabel, DUE_STYLES, inputCls, sectionTitleCls, relativeDay } from './helpers';

const ACTIVITY_ICON = { call: '📞', whatsapp: '💬', email: '✉️', meeting: '📅', note: '📝' };

/** Tomorrow 11:00 in the local timezone, formatted for datetime-local. */
function defaultDueAt() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(11, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const isOpenTask = (f) => f.status === 'pending' && f.next_follow_up_date;

/**
 * Follow-ups and internal notes for whoever this chat is - the lead's, plus
 * the booking's once there is one. Nothing here is sent to the customer.
 */
export default function TasksTab({ chat, onChanged }) {
  const toast = useToast();
  const leadId = chat.formatted_lead_id;
  const bookingId = chat.formatted_booking_id;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState(null); // null | 'task' | 'note'
  const [form, setForm] = useState({ activityType: 'call', dueAt: defaultDueAt(), note: '' });
  const [saving, setSaving] = useState(false);
  const [completingId, setCompletingId] = useState(null);

  const load = useCallback(async () => {
    if (!leadId && !bookingId) { setItems([]); return; }
    setLoading(true);
    try {
      const [leadItems, bookingItems] = await Promise.all([
        leadId ? leadService.getLeadFollowUps(leadId).catch(() => []) : [],
        bookingId ? bookingService.getFollowUps(bookingId).catch(() => []) : [],
      ]);
      const seen = new Set();
      const merged = [...(leadItems || []), ...(bookingItems || [])].filter((f) => !seen.has(f.id) && seen.add(f.id));
      setItems(merged);
    } finally {
      setLoading(false);
    }
  }, [leadId, bookingId]);

  useEffect(() => { setMode(null); load(); }, [load]);

  if (!leadId && !bookingId) {
    return (
      <div className="p-5 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-2">
        <ListChecks className="w-6 h-6 mx-auto text-slate-300" />
        <p className="text-xs text-slate-500">Create a lead from the Lead tab to schedule follow-ups for this chat.</p>
      </div>
    );
  }

  const open = items
    .filter(isOpenTask)
    .sort((a, b) => new Date(a.next_follow_up_date) - new Date(b.next_follow_up_date));
  const history = items
    .filter((f) => !isOpenTask(f))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const startAdd = (m) => {
    setForm({ activityType: 'call', dueAt: defaultDueAt(), note: '' });
    setMode(m);
  };

  const submit = async (e) => {
    e.preventDefault();
    const note = form.note.trim();
    if (!note) { toast.error(mode === 'note' ? 'Write the note first.' : 'Say what the follow-up is about.'); return; }
    const payload = mode === 'note'
      ? { note, activityType: 'note' }
      : { note, activityType: form.activityType, nextFollowUpDate: new Date(form.dueAt).toISOString() };
    setSaving(true);
    try {
      if (leadId) await leadService.addLeadFollowUp(leadId, payload);
      else await bookingService.addFollowUp(bookingId, payload);
      toast.success(mode === 'note' ? 'Note saved.' : 'Follow-up scheduled.');
      setMode(null);
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const complete = async (f) => {
    setCompletingId(f.id);
    try {
      await markFollowUpDone(f.id, {});
      toast.success('Marked done.');
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not mark it done.');
    } finally {
      setCompletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Add */}
      {mode === null ? (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => startAdd('task')} className="flex items-center justify-center gap-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer">
            <CalendarClock className="w-3.5 h-3.5" /> Follow-up
          </button>
          <button type="button" onClick={() => startAdd('note')} className="flex items-center justify-center gap-1 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer">
            <StickyNote className="w-3.5 h-3.5" /> Internal note
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2">
          <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
            {mode === 'note' ? 'Internal note · only your team sees this' : 'Schedule a follow-up'}
          </p>
          {mode === 'task' && (
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Type
                <select className={`${inputCls} mt-1`} value={form.activityType} onChange={(e) => setForm((f) => ({ ...f, activityType: e.target.value }))}>
                  {ACTIVITY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                When
                <input className={`${inputCls} mt-1`} type="datetime-local" value={form.dueAt} onChange={(e) => setForm((f) => ({ ...f, dueAt: e.target.value }))} required />
              </label>
            </div>
          )}
          <textarea
            className={`${inputCls} resize-none`}
            rows={3}
            autoFocus
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            placeholder={mode === 'note' ? 'e.g. Prefers calls after 6 PM, price-sensitive' : 'e.g. Call to confirm hotel category'}
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setMode(null)} className="flex-1 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1">
              {saving && <Loader2 className="w-3 h-3 animate-spin" />} Save
            </button>
          </div>
        </form>
      )}

      {/* Open */}
      <div className="space-y-2">
        <h4 className={sectionTitleCls}>Open follow-ups{open.length ? ` · ${open.length}` : ''}</h4>
        {loading && !items.length ? (
          <div className="space-y-2 animate-pulse">{[0, 1].map((i) => <div key={i} className="h-12 rounded-lg bg-slate-100 dark:bg-slate-800" />)}</div>
        ) : open.length === 0 ? (
          <p className="text-[11px] text-slate-400">Nothing scheduled. Add a follow-up so this lead does not go cold.</p>
        ) : (
          <ul className="space-y-1.5">
            {open.map((f) => {
              const state = dueState(f.next_follow_up_date);
              return (
                <li key={f.id} className={`p-2.5 rounded-lg border bg-white dark:bg-slate-800/40 ${state === 'overdue' ? 'border-rose-200 dark:border-rose-900' : 'border-slate-200 dark:border-slate-700'}`}>
                  <div className="flex items-start gap-2">
                    <span className="text-sm leading-none mt-0.5" aria-hidden="true">{ACTIVITY_ICON[f.activity_type] || '📌'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-800 dark:text-slate-100 whitespace-pre-wrap break-words">{f.note}</p>
                      <p className={`text-[10px] font-semibold mt-1 ${DUE_STYLES[state] || ''}`}>{dueLabel(f.next_follow_up_date)}</p>
                    </div>
                    <button
                      type="button"
                      disabled={completingId !== null}
                      onClick={() => complete(f)}
                      className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold hover:bg-emerald-100 disabled:opacity-50 cursor-pointer"
                      title="Mark as done"
                    >
                      {completingId === f.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Done
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-2">
          <h4 className={sectionTitleCls}>Activity</h4>
          <ol className="relative border-l border-slate-200 dark:border-slate-700 ml-1.5 space-y-3">
            {history.slice(0, 30).map((f) => (
              <li key={f.id} className="ml-3.5">
                <span className="absolute -left-[5px] mt-1.5 w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600 border-2 border-white dark:border-slate-900" />
                <p className="text-[11px] text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words">
                  <span className="mr-1" aria-hidden="true">{ACTIVITY_ICON[f.activity_type] || '•'}</span>
                  {f.note.replace(/\*/g, '')}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{relativeDay(f.created_at)}{f.created_by ? ` · ${f.created_by}` : ''}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
