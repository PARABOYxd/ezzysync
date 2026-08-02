import React, { useEffect, useState } from 'react';
import Drawer from '../common/Drawer.jsx';
import Input from '../ui/Input.jsx';
import { TravelStatusBadge, PaymentStatusBadge, BatchStatusBadge } from '../common/StatusBadge.jsx';
import * as batchService from '../../services/batchService';
import * as bookingService from '../../services/bookingService';
import { useToast } from '../../hooks/useToast.jsx';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Search, Link2, Unlink, Users, MapPin, Calendar, IndianRupee, ClipboardList } from 'lucide-react';

export default function BatchDetailDrawer({ open, onClose, batchId, onChanged }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const toast = useToast();

  const load = () => {
    if (!batchId) return;
    setLoading(true);
    batchService.getBatchById(batchId)
      .then(setDetail)
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

  if (!open) return null;

  const { batch, bookings = [], summary } = detail || {};
  const pct = summary ? Math.min(100, Math.round((summary.confirmedSeats / (summary.totalCapacity || 1)) * 100)) : 0;

  return (
    <Drawer open={open} onClose={onClose} title={batch?.name || 'Tour Batch'}>
      {loading || !batch ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overview */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] text-slate-400">{batch.batchId}</span>
              <BatchStatusBadge status={batch.status} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-1.5"><MapPin size={13} className="text-slate-400" /> {batch.tripName}</div>
              <div className="flex items-center gap-1.5"><Calendar size={13} className="text-slate-400" /> {formatDate(batch.departureDate)}</div>
              <div className="flex items-center gap-1.5"><IndianRupee size={13} className="text-slate-400" /> {formatCurrency(batch.pricePerPerson)} / person</div>
              <div className="flex items-center gap-1.5"><Users size={13} className="text-slate-400" /> {summary.confirmedSeats} / {summary.totalCapacity} seats filled</div>
            </div>
            {batch.notes && <p className="text-xs text-slate-500 border-t border-slate-100 pt-2.5">{batch.notes}</p>}
          </div>

          {/* Capacity bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-600">
              <span>Capacity</span>
              <span>{pct}% filled &middot; {Math.max(summary.totalCapacity - summary.confirmedSeats, 0)} seats left</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : 'bg-brand-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Payment rollup */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Total Paid</p>
              <p className="text-base font-bold text-emerald-700">{formatCurrency(summary.totalPaid)}</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Total Pending</p>
              <p className="text-base font-bold text-amber-700">{formatCurrency(summary.totalPending)}</p>
            </div>
          </div>

          {/* Master itinerary */}
          {batch.itineraryDays?.length > 0 && batch.itineraryDays.some((d) => d.title) && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <ClipboardList size={13} /> Master Itinerary
              </h4>
              <div className="space-y-2">
                {batch.itineraryDays.map((d, i) => d.title && (
                  <div key={i} className="border border-slate-100 rounded-xl p-3 text-xs">
                    <p className="font-semibold text-slate-700">Day {d.day}: {d.title}</p>
                    {d.description && <p className="text-slate-500 mt-1">{d.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Link existing booking */}
          <div className="space-y-2 border-t border-slate-100 pt-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Link an existing booking</h4>
            <Input
              icon={Search}
              placeholder="Search by name, phone or booking ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {searching && <p className="text-[11px] text-slate-400">Searching…</p>}
            {searchResults.length > 0 && (
              <div className="border border-slate-100 rounded-xl divide-y divide-slate-50 overflow-hidden">
                {searchResults.map((b) => (
                  <div key={b.bookingId} className="flex items-center justify-between px-3 py-2 hover:bg-slate-50">
                    <div className="text-xs">
                      <p className="font-semibold text-slate-700">{b.customerName}</p>
                      <p className="text-slate-400">{b.phone} &middot; {b.members} pax &middot; {b.trip}</p>
                    </div>
                    <button
                      onClick={() => handleLink(b)}
                      className="p-1.5 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 transition"
                      title="Link to this batch"
                    >
                      <Link2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Linked bookings roster */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Roster ({bookings.length} booking{bookings.length !== 1 ? 's' : ''})
            </h4>
            {bookings.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center border border-dashed border-slate-200 rounded-xl">
                No bookings linked yet. Search above to add travellers to this batch.
              </p>
            ) : (
              <div className="space-y-2">
                {bookings.map((b) => (
                  <div key={b.bookingId} className="border border-slate-100 rounded-xl p-3 flex items-center justify-between gap-3">
                    <div className="text-xs min-w-0">
                      <p className="font-semibold text-slate-700 truncate">{b.customerName}</p>
                      <p className="text-slate-400 truncate">{b.phone} &middot; {b.members} pax</p>
                      <div className="flex gap-1.5 mt-1.5">
                        <TravelStatusBadge status={b.travelStatus} />
                        <PaymentStatusBadge status={b.paymentStatus} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono text-slate-500">{formatCurrency(b.totalAmount)}</span>
                      <button
                        onClick={() => handleUnlink(b)}
                        className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                        title="Unlink from batch"
                      >
                        <Unlink size={14} />
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
