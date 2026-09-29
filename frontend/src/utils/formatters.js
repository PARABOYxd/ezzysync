export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    Number(amount || 0)
  );

export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

/**
 * Whole days from today to a due date: negative = overdue, 0 = today,
 * 1 = tomorrow. A bare 'YYYY-MM-DD' (how the API sends DATE columns) is read
 * as a local calendar day - `new Date('2026-09-28')` would be UTC midnight,
 * which is the previous day anywhere west of Greenwich.
 */
export const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateStr));
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((day - today) / 86400000);
};

/** "Overdue 2 days" / "Today" / "Tomorrow" / "In 3 days" for a follow-up due date. */
export const dueLabel = (dateStr) => {
  const n = daysUntil(dateStr);
  if (n === null) return '-';
  if (n < 0) return `Overdue ${-n} ${n === -1 ? 'day' : 'days'}`;
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  return `In ${n} days`;
};

/** "Today" / "Yesterday" for the last two days, otherwise the plain formatted date. */
export const formatRelativeDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return formatDate(dateStr);
};
