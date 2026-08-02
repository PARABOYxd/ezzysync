import React from 'react';

const TRAVEL_STYLES = {
  New: 'badge-new',
  Confirming: 'badge-contacted',
  Booked: 'badge-followup',
  Completed: 'badge-confirmed',
  Cancelled: 'badge-lost',
  Refunded: 'badge-quoted',
  Postponed: 'badge-lost',
};

const PAYMENT_STYLES = {
  Pending: 'badge-lost',
  Partial: 'badge-quoted',
  Paid: 'badge-confirmed',
};

export function TravelStatusBadge({ status }) {
  return <span className={`badge-tint ${TRAVEL_STYLES[status] || 'badge-lost'}`}>{status}</span>;
}

export function PaymentStatusBadge({ status }) {
  return <span className={`badge-tint ${PAYMENT_STYLES[status] || 'badge-lost'}`}>{status}</span>;
}

const QUOTATION_STYLES = {
  Draft: 'badge-lost',
  Sent: 'badge-contacted',
  Accepted: 'badge-confirmed',
};

export function QuotationStatusBadge({ status }) {
  return (
    <span className={`badge-tint ${QUOTATION_STYLES[status] || 'badge-lost'}`}>
      {status}
    </span>
  );
}

const LEAD_STAGE_STYLES = {
  New: 'badge-new',
  Contacted: 'badge-contacted',
  Qualified: 'badge-quoted',
  Negotiating: 'badge-followup',
  Won: 'badge-confirmed',
  Lost: 'badge-lost',
};

export function LeadStageBadge({ stage }) {
  return <span className={`badge-tint ${LEAD_STAGE_STYLES[stage] || 'badge-lost'}`}>{stage}</span>;
}
