import React, { useState, useEffect, useRef } from 'react';
import { Search, Download, X, Filter, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import TeamMemberSelect from '../common/TeamMemberSelect.jsx';

const TRAVEL_STATUSES = ['Confirming', 'Booked', 'Completed', 'Cancelled'];

function DateRangeField({ label, from, to, onFromChange, onToChange, onClear }) {
  const hasValue = from || to;
  return (
    <div className="flex flex-col gap-1 w-full sm:w-auto">
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</span>
        {hasValue && (
          <button 
            type="button"
            onClick={onClear}
            className="text-[10px] text-brand-600 hover:text-brand-700 font-medium"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex items-center gap-1 w-full sm:w-auto">
        <Input type="date" className="flex-1 sm:w-auto" inputClassName="w-full sm:w-auto h-8 text-xs bg-white dark:bg-zinc-800" title={`${label} from`} value={from || ''} onChange={onFromChange} />
        <span className="text-[10px] text-slate-300">to</span>
        <Input type="date" className="flex-1 sm:w-auto" inputClassName="w-full sm:w-auto h-8 text-xs bg-white dark:bg-zinc-800" title={`${label} to`} value={to || ''} onChange={onToChange} />
      </div>
    </div>
  );
}

export default function BookingFilters({ filters, onChange, onExport }) {
  const [localSearch, setLocalSearch] = useState(filters.search || '');
  const [showFilters, setShowFilters] = useState(false);

  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    setLocalSearch(filters.search || '');
  }, [filters.search]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== (filtersRef.current.search || '')) {
        onChange({ ...filtersRef.current, search: localSearch });
      }
    }, 350);
    return () => clearTimeout(handler);
  }, [localSearch, onChange]);

  const set = (key) => (e) => onChange({ ...filtersRef.current, [key]: e.target.value });

  const selectedStatuses = typeof filters.status === 'string' && filters.status
    ? filters.status.split(',').map((s) => s.trim()).filter(Boolean)
    : (Array.isArray(filters.status) ? filters.status : []);

  const toggleStatus = (st) => {
    if (!st) {
      onChange({ ...filters, status: '' });
      return;
    }
    let updated;
    if (selectedStatuses.includes(st)) {
      updated = selectedStatuses.filter((s) => s !== st);
    } else {
      updated = [...selectedStatuses, st];
    }
    onChange({ ...filters, status: updated.join(',') });
  };

  const activeCount = [
    Boolean(selectedStatuses.length),
    Boolean(filters.trip),
    Boolean(filters.teamMember),
    Boolean(filters.departureFrom || filters.departureTo || filters.travelDateFrom || filters.travelDateTo),
    Boolean(filters.createdFrom || filters.createdTo),
    filters.sort && filters.sort !== 'newest',
  ].filter(Boolean).length;

  const handleClearAll = () => {
    setLocalSearch('');
    onChange({
      ...filters,
      search: '',
      status: '',
      trip: '',
      teamMember: '',
      departureFrom: '',
      departureTo: '',
      travelDateFrom: '',
      travelDateTo: '',
      createdFrom: '',
      createdTo: '',
      sort: 'newest',
    });
  };

  return (
    <div className="w-full">
      {/* Sleek Single-Line Command Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 w-full">
        {/* Left: Search input + Quick Status Pills */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
          {/* Search Box */}
          <div className="relative w-full sm:w-64 lg:w-72">
            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              className="input pl-8 pr-7 h-8 text-xs w-full bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700/50 focus:bg-white border-slate-200 dark:border-zinc-700"
              placeholder="Search by customer, booking ID, phone…"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => {
                  setLocalSearch('');
                  onChange({ ...filters, search: '' });
                }}
                className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Quick Status Pills (Multi-Select Supported) */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => toggleStatus('')}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedStatuses.length === 0
                  ? 'bg-slate-800 text-white dark:bg-zinc-200 dark:text-zinc-900 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-400'
              }`}
            >
              All Statuses
            </button>
            {TRAVEL_STATUSES.map((st) => {
              const isActive = selectedStatuses.includes(st);
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => toggleStatus(st)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-400'
                  }`}
                >
                  {st}
                  {isActive && <span className="text-[9px] opacity-80">✕</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Filters Slider Toggle, Export & Reset */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {activeCount > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="h-8 px-2 text-[11px] text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 flex items-center gap-1 transition"
              title="Reset all filters"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            className={`h-8 px-2.5 text-xs rounded-lg border font-medium flex items-center gap-1.5 transition ${
              showFilters || activeCount > 0
                ? 'bg-brand-50 border-brand-300 text-brand-700 dark:bg-brand-950/40 dark:border-brand-800 dark:text-brand-300 shadow-xs'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700'
            }`}
            title="Toggle advanced filter slider"
          >
            <Filter size={13} className={activeCount > 0 ? 'text-brand-600' : 'text-slate-400 dark:text-zinc-400'} />
            <span>Filters</span>
            {activeCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center">
                {activeCount}
              </span>
            )}
            {showFilters ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {onExport && (
            <button
              type="button"
              onClick={onExport}
              className="btn-secondary h-8 px-2.5 text-xs gap-1"
              title="Export bookings CSV"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Upper se Slider (Collapsible Top Filter Panel) */}
      {showFilters && (
        <div className="mt-2.5 p-3.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-xl flex flex-wrap items-end gap-3 animate-fade-in shadow-xs">
          <div className="w-40">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Status</label>
            <Select
              className="w-full"
              inputClassName="w-full h-8 text-xs py-0 bg-white dark:bg-zinc-800"
              value={filters.status}
              onChange={set('status')}
              options={[{ value: '', label: 'All Statuses' }, ...TRAVEL_STATUSES]}
            />
          </div>

          <div className="w-40">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Trip Name</label>
            <Input
              className="w-full"
              inputClassName="w-full h-8 text-xs bg-white dark:bg-zinc-800"
              placeholder="e.g. Bali, Dubai…"
              value={filters.trip || ''}
              onChange={set('trip')}
            />
          </div>

          <div className="w-44">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Assigned Agent</label>
            <TeamMemberSelect
              value={filters.teamMember}
              onChange={(name) => onChange({ ...filters, teamMember: name })}
              className="w-full"
            />
          </div>

          <DateRangeField
            label="Departure Date"
            from={filters.departureFrom || filters.travelDateFrom}
            to={filters.departureTo || filters.travelDateTo}
            onFromChange={(e) => onChange({ ...filters, departureFrom: e.target.value, travelDateFrom: e.target.value })}
            onToChange={(e) => onChange({ ...filters, departureTo: e.target.value, travelDateTo: e.target.value })}
            onClear={() => onChange({ ...filters, departureFrom: '', departureTo: '', travelDateFrom: '', travelDateTo: '' })}
          />

          <DateRangeField
            label="Created"
            from={filters.createdFrom}
            to={filters.createdTo}
            onFromChange={set('createdFrom')}
            onToChange={set('createdTo')}
            onClear={() => onChange({ ...filters, createdFrom: '', createdTo: '' })}
          />

          <div className="w-36">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Sort Order</label>
            <Select
              className="w-full"
              inputClassName="w-full h-8 text-xs py-0 bg-white dark:bg-zinc-800"
              value={filters.sort}
              onChange={set('sort')}
              options={[{ value: 'newest', label: 'Newest First' }, { value: 'oldest', label: 'Oldest First' }]}
            />
          </div>

          <div className="flex items-center gap-2 ml-auto self-end">
            <button
              type="button"
              onClick={handleClearAll}
              className="btn-secondary h-8 px-2.5 text-xs gap-1"
            >
              <RotateCcw size={12} /> Clear
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(false)}
              className="btn-ghost h-8 px-2.5 text-xs text-slate-500 hover:text-slate-700 dark:text-zinc-400"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
