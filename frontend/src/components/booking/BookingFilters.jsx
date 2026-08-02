import React, { useState, useEffect } from 'react';
import { Search, Download } from 'lucide-react';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';

const TRAVEL_STATUSES = ['Booked', 'Completed', 'Cancelled', 'Refunded', 'Postponed'];

function DateRangeField({ label, from, to, onFromChange, onToChange }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-0.5">{label}</span>
      <div className="flex items-center gap-1">
        <Input type="date" className="w-auto" inputClassName="w-auto" title={`${label} from`} value={from || ''} onChange={onFromChange} />
        <span className="text-[10px] text-slate-300">to</span>
        <Input type="date" className="w-auto" inputClassName="w-auto" title={`${label} to`} value={to || ''} onChange={onToChange} />
      </div>
    </div>
  );
}

export default function BookingFilters({ filters, onChange, onExport }) {
  const [localSearch, setLocalSearch] = useState(filters.search || '');

  // Sync external search updates (e.g. page resets) to local input
  useEffect(() => {
    setLocalSearch(filters.search || '');
  }, [filters.search]);

  // Debounced execution wrapper
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== (filters.search || '')) {
        onChange({ ...filters, search: localSearch });
      }
    }, 600); // 600ms debounce
    return () => clearTimeout(handler);
  }, [localSearch, onChange, filters]);

  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value });

  return (
    <div className="flex flex-col lg:flex-row gap-3 lg:items-start lg:justify-between w-full">
      <div className="w-full lg:max-w-xs">
        <Input
          icon={Search}
          placeholder="Search by name, ID, email…"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <Select
          className="w-auto"
          inputClassName="w-auto"
          value={filters.status}
          onChange={set('status')}
          options={[{ value: '', label: 'All Statuses' }, ...TRAVEL_STATUSES]}
        />
        <Input className="w-auto" inputClassName="w-auto" placeholder="Trip" value={filters.trip} onChange={set('trip')} />
        <Input className="w-auto" inputClassName="w-auto" placeholder="Team Member" value={filters.teamMember} onChange={set('teamMember')} />

        <DateRangeField
          label="Departure"
          from={filters.departureFrom}
          to={filters.departureTo}
          onFromChange={set('departureFrom')}
          onToChange={set('departureTo')}
        />
        <DateRangeField
          label="Created"
          from={filters.createdFrom}
          to={filters.createdTo}
          onFromChange={set('createdFrom')}
          onToChange={set('createdTo')}
        />

        <Select
          className="w-auto"
          inputClassName="w-auto"
          value={filters.sort}
          onChange={set('sort')}
          options={[{ value: 'newest', label: 'Newest First' }, { value: 'oldest', label: 'Oldest First' }]}
        />
        <Button variant="ghost" onClick={onExport}>
          <Download size={16} /> Export CSV
        </Button>
      </div>
    </div>
  );
}
