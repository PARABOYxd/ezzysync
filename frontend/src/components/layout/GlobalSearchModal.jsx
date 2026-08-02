import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, Calendar, MapPin, Settings, Command } from 'lucide-react';
import * as leadService from '../../services/leadService';
import * as bookingService from '../../services/bookingService';

export default function GlobalSearchModal({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();
  const modalRef = useRef(null);
  const inputRef = useRef(null);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (open) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose]);

  // Perform search across APIs
  useEffect(() => {
    if (!query.trim()) {
      // Default Quick Actions when search is empty
      setResults([
        { id: 'q-dashboard', type: 'nav', title: 'Go to Dashboard', path: '/dashboard', icon: Command },
        { id: 'q-leads', type: 'nav', title: 'Manage Leads Pipeline', path: '/leads', icon: User },
        { id: 'q-bookings', type: 'nav', title: 'View Bookings Ledger', path: '/bookings', icon: Calendar },
        { id: 'q-itineraries', type: 'nav', title: 'Itineraries & Quotes Builder', path: '/quotations', icon: MapPin },
        { id: 'q-settings', type: 'nav', title: 'Open Settings', path: '/settings', icon: Settings },
      ]);
      setSelectedIndex(0);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSearching(true);
      try {
        const [leadData, bookingData] = await Promise.all([
          leadService.getLeads({ search: query, limit: 5 }).catch(() => ({ leads: [] })),
          bookingService.getBookings({ search: query, limit: 5 }).catch(() => ({ bookings: [] }))
        ]);

        const formattedLeads = (leadData.leads || []).map(l => ({
          id: `lead-${l.leadId}`,
          type: 'lead',
          title: l.customerName,
          subtitle: `Lead: ${l.interest || 'General Inquiry'} • ${l.stage}`,
          path: `/leads?search=${encodeURIComponent(l.customerName)}`,
          icon: User
        }));

        const formattedBookings = (bookingData.bookings || []).map(b => ({
          id: `booking-${b.bookingId}`,
          type: 'booking',
          title: b.customerName,
          subtitle: `Booking: ${b.trip || 'Tour Package'} • ${b.travelStatus}`,
          path: `/bookings?search=${encodeURIComponent(b.customerName)}`,
          icon: Calendar
        }));

        setResults([...formattedLeads, ...formattedBookings]);
        setSelectedIndex(0);
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  // Keyboard navigation inside result list
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(results.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % Math.max(results.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleSelect = (item) => {
    if (item.type === 'nav') {
      navigate(item.path);
    } else {
      // Go to page with search queries preset
      navigate(item.path);
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] p-4 bg-black/40 backdrop-blur-xs select-none">
      <div 
        ref={modalRef} 
        className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col animate-[scaleIn_0.15s_ease-out]"
      >
        {/* Search header input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/50">
          <Search size={16} className="text-slate-400 dark:text-zinc-500" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type command, lead name, or booking details..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm text-slate-800 dark:text-zinc-100 outline-none border-none placeholder:text-slate-400 dark:placeholder:text-zinc-500"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded shadow-xs">
            ESC
          </kbd>
        </div>

        {/* Results Container */}
        <div className="max-h-[320px] overflow-y-auto p-2 no-scrollbar">
          {searching ? (
            <div className="py-8 text-center text-xs text-slate-400 dark:text-zinc-500 flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></span>
              Searching records...
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-0.5">
              {results.map((item, idx) => {
                const Icon = item.icon;
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition ${
                      isSelected 
                        ? 'bg-orange-50 dark:bg-orange-950/20 text-[#F97316]' 
                        : 'hover:bg-slate-50 dark:hover:bg-zinc-800/50 text-slate-700 dark:text-zinc-300'
                    }`}
                  >
                    <Icon size={16} className={isSelected ? 'text-[#F97316]' : 'text-slate-400 dark:text-zinc-500'} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{item.title}</p>
                      {item.subtitle && (
                        <p className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-orange-600/75 dark:text-orange-400/75' : 'text-slate-400 dark:text-zinc-500'}`}>
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <span className="text-[10px] font-bold text-orange-600 bg-orange-100/50 px-2 py-0.5 rounded border border-orange-200/20">
                        Enter
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400 dark:text-zinc-500">
              No matching records found for "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
