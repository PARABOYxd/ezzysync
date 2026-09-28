import React, { useEffect, useState } from 'react';
import { Loader2, Plus, Wallet, BellRing, IndianRupee } from 'lucide-react';
import * as bookingService from '../../../services/bookingService';
import { useToast } from '../../../hooks/useToast.jsx';
import { inr, inputCls, sectionTitleCls, PAYMENT_METHODS, buildReminderText } from './helpers';

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Money for the booking linked to this chat: what is paid, what is due, the
 * ledger, and recording a payment without leaving the conversation.
 *
 * The due reminder is shown as the exact text first - it goes to a customer
 * and talks about money, so it is never a one-click send.
 */
export default function MoneyTab({ chat, onPaymentRecorded, onSendReminder, sendingReminderType }) {
  const toast = useToast();
  const bookingId = chat.formatted_booking_id;
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ amount: '', method: 'UPI', reference: '', paidOn: today() });
  const [saving, setSaving] = useState(false);
  const [previewReminder, setPreviewReminder] = useState(false);

  const total = Number(chat.total_amount || 0);
  const paid = Number(chat.paid || 0);
  const remaining = Number(chat.remaining || 0);
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

  useEffect(() => {
    setFormOpen(false);
    setPreviewReminder(false);
    if (!bookingId) { setPayments([]); return undefined; }
    let alive = true;
    setLoading(true);
    bookingService.getPayments(bookingId)
      .then((p) => { if (alive) setPayments(p || []); })
      .catch(() => { if (alive) setPayments([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [bookingId]);

  if (!bookingId) {
    return (
      <div className="p-5 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-2">
        <Wallet className="w-6 h-6 mx-auto text-slate-300" />
        <p className="text-xs text-slate-500">No booking yet. Payments appear here once the lead is converted to a booking.</p>
      </div>
    );
  }

  const openForm = () => {
    setForm({ amount: remaining > 0 ? String(remaining) : '', method: 'UPI', reference: '', paidOn: today() });
    setFormOpen(true);
  };

  const record = async (e) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!(amount > 0)) { toast.error('Enter an amount greater than zero.'); return; }
    if (amount > remaining && remaining > 0) {
      // Allowed (a refund-less overpayment happens), but worth a second look.
      if (!window.confirm(`${inr(amount)} is more than the ${inr(remaining)} due. Record it anyway?`)) return;
    }
    setSaving(true);
    try {
      await bookingService.addPayment(bookingId, {
        amount, method: form.method, reference: form.reference.trim(), paidOn: form.paidOn,
      });
      toast.success(`${inr(amount)} recorded.`);
      setFormOpen(false);
      const list = await bookingService.getPayments(bookingId);
      setPayments(list || []);
      await onPaymentRecorded?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not record the payment.');
    } finally {
      setSaving(false);
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2.5">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Total</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white">{inr(total)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Paid</p>
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{inr(paid)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Due</p>
            <p className={`text-sm font-bold ${remaining > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>{inr(remaining)}</p>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Paid so far">
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[11px] text-slate-500 text-center">{remaining > 0 ? `${pct}% paid` : 'Fully paid ✅'}</p>
      </div>

      {/* Actions */}
      {!formOpen && (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={openForm} className="flex items-center justify-center gap-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> Record payment
          </button>
          <button
            type="button"
            disabled={remaining <= 0}
            onClick={() => setPreviewReminder((v) => !v)}
            className="flex items-center justify-center gap-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-800 cursor-pointer disabled:cursor-not-allowed"
            title={remaining > 0 ? 'Preview the payment reminder' : 'Nothing is due'}
          >
            <BellRing className="w-3.5 h-3.5" /> Due reminder
          </button>
        </div>
      )}

      {previewReminder && remaining > 0 && (
        <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/30 space-y-2">
          <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">This will be sent to {chat.customer_name || 'the customer'}:</p>
          <p className="text-xs whitespace-pre-wrap text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 rounded-lg p-2.5 border border-amber-100 dark:border-amber-900">
            {buildReminderText('payment', chat)}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPreviewReminder(false)} className="flex-1 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">Cancel</button>
            <button
              type="button"
              disabled={sendingReminderType !== null}
              onClick={async () => { await onSendReminder('payment'); setPreviewReminder(false); }}
              className="flex-1 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1"
            >
              {sendingReminderType === 'payment' && <Loader2 className="w-3 h-3 animate-spin" />} Send
            </button>
          </div>
        </div>
      )}

      {formOpen && (
        <form onSubmit={record} className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2">
          <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">Record a payment received</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              Amount (₹)
              <input className={`${inputCls} mt-1`} type="number" min="1" step="1" inputMode="numeric" value={form.amount} onChange={set('amount')} required autoFocus />
            </label>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              Method
              <select className={`${inputCls} mt-1`} value={form.method} onChange={set('method')}>
                {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              Reference
              <input className={`${inputCls} mt-1`} value={form.reference} onChange={set('reference')} placeholder="UTR / txn id" />
            </label>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              Received on
              <input className={`${inputCls} mt-1`} type="date" value={form.paidOn} max={today()} onChange={set('paidOn')} />
            </label>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setFormOpen(false)} className="flex-1 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1">
              {saving && <Loader2 className="w-3 h-3 animate-spin" />} Save payment
            </button>
          </div>
        </form>
      )}

      {/* Ledger */}
      <div className="space-y-2">
        <h4 className={sectionTitleCls}>Payments{payments.length ? ` · ${payments.length}` : ''}</h4>
        {loading ? (
          <div className="space-y-2 animate-pulse">{[0, 1].map((i) => <div key={i} className="h-9 rounded-lg bg-slate-100 dark:bg-slate-800" />)}</div>
        ) : payments.length === 0 ? (
          <p className="text-[11px] text-slate-400">No payments recorded yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
                    <IndianRupee className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{inr(p.amount)}</p>
                    <p className="text-[10px] text-slate-500 truncate">{p.method}{p.reference ? ` · ${p.reference}` : ''}</p>
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0">
                  {p.paidOn ? new Date(p.paidOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
