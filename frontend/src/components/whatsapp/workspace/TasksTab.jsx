import React, { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, Plus, StickyNote, CalendarClock, ListChecks, AlertCircle } from 'lucide-react';
import * as leadService from '../../../services/leadService';
import * as bookingService from '../../../services/bookingService';
import { whatsappWebService } from '../../../services/whatsappWebService';
import { markFollowUpDone } from '../../../services/followUpService';
import { useToast } from '../../../hooks/useToast.jsx';
import { ACTIVITY_TYPES, dueState, dueLabel, DUE_STYLES, inputCls, sectionTitleCls, relativeDay } from './helpers';

const ACTIVITY_ICON = { call: '📞', whatsapp: '💬', email: '✉️', meeting: '📅', note: '📝' };

/** Helper to format a local date as YYYY-MM-DD */
function getTodayDateStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getOffsetDateStr(offsetDays = 1) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const isOpenTask = (f) => f.status === 'pending' && f.next_follow_up_date;

/**
 * Follow-ups and internal notes for whoever this chat is - the lead's, plus
 * the booking's once there is one. Nothing here is sent to the customer.
 */
export default function TasksTab({ chat, onChanged }) {
  const toast = useToast();
  const leadId = chat?.formatted_lead_id;
  const bookingId = chat?.formatted_booking_id;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState(null); // null | 'task' | 'note'
  const [form, setForm] = useState({
    activityType: 'call',
    dueDate: getOffsetDateStr(1),
    dueTime: '11:00',
    note: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [completingId, setCompletingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [leadItems, bookingItems, chatItems] = await Promise.all([
        leadId ? leadService.getLeadFollowUps(leadId).catch(() => []) : [],
        bookingId ? bookingService.getFollowUps(bookingId).catch(() => []) : [],
        chat?.id ? whatsappWebService.getChatFollowUps(chat.id).catch(() => []) : [],
      ]);
      const seen = new Set();
      const merged = [...(leadItems || []), ...(bookingItems || []), ...(chatItems || [])].filter((f) => !seen.has(f.id) && seen.add(f.id));
      setItems(merged);
    } finally {
      setLoading(false);
    }
  }, [leadId, bookingId, chat?.id]);

  useEffect(() => { setMode(null); load(); }, [load]);

  const open = items
    .filter(isOpenTask)
    .sort((a, b) => new Date(a.next_follow_up_date) - new Date(b.next_follow_up_date));
  const history = items
    .filter((f) => !isOpenTask(f))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const startAdd = (m) => {
    setErrors({});
    setForm({
      activityType: 'call',
      dueDate: getOffsetDateStr(1),
      dueTime: '11:00',
      note: '',
    });
    setMode(m);
  };

  const submit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (mode === 'task') {
      if (!form.dueDate) {
        newErrors.dueDate = 'Please select a follow-up date.';
      } else {
        const todayStr = getTodayDateStr();
        if (form.dueDate < todayStr) {
          newErrors.dueDate = 'Follow-up date must be today or in the future.';
        }
      }
      if (!form.dueTime) {
        newErrors.dueTime = 'Please select a follow-up time.';
      }
    }

    const note = form.note.trim();
    if (!note) {
      newErrors.note = mode === 'note' ? 'Please enter note content before saving.' : 'Please enter action notes for the follow-up.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstError = Object.values(newErrors)[0];
      toast.error(firstError);
      return;
    }

    setErrors({});

    let nextFollowUpDate = null;
    if (mode === 'task') {
      const timeStr = form.dueTime || '11:00';
      const localDateTime = new Date(`${form.dueDate}T${timeStr}:00`);
      nextFollowUpDate = !isNaN(localDateTime.getTime()) ? localDateTime.toISOString() : new Date().toISOString();
    }

    const payload = mode === 'note'
      ? { note, activityType: 'note' }
      : { note, activityType: form.activityType, nextFollowUpDate };

    setSaving(true);
    try {
      if (leadId) await leadService.addLeadFollowUp(leadId, payload);
      else if (bookingId) await bookingService.addFollowUp(bookingId, payload);
      else if (chat?.id) await whatsappWebService.addChatFollowUp(chat.id, payload);
      else {
        toast.error('Cannot save: Chat ID is missing.');
        return;
      }
      toast.success(mode === 'note' ? 'Note saved.' : 'Follow-up scheduled.');
      setMode(null);
      setErrors({});
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save follow-up.');
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
          <button type="button" onClick={() => startAdd('task')} className="flex items-center justify-center gap-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition">
            <CalendarClock className="w-3.5 h-3.5" /> Follow-up
          </button>
          <button type="button" onClick={() => startAdd('note')} className="flex items-center justify-center gap-1 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-750 cursor-pointer transition">
            <StickyNote className="w-3.5 h-3.5" /> Internal note
          </button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
              {mode === 'note' ? 'Internal note · only your team sees this' : 'Schedule a follow-up'}
            </p>
            <span className="text-[10px] text-slate-400 font-medium">* Required</span>
          </div>

          {mode === 'task' && (
            <div className="space-y-2.5">
              {/* Type and Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="min-w-0">
                  <label htmlFor="taskActivityType" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    Type
                  </label>
                  <select
                    id="taskActivityType"
                    className={`${inputCls} mt-1`}
                    value={form.activityType}
                    onChange={(e) => setForm((f) => ({ ...f, activityType: e.target.value }))}
                  >
                    {ACTIVITY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="min-w-0">
                  <label htmlFor="taskDueTime" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="taskDueTime"
                    type="time"
                    className={`${inputCls} mt-1 ${errors.dueTime ? 'border-rose-400 ring-1 ring-rose-400 bg-rose-50/20' : ''}`}
                    value={form.dueTime}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, dueTime: e.target.value }));
                      if (errors.dueTime) setErrors((err) => ({ ...err, dueTime: null }));
                    }}
                  />
                  {errors.dueTime && (
                    <p className="text-[10px] font-medium text-rose-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" /> {errors.dueTime}
                    </p>
                  )}
                </div>
              </div>

              {/* Date Field & Presets */}
              <div className="min-w-0 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="taskDueDate" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    Follow-up Date <span className="text-rose-500">*</span>
                  </label>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                  {[
                    { label: 'Today', days: 0 },
                    { label: 'Tomorrow', days: 1 },
                    { label: '+2 Days', days: 2 },
                    { label: '+1 Week', days: 7 },
                  ].map((preset) => {
                    const pDate = getOffsetDateStr(preset.days);
                    const isSelected = form.dueDate === pDate;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setForm((f) => ({ ...f, dueDate: pDate }));
                          if (errors.dueDate) setErrors((err) => ({ ...err, dueDate: null }));
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer border ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                <input
                  id="taskDueDate"
                  type="date"
                  min={getTodayDateStr()}
                  className={`${inputCls} ${errors.dueDate ? 'border-rose-400 ring-1 ring-rose-400 bg-rose-50/20' : ''}`}
                  value={form.dueDate}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, dueDate: e.target.value }));
                    if (errors.dueDate) setErrors((err) => ({ ...err, dueDate: null }));
                  }}
                />
                {errors.dueDate && (
                  <p className="text-[10px] font-medium text-rose-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" /> {errors.dueDate}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1">
            <label htmlFor="taskNote" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              {mode === 'note' ? 'Internal Note' : 'Follow-up Details'} <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="taskNote"
              className={`${inputCls} resize-none ${errors.note ? 'border-rose-400 ring-1 ring-rose-400 bg-rose-50/20' : ''}`}
              rows={3}
              autoFocus
              value={form.note}
              onChange={(e) => {
                setForm((f) => ({ ...f, note: e.target.value }));
                if (errors.note) setErrors((err) => ({ ...err, note: null }));
              }}
              placeholder={mode === 'note' ? 'e.g. Prefers calls after 6 PM, price-sensitive' : 'e.g. Call to confirm hotel category & departure dates'}
            />
            {errors.note && (
              <p className="text-[10px] font-medium text-rose-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" /> {errors.note}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setMode(null);
                setErrors({});
              }}
              className="flex-1 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1 shadow-xs transition"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                </>
              ) : (
                'Save'
              )}
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
