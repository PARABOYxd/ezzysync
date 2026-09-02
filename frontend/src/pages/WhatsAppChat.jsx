import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Search,
  Bot,
  User,
  Send,
  Paperclip,
  Check,
  CheckCheck,
  QrCode,
  Sparkles,
  FileText,
  Briefcase,
  Calendar,
  DollarSign,
  AlertCircle,
  RefreshCw,
  Phone,
  Power,
  ChevronRight,
  PlusCircle,
  ExternalLink,
  Wand2,
  Loader2,
} from 'lucide-react';
import { whatsappWebService } from '../services/whatsappWebService';
import WhatsAppQRModal from '../components/whatsapp/WhatsAppQRModal.jsx';

export default function WhatsAppChat() {
  const [session, setSession] = useState({
    status: 'disconnected',
    phoneNumber: '',
    aiAutopilotEnabled: false,
  });
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [itineraryModalOpen, setItineraryModalOpen] = useState(false);
  const [itineraryForm, setItineraryForm] = useState({ tripName: '', itineraryText: '' });
  const [sendingItinerary, setSendingItinerary] = useState(false);
  const [aiDrafting, setAiDrafting] = useState(false);
  const [togglingAi, setTogglingAi] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadStatus = async () => {
    try {
      const data = await whatsappWebService.getStatus();
      setSession(data);
    } catch (e) {}
  };

  const loadChats = async (search = searchQuery) => {
    try {
      const data = await whatsappWebService.listChats(search);
      setChats(data.chats || []);
    } catch (e) {}
  };

  const loadChatMessages = async (chatId) => {
    setLoading(true);
    try {
      const data = await whatsappWebService.getChatMessages(chatId);
      setSelectedChat(data.chat);
      setMessages(data.messages || []);
      // Refresh chats to clear unread badge
      loadChats();
    } catch (e) {
    } finally {
      setLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  useEffect(() => {
    loadStatus();
    loadChats();

    // Poll chats and active message updates every 4 seconds
    const interval = setInterval(() => {
      loadStatus();
      loadChats();
      if (selectedChat?.id) {
        whatsappWebService.getChatMessages(selectedChat.id).then((data) => {
          if (data.messages?.length !== messages.length) {
            setMessages(data.messages || []);
            scrollToBottom();
          }
        }).catch(() => {});
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedChat?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if ((!inputText.trim() && !selectedFile) || !selectedChat) return;

    setSending(true);
    try {
      await whatsappWebService.sendMessage(selectedChat.id, inputText.trim(), selectedFile);
      setInputText('');
      setSelectedFile(null);
      // Reload current chat messages
      await loadChatMessages(selectedChat.id);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleToggleChatAi = async () => {
    // Guarded because the takeover can send a real WhatsApp message; a double
    // click used to mean the customer got the same reply twice.
    if (!selectedChat || togglingAi) return;
    const newStatus = !selectedChat.ai_enabled;
    setTogglingAi(true);
    try {
      const res = await whatsappWebService.toggleChatAi(selectedChat.id, newStatus);
      setSelectedChat({ ...selectedChat, ai_enabled: newStatus });

      // Handing over to AI can send a catch-up reply server-side, so pull the
      // thread again rather than leaving the agent looking at a stale view.
      if (res?.catchUp?.sent) {
        const data = await whatsappWebService.getChatMessages(selectedChat.id);
        setMessages(data.messages || []);
        loadChats();
      }
    } catch (e) {
      alert('Failed to update AI toggle for this chat.');
    } finally {
      setTogglingAi(false);
    }
  };

  const handleToggleGlobalAi = async () => {
    const newStatus = !session.aiAutopilotEnabled;
    try {
      await whatsappWebService.toggleAiAutopilot(newStatus);
      setSession({ ...session, aiAutopilotEnabled: newStatus });
    } catch (e) {
      alert('Failed to toggle AI Autopilot.');
    }
  };

  /**
   * Asks the AI for a draft and drops it into the composer. Nothing is sent -
   * the agent still reads it, edits it and presses Send, which is the whole
   * point of assist mode as opposed to autopilot.
   */
  const handleAiDraft = async (mode) => {
    if (!selectedChat || aiDrafting) return;
    setAiDrafting(true);
    try {
      const { suggestion } = await whatsappWebService.aiSuggest(selectedChat.id, {
        mode,
        draft: inputText.trim(),
      });
      if (suggestion) setInputText(suggestion);
    } catch (err) {
      alert(err.response?.data?.message || 'AI could not draft a reply. Please try again.');
    } finally {
      setAiDrafting(false);
    }
  };

  const handleSendItinerary = async (e) => {
    e.preventDefault();
    if (!itineraryForm.tripName || !itineraryForm.itineraryText || !selectedChat) return;

    setSendingItinerary(true);
    try {
      await whatsappWebService.sendItineraryPdf(
        selectedChat.id,
        itineraryForm.tripName,
        itineraryForm.itineraryText
      );
      setItineraryModalOpen(false);
      setItineraryForm({ tripName: '', itineraryText: '' });
      await loadChatMessages(selectedChat.id);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send itinerary PDF.');
    } finally {
      setSendingItinerary(false);
    }
  };

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

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Top Banner: Connection & AI Status Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                session.status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {session.status === 'connected'
                ? `WhatsApp Web Connected (+${session.phoneNumber})`
                : 'WhatsApp Web Disconnected'}
            </span>
          </div>

          {session.status === 'connected' ? (
            <button
              onClick={() => whatsappWebService.disconnect().then(loadStatus)}
              className="text-xs text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 font-medium ml-2"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={() => setIsQrModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 rounded-lg border border-emerald-300 dark:border-emerald-800 transition-colors shadow-sm"
            >
              <QrCode className="w-3.5 h-3.5" />
              Scan QR to Connect
            </button>
          )}
        </div>

        {/* Global AI Autopilot Toggle */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
            <Bot className={`w-4 h-4 ${session.aiAutopilotEnabled ? 'text-indigo-500' : 'text-slate-400'}`} />
            <span className="font-medium">AI for new chats:</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${
                session.aiAutopilotEnabled
                  ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {session.aiAutopilotEnabled ? 'On' : 'Off'}
            </span>
          </div>
          <button
            onClick={handleToggleGlobalAi}
            title={
              session.aiAutopilotEnabled
                ? 'New incoming chats start with AI Auto-Pilot on. Existing chats keep their own setting.'
                : 'New incoming chats start in Human Mode. Turn AI on per chat from its header.'
            }
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              session.aiAutopilotEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                session.aiAutopilotEnabled ? 'translate-x-4.5' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Main 3-Column WhatsApp Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Chats List */}
        <div className="w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0">
          {/* Search Bar */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search chats by name or phone..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  loadChats(e.target.value);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {chats.length === 0 ? (
              <div className="text-center py-12 px-4 text-slate-400">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                <p className="text-xs font-medium">No WhatsApp conversations yet.</p>
                <p className="text-[11px] mt-1 text-slate-500">Inbound messages from customers will automatically appear here!</p>
              </div>
            ) : (
              chats.map((chat) => {
                const isSelected = selectedChat?.id === chat.id;
                return (
                  <button
                    key={chat.id}
                    onClick={() => loadChatMessages(chat.id)}
                    className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors ${
                      isSelected
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-l-4 border-emerald-500'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-sm text-slate-600 dark:text-slate-300 shrink-0">
                      {chat.customer_name ? chat.customer_name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {chat.customer_name || `+${chat.phone}`}
                        </h4>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatDate(chat.last_message_timestamp)}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {chat.last_message || 'Attachment sent'}
                      </p>

                      {/* Lead / Booking badges */}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
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

        {/* Center Column: Active Chat Thread */}
        <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-950/80">
          {selectedChat ? (
            <>
              {/* Chat Thread Header */}
              <div className="px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                    {selectedChat.customer_name ? selectedChat.customer_name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-baseline gap-2 min-w-0">
                      <span className="truncate">{selectedChat.customer_name || 'WhatsApp Contact'}</span>
                      <span className="text-xs font-normal text-slate-500 whitespace-nowrap shrink-0">+{selectedChat.phone}</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 truncate">
                      {selectedChat.formatted_lead_id
                        ? `CRM Lead: ${selectedChat.formatted_lead_id} (${selectedChat.lead_stage || 'Inquiry'})`
                        : selectedChat.booking_trip
                        ? `Active Booking: ${selectedChat.booking_trip}`
                        : 'Direct WhatsApp Customer'}
                    </p>
                  </div>
                </div>

                {/* Per-Chat Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Human Takeover / Per-chat AI Toggle */}
                  <button
                    onClick={handleToggleChatAi}
                    disabled={togglingAi}
                    title={AI_STATE_UI[getAiState(selectedChat)].title}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors shadow-sm whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed ${AI_STATE_UI[getAiState(selectedChat)].className}`}
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>{AI_STATE_UI[getAiState(selectedChat)].label}</span>
                  </button>

                  {/* Send Itinerary PDF button */}
                  <button
                    onClick={() => setItineraryModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm whitespace-nowrap"
                  >
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>Itinerary PDF</span>
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

              <div className="flex-1 px-6 py-5 overflow-y-auto space-y-2">
                {messages.map((msg) => {
                  const isOutbound = msg.direction === 'outbound';
                  return (
                    <div key={msg.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
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
                            <span>{msg.sender === 'ai_bot' ? 'Gemini AI Auto-Pilot' : 'Agent (You)'}</span>
                          </div>
                        )}

                        <div className="whitespace-pre-wrap break-words">{msg.message_text}</div>

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
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Box */}
              <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-2.5 rounded-xl border transition-colors ${
                    selectedFile
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-300'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                  title="Attach PDF / Image"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {selectedFile && (
                  <span className="text-[11px] text-emerald-600 font-medium truncate max-w-xs">
                    📎 {selectedFile.name}
                  </span>
                )}

                <input
                  type="text"
                  placeholder="Type a message (sent directly to customer's WhatsApp)..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 px-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-200"
                />

                <button
                  type="button"
                  onClick={() => handleAiDraft(inputText.trim() ? 'improve' : 'suggest')}
                  disabled={aiDrafting}
                  className="p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 disabled:opacity-50 transition-colors"
                  title={inputText.trim() ? 'Improve my message with AI' : 'Suggest a reply with AI'}
                >
                  {aiDrafting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : inputText.trim() ? (
                    <Wand2 className="w-4 h-4" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                </button>

                <button
                  type="submit"
                  disabled={sending || (!inputText.trim() && !selectedFile)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
              <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">No Chat Selected</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Select a conversation from the left to view message history, chat live, or send travel itineraries.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Customer Lead & Booking 360° Sidebar */}
        {selectedChat && (
          <div className="w-72 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 overflow-y-auto shrink-0 space-y-5">
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Customer 360°</h4>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
                <p className="font-bold text-sm text-slate-900 dark:text-white">{selectedChat.customer_name || 'Guest'}</p>
                <p className="text-xs text-slate-500 mt-0.5">+{selectedChat.phone}</p>
              </div>
            </div>

            {/* Lead Card */}
            {selectedChat.formatted_lead_id ? (
              <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5" />
                    {selectedChat.formatted_lead_id}
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-200/60 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                    {selectedChat.lead_stage || 'New'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  <strong>Interest:</strong> {selectedChat.lead_interest || 'Inquiry'}
                </p>
                {selectedChat.lead_notes && (
                  <p className="text-[11px] text-slate-500 mt-1 italic">"{selectedChat.lead_notes}"</p>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                <p className="text-xs text-slate-500">No CRM Lead linked yet.</p>
              </div>
            )}

            {/* Active Booking Card */}
            {selectedChat.booking_trip ? (
              <div className="p-3.5 rounded-xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {selectedChat.booking_trip}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 flex justify-between">
                  <span>Total: ₹{selectedChat.total_amount || 0}</span>
                  <span className="text-rose-600 font-medium">Pending: ₹{selectedChat.remaining || 0}</span>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      <WhatsAppQRModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        onConnected={(data) => {
          setSession(data);
          loadChats();
        }}
      />

      {/* Send Itinerary Modal */}
      {itineraryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">Send Custom Itinerary PDF to WhatsApp</h3>
            <form onSubmit={handleSendItinerary} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Trip Name</label>
                <input
                  type="text"
                  placeholder="e.g. 5 Days Luxury Goa Vacation"
                  value={itineraryForm.tripName}
                  onChange={(e) => setItineraryForm({ ...itineraryForm, tripName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Day-by-Day Itinerary Text</label>
                <textarea
                  rows={6}
                  placeholder="Day 1: Arrival & Sunset Beach Club&#10;Day 2: Private Yacht Tour..."
                  value={itineraryForm.itineraryText}
                  onChange={(e) => setItineraryForm({ ...itineraryForm, itineraryText: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setItineraryModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingItinerary}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 disabled:opacity-50"
                >
                  {sendingItinerary ? 'Generating & Sending...' : 'Send PDF via WhatsApp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
