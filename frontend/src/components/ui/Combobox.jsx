import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import Label from './Label.jsx';
import Helper from './Helper.jsx';

/**
 * Searchable single-select combobox - a real listbox pattern (not a native
 * <select>), for lists long/labeled enough that typing to filter beats
 * scrolling. Options: [{ value, label, hint? }].
 */
export default function Combobox({
  label,
  icon: Icon,
  options = [],
  value,
  onChange,
  placeholder = 'Search…',
  error,
  required = false,
  accentAsterisk = false,
  hint = '',
  disabled = false,
  className = 'w-full',
  inputClassName = '',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef(null);
  const searchRef = useRef(null);
  const listboxId = useRef(`combobox-listbox-${Math.random().toString(36).slice(2, 9)}`).current;

  const selected = options.find((o) => o.value === value) || null;
  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  useEffect(() => {
    if (!open) return undefined;
    const onClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(Math.max(0, options.findIndex((o) => o.value === value)));
      setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const commit = (opt) => {
    onChange?.(opt.value);
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[activeIndex]) commit(filtered[activeIndex]);
    }
  };

  return (
    <div className={className} ref={rootRef}>
      <Label required={required} accent={accentAsterisk}>{label}</Label>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((v) => !v)}
          onKeyDown={handleKeyDown}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          className={`input h-11 rounded-xl text-left flex items-center justify-between gap-2 cursor-pointer
            disabled:cursor-not-allowed disabled:opacity-60
            ${Icon ? 'pl-10' : ''}
            ${error ? 'border-red-400' : ''}
            ${open ? 'ring-2 ring-[var(--primary)]/20 border-[var(--primary)]' : ''}
            ${inputClassName}`}
        >
          {Icon && <Icon size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />}
          <span className={`truncate ${selected ? 'text-[var(--text-primary)] font-medium' : 'text-slate-400'}`}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown size={14} className={`shrink-0 text-slate-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute z-20 mt-1.5 w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden">
            <div className="relative border-b border-[var(--border)]">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
                onKeyDown={handleKeyDown}
                placeholder="Type to filter…"
                className="w-full h-11 pl-10 pr-3 text-sm bg-transparent outline-none text-[var(--text-primary)] placeholder:text-slate-400"
              />
            </div>
            <ul id={listboxId} role="listbox" className="max-h-56 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <li className="px-3.5 py-3 text-xs text-[var(--text-secondary)]">No matches found.</li>
              ) : (
                filtered.map((opt, idx) => {
                  const isSelected = opt.value === value;
                  const isActive = idx === activeIndex;
                  return (
                    <li
                      key={opt.value || `empty-${idx}`}
                      id={`${listboxId}-opt-${idx}`}
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => commit(opt)}
                      className={`flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm cursor-pointer transition-colors duration-100
                        ${isActive ? 'bg-[var(--primary)]/10' : ''}
                        ${isSelected ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-primary)]'}`}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected && <Check size={14} className="text-[var(--primary)] shrink-0" />}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>
      <Helper error={!!error}>{error || hint}</Helper>
    </div>
  );
}
