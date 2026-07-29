import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, Mail, Phone, Calendar, Clock, MapPin, FileText, ArrowLeft } from 'lucide-react';
import * as customerService from '../services/customerService';
import { formatCurrency, formatDate } from '../utils/formatters';
import { TravelStatusBadge, PaymentStatusBadge, QuotationStatusBadge } from '../components/common/StatusBadge.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { useToast } from '../hooks/useToast.jsx';

export default function CustomerProfile() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    setLoading(true);
    customerService.getCustomer(id)
      .then(setCustomer)
      .catch(() => toast.error('Could not load customer profile.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <div className="skeleton h-64 rounded-2xl" />;
  if (!customer) return <EmptyState title="Customer not found" message="This customer profile doesn't exist or you don't have access to it." />;

  const hasHistory = customer.bookings.length || customer.quotations.length || customer.leads.length || customer.followUps.length;

  return (
    <div className="space-y-6 max-w-5xl">
      <Link to="/bookings" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={15} /> Back
      </Link>

      {/* Header */}
      <div className="card">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-lg">
              {(customer.name || '?').slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{customer.name || 'Unnamed Customer'}</h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
                {customer.email && (
                  <span className="flex items-center gap-1.5"><Mail size={13} /> {customer.email}</span>
                )}
                <span className="flex items-center gap-1.5"><Phone size={13} /> {customer.phone}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-6 text-xs text-slate-500">
            <div>
              <span className="block text-slate-400 uppercase font-semibold tracking-wide mb-0.5">First Seen</span>
              <span className="flex items-center gap-1 font-medium text-slate-700"><Calendar size={12} /> {formatDate(customer.first_seen_at)}</span>
            </div>
            <div>
              <span className="block text-slate-400 uppercase font-semibold tracking-wide mb-0.5">Last Activity</span>
              <span className="flex items-center gap-1 font-medium text-slate-700"><Clock size={12} /> {formatDate(customer.last_activity_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {!hasHistory && (
        <EmptyState title="No activity yet" message="Bookings, quotations, leads, and follow-ups for this customer will show up here." />
      )}

      {/* Bookings */}
      {customer.bookings.length > 0 && (
        <div className="card space-y-3">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2"><MapPin size={16} className="text-brand-500" /> Bookings</h3>
          <div className="divide-y divide-slate-100">
            {customer.bookings.map((b) => (
              <div key={b.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-medium text-slate-700 text-sm">{b.trip}</p>
                  <p className="text-xs text-slate-400">{b.booking_id} &middot; Departure {formatDate(b.departure)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <TravelStatusBadge status={b.travel_status} />
                  <PaymentStatusBadge status={b.payment_status} />
                  <span className="text-sm font-semibold text-slate-700">{formatCurrency(b.total_amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quotations */}
      {customer.quotations.length > 0 && (
        <div className="card space-y-3">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2"><FileText size={16} className="text-brand-500" /> Quotations</h3>
          <div className="divide-y divide-slate-100">
            {customer.quotations.map((q) => (
              <div key={q.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-medium text-slate-700 text-sm">{q.trip_name}</p>
                  <p className="text-xs text-slate-400">{q.quotation_id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <QuotationStatusBadge status={q.status} />
                  <span className="text-sm font-semibold text-slate-700">{formatCurrency(q.price_quote)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leads */}
      {customer.leads.length > 0 && (
        <div className="card space-y-3">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2"><User size={16} className="text-brand-500" /> Leads</h3>
          <div className="divide-y divide-slate-100">
            {customer.leads.map((l) => (
              <div key={l.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-medium text-slate-700 text-sm">{l.interest || 'General inquiry'}</p>
                  <p className="text-xs text-slate-400">{l.lead_id} &middot; Source: {l.source}</p>
                </div>
                <span className="badge bg-slate-100 text-slate-600">{l.stage}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      {customer.followUps.length > 0 && (
        <div className="card space-y-3">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Clock size={16} className="text-brand-500" /> Interaction Timeline</h3>
          <div className="space-y-3">
            {customer.followUps.map((f) => (
              <div key={f.id} className="text-sm border-l-2 border-slate-200 pl-3">
                <p className="text-slate-600">{f.note}</p>
                <p className="text-xs text-slate-400 mt-0.5">{formatDate(f.created_at)} &middot; {f.activity_type}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
