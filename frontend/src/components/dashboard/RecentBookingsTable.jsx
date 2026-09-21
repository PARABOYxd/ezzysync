import React from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { TravelStatusBadge } from '../common/StatusBadge.jsx';
import EmptyState from '../common/EmptyState.jsx';
import { Table, Thead, Tbody, Tr, Th, Td } from '../common/Table.jsx';

export default function RecentBookingsTable({ bookings }) {
  if (!bookings?.length) {
    return <EmptyState title="No recent bookings" message="New bookings will show up here as soon as they're created." />;
  }
  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Table>
          <Thead>
            <Th>Customer</Th>
            <Th>Trip</Th>
            <Th>Departure</Th>
            <Th>Amount</Th>
            <Th>Status</Th>
          </Thead>
          <Tbody>
            {bookings.map((b) => (
              <Tr key={b.bookingId}>
                <Td>
                  <Link to={`/bookings?search=${encodeURIComponent(b.bookingId)}`} className="font-medium text-slate-700 dark:text-zinc-200 hover:text-brand-600 dark:hover:text-brand-400">{b.customerName}</Link>
                </Td>
                <Td className="text-slate-500 dark:text-zinc-400">{b.trip}</Td>
                <Td className="text-slate-500 dark:text-zinc-400">{formatDate(b.departure)}</Td>
                <Td className="text-slate-500 dark:text-zinc-400">{formatCurrency(b.totalAmount)}</Td>
                <Td><TravelStatusBadge status={b.travelStatus} /></Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>

      {/* Mobile Card List View */}
      <div className="block md:hidden divide-y divide-slate-100 dark:divide-zinc-800">
        {bookings.map((b) => (
          <Link
            key={b.bookingId}
            to={`/bookings?search=${encodeURIComponent(b.bookingId)}`}
            className="block py-3 px-1 hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition active:bg-slate-100"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-800 dark:text-zinc-100 text-sm truncate">{b.customerName}</p>
                <p className="text-xs text-slate-500 dark:text-zinc-400 truncate mt-0.5">{b.trip}</p>
              </div>
              <span className="font-bold text-slate-800 dark:text-zinc-200 text-xs shrink-0">
                {formatCurrency(b.totalAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2 pt-1">
              <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono">
                {formatDate(b.departure)}
              </span>
              <TravelStatusBadge status={b.travelStatus} />
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
