import React, { useEffect, useState } from 'react';
import { IndianRupee, CreditCard, Home, Plane, Car, Tag, Trash2, Plus } from 'lucide-react';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import FormRow from '../ui/FormRow.jsx';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast.jsx';
import * as bookingService from '../../services/bookingService';

const PAYMENT_STATUSES = ['Pending', 'Partial', 'Paid'];
const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Other'];

/** Installment log for an existing booking - replaces hand-recomputing a new
 * "Amount Paid" total on every partial payment with logging just the one
 * new installment; the server rolls it into paid/remaining/status. */
function PaymentLedger({ bookingId, paid, onTotalsChange }) {
  const toast = useToast();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [entry, setEntry] = useState({ amount: '', method: 'Cash', reference: '', paidOn: new Date().toISOString().split('T')[0] });

  const load = () => {
    setLoading(true);
    bookingService.getPayments(bookingId)
      .then((data) => setPayments(data || []))
      .catch(() => toast.error('Could not load payment history.'))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [bookingId]);

  const handleAdd = async () => {
    if (!(Number(entry.amount) > 0)) {
      toast.error('Enter an amount greater than zero.');
      return;
    }
    setAdding(true);
    try {
      const result = await bookingService.addPayment(bookingId, entry);
      toast.success('Payment logged.');
      setEntry({ amount: '', method: 'Cash', reference: '', paidOn: new Date().toISOString().split('T')[0] });
      onTotalsChange(result.paid, result.paymentStatus);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not log this payment.');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (paymentId) => {
    if (!window.confirm('Remove this payment entry? The booking total will be reduced to match.')) return;
    try {
      const result = await bookingService.deletePayment(bookingId, paymentId);
      toast.success('Payment removed.');
      onTotalsChange(result.paid, result.paymentStatus);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not remove this payment.');
    }
  };

  return (
    <div className="p-4 bg-slate-50/50 dark:bg-zinc-950/20 border border-slate-100 dark:border-zinc-800 rounded-2xl space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Payment History</h4>
        <span className="text-xs font-semibold text-slate-600 dark:text-zinc-300">Total Paid: {formatCurrency(paid)}</span>
      </div>

      {loading ? (
        <p className="text-xs text-slate-400">Loading payment history...</p>
      ) : payments.length === 0 ? (
        <p className="text-xs text-slate-400">No payments logged yet.</p>
      ) : (
        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-xs bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-lg px-3 py-2">
              <div>
                <span className="font-semibold text-slate-700 dark:text-zinc-200">{formatCurrency(p.amount)}</span>
                <span className="text-slate-400 mx-1.5">&middot;</span>
                <span className="text-slate-500 dark:text-zinc-400">{p.method}</span>
                {p.reference && <span className="text-slate-400"> ({p.reference})</span>}
                <span className="text-slate-400 mx-1.5">&middot;</span>
                <span className="text-slate-500 dark:text-zinc-400">{formatDate(p.paidOn)}</span>
              </div>
              <button type="button" onClick={() => handleDelete(p.id)} className="p-1 text-slate-400 hover:text-red-500 transition" title="Remove entry">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end pt-2 border-t border-slate-200/60 dark:border-zinc-800">
        <Input label="Amount (₹)" type="number" min={0} placeholder="e.g. 5000" value={entry.amount} onChange={(e) => setEntry({ ...entry, amount: e.target.value })} />
        <Select label="Method" value={entry.method} onChange={(e) => setEntry({ ...entry, method: e.target.value })} options={PAYMENT_METHODS} />
        <Input label="Reference" placeholder="Txn ID (optional)" value={entry.reference} onChange={(e) => setEntry({ ...entry, reference: e.target.value })} />
        <Input label="Date" type="date" value={entry.paidOn} onChange={(e) => setEntry({ ...entry, paidOn: e.target.value })} />
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding}
          className="text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl px-3.5 py-2 flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
        >
          <Plus size={13} />
          {adding ? 'Logging...' : 'Log Payment'}
        </button>
      </div>
    </div>
  );
}

export default function FinancialsTab({
  form,
  setForm,
  set,
  errors,
  user,
  showCosting,
  setShowCosting,
  templates,
  totalAmount,
  remaining,
  bookingId,
  isEdit,
}) {
  const toast = useToast();

  const handleCostTemplateChange = (e) => {
    const templateId = e.target.value;
    if (!templateId) {
      setForm((prev) => ({ ...prev, costTemplateId: '' }));
      return;
    }
    const t = templates.find((x) => x.id === templateId);
    if (t) {
      setForm((prev) => ({
        ...prev,
        costTemplateId: templateId,
        vendorHotelCost: Number(t.hotel_cost_per_pax || 0) * Number(prev.members || 1),
        vendorFlightCost: Number(t.flight_cost_per_pax || 0) * Number(prev.members || 1),
        vendorTransportCost: Number(t.transport_cost_per_pax || 0) * Number(prev.members || 1),
        vendorOtherCost: Number(t.other_cost_per_pax || 0) * Number(prev.members || 1),
      }));
      toast.success(`Costing template "${t.template_name}" applied!`);
    }
  };

  const totalCost = Number(form.vendorHotelCost || 0) +
    Number(form.vendorFlightCost || 0) +
    Number(form.vendorTransportCost || 0) +
    Number(form.vendorOtherCost || 0);
  const projectedProfit = totalAmount - totalCost;
  const isPositive = projectedProfit >= 0;

  return (
    <div className="space-y-6 animate-[fadeIn_0.2s_ease-out]">
      <FormRow className="sm:grid-cols-3">
        <Input
          label="Price Per Person (₹)"
          icon={IndianRupee}
          type="number"
          min={0}
          error={errors.pricePerPerson}
          required={['Booked', 'Completed', 'Refunded'].includes(form.travelStatus)}
          hint="Cost per single traveler"
          placeholder="e.g. 15000"
          value={form.pricePerPerson}
          onChange={set('pricePerPerson')}
        />
        <Input
          label="Amount Paid (₹)"
          icon={CreditCard}
          type="number"
          min={0}
          disabled={isEdit}
          hint={isEdit ? 'Log payments below to change this' : 'Advance payment received'}
          placeholder="e.g. 5000"
          value={form.paid}
          onChange={set('paid')}
        />
        <Select
          label="Payment Status"
          required
          hint="Invoice collection status"
          value={form.paymentStatus}
          onChange={set('paymentStatus')}
          options={PAYMENT_STATUSES}
        />
      </FormRow>

      {isEdit && bookingId && (
        <PaymentLedger
          bookingId={bookingId}
          paid={Number(form.paid || 0)}
          onTotalsChange={(paid, paymentStatus) => setForm((prev) => ({ ...prev, paid, paymentStatus }))}
        />
      )}

      {/* Toggle Button for Costing Section - Admin Only */}
      {user?.role === 'ADMIN' && (
        <div className="flex justify-start">
          <button
            type="button"
            onClick={() => setShowCosting(!showCosting)}
            className="text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100/70 border border-brand-100 rounded-xl px-4 py-2.5 flex items-center gap-1.5 shadow-sm transition active:scale-[0.98]"
          >
            <IndianRupee size={14} />
            {showCosting ? 'Hide Costing' : 'Add Costing (Internal)'}
          </button>
        </div>
      )}

      {/* B2B Supplier Cost Section - ONLY visible to ADMIN when showCosting is true */}
      {user?.role === 'ADMIN' && showCosting && (
        <div className="bg-slate-50/50 dark:bg-zinc-950/30 border border-slate-100 dark:border-zinc-800 p-5 rounded-2xl space-y-4 animate-[fadeIn_0.15s_ease-out]">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-zinc-800 pb-2">
            <h4 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">B2B Supplier Costs (P&L Ledger)</h4>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500">Values are subtracted from revenue to yield Net Profit</span>
          </div>

          <div className="flex flex-col gap-1 w-full max-w-md">
            <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wide">Select Costing Template</label>
            <select
              value={form.costTemplateId || ''}
              onChange={handleCostTemplateChange}
              className="w-full bg-white dark:bg-zinc-950 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-brand-500/20 focus:border-brand-500 outline-none"
            >
              <option value="">-- Manual/No Template Selected --</option>
              {/* Priority matches for current trip name */}
              {templates
                .filter(t => form.trip && t.trip_name.toLowerCase() === form.trip.toLowerCase())
                .map(t => (
                  <option key={t.id} value={t.id}>{t.trip_name} - {t.template_name} (Hotel: ₹{t.hotel_cost_per_pax}, Transport: ₹{t.transport_cost_per_pax})</option>
                ))
              }
              {/* Other templates as divider */}
              {templates.length > 0 && <option disabled>────────── Other Trip Templates ──────────</option>}
              {templates
                .filter(t => !form.trip || t.trip_name.toLowerCase() !== form.trip.toLowerCase())
                .map(t => (
                  <option key={t.id} value={t.id}>{t.trip_name} - {t.template_name} (Hotel: ₹{t.hotel_cost_per_pax}, Transport: ₹{t.transport_cost_per_pax})</option>
                ))
              }
            </select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
            <Input label="Hotel Cost (₹)" icon={Home} type="number" min={0} hint="Supplier accommodation" placeholder="e.g. 12000" inputClassName="bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800" value={form.vendorHotelCost || ''} onChange={set('vendorHotelCost')} />
            <Input label="Flight Cost (₹)" icon={Plane} type="number" min={0} hint="Supplier airfare charges" placeholder="e.g. 15000" inputClassName="bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800" value={form.vendorFlightCost || ''} onChange={set('vendorFlightCost')} />
            <Input label="Transport Cost (₹)" icon={Car} type="number" min={0} hint="Supplier taxi/bus fees" placeholder="e.g. 5000" inputClassName="bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800" value={form.vendorTransportCost || ''} onChange={set('vendorTransportCost')} />
            <Input label="Other Cost (₹)" icon={Tag} type="number" min={0} hint="Visa/misc supplier fees" placeholder="e.g. 2000" inputClassName="bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800" value={form.vendorOtherCost || ''} onChange={set('vendorOtherCost')} />
          </div>
        </div>
      )}

      {/* Advanced Live Financial Statement / Margin Card */}
      {user?.role === 'ADMIN' && showCosting && (
        <div className={`p-4 rounded-2xl border transition-all duration-300 ${isPositive
          ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40 shadow-emerald-50/30'
          : 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-900/40 shadow-rose-50/30'
          } shadow-md`}>
          <div className="grid grid-cols-3 text-center divide-x divide-slate-200/50 dark:divide-zinc-800">
            <div>
              <span className="block text-[9px] uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-wider">Gross Revenue</span>
              <b className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{formatCurrency(totalAmount)}</b>
            </div>
            <div>
              <span className="block text-[9px] uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-wider">Total Supplier Cost</span>
              <b className="text-sm font-extrabold text-slate-700 dark:text-slate-300">{formatCurrency(totalCost)}</b>
            </div>
            <div>
              <span className="block text-[9px] uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-wider">Net Profit (P&L)</span>
              <b className={`text-sm font-extrabold transition-colors duration-200 ${isPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                {formatCurrency(projectedProfit)}
              </b>
            </div>
          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-zinc-500 border-t border-slate-200/30 dark:border-zinc-800 mt-3 pt-2">
            <span>Pending balance for traveler collection: <b className="text-orange-600 dark:text-orange-400 font-bold">{formatCurrency(remaining)}</b></span>
            <span className={`font-semibold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {isPositive ? '✓ Positive Margin Deal' : '⚠️ Negative Margin Warning'}
            </span>
          </div>
        </div>
      )}

      {/* Standard card visible to team members */}
      {user?.role !== 'ADMIN' && (
        <div className="p-4 bg-slate-50 dark:bg-zinc-950/20 border border-slate-100 dark:border-zinc-800 rounded-2xl shadow-sm">
          <div className="grid grid-cols-2 text-center divide-x divide-slate-200/50 dark:divide-zinc-800">
            <div>
              <span className="block text-[9px] uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-wider">Gross Package Cost</span>
              <b className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{formatCurrency(totalAmount)}</b>
            </div>
            <div>
              <span className="block text-[9px] uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-wider">Amount Paid</span>
              <b className="text-sm font-extrabold text-slate-700 dark:text-slate-300">{formatCurrency(form.paid)}</b>
            </div>
          </div>
          <div className="text-center text-[11px] text-slate-500 dark:text-zinc-400 border-t border-slate-200/30 dark:border-zinc-800 mt-3 pt-2">
            Remaining Balance to Collect: <b className="text-orange-600 dark:text-orange-400 font-extrabold">{formatCurrency(remaining)}</b>
          </div>
        </div>
      )}
    </div>
  );
}
