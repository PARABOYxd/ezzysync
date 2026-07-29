import React from 'react';

const TRAVEL_STYLES = {
  New: 'bg-blue-50 text-blue-600',
  Confirming: 'bg-indigo-50 text-indigo-600',
  Booked: 'bg-brand-50 text-brand-600',
  Completed: 'bg-emerald-50 text-emerald-600',
  Cancelled: 'bg-red-50 text-red-600',
  Refunded: 'bg-amber-50 text-amber-600',
  Postponed: 'bg-slate-100 text-slate-600',
};

const PAYMENT_STYLES = {
  Pending: 'bg-red-50 text-red-600',
  Partial: 'bg-amber-50 text-amber-600',
  Paid: 'bg-brand-50 text-brand-600',
};

export function TravelStatusBadge({ status }) {
  return <span className={`badge ${TRAVEL_STYLES[status] || 'bg-slate-100 text-slate-600'}`}>{status}</span>;
}

export function PaymentStatusBadge({ status }) {
  return <span className={`badge ${PAYMENT_STYLES[status] || 'bg-slate-100 text-slate-600'}`}>{status}</span>;
}

const QUOTATION_STYLES = {
  Draft: 'bg-slate-100 text-slate-600 border border-slate-200/50',
  Sent: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
  Accepted: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
};

export function QuotationStatusBadge({ status }) {
  return (
    <span className={`badge ${QUOTATION_STYLES[status] || 'bg-slate-100 text-slate-600'} px-2.5 py-1 text-xs border font-bold uppercase tracking-wider`}>
      {status}
    </span>
  );
}

const LEAD_STAGE_STYLES = {
  New: 'bg-blue-50 text-blue-600',
  Contacted: 'bg-indigo-50 text-indigo-600',
  Qualified: 'bg-amber-50 text-amber-600',
  Negotiating: 'bg-brand-50 text-brand-600',
  Won: 'bg-emerald-50 text-emerald-600',
  Lost: 'bg-red-50 text-red-600',
};

export function LeadStageBadge({ stage }) {
  return <span className={`badge ${LEAD_STAGE_STYLES[stage] || 'bg-slate-100 text-slate-600'}`}>{stage}</span>;
}
