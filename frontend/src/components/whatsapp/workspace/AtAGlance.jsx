import React from 'react';
import { Hourglass, CalendarClock, Inbox, ChevronRight, Plus } from 'lucide-react';
import { dueState, dueLabel, relativeDay, sinceLabel, DUE_STYLES } from './helpers';

const TYPE_ICON = { call: '📞', whatsapp: '💬', email: '✉️', meeting: '📅' };

/**
 * The three things an agent wants to know before typing a reply: is the
 * customer waiting on me, what did I promise to do next, and how fresh is
 * this lead. Stage and owner are not repeated here - they sit in the chat
 * header.
 */
export default function AtAGlance({ chat, waitingSince, onGoToTab }) {
  const due = dueState(chat.lead_next_follow_up_date);
  const hasLead = Boolean(chat.formatted_lead_id);
  const waitingLong = waitingSince && Date.now() - new Date(waitingSince).getTime() > 60 * 60 * 1000;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
      {/* Who owes the next message */}
      <div className={`flex items-center gap-2.5 px-3 py-2.5 ${waitingSince ? (waitingLong ? 'bg-rose-50/70 dark:bg-rose-950/30' : 'bg-amber-50/70 dark:bg-amber-950/30') : ''}`}>
        <Hourglass className={`w-4 h-4 shrink-0 ${waitingSince ? (waitingLong ? 'text-rose-500' : 'text-amber-500') : 'text-slate-300'}`} />
        <p className="text-xs text-slate-700 dark:text-slate-200">
          {waitingSince ? (
            <>
              <span className="font-bold">Customer is waiting</span> for your reply · {sinceLabel(waitingSince)}
            </>
          ) : (
            <span className="text-slate-500">You replied last - ball is in their court.</span>
          )}
        </p>
      </div>

      {/* What was promised next */}
      {hasLead && (
        <button
          type="button"
          onClick={() => onGoToTab('tasks')}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer"
        >
          <CalendarClock className={`w-4 h-4 shrink-0 ${due ? DUE_STYLES[due] : 'text-slate-300'}`} />
          <div className="min-w-0 flex-1">
            {due ? (
              <>
                <p className={`text-[11px] font-bold ${DUE_STYLES[due]}`}>
                  Next: {dueLabel(chat.lead_next_follow_up_date)}
                </p>
                {chat.next_follow_up_note && (
                  <p className="text-xs text-slate-700 dark:text-slate-200 truncate">
                    {TYPE_ICON[chat.next_follow_up_type] || '📌'} {chat.next_follow_up_note}
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-500 flex items-center gap-1">
                No follow-up set · <span className="font-semibold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-0.5"><Plus className="w-3 h-3" />Add one</span>
              </p>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
        </button>
      )}

      {/* How fresh the lead is */}
      {hasLead && chat.lead_created_at && (
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <Inbox className="w-4 h-4 shrink-0 text-slate-400" />
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Came via <span className="font-semibold">{chat.lead_source || 'Manual'}</span> · {relativeDay(chat.lead_created_at).replace(/^(Today|Yesterday)$/, (w) => w.toLowerCase())}
          </p>
        </div>
      )}
    </div>
  );
}
