import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, Check, X, Loader2 } from 'lucide-react';
import Label from './Label.jsx';
import Helper from './Helper.jsx';

/**
 * Normalizes options into [{ value, label, hint? }]
 */
function normalizeOptions(options) {
  if (!Array.isArray(options)) return [];
  return options.map((opt) => {
    if (typeof opt === 'object' && opt !== null) {
      return {
        value: opt.value !== undefined ? opt.value : '',
        label: opt.label !== undefined ? String(opt.label) : String(opt.value || ''),
        hint: opt.hint || opt.subtext || '',
      };
    }
    return {
      value: opt !== undefined ? opt : '',
      label: String(opt || ''),
      hint: '',
    };
  });
}

/**
 * Enterprise Searchable Combobox with On-Scroll Pagination
 * - Searches by label, value, and hint
 * - On-scroll pagination loads 10 items at a time
 * - Shows pagination progress and allows manual "Load +10 more"
 * - Keyboard navigation (Arrows, Enter, Escape)
 */
export default function Combobox({
  label,
  icon: Icon,
  options = [],
  value,
  onChange,
  placeholder = 'Select…',
  error,
  required = false,
  accentAsterisk = false,
  hint = '',
  disabled = false,
  className = 'w-full',
  inputClassName = '',
  name = '',
  pageSize = 10,
  searchable = true,
  allowClear = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [visibleLimit, setVisibleLimit] = useState(pageSize);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const listboxId = useRef(`combobox-listbox-${Math.random().toString(36).slice(2, 9)}`).current;

  const normalized = normalizeOptions(options);

  // Selected item
  const selected = normalized.find((o) => String(o.value) === String(value)) || null;

  // Filtered items based on query
  const q = query.trim().toLowerCase();
  const filtered = q
    ? normalized.filter((o) =>
        o.label.toLowerCase().includes(q) ||
        String(o.value).toLowerCase().includes(q) ||
        (o.hint && o.hint.toLowerCase().includes(q))
      )
    : normalized;

  // Paginated slice
  const displayed = filtered.slice(0, visibleLimit);

  // Close on outside click
  useEffect(() => {
    if (!open) return undefined;
    const onClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  // When opening, reset search and pagination
  useEffect(() => {
    if (open) {
      setQuery('');
      setVisibleLimit(pageSize);
      const selIdx = normalized.findIndex((o) => String(o.value) === String(value));
      setActiveIndex(selIdx >= 0 ? selIdx : 0);
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset pagination when search query changes
  useEffect(() => {
    setVisibleLimit(pageSize);
    setActiveIndex(0);
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [query, pageSize]);

  const commit = (opt) => {
    const optVal = opt ? opt.value : '';
    const fakeEvent = {
      target: { name, value: optVal },
      currentTarget: { name, value: optVal },
      preventDefault: () => {},
      stopPropagation: () => {},
    };
    onChange?.(optVal, fakeEvent);
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    commit({ value: '' });
  };

  // On-Scroll Pagination: reveal next chunk of 10 items when reaching bottom
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 35) {
      if (visibleLimit < filtered.length) {
        setVisibleLimit((prev) => Math.min(prev + pageSize, filtered.length));
      }
    }
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
      setActiveIndex((i) => {
        const next = Math.min(displayed.length - 1, i + 1);
        // If near end of displayed list, load more on keyboard down
        if (next >= displayed.length - 2 && visibleLimit < filtered.length) {
          setVisibleLimit((prev) => Math.min(prev + pageSize, filtered.length));
        }
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (displayed[activeIndex]) commit(displayed[activeIndex]);
    }
  };

  const showSearch = searchable || normalized.length > 10;
  const showPagination = filtered.length > pageSize;

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
          className={`input h-10 min-h-[40px] rounded-xl text-left flex items-center justify-between gap-2 cursor-pointer bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 border border-slate-200 dark:border-zinc-700
            disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-slate-50 dark:disabled:bg-zinc-900
            ${Icon ? 'pl-9' : 'pl-3'}
            ${error ? 'border-red-400 focus:ring-red-400' : 'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10'}
            ${open ? 'ring-2 ring-brand-500/20 border-brand-500' : ''}
            ${inputClassName}`}
        >
          {Icon && (
            <Icon size={16} className="absolute left-3 text-slate-400 pointer-events-none" />
          )}
          <span className={`truncate text-sm flex-1 ${selected && selected.value !== '' ? 'text-slate-800 dark:text-zinc-100 font-medium' : 'text-slate-400 dark:text-zinc-500'}`}>
            {selected && selected.value !== '' ? selected.label : placeholder}
          </span>
          <div className="flex items-center gap-1 shrink-0 text-slate-400">
            {allowClear && selected && selected.value !== '' && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                className="p-1 hover:text-slate-600 dark:hover:text-zinc-200 transition"
                title="Clear selection"
              >
                <X size={13} />
              </span>
            )}
            <ChevronDown size={14} className={`transition-transform duration-150 ${open ? 'rotate-180 text-brand-500' : ''}`} />
          </div>
        </button>

        {open && (
          <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-72 animate-in fade-in zoom-in-95 duration-100">
            {/* Search Input when items > 10 or searchable */}
            {showSearch && (
              <div className="relative border-b border-slate-100 dark:border-zinc-800 p-2 shrink-0 bg-slate-50/50 dark:bg-zinc-800/40">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Search ${normalized.length} options…`}
                  className="w-full h-8 pl-8 pr-7 text-xs bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg outline-none focus:border-brand-500 text-slate-800 dark:text-zinc-100 placeholder:text-slate-400"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            )}

            {/* Scrollable list with on-scroll pagination */}
            <ul
              ref={listRef}
              id={listboxId}
              role="listbox"
              onScroll={handleScroll}
              className="overflow-y-auto py-1 flex-1 divide-y divide-slate-50 dark:divide-zinc-800/40 custom-scrollbar"
              style={{ maxHeight: '200px' }}
            >
              {filtered.length === 0 ? (
                <li className="px-4 py-4 text-xs text-center text-slate-400 dark:text-zinc-500">
                  No matching options found.
                </li>
              ) : (
                displayed.map((opt, idx) => {
                  const isSelected = String(opt.value) === String(value);
                  const isActive = idx === activeIndex;
                  return (
                    <li
                      key={`${opt.value}-${idx}`}
                      id={`${listboxId}-opt-${idx}`}
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => commit(opt)}
                      className={`flex items-center justify-between gap-2 px-3.5 py-2 text-xs cursor-pointer transition-colors duration-75
                        ${isActive ? 'bg-brand-50/70 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300' : 'text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800/60'}
                        ${isSelected ? 'font-bold text-brand-600 dark:text-brand-400 bg-brand-50/40 dark:bg-brand-950/20' : ''}`}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="truncate block">{opt.label || opt.value || '--'}</span>
                        {opt.hint && (
                          <span className="text-[10px] text-slate-400 dark:text-zinc-500 block truncate mt-0.5">
                            {opt.hint}
                          </span>
                        )}
                      </div>
                      {isSelected && <Check size={13} className="text-brand-600 dark:text-brand-400 shrink-0 ml-1.5" />}
                    </li>
                  );
                })
              )}
            </ul>

            {/* Pagination Status & Quick Load Footer (when data > pageSize) */}
            {showPagination && (
              <div className="px-3 py-1.5 bg-slate-50 dark:bg-zinc-800/80 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-[10px] text-slate-500 dark:text-zinc-400 shrink-0">
                <span>
                  Showing <strong className="font-semibold text-slate-700 dark:text-zinc-200">{displayed.length}</strong> of {filtered.length}
                </span>
                {visibleLimit < filtered.length ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setVisibleLimit((prev) => Math.min(prev + pageSize, filtered.length));
                    }}
                    className="font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Load +{Math.min(pageSize, filtered.length - visibleLimit)} more</span>
                  </button>
                ) : (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">All loaded</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <Helper error={!!error}>{error || hint}</Helper>
    </div>
  );
}
