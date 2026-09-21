import React from 'react';
import { Link } from 'react-router-dom';
import { Layers } from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import EmptyState from '../common/EmptyState.jsx';

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

  const displayedDepartures = departures.slice(0, 5);

  return (
    <div className="flex flex-col h-full justify-between">
      <div className="grid grid-cols-1 gap-2.5 mt-1.5">
        {displayedDepartures.map((d, idx) => {
          const isBatch = d.type === 'batch';
          const batchData = d.batch || (isBatch ? d : null);
          const bookingData = d.booking || (isBatch ? null : d);
          const batchId = batchData?.batchId || batchData?.id || idx;
          const bookingId = bookingData?.bookingId || bookingData?.id || idx;
          const key = isBatch ? `batch-${batchId}` : `booking-${bookingId}`;
          const imageUrl = (isBatch ? batchData?.bannerUrl : bookingData?.bannerUrl) || 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTWCnZIAMEWJEcSm9t5zlxrrW526rXBpZYl5QOjMHHhf51_d878RkgnsbGq&s=10';
          
          return (
            <Link
              key={key}
              to={isBatch ? `/tour-batches?open=${batchId}` : `/bookings?search=${encodeURIComponent(bookingId)}`}
              className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 dark:border-zinc-800/80 bg-slate-50/40 dark:bg-zinc-800/10 hover:border-slate-200 dark:hover:border-zinc-700 hover:shadow-sm cursor-pointer transition text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img 
                  src={imageUrl} 
                  alt="Banner" 
                  className="w-12 h-12 rounded-lg object-cover bg-slate-100 border border-slate-100 dark:border-zinc-800 shrink-0 shadow-sm"
                  onError={(e) => {
                    e.target.src = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTWCnZIAMEWJEcSm9t5zlxrrW526rXBpZYl5QOjMHHhf51_d878RkgnsbGq&s=10';
                  }}
                />
                {isBatch ? (
                  <div className="min-w-0 flex-1">
                    <span className="text-[13px] font-bold text-slate-800 dark:text-zinc-100 truncate block">
                      {batchData?.name}
                    </span>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px] text-slate-400 dark:text-zinc-500">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded-[4px] text-[10px]">GROUP</span>
                      <span>{batchData?.confirmedSeats || 0}/{batchData?.totalCapacity || 0} seats</span>
                    </div>
                  </div>
                ) : (
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-slate-800 dark:text-zinc-100 truncate">{bookingData?.trip || 'Trip'}</p>
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5 text-[11px] text-slate-400 dark:text-zinc-500">
                      <span className="font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 px-1.5 py-0.5 rounded-[4px] text-[10px]">PERSONAL</span>
                      <span className="font-bold text-slate-700 dark:text-zinc-300 truncate max-w-[100px]">{bookingData?.customerName || '-'}</span>
                      <span>&middot;</span>
                      <span>{bookingData?.members || 1} member{Number(bookingData?.members) !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[11px] font-extrabold text-brand-600 bg-brand-50 dark:bg-brand-950/20 px-2.5 py-1 rounded shrink-0">
                {formatDate(d.departure)}
              </span>
            </Link>
          );
        })}
      </div>
      
      <Link
        to="/upcoming-trips"
        className="mt-4 text-center text-xs font-bold text-slate-600 dark:text-zinc-300 hover:text-brand-600 dark:hover:text-brand-400 py-2.5 px-4 rounded-xl border border-slate-200/80 dark:border-zinc-700/80 bg-slate-50 dark:bg-zinc-800/40 hover:bg-slate-100 dark:hover:bg-zinc-800 transition flex items-center justify-center gap-1.5 shadow-sm"
      >
        View All Upcoming Trips
      </Link>
    </div>
  );
}
