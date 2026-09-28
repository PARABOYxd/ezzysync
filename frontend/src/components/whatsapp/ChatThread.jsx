import React, { useLayoutEffect, useRef, useState } from 'react';
import {
  MessageSquare,
  Bot,
  User,
  Send,
  Paperclip,
  Check,
  CheckCheck,
  Sparkles,
  FileText,
  AlertCircle,
  ExternalLink,
  Wand2,
  Loader2,
  Smile,
  Compass,
  Instagram,
  X,
  ArrowLeft,
  Info,
} from 'lucide-react';
import { whatsappWebService } from '../../services/whatsappWebService';
import { usePlanStatus } from '../../hooks/usePlanStatus.js';
import AiUsageMeter from '../common/AiUsageMeter.jsx';
import { useToast } from '../../hooks/useToast.jsx';
import {
  formatTime,
  formatDayLabel,
  startsNewDay,
  mediaTypeOf,
  mediaNameOf,
  formatFileSize,
  formatWindowRemaining,
} from '../../utils/whatsappMessageFormatters';

// What the AI button offers. 'suggest' writes from scratch; the rest rework
// what the agent already typed, so they only make sense with a draft.
const AI_ACTIONS = [
  { mode: 'suggest', label: 'Suggest a reply', hint: 'Write the next message for me', needsDraft: false },
  { mode: 'improve', label: 'Fix & improve', hint: 'Grammar, spelling and tone', needsDraft: true },
  { mode: 'shorten', label: 'Make it shorter', hint: 'Cut it to the essentials', needsDraft: true },
  { mode: 'friendly', label: 'Make it warmer', hint: 'Friendlier, more personal', needsDraft: true },
  { mode: 'professional', label: 'Make it formal', hint: 'Polished, no emojis', needsDraft: true },
  { mode: 'hinglish', label: 'Write in Hinglish', hint: 'Casual Hindi-English mix', needsDraft: true },
];

const EMOJIS = [
  '😊','😃','😍','🙏','👍','👌','🙌','🎉','✨','🔥',
  '❤️','😅','😉','🤝','💯','✅','⭐','😎','🥳','🤗',
  '✈️','🏖️','🏔️','🗺️','🧳','🚗','🏨','📅','💰','📞',
];

/**
 * What is *actually* happening on this chat, as opposed to what the per-chat
 * switch alone suggests. Autopilot needs the master switch AND the chat
 * switch, so a chat can read "AI Auto-Pilot" while nothing sends - which is
 * exactly the state that looks like a silent failure.
 */
const getAiState = (chat) => {
  if (!chat) return null;
  if (chat.needs_human) return 'escalated';
  if (!chat.ai_enabled) return 'human';
  return 'ai';
};

