import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Calendar, Clock, MapPin, FileText, ArrowLeft, Activity, Compass, Tag } from 'lucide-react';
import * as customerService from '../services/customerService';
import { formatCurrency, formatDate } from '../utils/formatters';
import { TravelStatusBadge, PaymentStatusBadge, QuotationStatusBadge, LeadStageBadge } from '../components/common/StatusBadge.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { useToast } from '../hooks/useToast.jsx';

export default function CustomerProfile() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    customerService.getCustomer(id)
      .then(setCustomer)
      .catch(() => toast.error('Could not load customer profile.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <div className="skeleton h-96 rounded-2xl animate-pulse bg-zinc-100 dark:bg-zinc-800" />;
  if (!customer) return <EmptyState title="Customer not found" message="This customer profile doesn't exist or you don't have access to it." />;

  const hasHistory = customer.bookings.length || customer.quotations.length || customer.leads.length || customer.followUps.length;

  return (
    <div className="space-y-6 max-w-7xl text-[var(--text-main)]">
      <button 
        onClick={() => navigate(-1)} 
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 transition bg-transparent border-none cursor-pointer"
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* Header Info Banner */}
      <div className="card bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 shadow-soft">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 flex items-center justify-center font-extrabold text-2xl border border-brand-100/50 dark:border-brand-900/30">
              {(customer.name || '?').slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-zinc-100">{customer.name || 'Unnamed Customer'}</h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-1.5 text-xs text-slate-500 dark:text-zinc-400 font-medium">
                {customer.email && (
                  <span className="flex items-center gap-1.5"><Mail size={13} /> {customer.email}</span>
                )}
                <span className="flex items-center gap-1.5"><Phone size={13} /> {customer.phone}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-8 text-xs border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-100 dark:border-zinc-800 w-full sm:w-auto">
            <div>
              <span className="block text-slate-400 dark:text-zinc-500 uppercase font-bold tracking-wide mb-1">First Seen</span>
              <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-zinc-300"><Calendar size={13} /> {formatDate(customer.first_seen_at)}</span>
            </div>
            <div>
              <span className="block text-slate-400 dark:text-zinc-500 uppercase font-bold tracking-wide mb-1">Last Active</span>
              <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-zinc-300"><Clock size={13} /> {formatDate(customer.last_activity_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {!hasHistory ? (
        <EmptyState title="No activity yet" message="Bookings, quotations, leads, and follow-ups for this customer will show up here." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* LEFT SIDE: Interaction Feed & Logs */}
          <div className="lg:col-span-1 space-y-6">
            <div className="card space-y-4">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 dark:text-zinc-200 flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-zinc-800/80">
                <Activity size={16} className="text-brand-500" />
                <span>Interaction Feed</span>
              </h3>
              
              {customer.followUps.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-zinc-500 italic text-center py-4">No follow-ups recorded yet</p>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 no-scrollbar">
                  {customer.followUps.map((f) => (
                    <div key={f.id} className="text-xs border-l-2 border-slate-200 dark:border-zinc-800 pl-3.5 py-0.5 space-y-1">
                      <p className="text-slate-700 dark:text-zinc-300 leading-relaxed">{f.note}</p>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-semibold uppercase tracking-wide">
                        {formatDate(f.created_at)} &middot; {f.activity_type}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SIDE: Leads, Quotations, and Bookings */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Bookings Card */}
            {customer.bookings.length > 0 && (
              <div className="card space-y-4">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 dark:text-zinc-200 flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-zinc-800/80">
                  <MapPin size={16} className="text-brand-500" />
                  <span>Bookings ({customer.bookings.length})</span>
                </h3>
                <div className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                  {customer.bookings.map((b) => (
                    <div key={b.id} className="py-3.5 flex items-center justify-between gap-4 flex-wrap first:pt-0 last:pb-0">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-zinc-200 text-sm">{b.trip}</p>
                        <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5 font-mono">
                          {b.booking_id} &middot; Departure: {formatDate(b.departure)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <TravelStatusBadge status={b.travel_status} />
                        <PaymentStatusBadge status={b.payment_status} />
                        <span className="text-sm font-extrabold text-slate-800 dark:text-zinc-200">{formatCurrency(b.total_amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quotations Card */}
            {customer.quotations.length > 0 && (
              <div className="card space-y-4">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 dark:text-zinc-200 flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-zinc-800/80">
                  <Compass size={16} className="text-brand-500" />
                  <span>Quotations & Itineraries ({customer.quotations.length})</span>
                </h3>
                <div className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                  {customer.quotations.map((q) => (
                    <div key={q.id} className="py-3.5 flex items-center justify-between gap-4 flex-wrap first:pt-0 last:pb-0">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-zinc-200 text-sm">{q.trip_name}</p>
                        <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5 font-mono">{q.quotation_id}</p>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <QuotationStatusBadge status={q.status} />
                        <span className="text-sm font-extrabold text-slate-800 dark:text-zinc-200">{formatCurrency(q.price_quote)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Leads Card */}
            {customer.leads.length > 0 && (
              <div className="card space-y-4">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 dark:text-zinc-200 flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-zinc-800/80">
                  <Tag size={16} className="text-brand-500" />
                  <span>Active Enquiries & Leads ({customer.leads.length})</span>
                </h3>
                <div className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                  {customer.leads.map((l) => (
                    <div key={l.id} className="py-3.5 flex items-center justify-between gap-4 flex-wrap first:pt-0 last:pb-0">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-zinc-200 text-sm">{l.interest || 'General Enquiry'}</p>
                        <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5 font-mono">
                          {l.lead_id} &middot; Source: {l.source}
                        </p>
                      </div>
                      <LeadStageBadge stage={l.stage} />
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
