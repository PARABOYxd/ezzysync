import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Search, Send, User, Check, CheckCheck, MessageSquare, ShieldAlert, Phone, Clock, Paperclip, FileText, Image, X, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import api, { API_BASE_URL } from '../services/api';
import * as whatsappChatService from '../services/whatsappChatService';

export default function WhatsAppChat() {
  const { user } = useAuth();
  const toast = useToast();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const fileInputRef = useRef(null);
  const [attachment, setAttachment] = useState(null); // { file, url, type, name, loading }

  // Load chat headers
  const loadChats = useCallback(async (selectFirst = false) => {
    try {
      const data = await whatsappChatService.getChats();
      setChats(data);
      if (selectFirst && data.length > 0 && !activeChat) {
        handleSelectChat(data[0]);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Could not load WhatsApp chats.');
    } finally {
      setLoadingChats(false);
    }
  }, [activeChat, toast]);

  // Load messages for the selected chat
  const loadMessages = useCallback(async (chatId) => {
    setLoadingMessages(true);
    try {
      const data = await whatsappChatService.getChatMessages(chatId);
      setMessages(data);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Could not load chat messages.');
    } finally {
      setLoadingMessages(false);
    }
  }, [toast]);

  useEffect(() => {
    loadChats(true);
  }, []);

  // Set up WebSocket for live updates with auto-reconnect
  useEffect(() => {
    if (!user?.tenantId) return;

    let socket;
    let reconnectTimeout;
    let isUnmounted = false;

    const connect = () => {
      if (isUnmounted) return;
      
      const wsUrl = API_BASE_URL.replace(/^http/, 'ws').replace(/\/api$/, '');
      socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        // eslint-disable-next-line no-console
        console.log('[WhatsApp WebSocket] Connected');
        socket.send(JSON.stringify({ type: 'join', tenantId: user.tenantId }));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'WHATSAPP_MESSAGE_RECEIVED') {
            const { chat: updatedChat, message: newMsg } = data;

            // Update chats list
            setChats((prevChats) => {
              const filtered = prevChats.filter((c) => c.phone !== updatedChat.phone);
              return [updatedChat, ...filtered];
            });

            // Append to active message thread if open
            setActiveChat((currentActive) => {
              if (currentActive && currentActive.phone === updatedChat.phone) {
                setMessages((prevMsgs) => {
                  // Prevent duplicate messages in state (using DB ID or Meta message_id)
                  const exists = prevMsgs.some(
                    (m) => m.id === newMsg.id || (m.message_id && m.message_id === newMsg.message_id)
                  );
                  if (exists) return prevMsgs;
                  return [...prevMsgs, newMsg];
                });
                // Reset unread count for current active chat on backend
                whatsappChatService.markChatAsRead(currentActive.id).catch(() => {});
              }
              return currentActive;
            });
          } else if (data.type === 'WHATSAPP_STATUS_UPDATED') {
            const { messageId, status } = data;
            setMessages((prevMsgs) =>
              prevMsgs.map((m) => (m.message_id === messageId ? { ...m, status } : m))
            );
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('[WhatsApp WebSocket] Error parsing message:', err);
        }
      };

      socket.onclose = () => {
        if (isUnmounted) return;
        // eslint-disable-next-line no-console
        console.log('[WhatsApp WebSocket] Disconnected. Reconnecting in 3 seconds...');
        reconnectTimeout = setTimeout(connect, 3000);
      };

      socket.onerror = (err) => {
        // eslint-disable-next-line no-console
        console.error('[WhatsApp WebSocket] Socket error:', err);
        socket.close();
      };
    };

    connect();

    return () => {
      isUnmounted = true;
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
      clearTimeout(reconnectTimeout);
    };
  }, [user]);

  // Auto scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectChat = async (chat) => {
    setActiveChat(chat);
    await loadMessages(chat.id);
    // Mark as read locally and on backend
    try {
      const updated = await whatsappChatService.markChatAsRead(chat.id);
      setChats((prev) =>
        prev.map((c) => (c.id === chat.id ? { ...c, unread_count: 0 } : c))
      );
    } catch (err) {}
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size cannot exceed 5MB.');
      return;
    }

    setAttachment({
      name: file.name,
      type: file.type.startsWith('image/') ? 'image' : 'document',
      loading: true,
      url: null,
    });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAttachment((prev) => ({
        ...prev,
        loading: false,
        url: response.data.url,
      }));
      toast.success('File uploaded successfully.');
    } catch (err) {
      setAttachment(null);
      toast.error(err.response?.data?.message || 'Failed to upload attachment.');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!activeChat) return;

    const hasText = !!newMessage.trim();
    const hasAttachment = !!attachment && !!attachment.url;

    if (!hasText && !hasAttachment) return;

    setSending(true);
    const textToSend = newMessage.trim();
    setNewMessage('');

    const payload = {
      text: textToSend,
      mediaLink: attachment?.url || null,
      mediaType: attachment?.type || null,
      filename: attachment?.name || null,
    };

    setAttachment(null);

    try {
      const res = await whatsappChatService.sendChatMessage(activeChat.id, payload);
      setMessages((prev) => {
        // Prevent duplicate messages in state
        if (prev.some((m) => m.id === res.messageData.id)) return prev;
        return [...prev, res.messageData];
      });
      setChats((prev) =>
        prev.map((c) => (c.id === activeChat.id ? res.chat : c))
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send WhatsApp message.');
    } finally {
      setSending(false);
    }
  };

  // Filter chats by search query
  const filteredChats = chats.filter(
    (c) =>
      c.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  const formatChatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex h-[calc(100vh-80px)] rounded-2xl overflow-hidden border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm">
      {/* Sidebar: Chats List */}
      <div className={`w-full md:w-80 lg:w-96 flex-col border-r border-slate-100 dark:border-zinc-800 bg-[#FBFCFD] dark:bg-zinc-900/50 ${
        activeChat ? 'hidden md:flex' : 'flex'
      }`}>
        <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-zinc-800">
          <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
            <MessageSquare className="text-emerald-500" size={20} />
            WhatsApp Chat
          </h2>
          <div className="relative mt-2.5 sm:mt-3">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search chat or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-emerald-500 font-medium text-slate-700 dark:text-zinc-200 transition"
            />
          </div>
        </div>

        {/* Chats scroll area */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100/50 dark:divide-zinc-800/40">
          {loadingChats ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3 items-center animate-pulse">
                  <div className="w-11 h-11 bg-slate-100 dark:bg-zinc-800 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/3 bg-slate-100 dark:bg-zinc-800 rounded" />
                    <div className="h-2 w-2/3 bg-slate-100 dark:bg-zinc-800 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="p-6 text-center text-slate-400 dark:text-zinc-500 text-xs mt-10">
              No chats found. Link a webhook and receive incoming messages to get started!
            </div>
          ) : (
            filteredChats.map((c) => {
              const isActive = activeChat?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => handleSelectChat(c)}
                  className={`flex gap-3 items-center p-3 sm:p-3.5 cursor-pointer select-none transition ${
                    isActive
                      ? 'bg-slate-100/70 dark:bg-zinc-800/70 border-l-4 border-emerald-500 rounded-r-lg'
                      : 'hover:bg-slate-50 dark:hover:bg-zinc-850/40'
                  }`}
                >
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 border border-emerald-500/15 shadow-sm">
                    {c.customer_name ? c.customer_name.slice(0, 2).toUpperCase() : <User size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <p className="font-semibold text-slate-800 dark:text-zinc-200 text-xs truncate">
                        {c.customer_name || c.phone}
                      </p>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                        {formatChatTime(c.last_message_timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-zinc-500 truncate pr-4">
                      {c.last_message}
                    </p>
                  </div>
                  {c.unread_count > 0 && (
                    <span className="bg-emerald-500 text-white font-bold rounded-full w-5 h-5 flex items-center justify-center text-[10px] shrink-0 animate-bounce">
                      {c.unread_count}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Pane: Messages Window */}
      <div className={`flex-1 flex-col bg-[#efeae2] dark:bg-zinc-950 relative ${
        activeChat ? 'flex' : 'hidden md:flex'
      }`}>
        {/* WhatsApp Pattern Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: `url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")`,
            backgroundRepeat: 'repeat',
          }}
        />

        {activeChat ? (
          <>
            {/* Active Header with Mobile Back Button */}
            <div className="flex items-center gap-2.5 sm:gap-3 px-3.5 sm:px-5 py-3 border-b border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs z-10">
              <button
                type="button"
                onClick={() => setActiveChat(null)}
                className="md:hidden p-1.5 -ml-1 rounded-lg text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                title="Back to chats"
              >
                <ArrowLeft size={18} />
              </button>

              <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-500/15">
                {activeChat.customer_name ? activeChat.customer_name.slice(0, 2).toUpperCase() : <User size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 dark:text-zinc-100 text-xs truncate">
                  {activeChat.customer_name || 'Active Chat'}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 flex items-center gap-1 mt-0.5">
                  <Phone size={10} /> {activeChat.phone}
                </p>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 md:p-6 space-y-3 relative z-10 flex flex-col">
              {loadingMessages ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                messages.map((m) => {
                  const isOutbound = m.direction === 'outbound';
                  return (
                    <div
                      key={m.id}
                      className={`max-w-[85%] sm:max-w-[75%] md:max-w-[70%] rounded-xl px-3 sm:px-3.5 py-2 sm:py-2.5 shadow-sm text-xs relative flex flex-col gap-1 ${
                        isOutbound
                          ? 'bg-[#E1F3D4] dark:bg-emerald-950 text-slate-800 dark:text-emerald-100 self-end rounded-tr-none'
                          : 'bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 self-start rounded-tl-none border border-slate-100 dark:border-zinc-800'
                      }`}
                    >
                      {m.message_type === 'image' && m.media_url && (
                        <div className="mb-1 rounded-lg overflow-hidden border border-slate-200/60 dark:border-zinc-800/60">
                          <img
                            src={m.media_url}
                            alt="Attachment"
                            className="max-h-60 max-w-full object-cover cursor-pointer hover:opacity-90 transition rounded"
                            onClick={() => window.open(m.media_url, '_blank')}
                          />
                        </div>
                      )}
                      {m.message_type === 'document' && m.media_url && (
                        <a
                          href={m.media_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={m.message_text || 'Document.pdf'}
                          className="mb-1 flex items-center gap-2.5 p-2 rounded-lg bg-slate-100/50 dark:bg-zinc-800/30 hover:bg-slate-200/50 dark:hover:bg-zinc-800/80 border border-slate-200/40 dark:border-zinc-800/40 transition text-slate-800 dark:text-zinc-200 text-[11px] font-medium"
                        >
                          <FileText size={16} className="text-emerald-500 shrink-0" />
                          <span className="truncate flex-1 max-w-[200px]">{m.message_text || 'Document.pdf'}</span>
                        </a>
                      )}
                      {/* Display message body text (or image/doc caption) */}
                      {!(m.message_type === 'document' && m.media_url) && m.message_text && (
                        <p className="leading-relaxed break-words">{m.message_text}</p>
                      )}
                      <div className="flex justify-end items-center gap-1.5 self-end">
                        <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-mono">
                          {formatChatTime(m.message_timestamp)}
                        </span>
                        {isOutbound && (
                          m.status === 'read' ? (
                            <CheckCheck size={13} className="text-blue-500 dark:text-blue-400" title="Read" />
                          ) : m.status === 'delivered' ? (
                            <CheckCheck size={13} className="text-slate-400" title="Delivered" />
                          ) : m.status === 'failed' ? (
                            <ShieldAlert size={13} className="text-red-500" title="Failed" />
                          ) : (
                            <Check size={13} className="text-slate-400" title="Sent" />
                          )
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Attachment Preview Bar */}
            {attachment && (
              <div className="px-5 py-2.5 bg-slate-50 dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-3 z-10 relative">
                <div className="flex items-center gap-2.5 min-w-0">
                  {attachment.loading ? (
                    <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin shrink-0" />
                  ) : attachment.type === 'image' ? (
                    <Image size={16} className="text-emerald-500 shrink-0" />
                  ) : (
                    <FileText size={16} className="text-emerald-500 shrink-0" />
                  )}
                  <span className="text-[11px] font-medium text-slate-700 dark:text-zinc-300 truncate max-w-[300px]">
                    {attachment.name} {attachment.loading && <span className="text-slate-400 font-normal">(Uploading...)</span>}
                  </span>
                </div>
                {!attachment.loading && (
                  <button
                    type="button"
                    onClick={() => setAttachment(null)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition p-1 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            )}

            {/* Input Bar */}
            <form
              onSubmit={handleSendMessage}
              className="px-4 py-3 bg-[#f0f2f5] dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800 flex items-center gap-3 relative z-10"
            >
              {/* Invisible File Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,application/pdf"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending || (attachment && attachment.loading)}
                className="text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300 p-2 rounded-xl transition hover:bg-slate-200/50 dark:hover:bg-zinc-800/50 shrink-0"
                title="Attach Image or PDF"
              >
                <Paperclip size={18} />
              </button>

              <input
                type="text"
                placeholder={attachment ? "Add a caption..." : "Type a message..."}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={sending}
                className="flex-1 text-xs bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 font-medium text-slate-700 dark:text-zinc-200 transition"
              />
              <button
                type="submit"
                disabled={sending || (attachment && attachment.loading) || (!newMessage.trim() && !attachment?.url)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl p-3 shrink-0 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center"
              >
                <Send size={15} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 relative z-10 select-none">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-4 border border-emerald-500/20">
              <MessageSquare size={32} />
            </div>
            <h3 className="font-bold text-slate-700 dark:text-zinc-200 text-sm">EzzySync WhatsApp Chat</h3>
            <p className="text-xs text-slate-400 dark:text-zinc-500 max-w-sm mt-1">
              Send and receive messages live. Click on any contact on the left side menu to view the conversation history and start chatting.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