const AI_STATE_UI = {
  ai: {
    label: 'AI Auto-Pilot',
    title: 'AI is replying automatically. Click to take over.',
    className: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  },
  human: {
    label: 'Human Mode',
    title: 'You are replying. Click to hand this chat to AI.',
    className: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  escalated: {
    label: 'Needs You',
    title: 'AI stepped back on this chat. Reply yourself to clear it.',
    className: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  },
};

export default function ChatThread({
  selectedChat,
  messages,
  isAiTyping = false,
  user,
  isSelectedIg,
  selectedIgHandle,
  chatWindow,
  session,
  attachments,
  addFiles,
  clearAttachment,
  fileInputRef,
  inputText,
  setInputText,
  templates,
  sendingTemplateId,
  onSendTemplate,
  quickReplies,
  sending,
  onSendMessage,
  togglingAi,
  onToggleChatAi,
  onOpenItineraryModal,
  onViewMedia,
  onOpenQrModal,
  onOpenAttachmentPreview,
  messagesEndRef,
  onBack,
  onOpenInfo,
  headerExtra = null,
  hasMore = false,
  loadingEarlier = false,
  onLoadEarlier,
}) {
  const toast = useToast();
  const { limits: planLimits, usage: planUsage, refresh: refreshPlan } = usePlanStatus();
  const scrollBoxRef = useRef(null);
  // Height before an older page is prepended, so the view can stay on the
  // message the agent was reading instead of jumping.
  const heightBeforeLoadRef = useRef(null);

  useLayoutEffect(() => {
    const box = scrollBoxRef.current;
    if (box && heightBeforeLoadRef.current !== null && !loadingEarlier) {
      box.scrollTop += box.scrollHeight - heightBeforeLoadRef.current;
      heightBeforeLoadRef.current = null;
    }
  }, [messages, loadingEarlier]);

  const handleLoadEarlier = () => {
    if (!onLoadEarlier || loadingEarlier) return;
    heightBeforeLoadRef.current = scrollBoxRef.current?.scrollHeight ?? null;
    onLoadEarlier();
  };
  const [aiDrafting, setAiDrafting] = useState(false);
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [quickReplyQuery, setQuickReplyQuery] = useState(null); // null = popup closed

  /**
   * Watches the composer for a "/shortcut" being typed.
   *
   * Only a slash at the very start opens the picker - mid-sentence slashes
   * (dates, "and/or", URLs) are left alone.
   */
  const handleComposerChange = (value) => {
    setInputText(value);
    const match = /^\/([a-zA-Z0-9_-]*)$/.exec(value);
    setQuickReplyQuery(match ? match[1].toLowerCase() : null);
  };

  const applyQuickReply = (reply) => {
    setInputText(reply.message);
    setQuickReplyQuery(null);
  };

  const matchingQuickReplies =
    quickReplyQuery === null
      ? []
      : quickReplies.filter((q) => q.shortcut.startsWith(quickReplyQuery));

  const insertEmoji = (emoji) => {
    setInputText((prev) => prev + emoji);
    setEmojiOpen(false);
  };

  /**
   * Asks the AI for a draft and drops it into the composer. Nothing is sent -
   * the agent still reads it, edits it and presses Send, which is the whole
   * point of assist mode as opposed to autopilot.
   */
  const handleAiDraft = async (mode) => {
    if (!selectedChat || aiDrafting) return;
    setAiMenuOpen(false);
    setAiDrafting(true);
    try {
      const { suggestion } = await whatsappWebService.aiSuggest(selectedChat.id, {
        mode,
        draft: inputText.trim(),
      });
      if (suggestion) setInputText(suggestion);
    } catch (err) {
      toast.error(err.response?.data?.message || 'AI could not draft a reply. Please try again.');
    } finally {
      setAiDrafting(false);
      refreshPlan();
    }
  };

  if (!selectedChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
        <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
        <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">No Chat Selected</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Select a conversation from the left to view message history, chat live, or send travel itineraries.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col h-full w-full overflow-hidden relative">
      {/* Chat Thread Header */}
      <div className="px-2.5 sm:px-6 py-2 sm:py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-1.5 sm:gap-4 shadow-xs shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="md:hidden p-1.5 -ml-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0 cursor-pointer flex items-center justify-center"
              aria-label="Back to chats"
              title="Back to conversation list"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div
            onClick={onOpenInfo}
            className={`w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm cursor-pointer md:cursor-default ${
              isSelectedIg
                ? 'bg-gradient-to-tr from-pink-500 to-rose-600 text-white'
                : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {isSelectedIg ? (
              <Instagram className="w-3.5 h-3.5 text-white" />
            ) : selectedChat.customer_name ? (
              selectedChat.customer_name.charAt(0).toUpperCase()
            ) : (
              <User className="w-3.5 h-3.5" />
            )}
          </div>
          <div className="min-w-0 flex-1 cursor-pointer md:cursor-default" onClick={onOpenInfo}>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1 min-w-0">
              <span className="truncate max-w-[95px] xs:max-w-[140px] sm:max-w-none">{selectedChat.customer_name || (isSelectedIg ? `@${selectedIgHandle}` : 'WhatsApp Contact')}</span>
              {isSelectedIg ? (
                <span className="text-[9px] sm:text-[10px] font-extrabold bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded-full border border-pink-200 flex items-center gap-0.5 shrink-0">
                  <Instagram size={9} /> <span className="hidden sm:inline">Instagram</span> Direct
                </span>
              ) : (
                <span className="text-[10px] sm:text-xs font-normal text-slate-400 whitespace-nowrap shrink-0 hidden xs:inline">+{selectedChat.phone}</span>
              )}
            </h3>
            {/* Stage and owner sit on the name's second line, not beside it:
                beside it they squeezed a long name out of the header entirely. */}
            {headerExtra && !isAiTyping && (
              <div className="hidden lg:flex mt-1" onClick={(e) => e.stopPropagation()}>{headerExtra}</div>
            )}
            {isAiTyping ? (
              <p className="text-[10px] sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 truncate animate-pulse">
                <Sparkles size={11} className="shrink-0 animate-spin" />
                <span>AI Auto-Pilot is replying...</span>
              </p>
            ) : (
              <p className={`text-[10px] sm:text-[11px] text-slate-400 truncate ${headerExtra ? 'lg:hidden' : ''}`}>
                {selectedChat.formatted_lead_id
                  ? `CRM: ${selectedChat.formatted_lead_id}`
                  : selectedChat.booking_trip
                  ? `Booking: ${selectedChat.booking_trip}`
                  : isSelectedIg
                  ? `@${selectedIgHandle}`
                  : `+${selectedChat.phone}`}
              </p>
            )}
          </div>
        </div>

        {/* Per-Chat Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Mobile Info / Customer 360° Button */}
          {onOpenInfo && (
            <button
              type="button"
              onClick={onOpenInfo}
              className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex items-center justify-center shrink-0"
              title="View Customer 360° details"
              aria-label="Customer 360"
            >
              <Info size={17} />
            </button>
          )}

          {/* Human Takeover / Per-chat AI Toggle */}
          <button
            type="button"
            onClick={onToggleChatAi}
            disabled={togglingAi}
            title={AI_STATE_UI[getAiState(selectedChat)].title}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors shadow-xs whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer shrink-0 ${AI_STATE_UI[getAiState(selectedChat)].className}`}
          >
            <Bot className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">{AI_STATE_UI[getAiState(selectedChat)].label}</span>
            <span className="sm:hidden">{selectedChat.ai_enabled ? 'AI' : 'Human'}</span>
          </button>

          {/* Send Itinerary button */}
          <button
            type="button"
            onClick={onOpenItineraryModal}
            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-xs whitespace-nowrap cursor-pointer shrink-0"
            title="Share Itinerary (Select Existing or Create Custom PDF)"
          >
            <Compass className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Itinerary</span>
          </button>
        </div>
      </div>

      {/* Messages Stream */}
      {getAiState(selectedChat) === 'escalated' && (
        <div className="mx-6 mt-4 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-700 dark:text-rose-300">
            <p className="font-semibold">AI stepped back — this one needs you.</p>
            <p className="mt-0.5 text-rose-600/90 dark:text-rose-400/90">
              Nothing was sent to the customer. Autopilot is off for this chat; replying below clears this.
            </p>
          </div>
        </div>
      )}

      <div ref={scrollBoxRef} className="flex-1 min-h-0 px-3 sm:px-6 py-3 sm:py-5 overflow-y-auto space-y-2">
        {hasMore && (
          <div className="flex justify-center pb-1">
            <button
              type="button"
              onClick={handleLoadEarlier}
              disabled={loadingEarlier}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs disabled:opacity-60 cursor-pointer"
            >
              {loadingEarlier && <Loader2 className="w-3 h-3 animate-spin" />}
              {loadingEarlier ? 'Loading…' : 'Load earlier messages'}
            </button>
          </div>
        )}
        {messages.map((msg, index) => {
          const isOutbound = msg.direction === 'outbound';
          const newDay = startsNewDay(msg, messages[index - 1]);
          return (
            <React.Fragment key={msg.id}>
              {newDay && (
                <div className="flex justify-center my-3">
                  <span className="px-3 py-1 rounded-full bg-slate-200/80 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    {formatDayLabel(msg.message_timestamp)}
                  </span>
                </div>
              )}
            <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] sm:max-w-md min-w-[88px] rounded-2xl px-3.5 py-2 shadow-sm text-xs leading-relaxed break-words ${
                  isOutbound
                    ? 'bg-emerald-600 text-white rounded-br-none'
                    : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 rounded-bl-none'
                }`}
              >
                {/* Sender tag for outbound */}
                {isOutbound && (
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-100/90 mb-0.5">
                    {msg.sender === 'ai_bot' ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    {/* Name the person, not the seat. On a shared
                        inbox every outbound message used to read
                        "Agent (You)" whoever had actually sent it, so
                        an owner could not tell which of their staff
                        replied to a customer. */}
                    <span>
                      {msg.sender === 'ai_bot'
                        ? 'Gemini AI Auto-Pilot'
                        : msg.agent_name
                        ? msg.user_id === user?.userId
                          ? `${msg.agent_name} (You)`
                          : msg.agent_name
                        : 'Agent'}
                    </span>
                  </div>
                )}

                {msg.media_url && (
                  <div className="mb-1.5 w-full">
                    {msg.message_type === 'audio' || mediaTypeOf(msg).startsWith('audio/') ? (
                      <div className="py-1 min-w-[220px]" onClick={(e) => e.stopPropagation()}>
                        <audio controls className="w-full h-8" preload="metadata">
                          <source src={msg.media_url} type={mediaTypeOf(msg)} />
                          Your browser does not support audio playback.
                        </audio>
                      </div>
                    ) : msg.message_type === 'video' || mediaTypeOf(msg).startsWith('video/') ? (
                      <div className="relative rounded-xl overflow-hidden max-h-60 max-w-xs border border-black/5 bg-black/10">
                        <video
                          src={msg.media_url}
                          className="w-full max-h-60 object-cover rounded-xl"
                          controls
                          preload="metadata"
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onViewMedia(msg)}
                        className="block w-full text-left"
                        title="Open attachment"
                      >
                        {msg.message_type === 'image' || mediaTypeOf(msg).startsWith('image/') ? (
                          <img
                            src={msg.media_url}
                            alt={msg.message_text || 'Attachment'}
                            className="rounded-xl max-h-64 w-auto object-cover border border-black/5 shadow-sm"
                            loading="lazy"
                          />
                        ) : (
                          <span
                            className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border transition-colors ${
                              isOutbound
                                ? 'bg-white/15 border-white/20 text-white'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                            }`}
                          >
                            <FileText className="w-4 h-4 shrink-0" />
                            <span className="truncate underline underline-offset-2 text-xs font-medium">
                              {mediaNameOf(msg)}
                            </span>
                            <ExternalLink className="w-3.5 h-3.5 opacity-60 ml-auto shrink-0" />
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {msg.message_text && (
                  <div className="whitespace-pre-wrap break-words">{msg.message_text}</div>
                )}

                {/* Status & Timestamp */}
                <div
                  className={`flex items-center justify-end gap-1 text-[10px] mt-0.5 ${
                    isOutbound ? 'text-emerald-100/80' : 'text-slate-400'
                  }`}
                >
                  <span>{formatTime(msg.message_timestamp)}</span>
                  {isOutbound && (
                    <span>
                      {msg.status === 'read' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-sky-300" /> // Blue ticks!
                      ) : msg.status === 'delivered' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-200" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-emerald-200" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
            </React.Fragment>
          );
        })}
        {/* Live AI Typing Indicator Bubble */}
        {isAiTyping && (
          <div className="flex items-end gap-2 justify-start my-2 animate-fade-in">
            <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-xs">
              <Bot className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/70 rounded-2xl rounded-bl-xs px-3.5 py-2 flex items-center gap-2 shadow-xs">
              <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400 animate-spin" />
                <span>AI Auto-Pilot is replying</span>
                <span className="inline-flex gap-1 items-center ml-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-bounce" />
                </span>
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachment bar. The full-screen preview is the real check -
          this row just shows what is staged and opens it. */}
      {attachments.length > 0 && (
        <div className="px-4 pt-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          {/* A row of two real buttons rather than one nested inside
              the other: a <button> inside a <button> is invalid HTML
              and left the remove control unreachable by keyboard. */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onOpenAttachmentPreview}
              className="flex items-center gap-3 min-w-0 flex-1 text-left group"
              title="Preview attachments"
            >
              <span className="flex -space-x-2 shrink-0">
                {attachments.slice(0, 3).map((a) =>
                  a.file.type?.startsWith('image/') ? (
                    <img
                      key={a.id}
                      src={a.url}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover border-2 border-white dark:border-slate-800"
                    />
                  ) : (
                    <span
                      key={a.id}
                      className="w-10 h-10 rounded-lg bg-white dark:bg-slate-900 border-2 border-white dark:border-slate-800 ring-1 ring-slate-200 dark:ring-slate-700 flex items-center justify-center"
                    >
                      <FileText className="w-4 h-4 text-slate-400" />
                    </span>
                  )
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {attachments.length === 1
                    ? attachments[0].file.name
                    : `${attachments.length} attachments`}
                </span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {formatFileSize(attachments.reduce((sum, a) => sum + a.file.size, 0))} · Click to preview
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={clearAttachment}
              title={attachments.length === 1 ? 'Remove attachment' : 'Remove all attachments'}
              className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Per-chat human mode indicator banner */}
      {selectedChat && session?.aiAutopilotEnabled && !selectedChat.ai_enabled && !selectedChat.needs_human && (
        <div className="mx-2 sm:mx-4 my-1.5 px-3 py-1.5 rounded-lg bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between gap-2 text-[10px] sm:text-[11px] text-indigo-800 dark:text-indigo-300 shrink-0">
          <span className="flex items-center gap-1.5 truncate">
            <Bot className="w-3.5 h-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
            <span className="truncate">Human mode active on this chat.</span>
          </span>
          <button
            type="button"
            onClick={onToggleChatAi}
            disabled={togglingAi}
            className="shrink-0 px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] transition disabled:opacity-60 cursor-pointer"
          >
            {togglingAi ? '...' : 'Turn AI ON'}
          </button>
        </div>
      )}

      {/* Cloud API 24h window notices */}
      {chatWindow?.applies && !chatWindow.isOpen && (
        <div className="mx-2 sm:mx-4 my-1.5 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-start gap-2 text-[10px] sm:text-[11px] text-blue-800 dark:text-blue-300 shrink-0">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
          <span className="flex-1">
            <strong>Customer hasn&apos;t replied in 24 hours.</strong>{' '}
            WhatsApp allows only ready-made templates until they reply.
          </span>
        </div>
      )}

      {chatWindow?.applies && chatWindow.isOpen && chatWindow.secondsRemaining < 4 * 3600 && (
        <div className="mx-2 sm:mx-4 my-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center gap-2 text-[10px] sm:text-[11px] text-amber-700 dark:text-amber-300 shrink-0">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>
            Free replies end in {formatWindowRemaining(chatWindow.secondsRemaining)}.
          </span>
        </div>
      )}

      {/* The QR socket being down doesn't affect a Cloud API chat at
          all - this banner used to show (and disable Send) on every
          chat whenever the QR session was disconnected, regardless
          of which transport that particular chat actually uses. */}
      {!session.canSend && selectedChat?.transport !== 'cloud_api' && (
        <div className="mx-4 mt-3 px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center gap-2 text-[11px] text-amber-700 dark:text-amber-300">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1">
            {session.status === 'connecting'
              ? 'Reconnecting to WhatsApp — sending will work again in a moment.'
              : 'WhatsApp is not connected, so messages cannot be sent.'}
          </span>
          {session.status !== 'connecting' && (
            <button
              type="button"
              onClick={onOpenQrModal}
              className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-colors"
            >
              Scan QR
            </button>
          )}
        </div>
      )}

      {/* With the window shut, WhatsApp will not deliver anything the
          agent types, so the composer is replaced rather than left
          there to fail. Each of these carries quick-reply buttons: a
          tap counts as a customer message, which is what re-opens the
          conversation. */}
      {chatWindow?.applies && !chatWindow.isOpen ? (
        <div className="px-4 pb-4 pt-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">
            Send a ready-made message to re-open this chat
          </p>

          {templates.length === 0 ? (
            <p className="text-xs text-slate-400">Loading your messages…</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  disabled={!!sendingTemplateId}
                  onClick={() => onSendTemplate(tpl)}
                  className="text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-600 disabled:opacity-50 transition-colors"
                >
                  <span className="block text-xs font-semibold text-slate-800 dark:text-slate-100">
                    {sendingTemplateId === tpl.id ? 'Sending…' : tpl.name.replace(/_/g, ' ')}
                  </span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                    {tpl.body}
                  </span>
                  {Array.isArray(tpl.buttons) && tpl.buttons.length > 0 && (
                    <span className="flex flex-wrap gap-1 mt-1.5">
                      {tpl.buttons.map((label) => (
                        <span
                          key={label}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                        >
                          {label}
                        </span>
                      ))}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
      <>
      {/* Message Input Box */}
      <form onSubmit={onSendMessage} className={`shrink-0 px-2 sm:px-4 pb-2 sm:pb-3 ${attachments.length ? 'pt-2' : 'pt-2 sm:pt-3 border-t border-slate-200 dark:border-slate-800'} bg-white dark:bg-slate-900 flex items-center gap-1 sm:gap-2`}>
        <input
          type="file"
          ref={fileInputRef}
          multiple
          onChange={(e) => addFiles(e.target.files)}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`p-2 sm:p-2.5 rounded-xl border transition-colors shrink-0 ${
            attachments.length
              ? 'bg-emerald-50 text-emerald-600 border-emerald-300'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
          }`}
          title="Attach PDF / Image"
        >
          <Paperclip className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Quick Share Itinerary button */}
        <button
          type="button"
          onClick={onOpenItineraryModal}
          className="p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-colors shrink-0"
          title="Share Itinerary (Select Existing or Create Custom PDF)"
        >
          <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>


        <div className="relative flex-1">
          {/* Quick reply picker. Anchored above the composer so it does
              not push the thread around as it opens and closes. */}
          {quickReplyQuery !== null && (
            <div className="absolute bottom-full left-0 right-0 mb-2 max-h-56 overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-lg z-20">
              <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                Quick replies
              </div>
              {matchingQuickReplies.length === 0 ? (
                <div className="px-3 py-3 text-[11px] text-slate-500">
                  {quickReplies.length === 0
                    ? 'No quick replies saved yet. Add them in Settings.'
                    : `No shortcut matches "/${quickReplyQuery}".`}
                </div>
              ) : (
                matchingQuickReplies.map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => applyQuickReply(q)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors border-b border-slate-50 dark:border-slate-800/60 last:border-0"
                  >
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">/{q.shortcut}</span>
                    <span className="block text-[11px] text-slate-600 dark:text-slate-400 truncate">{q.message}</span>
                  </button>
                ))
              )}
            </div>
          )}

          <input
            type="text"
            placeholder="Type a message, or / for a quick reply..."
            value={inputText}
            onChange={(e) => handleComposerChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setQuickReplyQuery(null);
              // Enter picks the top match instead of sending "/price"
              // to the customer as literal text.
              if (e.key === 'Enter' && matchingQuickReplies.length > 0) {
                e.preventDefault();
                applyQuickReply(matchingQuickReplies[0]);
              }
            }}
            className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-200"
          />
        </div>

        {/* Emoji picker */}
        <div className="relative shrink-0">
          {emojiOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setEmojiOpen(false)} />
              <div className="absolute bottom-full right-0 mb-2 z-20 w-64 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-lg">
                <div className="grid grid-cols-10 gap-0.5">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => insertEmoji(e)}
                      className="w-6 h-6 flex items-center justify-center text-base leading-none rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <button
            type="button"
            onClick={() => { setEmojiOpen((v) => !v); setAiMenuOpen(false); }}
            title="Insert emoji"
            className="p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-amber-500 hover:border-amber-300 transition-colors shrink-0"
          >
            <Smile className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* AI actions. A menu rather than one guessed action - the
            agent decides what should happen to what they wrote. */}
        <div className="relative shrink-0">
          {aiMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setAiMenuOpen(false)} />
              <div className="absolute bottom-full right-0 mb-2 z-20 w-60 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">AI assist</span>
                  <AiUsageMeter compact limits={planLimits} usage={planUsage} />
                </div>
                {AI_ACTIONS.map((a) => {
                  const blocked = a.needsDraft && !inputText.trim();
                  return (
                    <button
                      key={a.mode}
                      type="button"
                      disabled={blocked}
                      onClick={() => handleAiDraft(a.mode)}
                      title={blocked ? 'Type a message first' : a.hint}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors border-b border-slate-50 dark:border-slate-800/60 last:border-0"
                    >
                      <span className="block text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                        {a.label}
                      </span>
                      <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                        {a.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <button
            type="button"
            onClick={() => { setAiMenuOpen((v) => !v); setEmojiOpen(false); }}
            disabled={aiDrafting}
            className="p-2 sm:p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 disabled:opacity-50 transition-colors shrink-0"
            title="AI assist"
          >
            {aiDrafting ? (
              <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
            ) : inputText.trim() ? (
              <Wand2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
          </button>
        </div>

        <button
          type="submit"
          disabled={sending || (!session.canSend && selectedChat?.transport !== 'cloud_api') || (!inputText.trim() && !attachments.length)}
          title={(session.canSend || selectedChat?.transport === 'cloud_api') ? 'Send' : 'WhatsApp is not connected right now'}
          className="px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all shrink-0 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>
      </>
      )}
    </div>
  );
}
