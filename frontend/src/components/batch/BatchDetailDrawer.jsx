import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Drawer from '../common/Drawer.jsx';
import Input from '../ui/Input.jsx';
import ProgressBar from '../ui/ProgressBar.jsx';
import { TravelStatusBadge, PaymentStatusBadge } from '../common/StatusBadge.jsx';
import * as batchService from '../../services/batchService';
import * as bookingService from '../../services/bookingService';
import * as quotationService from '../../services/quotationService';
import { useToast } from '../../hooks/useToast.jsx';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Search, Link2, Unlink, Users, MapPin, Calendar, ExternalLink, Wallet, Hourglass, Target } from 'lucide-react';

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}

function MetaChip({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] bg-[var(--surface-muted)] border border-[var(--border)]/60 rounded-lg px-2.5 py-1.5">
      <Icon size={13} strokeWidth={1.75} className="text-[var(--text-secondary)] shrink-0" />
      <span className="truncate">{children}</span>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }) {
  const tones = {
    success: { bg: 'bg-[var(--success-bg)]', fg: 'text-[var(--success)]' },
    warning: { bg: 'bg-[var(--warning-bg)]', fg: 'text-[var(--warning)]' },
  };
  const t = tones[tone];
  return (
    <div className={`${t.bg} border border-[var(--border)]/60 rounded-xl p-3.5 space-y-1.5`}>
      <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${t.fg}`}>
        <Icon size={13} strokeWidth={1.75} /> {label}
      </div>
      <p className={`text-lg font-bold tabular-nums ${t.fg}`}>{value}</p>
    </div>
  );
}

export default function BatchDetailDrawer({ open, onClose, batchId, onChanged }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [itineraryUuid, setItineraryUuid] = useState(null);
  const toast = useToast();

  const load = () => {
    if (!batchId) return;
    setLoading(true);
    batchService.getBatchById(batchId)
      .then((data) => {
        setDetail(data);
        if (data.batch?.sourceQuotationId) {
          quotationService.getQuotation(data.batch.sourceQuotationId)
            .then((q) => setItineraryUuid(q.id))
            .catch(() => setItineraryUuid(null));
        } else {
          setItineraryUuid(null);
        }
      })
      .catch(() => toast.error('Could not load tour batch.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) {
      setSearch('');
      setSearchResults([]);
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, batchId]);

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      bookingService.getBookings({ search, limit: 8 })
        .then((data) => {
          const linkedIds = new Set((detail?.bookings || []).map((b) => b.bookingId));
          setSearchResults((data.bookings || []).filter((b) => !linkedIds.has(b.bookingId)));
        })
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleLink = async (booking) => {
    try {
      await batchService.linkBooking(batchId, booking.bookingId);
      toast.success(`${booking.customerName} linked to this batch.`);
      setSearch('');
      setSearchResults([]);
      load();
      onChanged?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not link booking.');
    }
  };

  const handleUnlink = async (booking) => {
    if (!window.confirm(`Remove ${booking.customerName} from this batch?`)) return;
    try {
      await batchService.unlinkBooking(batchId, booking.bookingId);
      toast.success('Booking unlinked from batch.');
      load();
      onChanged?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not unlink booking.');
    }
  };

  const handleUnlinkLead = async (lead) => {
    if (!window.confirm(`Remove ${lead.customerName} from this batch?`)) return;
    try {
      await batchService.unlinkLead(batchId, lead.leadId);
      toast.success('Lead unlinked from batch.');
      load();
      onChanged?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not unlink lead.');
    }
  };

  if (!open) return null;

  const { batch, bookings = [], leads = [], summary } = detail || {};

  return (
    <Drawer open={open} onClose={onClose} title={batch?.tripName || 'Tour Batch'}>
      {loading || !batch ? (
        <div className="space-y-4" aria-busy="true" aria-label="Loading batch details">
          <div className="skeleton h-20 rounded-2xl" />
          <div className="skeleton h-10 rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            <div className="skeleton h-16 rounded-xl" />
            <div className="skeleton h-16 rounded-xl" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Info summary row */}
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <MetaChip icon={MapPin}>{batch.tripName}</MetaChip>
              <MetaChip icon={Calendar}>{formatDate(batch.departureDate)}</MetaChip>
              <MetaChip icon={Users}>{summary.confirmedSeats} / {summary.totalCapacity} seats</MetaChip>
            </div>
            {batch.notes && <p className="text-sm text-[var(--text-secondary)]">{batch.notes}</p>}
            {itineraryUuid && (
              <Link
                to={`/quote-preview/${itineraryUuid}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors duration-150
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] rounded-md"
              >
                <ExternalLink size={14} strokeWidth={1.75} /> View full itinerary
              </Link>
            )}
          </div>

          {/* Capacity bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-semibold text-[var(--text-secondary)]">
              <span>Capacity</span>
              <span className="tabular-nums">
                {summary.totalCapacity > 0 ? Math.min(100, Math.round((summary.confirmedSeats / summary.totalCapacity) * 100)) : 0}% filled &middot; {Math.max(summary.totalCapacity - summary.confirmedSeats, 0)} seats left
              </span>
            </div>
            <ProgressBar value={summary.confirmedSeats} max={summary.totalCapacity} />
          </div>

          {/* Payment rollup */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Wallet} label="Total Paid" value={formatCurrency(summary.totalPaid)} tone="success" />
            <StatCard icon={Hourglass} label="Total Pending" value={formatCurrency(summary.totalPending)} tone="warning" />
          </div>

          {/* Link existing booking */}
          <div className="space-y-2 border-t border-[var(--border)] pt-4">
            <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Link an existing booking</h4>
            <Input
              icon={Search}
              placeholder="Search by name, phone or booking ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              inputClassName="h-11 rounded-xl"
            />
            {searching && <p className="text-xs text-[var(--text-secondary)]">Searching…</p>}
            {search.trim() && !searching && searchResults.length === 0 && (
              <p className="text-xs text-[var(--text-secondary)]">No bookings found for "{search}".</p>
            )}
            {searchResults.length > 0 && (
              <div className="border border-[var(--border)] rounded-xl divide-y divide-[var(--border)] overflow-hidden shadow-sm">
                {searchResults.map((b) => {
                  const sameTrip = b.trip === batch.tripName;
                  const sameDate = (b.departure || '').slice(0, 10) === (batch.departureDate || '').slice(0, 10);
                  const matches = sameTrip && sameDate;
                  return (
                    <div key={b.bookingId} className="flex items-center justify-between px-3.5 py-2.5 hover:bg-[var(--surface-muted)] transition-colors duration-150 gap-2">
                      <div className="text-xs min-w-0">
                        <p className="font-semibold text-[var(--text-primary)] truncate">{b.customerName}</p>
                        <p className="text-[var(--text-secondary)] truncate">{b.phone} &middot; {b.members} pax &middot; {b.trip}</p>
                        {!matches && (
                          <p className="text-[var(--warning)] text-[10px] font-semibold mt-0.5">
                            Different {!sameTrip && !sameDate ? 'trip & date' : !sameTrip ? 'trip' : 'date'} — must match this batch to link
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleLink(b)}
                        disabled={!matches}
                        aria-label={`Link ${b.customerName} to this batch`}
                        title={matches ? 'Link to this batch' : "Trip & departure date must match this batch's itinerary"}
                        className="w-11 h-11 flex items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]
                          hover:bg-[var(--primary)]/15 active:bg-[var(--primary)]/20 transition-colors duration-150
                          disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[var(--primary)]/10 shrink-0
                          focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                      >
                        <Link2 size={16} strokeWidth={1.75} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Linked bookings roster */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
              Roster ({bookings.length} booking{bookings.length !== 1 ? 's' : ''})
            </h4>
            {bookings.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)] py-6 text-center border border-dashed border-[var(--border)] rounded-xl">
                No bookings linked yet. Search above to add travellers to this batch.
              </p>
            ) : (
              <div className="space-y-2">
                {bookings.map((b) => (
                  <div
                    key={b.bookingId}
                    className="border border-[var(--border)] rounded-xl p-3 flex items-center gap-3 hover:bg-[var(--surface-muted)] transition-colors duration-150"
                  >
                    <div className="w-9 h-9 shrink-0 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-bold flex items-center justify-center">
                      {initials(b.customerName)}
                    </div>
                    <div className="text-xs min-w-0 flex-1">
                      <p className="font-semibold text-[var(--text-primary)] truncate">{b.customerName}</p>
                      <p className="text-[var(--text-secondary)] truncate">{b.phone} &middot; {b.members} pax</p>
                      <div className="flex gap-1.5 mt-1.5">
                        <TravelStatusBadge status={b.travelStatus} />
                        <PaymentStatusBadge status={b.paymentStatus} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-mono text-[var(--text-secondary)] tabular-nums">{formatCurrency(b.totalAmount)}</span>
                      <button
                        onClick={() => handleUnlink(b)}
                        aria-label={`Unlink ${b.customerName} from this batch`}
                        title="Unlink from batch"
                        className="w-11 h-11 flex items-center justify-center rounded-lg bg-[var(--danger-bg)] text-[var(--danger)]
                          hover:bg-red-100 dark:hover:bg-red-950/40 active:bg-red-200 dark:active:bg-red-950/60 transition-colors duration-150
                          focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)]"
                      >
                        <Unlink size={16} strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Linked leads roster */}
          <div className="space-y-2 mt-6">
            <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
              Lead Pipeline ({leads.length} lead{leads.length !== 1 ? 's' : ''})
            </h4>
            {leads.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)] py-6 text-center border border-dashed border-[var(--border)] rounded-xl">
                No active leads linked to this batch yet.
              </p>
            ) : (
              <div className="space-y-2">
                {leads.map((l) => (
                  <div
                    key={l.leadId}
                    className="border border-[var(--border)] rounded-xl p-3 flex items-center gap-3 hover:bg-[var(--surface-muted)] transition-colors duration-150"
                  >
                    <div className="w-9 h-9 shrink-0 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-bold flex items-center justify-center">
                      {initials(l.customerName)}
                    </div>
                    <div className="text-xs min-w-0 flex-1">
                      <p className="font-semibold text-[var(--text-primary)] truncate">{l.customerName}</p>
                      <p className="text-[var(--text-secondary)] truncate">{l.phone}</p>
                      <div className="flex gap-1.5 mt-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-zinc-800 text-[var(--text-secondary)]">
                          <Target size={10} /> {l.stage}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleUnlinkLead(l)}
                        aria-label={`Unlink ${l.customerName} from this batch`}
                        title="Unlink from batch"
                        className="w-11 h-11 flex items-center justify-center rounded-lg bg-[var(--danger-bg)] text-[var(--danger)]
                          hover:bg-red-100 dark:hover:bg-red-950/40 active:bg-red-200 dark:active:bg-red-950/60 transition-colors duration-150
                          focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)]"
                      >
                        <Unlink size={16} strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}
