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
              <Link to="/bookings" className="font-medium text-slate-700 dark:text-zinc-200 hover:text-brand-600 dark:hover:text-brand-400">{b.customerName}</Link>
            </Td>
            <Td className="text-slate-500 dark:text-zinc-400">{b.trip}</Td>
            <Td className="text-slate-500 dark:text-zinc-400">{formatDate(b.departure)}</Td>
            <Td className="text-slate-500 dark:text-zinc-400">{formatCurrency(b.totalAmount)}</Td>
            <Td><TravelStatusBadge status={b.travelStatus} /></Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
