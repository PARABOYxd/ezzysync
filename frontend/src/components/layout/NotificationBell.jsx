import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import * as followUpService from '../../services/followUpService';

const POLL_INTERVAL_MS = 60000;

export default function NotificationBell() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const load = () => {
    followUpService.getDueFollowUps({ overdue: true, dueToday: true }).then(setItems).catch(() => {});
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isOverdue = (dateStr) => new Date(dateStr) < new Date(new Date().toDateString());

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500"
        title="Follow-up reminders"
      >
        <Bell size={20} />
        {items.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
            {items.length > 9 ? '9+' : items.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="px-4 py-3 border-b border-slate-100">
            <h4 className="text-sm font-bold text-slate-800">Follow-up Reminders</h4>
            <p className="text-xs text-slate-400">{items.length} due today or overdue</p>
          </div>
          {items.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">All caught up! No pending follow-ups.</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {items.slice(0, 20).map((item) => (
                <Link
                  key={item.id}
                  to="/follow-ups"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 hover:bg-slate-50"
                >
                  <p className="text-sm font-semibold text-slate-700 truncate">{item.customer_name}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{item.note}</p>
                  <p className={`text-[10px] font-semibold mt-1 ${isOverdue(item.next_follow_up_date) ? 'text-red-500' : 'text-slate-400'}`}>
                    {item.source_type === 'booking' ? 'Booking' : 'Lead'} #{item.source_id} &middot; {new Date(item.next_follow_up_date).toLocaleDateString('en-IN')}
                    {isOverdue(item.next_follow_up_date) ? ' (Overdue)' : ' (Today)'}
                  </p>
                </Link>
              ))}
            </div>
          )}
          <Link to="/follow-ups" onClick={() => setOpen(false)} className="block text-center text-xs font-semibold text-brand-600 py-2.5 border-t border-slate-100 hover:bg-slate-50">
            View all follow-ups
          </Link>
        </div>
      )}
    </div>
  );
}
