import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import Label from './Label.jsx';
import Helper from './Helper.jsx';

export default function DatePicker({
  label,
  value, // string 'YYYY-MM-DD' or array ['YYYY-MM-DD', 'YYYY-MM-DD']
  onChange,
  range = false,
  required = false,
  error,
  hint,
  placeholder = 'Select date',
  className = 'w-full',
}) {
  const [open, setOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDateLabel = () => {
    if (!value) return '';
    if (range && Array.isArray(value)) {
      const [start, end] = value;
      if (!start) return '';
      return end ? `${start} to ${end}` : `${start} ...`;
    }
    return typeof value === 'string' ? value : '';
  };

  const daysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const startDayOfWeek = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateClick = (dayString) => {
    if (range) {
      const currentRange = Array.isArray(value) ? value : [];
      if (currentRange.length === 0 || currentRange.length === 2) {
        onChange([dayString, '']);
      } else {
        const [start] = currentRange;
        if (dayString < start) {
          onChange([dayString, '']);
        } else {
          onChange([start, dayString]);
          setOpen(false);
        }
      }
    } else {
      onChange(dayString);
      setOpen(false);
    }
  };

  const isSelected = (dayString) => {
    if (!value) return false;
    if (range && Array.isArray(value)) {
      const [start, end] = value;
      if (end) {
        return dayString >= start && dayString <= end;
      }
      return dayString === start;
    }
    return value === dayString;
  };

  const isToday = (day, month, year) => {
    const today = new Date();
    return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const totalDays = daysInMonth(currentMonth);
  const firstDayIndex = startDayOfWeek(currentMonth);

  const daysArray = [];
  for (let i = 0; i < firstDayIndex; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    daysArray.push(d);
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <Label required={required}>{label}</Label>
      
      <div 
        onClick={() => setOpen(!open)}
        className={`input flex items-center justify-between cursor-pointer border ${
          error ? 'border-red-500' : 'border-slate-200 dark:border-zinc-800'
        } bg-[var(--bg-card)] px-3 text-xs h-9 rounded-lg select-none`}
      >
        <span className={formatDateLabel() ? 'text-slate-800 dark:text-zinc-200 font-medium font-mono' : 'text-slate-400'}>
          {formatDateLabel() || placeholder}
        </span>
        <div className="flex items-center gap-1">
          {value && (
            <X 
              size={12} 
              className="text-slate-400 hover:text-slate-600 cursor-pointer" 
              onClick={(e) => {
                e.stopPropagation();
                onChange(range ? ['', ''] : '');
              }} 
            />
          )}
          <CalendarIcon size={14} className="text-slate-400 shrink-0" />
        </div>
      </div>

      {open && (
        <div className="absolute left-0 mt-1.5 z-50 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl p-3 w-[260px] text-[var(--text-main)] animate-fade-in select-none">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={handlePrevMonth} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500">
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold font-mono">
              {monthNames[month]} {year}
            </span>
            <button type="button" onClick={handleNextMonth} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 gap-1 text-[10px] font-bold text-center text-slate-400 mb-1">
            <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {daysArray.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} />;
              }
              const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const selected = isSelected(dStr);
              const today = isToday(day, month, year);
              
              return (
                <button
                  key={dStr}
                  type="button"
                  onClick={() => handleDateClick(dStr)}
                  className={`w-7 h-7 text-xs rounded-lg flex items-center justify-center transition font-mono ${
                    selected 
                      ? 'bg-[#F97316] text-white font-bold' 
                      : today 
                        ? 'border border-[#F97316] text-[#F97316] font-semibold' 
                        : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Helper error={!!error}>{error || hint}</Helper>
    </div>
  );
}
