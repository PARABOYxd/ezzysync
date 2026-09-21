import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Mail, Phone, ArrowRight } from 'lucide-react';
import * as customerService from '../services/customerService';
import { formatDate } from '../utils/formatters';
import { SkeletonTableRows } from '../components/common/Skeleton.jsx';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/common/Table.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Input from '../components/ui/Input.jsx';
import Pagination from '../components/common/Pagination.jsx';
import { useToast } from '../hooks/useToast.jsx';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalCount: 0, totalPages: 1, currentPage: 1, limit: 20 });
  const toast = useToast();

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInput]);

  useEffect(() => {
    setLoading(true);
    customerService.getCustomers({ search: debouncedSearch, page, limit: 20 })
      .then((data) => {
        setCustomers(data.customers || []);
        setPagination(data.pagination || { totalCount: 0, totalPages: 1, currentPage: 1, limit: 20 });
      })
      .catch(() => toast.error('Could not load customers.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, page]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
          <span>Customers</span>
          <span className="text-xs bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 font-semibold px-2 py-0.5 rounded-full">
            {pagination.totalCount}
          </span>
        </h1>
        <div className="w-full sm:max-w-xs">
          <Input icon={Search} placeholder="Search name, email, phone…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block">
          <Table>
            <Thead>
              <Th>Name</Th>
              <Th>Contact</Th>
              <Th>First Seen</Th>
              <Th>Last Active</Th>
              <Th className="text-right">Actions</Th>
            </Thead>
            <Tbody>
              {loading && <SkeletonTableRows rows={8} cols={5} />}
              {!loading && customers.map((c) => (
                <Tr key={c.id}>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-xs shrink-0">
                        {(c.name || '?').slice(0, 1).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-700 dark:text-zinc-200">{c.name || 'Unnamed Customer'}</span>
                    </div>
                  </Td>
                  <Td className="text-slate-500 dark:text-zinc-400 text-xs">
                    <div className="flex flex-col gap-0.5">
                      {c.email && <span className="flex items-center gap-1.5"><Mail size={11} /> {c.email}</span>}
                      <span className="flex items-center gap-1.5"><Phone size={11} /> {c.phone}</span>
                    </div>
                  </Td>
                  <Td className="text-slate-500 dark:text-zinc-400 text-xs">{formatDate(c.first_seen_at)}</Td>
                  <Td className="text-slate-500 dark:text-zinc-400 text-xs">{formatDate(c.last_activity_at)}</Td>
                  <Td>
                    <div className="flex justify-end">
                      <Link
                        to={`/customers/${c.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                      >
                        View Profile <ArrowRight size={12} />
                      </Link>
                    </div>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>

        {/* Mobile Cards View */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-zinc-800">
          {loading && (
            <div className="p-6 text-center text-slate-400 text-xs">
              <span className="animate-spin inline-block mr-2">⏳</span> Loading customer profiles...
            </div>
          )}
          {!loading && customers.map((c) => (
            <div key={c.id} className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-sm shrink-0">
                    {(c.name || '?').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-800 dark:text-zinc-100 text-sm truncate">{c.name || 'Unnamed Customer'}</h4>
                    <p className="text-[11px] text-slate-400 dark:text-zinc-500">Active: {formatDate(c.last_activity_at)}</p>
                  </div>
                </div>
                <Link
                  to={`/customers/${c.id}`}
                  className="px-3 py-1.5 rounded-lg bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300 text-xs font-semibold hover:bg-brand-100 transition inline-flex items-center gap-1 min-h-[36px] shrink-0"
                >
                  Profile <ArrowRight size={12} />
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-zinc-400 pt-1">
                {c.phone && (
                  <a href={`tel:${c.phone}`} className="flex items-center gap-1 hover:text-brand-600 font-mono">
                    <Phone size={12} className="text-brand-500" /> {c.phone}
                  </a>
                )}
                {c.email && (
                  <a href={`mailto:${c.email}`} className="flex items-center gap-1 hover:text-brand-600 truncate max-w-[200px]">
                    <Mail size={12} className="text-slate-400" /> {c.email}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
        {!loading && customers.length === 0 && (
          <EmptyState
            title="No customers yet"
            message="A customer profile is created automatically the first time someone books, gets quoted, or becomes a lead - nothing to set up here."
          />
        )}
      </div>

      {!loading && (
        <Pagination
          currentPage={page}
          totalPages={pagination.totalPages}
          totalCount={pagination.totalCount}
          limit={pagination.limit}
          itemName="customers"
          onPageChange={setPage}
          className="mt-4 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm"
        />
      )}
    </div>
  );
}
