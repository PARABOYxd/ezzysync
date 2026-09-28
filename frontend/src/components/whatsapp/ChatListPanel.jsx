import React, { useState } from 'react';
import { MessageSquare, Search, User, AlertCircle, PlusCircle, Instagram, Bot, Flame, Clock } from 'lucide-react';
import { formatDate } from '../../utils/whatsappMessageFormatters';
import { dueState, STAGE_STYLES } from './workspace/helpers';

/**
 * Work queues, not just a list. Each one answers a question an agent asks at
 * the start of a shift: who is waiting, which chats are mine, who did I
 * promise to call today, which leads are hot.
 */
const FILTERS = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'unread', label: 'Unread', match: (c) => c.unread_count > 0 || c.needs_human },
  { key: 'mine', label: 'Mine', match: (c, me) => Boolean(me) && c.lead_assigned_to === me },
  { key: 'due', label: 'Due', match: (c) => ['overdue', 'today'].includes(dueState(c.lead_next_follow_up_date)) },
  { key: 'hot', label: 'Hot', match: (c) => c.lead_priority === 'Hot' },
];

export default function ChatListPanel({
  chats,
  selectedChat,
  searchQuery,
  onSearchChange,
  sessionStatus,
  cloudApiConfigured,
  onSelectChat,
  onStartNewChat,
  typingChats = {},
  currentUserName = '',
}) {
  const [filter, setFilter] = useState('all');

  // True when the search query looks like a phone number (≥8 digits)
  const isPhoneSearch = /^[\d\s+()-]{8,}$/.test(searchQuery.trim());

  const active = FILTERS.find((f) => f.key === filter) || FILTERS[0];
  const filteredChats = chats.filter((c) => active.match(c, currentUserName));
  const counts = Object.fromEntries(FILTERS.map((f) => [f.key, chats.filter((c) => f.match(c, currentUserName)).length]));

  return (
    <div className="w-full md:w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0 h-full">
      {/* Search + queues */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-800 space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="search"
            placeholder="Search name, phone or message…"
            aria-label="Search chats"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-base sm:text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-200"
          />
        </div>

        <div className="grid grid-cols-5 gap-1" role="tablist" aria-label="Chat filters">
          {FILTERS.map((f) => {
            const isActive = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setFilter(f.key)}
                title={`${f.label} (${counts[f.key]})`}
                className={`flex flex-col items-center justify-center py-1 rounded-lg leading-tight transition cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span className="text-[11px] font-bold">{f.label}</span>
                <span className={`text-[10px] font-semibold ${isActive ? 'opacity-80' : counts[f.key] && f.key !== 'all' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                  {counts[f.key]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
        {filteredChats.length === 0 ? (
          <div className="text-center py-12 px-4 text-slate-400">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
            <p className="text-xs font-medium">
              {filter === 'all' ? 'No conversations found.' : `Nothing in "${active.label}" right now.`}
            </p>
            {filter !== 'all' ? (
              <button type="button" onClick={() => setFilter('all')} className="mt-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer">
                Show all chats
              </button>
            ) : isPhoneSearch && (sessionStatus === 'connected' || cloudApiConfigured) ? (
              <button
                type="button"
                onClick={() => onStartNewChat(searchQuery.trim())}
                className="mt-3 flex items-center gap-1.5 mx-auto px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow transition-colors cursor-pointer"
              >
                <PlusCircle size={13} />
                Start New Chat with {searchQuery.trim()}
              </button>
            ) : (
              <p className="text-[11px] mt-1 text-slate-500">
                New WhatsApp messages appear here automatically.
              </p>
            )}
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isSelected = selectedChat?.id === chat.id;
            const isIg = chat.phone?.startsWith('IG_') || chat.chat_id?.startsWith('IG_');
            const igHandle = isIg ? chat.phone.replace('IG_', '') : '';
            const due = dueState(chat.lead_next_follow_up_date);
            const stage = chat.lead_stage;

            return (
              <button
                key={chat.id}
                type="button"
                onClick={() => onSelectChat(chat.id)}
                aria-current={isSelected ? 'true' : undefined}
                className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                  isSelected
                    ? isIg
                      ? 'bg-pink-50/70 dark:bg-pink-950/30 border-l-4 border-pink-500'
                      : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-l-4 border-emerald-500'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 border-l-4 border-transparent'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    isIg
                      ? 'bg-gradient-to-tr from-pink-500 to-rose-600 text-white shadow-xs'
                      : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  {isIg ? (
                    <Instagram className="w-4 h-4 text-white" />
                  ) : chat.customer_name ? (
                    chat.customer_name.charAt(0).toUpperCase()
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-xs truncate ${chat.unread_count > 0 ? 'font-bold' : 'font-semibold'} text-slate-900 dark:text-white`}>
                      {isIg ? (chat.customer_name || `@${igHandle}`) : (chat.customer_name || `+${chat.phone}`)}
                    </h4>
                    <span className={`text-[10px] shrink-0 ${chat.unread_count > 0 ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                      {formatDate(chat.last_message_timestamp)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-0.5">
                    {typingChats && typingChats[chat.id] ? (
                      <p className="flex-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 animate-pulse">
                        <Bot size={13} className="shrink-0" />
                        <span>AI is typing…</span>
                      </p>
                    ) : (
                      <p className={`flex-1 text-[11px] truncate ${chat.unread_count > 0 ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>
                        {chat.last_message || 'Message'}
                      </p>
                    )}
                    {chat.needs_human && (
                      <span className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-[10px] font-bold" title="AI escalated this chat - it needs a person">
                        <AlertCircle className="w-3 h-3" /> You
                      </span>
                    )}
                    {chat.unread_count > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {chat.unread_count}
                      </span>
                    )}
                  </div>

                  {/* CRM context at a glance */}
                  {(stage || chat.booking_trip || isIg || due || chat.lead_priority === 'Hot') && (
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      {isIg && (
                        <span className="px-1.5 py-0.5 text-[9px] font-extrabold rounded bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 flex items-center gap-1">
                          <Instagram size={9} /> Instagram
                        </span>
                      )}
                      {stage && (
                        <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded border ${STAGE_STYLES[stage] || STAGE_STYLES.New}`}>
                          {stage}
                        </span>
                      )}
                      {chat.lead_priority === 'Hot' && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 flex items-center gap-0.5">
                          <Flame size={9} /> Hot
                        </span>
                      )}
                      {(due === 'overdue' || due === 'today') && (
                        <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded flex items-center gap-0.5 ${due === 'overdue' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'}`}>
                          <Clock size={9} /> {due === 'overdue' ? 'Overdue' : 'Due today'}
                        </span>
                      )}
                      {chat.booking_trip && (
                        <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 truncate max-w-[140px]" title={chat.booking_trip}>
                          ✈ {chat.booking_trip}
                        </span>
                      )}
                      {chat.lead_assigned_to && (
                        <span className="text-[9px] text-slate-400 truncate max-w-[90px]" title={`Owner: ${chat.lead_assigned_to}`}>
                          · {chat.lead_assigned_to === currentUserName ? 'You' : chat.lead_assigned_to.split(' ')[0]}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
