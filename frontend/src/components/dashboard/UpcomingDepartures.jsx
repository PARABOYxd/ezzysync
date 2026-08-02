import React from 'react';
import { Link } from 'react-router-dom';
import { Layers } from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import EmptyState from '../common/EmptyState.jsx';

export default function UpcomingDepartures({ departures }) {
  if (!departures?.length) {
    return <EmptyState title="No upcoming departures" message="Upcoming trips will appear here." />;
  }
  return (
    <ul className="divide-y divide-slate-50">
      {departures.map((d) => {
        const isBatch = d.type === 'batch';
        const key = isBatch ? `batch-${d.batch.batchId}` : `booking-${d.booking.bookingId}`;
        return (
          <li key={key} className="py-3 flex items-center justify-between gap-3">
            {isBatch ? (
              <div className="min-w-0">
                <Link
                  to={`/tour-batches?open=${d.batch.batchId}`}
                  className="text-sm font-medium text-slate-700 hover:text-brand-600 flex items-center gap-1.5 truncate"
                  title="Open this Group Tour batch"
                >
                  <Layers size={13} className="text-brand-500 shrink-0" />
                  <span className="truncate">{d.batch.name}</span>
                </Link>
                <p className="text-xs text-slate-400 truncate">
                  {d.batch.confirmedSeats} member{d.batch.confirmedSeats !== 1 ? 's' : ''} &middot; {d.batch.confirmedSeats}/{d.batch.totalCapacity} seats filled
                </p>
              </div>
            ) : (
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{d.booking.trip}</p>
                <p className="text-xs text-slate-400 truncate">{d.booking.customerName} &middot; {d.booking.members} members</p>
              </div>
            )}
            <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full shrink-0">
              {formatDate(d.departure)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
