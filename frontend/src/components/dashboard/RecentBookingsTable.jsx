import React from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { TravelStatusBadge } from '../common/StatusBadge.jsx';
import EmptyState from '../common/EmptyState.jsx';

export default function RecentBookingsTable({ bookings }) {
  if (!bookings?.length) {
    return <EmptyState title="No recent bookings" message="New bookings will show up here as soon as they're created." />;
  }
  return (
    <div className="overflow-x-auto -mx-5">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-400 dark:text-zinc-500 border-b border-slate-100 dark:border-zinc-800">
            <th className="py-2.5 px-5 font-medium">Customer</th>
            <th className="py-2.5 px-5 font-medium">Trip</th>
            <th className="py-2.5 px-5 font-medium">Departure</th>
            <th className="py-2.5 px-5 font-medium">Amount</th>
            <th className="py-2.5 px-5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.bookingId} className="border-b border-slate-50 dark:border-zinc-800/50 hover:bg-slate-50/60 dark:hover:bg-zinc-800/50">
              <td className="py-3 px-5">
                <Link to="/bookings" className="font-medium text-slate-700 dark:text-zinc-200 hover:text-brand-600 dark:hover:text-brand-400">{b.customerName}</Link>
              </td>
              <td className="py-3 px-5 text-slate-500 dark:text-zinc-400">{b.trip}</td>
              <td className="py-3 px-5 text-slate-500 dark:text-zinc-400">{formatDate(b.departure)}</td>
              <td className="py-3 px-5 text-slate-500 dark:text-zinc-400">{formatCurrency(b.totalAmount)}</td>
              <td className="py-3 px-5"><TravelStatusBadge status={b.travelStatus} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
