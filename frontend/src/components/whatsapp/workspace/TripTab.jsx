import React, { useEffect, useState } from 'react';
import { Calendar, Loader2, Plus, Send, Plane, FileText, History, MapPin } from 'lucide-react';
import * as customerService from '../../../services/customerService';
import { inr, phoneKey, toQuoteShape, sectionTitleCls, relativeDay } from './helpers';

const QUOTE_STATUS = {
  Draft: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  Sent: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  Accepted: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  Expired: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300',
};

const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

/**
 * The trip side of this customer: the booking linked to the chat, the quotes
 * made for them, and earlier trips. History comes from the customer profile,
 * which is keyed on phone - so a quote made from the Quotations page for this
 * number shows here too.
 */
export default function TripTab({
  chat, refreshToken, onSendVoucher, sendingVoucherType, onSendReminder, sendingReminderType,
  onShareQuote, sharingQuoteId, onNewQuote,
}) {
  const [profile, setProfile] = useState(null);
  const [state, setState] = useState('loading'); // 'loading' | 'ready' | 'none' | 'denied'

  useEffect(() => {
    if (String(chat.phone || '').startsWith('IG_')) { setState('none'); return undefined; }
    let alive = true;
    setState('loading');
    // The lead's phone first: it is exactly what the customer row was keyed on.
    customerService.lookupByPhone(chat.lead_phone || phoneKey(chat.phone))
      .then((c) => (c ? customerService.getCustomer(c.id) : null))
      .then((p) => {
        if (!alive) return;
        setProfile(p);
        setState(p ? 'ready' : 'none');
      })
      .catch((err) => {
        if (!alive) return;
        setState(err.response?.status === 403 ? 'denied' : 'none');
      });
    return () => { alive = false; };
  }, [chat.id, chat.phone, chat.lead_phone, refreshToken]);

  const quotes = (profile?.quotations || []).map(toQuoteShape);
  const pastBookings = (profile?.bookings || []).filter((b) => b.id !== chat.booking_uuid);
  const currentBooking = (profile?.bookings || []).find((b) => b.id === chat.booking_uuid);
  const bookingPickup = chat.booking_pickup || currentBooking?.pickup || '';
  const bookingCount = (n) => (n > 1 ? ` (${n})` : '');
  const hotels = Array.isArray(chat.booking_hotels_stay) ? chat.booking_hotels_stay.length : 0;
  const cabs = Array.isArray(chat.booking_transports) ? chat.booking_transports.length : 0;

  return (
    <div className="space-y-5">
      {/* Linked booking */}
      {chat.booking_trip ? (
        <div className="p-3.5 rounded-xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/60 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{chat.booking_trip}</span>
              </p>
              <p className="text-[11px] text-teal-800/80 dark:text-teal-300/80 mt-0.5">
                {chat.booking_departure ? `Departs ${formatDate(chat.booking_departure)}` : 'Departure not set'}
                {chat.booking_members ? ` · ${chat.booking_members} pax` : ''}
              </p>
              {bookingPickup && (
                <p className="text-[11px] text-teal-950 dark:text-teal-200 mt-1.5 flex items-center gap-1 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span className="text-teal-700/80 dark:text-teal-300/80">Pickup:</span>
                  <span className="font-semibold truncate">{bookingPickup}</span>
                </p>
              )}
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-700 shrink-0">
              {chat.travel_status || 'Booked'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-teal-200/60 dark:border-teal-800/60">
            <button
              type="button"
              disabled={sendingVoucherType !== null}
              onClick={() => onSendVoucher('hotel')}
              className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold transition disabled:opacity-50 cursor-pointer"
              title="Generate the hotel voucher PDF and send it in this chat"
            >
              {sendingVoucherType === 'hotel' ? <Loader2 className="w-3 h-3 animate-spin" /> : <>🏨 Hotel voucher{bookingCount(hotels)}</>}
            </button>
            <button
              type="button"
              disabled={sendingVoucherType !== null}
              onClick={() => onSendVoucher('cab')}
              className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition disabled:opacity-50 cursor-pointer"
              title="Generate the cab voucher PDF and send it in this chat"
            >
              {sendingVoucherType === 'cab' ? <Loader2 className="w-3 h-3 animate-spin" /> : <>🚗 Cab voucher{bookingCount(cabs)}</>}
            </button>
          </div>
          <button
            type="button"
            disabled={sendingReminderType !== null}
            onClick={() => onSendReminder('departure')}
            className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold transition disabled:opacity-50 cursor-pointer"
          >
            {sendingReminderType === 'departure' ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Plane className="w-3 h-3" /> Send trip alert</>}
          </button>
        </div>
      ) : (
        <div className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center">
          <p className="text-[11px] text-slate-500">No booking linked to this chat yet.</p>
        </div>
      )}

      {/* Quotes */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className={sectionTitleCls}>Quotes{quotes.length ? ` · ${quotes.length}` : ''}</h4>
          <button type="button" onClick={onNewQuote} className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer">
            <Plus className="w-3 h-3" /> New quote
          </button>
        </div>

        {state === 'loading' ? (
          <div className="space-y-2 animate-pulse">
            {[0, 1].map((i) => <div key={i} className="h-12 rounded-lg bg-slate-100 dark:bg-slate-800" />)}
          </div>
        ) : state === 'denied' ? (
          <p className="text-[11px] text-slate-400">Your role cannot view customer history.</p>
        ) : quotes.length === 0 ? (
          <button
            type="button"
            onClick={onNewQuote}
            className="w-full p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 hover:border-emerald-400 hover:text-emerald-700 transition cursor-pointer"
          >
            No quotes for this customer yet · <span className="font-semibold">Create one</span>
          </button>
        ) : (
          <ul className="space-y-1.5">
            {quotes.map((q) => (
              <li key={q.id} className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate flex items-center gap-1">
                      <FileText className="w-3 h-3 text-slate-400 shrink-0" /> {q.tripName}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {inr(q.priceQuote)} · {q.itineraryDays.length} days · {relativeDay(q.createdAt)}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${QUOTE_STATUS[q.status] || QUOTE_STATUS.Draft}`}>{q.status}</span>
                </div>
                <button
                  type="button"
                  disabled={sharingQuoteId !== null}
                  onClick={() => onShareQuote(q)}
                  className="mt-2 w-full flex items-center justify-center gap-1 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold hover:bg-emerald-100 transition disabled:opacity-50 cursor-pointer"
                >
                  {sharingQuoteId === q.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Send className="w-3 h-3" /> Send link in chat</>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Earlier trips */}
      {pastBookings.length > 0 && (
        <div className="space-y-2">
          <h4 className={`${sectionTitleCls} flex items-center gap-1`}><History className="w-3 h-3" /> Other trips · {pastBookings.length}</h4>
          <ul className="space-y-1.5">
            {pastBookings.map((b) => (
              <li key={b.id} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 space-y-0.5">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="min-w-0 truncate text-slate-700 dark:text-slate-200 font-medium">{b.trip}</span>
                  <span className="shrink-0 text-slate-500">{inr(b.total_amount)} · {b.travel_status}</span>
                </div>
                {b.pickup && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                    <span className="truncate">Pickup: {b.pickup}</span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
