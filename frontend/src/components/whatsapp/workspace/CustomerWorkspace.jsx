import React, { useState } from 'react';
import { X, Briefcase, Plane, Wallet, ListChecks } from 'lucide-react';
import LeadTab from './LeadTab.jsx';
import TripTab from './TripTab.jsx';
import MoneyTab from './MoneyTab.jsx';
import TasksTab from './TasksTab.jsx';
import { dueState } from './helpers';

const TABS = [
  { key: 'lead', label: 'Lead', icon: Briefcase },
  { key: 'trip', label: 'Trip', icon: Plane },
  { key: 'money', label: 'Money', icon: Wallet },
  { key: 'tasks', label: 'Tasks', icon: ListChecks },
];

/**
 * Everything about the person in the open chat, so the agent never has to
 * leave the conversation: lead stage/owner/details, quotes and bookings,
 * payments, follow-ups and notes.
 *
 * Each tab loads its own data when it is shown, so opening a chat costs one
 * request for the visible tab rather than all of them.
 */
export default function CustomerWorkspace({ chat, onClose, ...props }) {
  // Kept across chats on purpose: an agent working through payments stays on Money.
  const [tab, setTab] = useState('lead');

  const due = dueState(chat.lead_next_follow_up_date);
  const badges = {
    money: Number(chat.remaining || 0) > 0 ? '₹' : null,
    tasks: due === 'overdue' || due === 'today' ? '!' : null,
  };

  return (
    <div className="w-full md:w-80 h-full border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0">
      {/* Who */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{chat.customer_name || 'Guest'}</p>
            <p className="text-xs text-slate-500 mt-0.5">+{chat.phone}</p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="md:hidden p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              aria-label="Close customer panel"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div role="tablist" aria-label="Customer details" className="mt-3 grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                id={`ws-tab-${key}`}
                aria-selected={active}
                aria-controls="ws-panel"
                onClick={() => setTab(key)}
                className={`relative flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                  active
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {badges[key] && (
                  <span className={`absolute top-0.5 right-1 min-w-[14px] h-[14px] px-0.5 rounded-full text-[9px] leading-[14px] text-white ${key === 'tasks' && due === 'overdue' ? 'bg-rose-500' : 'bg-amber-500'}`}>
                    {badges[key]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div id="ws-panel" role="tabpanel" aria-labelledby={`ws-tab-${tab}`} className="flex-1 min-h-0 overflow-y-auto p-4">
        {tab === 'lead' && <LeadTab chat={chat} onGoToTab={setTab} {...props} />}
        {tab === 'trip' && <TripTab chat={chat} {...props} />}
        {tab === 'money' && <MoneyTab chat={chat} {...props} />}
        {tab === 'tasks' && <TasksTab chat={chat} {...props} />}
      </div>
    </div>
  );
}
