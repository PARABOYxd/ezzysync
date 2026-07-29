import React from 'react';
import { formatDate } from '../../utils/formatters';
import EmptyState from '../common/EmptyState.jsx';

export default function UpcomingDepartures({ departures }) {
  if (!departures?.length) {
    return <EmptyState title="No upcoming departures" message="Upcoming trips will appear here." />;
  }
  return (
    <ul className="divide-y divide-slate-50">
      {departures.map((d) => (
        <li key={d.bookingId} className="py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">{d.trip}</p>
            <p className="text-xs text-slate-400">{d.customerName} · {d.members} members</p>
          </div>
          <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">
            {formatDate(d.departure)}
          </span>
        </li>
      ))}
    </ul>
  );
}
