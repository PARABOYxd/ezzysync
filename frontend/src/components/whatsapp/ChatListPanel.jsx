import React from 'react';
import { MessageSquare, Search, User, AlertCircle, PlusCircle, Instagram, Bot } from 'lucide-react';
import { formatDate } from '../../utils/whatsappMessageFormatters';

export default function ChatListPanel({
  chats,
  selectedChat,
  searchQuery,
  onSearchChange,
  platformFilter,
  setPlatformFilter,
  sessionStatus,
  cloudApiConfigured,
  onSelectChat,
  onStartNewChat,
  typingChats = {},
}) {
  // True when the search query looks like a phone number (≥8 digits)
  const isPhoneSearch = /^[\d\s+()-]{8,}$/.test(searchQuery.trim());

  const filteredChats = chats.filter((c) => {
    const isIg = c.phone?.startsWith('IG_') || c.chat_id?.startsWith('IG_');
    if (platformFilter === 'whatsapp') return !isIg;
    if (platformFilter === 'instagram') return isIg;
    return true;
  });

  return (
    <div className="w-full md:w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0 h-full">
      {/* Search Bar */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-800 space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search chats by name, phone or IG handle..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-200"
          />
        </div>

        {/* Platform Filter Pills */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setPlatformFilter('all')}
            className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition ${
              platformFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            All ({chats.length})
          </button>
          <button
            type="button"
            onClick={() => setPlatformFilter('whatsapp')}
            className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition flex items-center justify-center gap-1 ${
              platformFilter === 'whatsapp'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
            }`}
          >
            <MessageSquare size={10} />
            WhatsApp ({chats.filter((c) => !c.phone?.startsWith('IG_')).length})
          </button>

        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
        {filteredChats.length === 0 ? (
          <div className="text-center py-12 px-4 text-slate-400">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
            <p className="text-xs font-medium">No conversations found.</p>
            {isPhoneSearch && (sessionStatus === 'connected' || cloudApiConfigured) ? (
              <button
                onClick={() => onStartNewChat(searchQuery.trim())}
                className="mt-3 flex items-center gap-1.5 mx-auto px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow transition-colors"
              >
                <PlusCircle size={13} />
                Start New Chat with {searchQuery.trim()}
              </button>
            ) : (
              <p className="text-[11px] mt-1 text-slate-500">
                Inbound messages from WhatsApp & Instagram DMs will auto-appear here!
              </p>
            )}
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isSelected = selectedChat?.id === chat.id;
            const isIg = chat.phone?.startsWith('IG_') || chat.chat_id?.startsWith('IG_');
            const igHandle = isIg ? chat.phone.replace('IG_', '') : '';

            return (
              <button
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors ${
                  isSelected
                    ? isIg
                      ? 'bg-pink-50/70 dark:bg-pink-950/30 border-l-4 border-pink-500'
                      : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-l-4 border-emerald-500'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
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
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {isIg ? (chat.customer_name || `@${igHandle}`) : (chat.customer_name || `+${chat.phone}`)}
                    </h4>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {formatDate(chat.last_message_timestamp)}
                    </span>
                  </div>

                  {typingChats && typingChats[chat.id] ? (
                    <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mt-0.5 animate-pulse">
                      <Bot size={13} className="shrink-0" />
                      <span>AI is typing...</span>
                      <span className="inline-flex gap-0.5">
                        <span className="w-1 h-1 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1 h-1 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1 h-1 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-bounce" />
                      </span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {chat.last_message || 'Message'}
                    </p>
                  )}

                  {/* Lead / Booking / Platform Badges */}
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {isIg ? (
                      <span className="px-1.5 py-0.5 text-[9px] font-extrabold rounded bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800 flex items-center gap-1">
                        <Instagram size={9} /> Instagram DM
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 text-[9px] font-extrabold rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <MessageSquare size={9} /> WhatsApp
                      </span>
                    )}
                    {chat.formatted_lead_id && (
                      <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                        {chat.formatted_lead_id} • {chat.lead_stage || 'New'}
                      </span>
                    )}
                    {chat.booking_trip && (
                      <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
                        Trip: {chat.booking_trip}
                      </span>
                    )}
                  </div>
                </div>

                {chat.needs_human && (
                  <span
                    className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-[10px] font-bold"
                    title="AI escalated this chat - it needs a person"
                  >
                    <AlertCircle className="w-3 h-3" />
                    <span>You</span>
                  </span>
                )}

                {chat.unread_count > 0 && (
                  <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {chat.unread_count}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
