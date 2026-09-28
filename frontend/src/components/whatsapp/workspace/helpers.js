// Shared bits for the chat's Customer 360 workspace.

export const LEAD_STAGES = ['New', 'Contacted', 'Negotiating', 'Won', 'Lost'];

export const ACTIVITY_TYPES = [
  { value: 'call', label: '📞 Call' },
  { value: 'whatsapp', label: '💬 WhatsApp' },
  { value: 'email', label: '✉️ Email' },
  { value: 'meeting', label: '📅 Meeting' },
];

export const PAYMENT_METHODS = ['UPI', 'Cash', 'Bank Transfer', 'Card', 'Cheque', 'Other'];

export const STAGE_STYLES = {
  New: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  Contacted: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  Negotiating: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800',
  Won: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  Lost: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
};

export const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

/** Last ten digits - customers are stored without the 91 prefix chats carry. */
export const phoneKey = (phone = '') => String(phone).replace(/\D/g, '').slice(-10);

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

/**
 * 'overdue' | 'today' | 'soon' | null for a follow-up date, so the chat list
 * and the Tasks tab colour a due date the same way.
 */
export function dueState(date) {
  if (!date) return null;
  const due = startOfDay(date).getTime();
  const today = startOfDay(new Date()).getTime();
  if (due < today) return 'overdue';
  if (due === today) return 'today';
  return 'soon';
}

export function dueLabel(date) {
  const state = dueState(date);
  if (!state) return '';
  const d = new Date(date);
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  if (state === 'overdue') return `Overdue · ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
  if (state === 'today') return `Today · ${time}`;
  const tomorrow = startOfDay(new Date()).getTime() + 86400000;
  if (startOfDay(d).getTime() === tomorrow) return `Tomorrow · ${time}`;
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) + ` · ${time}`;
}

export const DUE_STYLES = {
  overdue: 'text-rose-600 dark:text-rose-400',
  today: 'text-amber-600 dark:text-amber-400',
  soon: 'text-slate-500 dark:text-slate-400',
};

/** "12 min", "3 h", "2 days" - how long something has been going on. */
export function sinceLabel(date) {
  if (!date) return '';
  const mins = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

export function relativeDay(date) {
  if (!date) return '';
  const d = new Date(date);
  const days = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: days > 300 ? 'numeric' : undefined });
}

/**
 * The exact text a reminder sends, so the agent can read it before it goes.
 * Used by both the send handler and the preview.
 */
export function buildReminderText(type, chat) {
  if (type === 'departure') {
    const trip = chat?.booking_trip || 'your upcoming trip';
    return `✈️ *Travel Briefing & Alert*\nHello! Your trip *${trip}* is coming up soon. Please ensure you have all vouchers and tickets handy!`;
  }
  const rem = Number(chat?.remaining || 0).toLocaleString('en-IN');
  return `💳 *Payment Reminder*\nHello! This is a gentle reminder that a balance of *₹${rem}* is pending for your booking. Please settle at your earliest convenience.`;
}

/** Quotation rows from the customer profile are raw DB rows; the share
 * handlers expect the API's camelCase shape. */
export function toQuoteShape(row) {
  return {
    id: row.id,
    quotationId: row.quotation_id,
    tripName: row.trip_name,
    priceQuote: Number(row.price_quote || 0),
    status: row.status || 'Draft',
    validUntil: row.valid_until,
    itineraryDays: row.itinerary_days || [],
    highlights: row.highlights || [],
    inclusions: row.inclusions || [],
    createdAt: row.created_at,
  };
}

export const inputCls =
  'w-full px-2.5 py-1.5 text-base sm:text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500';

export const sectionTitleCls = 'text-[11px] font-bold text-slate-500 uppercase tracking-wider';
