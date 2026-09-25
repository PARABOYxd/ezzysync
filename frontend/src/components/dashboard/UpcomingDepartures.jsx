import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, PlaneTakeoff } from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import EmptyState from '../common/EmptyState.jsx';

// Falls back to a neutral icon - it used to fall back to an unrelated stock
// photo of a person, shown on every trip without its own banner.
function TripThumb({ src }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="w-12 h-12 rounded-lg shrink-0 flex items-center justify-center bg-brand-50 text-brand-500 dark:bg-brand-950/20 border border-slate-100 dark:border-zinc-800">
        <PlaneTakeoff size={18} />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      className="w-12 h-12 rounded-lg object-cover bg-slate-100 border border-slate-100 dark:border-zinc-800 shrink-0 shadow-sm"
      onError={() => setFailed(true)}
    />
  );
}

export default function UpcomingDepartures({ departures }) {
  if (!departures?.length) {
    return (
      <div className="flex flex-col h-full justify-between">
        <EmptyState title="No upcoming departures" message="Upcoming trips will appear here." />
        <Link
          to="/upcoming-trips"
          className="mt-4 text-center text-xs font-bold text-slate-600 dark:text-zinc-300 hover:text-brand-600 dark:hover:text-brand-400 py-2.5 px-4 rounded-xl border border-slate-200/80 dark:border-zinc-700/80 bg-slate-50 dark:bg-zinc-800/40 hover:bg-slate-100 dark:hover:bg-zinc-800 transition flex items-center justify-center gap-1.5 shadow-sm"
        >
          View All Upcoming Trips
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 justify-between">
      <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-2.5">
        {departures.map((d, idx) => {
          const isBatch = d.type === 'batch';
          const batchData = d.batch || (isBatch ? d : null);
          const bookingData = d.booking || (isBatch ? null : d);
          const batchId = batchData?.batchId || batchData?.id || idx;
          const bookingId = bookingData?.bookingId || bookingData?.id || idx;
          const key = isBatch ? `batch-${batchId}` : `booking-${bookingId}`;
          const imageUrl = isBatch ? batchData?.bannerUrl : bookingData?.bannerUrl;
          
          return (
            <Link
              key={key}
              to={isBatch ? `/tour-batches?open=${batchId}` : `/bookings?search=${encodeURIComponent(bookingId)}`}
              className="flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-xl border border-slate-100 dark:border-zinc-800/80 bg-slate-50/40 dark:bg-zinc-800/10 hover:border-slate-200 dark:hover:border-zinc-700 hover:shadow-sm cursor-pointer transition text-left"
            >
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <TripThumb src={imageUrl} />
                {isBatch ? (
                  <div className="min-w-0 flex-1">
                    <span className="text-[12px] sm:text-[13px] font-bold text-slate-800 dark:text-zinc-100 truncate block">
                      {batchData?.name}
                    </span>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[10px] sm:text-[11px] text-slate-400 dark:text-zinc-500">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded-[4px] text-[10px]">GROUP</span>
                      <span>{batchData?.confirmedSeats || 0}/{batchData?.totalCapacity || 0} seats</span>
                    </div>
                  </div>
                ) : (
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] sm:text-[13px] font-bold text-slate-800 dark:text-zinc-100 truncate">{bookingData?.trip || 'Trip'}</p>
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5 text-[10px] sm:text-[11px] text-slate-400 dark:text-zinc-500">
                      <span className="font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 px-1.5 py-0.5 rounded-[4px] text-[10px]">PERSONAL</span>
                      <span className="font-bold text-slate-700 dark:text-zinc-300 truncate max-w-[90px] sm:max-w-[120px]">{bookingData?.customerName || '-'}</span>
                      <span>&middot;</span>
                      <span>{bookingData?.members || 1} pax</span>
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[11px] font-bold text-brand-600 bg-brand-50 dark:bg-brand-950/20 px-2 py-1 rounded shrink-0 whitespace-nowrap ml-1">
                {formatDate(d.departure)}
              </span>
            </Link>
          );
        })}
      </div>
      
      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-zinc-800/80 shrink-0">
        <Link
          to="/upcoming-trips"
          className="text-center text-xs font-bold text-slate-600 dark:text-zinc-300 hover:text-brand-600 dark:hover:text-brand-400 py-2 px-3 rounded-xl border border-slate-200/80 dark:border-zinc-700/80 bg-slate-50 dark:bg-zinc-800/40 hover:bg-slate-100 dark:hover:bg-zinc-800 transition flex items-center justify-center gap-1.5 shadow-sm"
        >
          View All Upcoming Trips ({departures.length})
        </Link>
      </div>
    </div>
  );
}
