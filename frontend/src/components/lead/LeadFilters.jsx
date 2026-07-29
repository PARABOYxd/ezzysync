import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';

const LEAD_STAGES = ['New', 'Contacted', 'Qualified', 'Negotiating', 'Won', 'Lost'];

export default function LeadFilters({ filters, onChange }) {
  const [localSearch, setLocalSearch] = useState(filters.search || '');

  useEffect(() => {
    setLocalSearch(filters.search || '');
  }, [filters.search]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== (filters.search || '')) {
        onChange({ ...filters, search: localSearch });
      }
    }, 600);
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSearch]);

  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value });

  return (
    <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between w-full">
      <div className="w-full lg:max-w-xs">
        <Input icon={Search} placeholder="Search by name, ID, email…" value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Select
          className="w-auto"
          inputClassName="w-auto"
          value={filters.stage}
          onChange={set('stage')}
          options={[{ value: '', label: 'All Stages' }, ...LEAD_STAGES]}
        />
        <Input className="w-auto" inputClassName="w-auto" placeholder="Assigned To" value={filters.assignedTo} onChange={set('assignedTo')} />
        <Select
          className="w-auto"
          inputClassName="w-auto"
          value={filters.sort}
          onChange={set('sort')}
          options={[{ value: 'newest', label: 'Newest First' }, { value: 'oldest', label: 'Oldest First' }]}
        />
      </div>
    </div>
  );
}
