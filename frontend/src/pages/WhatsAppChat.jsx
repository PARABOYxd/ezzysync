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
  Instagram,
  X,
  Smile,
} from 'lucide-react';
import { whatsappWebService } from '../services/whatsappWebService';
import { useToast } from '../hooks/useToast.jsx';
import WhatsAppQRModal from '../components/whatsapp/WhatsAppQRModal.jsx';
import AttachmentPreviewModal from '../components/whatsapp/AttachmentPreviewModal.jsx';

// WhatsApp itself caps a multi-attachment send; the backend enforces the same
// number, this is only so the UI can stop the agent before the upload.
const MAX_ATTACHMENTS = 8;

// Matches multer's per-file limit on the server. Checked here too so an
// oversized file is rejected before it is uploaded, rather than after.
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

export default function WhatsAppChat() {
  const toast = useToast();

  const [session, setSession] = useState({
    status: 'disconnected',
    phoneNumber: '',
    aiAutopilotEnabled: false,
    // Only a live socket can deliver. The stored status alone used to show
    // "Connected" while every send failed.
    canSend: false,
  });
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  // File and its preview URL live together. They used to be two separate
  // states kept in step by an effect, which meant that for one render after
  // adding or removing a file the arrays were different lengths - the preview
  // showed the wrong file, and a revoked URL could still be on screen.
  const [attachments, setAttachments] = useState([]); // [{ id, file, url }]
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [itineraryModalOpen, setItineraryModalOpen] = useState(false);
  const [itineraryForm, setItineraryForm] = useState({ tripName: '', itineraryText: '' });
  const [sendingItinerary, setSendingItinerary] = useState(false);
  const [aiDrafting, setAiDrafting] = useState(false);
  const [togglingAi, setTogglingAi] = useState(false);
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [quickReplies, setQuickReplies] = useState([]);
  const [quickReplyQuery, setQuickReplyQuery] = useState(null); // null = popup closed
  const [viewingMedia, setViewingMedia] = useState(null); // a message already in the thread
  const [attachmentPreviewOpen, setAttachmentPreviewOpen] = useState(false);
  const [platformFilter, setPlatformFilter] = useState('all'); // 'all' | 'whatsapp' | 'instagram'

  const filteredChats = chats.filter((c) => {
    const isIg = c.phone?.startsWith('IG_') || c.chat_id?.startsWith('IG_');
    if (platformFilter === 'whatsapp') return !isIg;
    if (platformFilter === 'instagram') return isIg;
    return true;
  });

  const isSelectedIg = selectedChat?.phone?.startsWith('IG_') || selectedChat?.chat_id?.startsWith('IG_');
  const selectedIgHandle = isSelectedIg ? selectedChat?.phone?.replace('IG_', '') : '';

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
    whatsappWebService
      .listQuickReplies()
      .then((d) => setQuickReplies(d.quickReplies || []))
      .catch(() => {});

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

  // Blob URLs are created and released alongside the file they belong to, in
  // the handlers below. The only thing left for an effect is the final sweep
  // on unmount - navigating away mid-compose would otherwise leak every staged
  // blob for the life of the tab.
  //
  // The ref mirrors state so that cleanup can run once, on unmount, without
  // re-subscribing on every change - which is what would revoke a live URL out
  // from under the preview that is still showing it.
  const attachmentsRef = useRef([]);
  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    return () => attachmentsRef.current.forEach((a) => URL.revokeObjectURL(a.url));
  }, []);

  /**
   * Stored messages keep a coarse message_type ('image' / 'document') and a
   * URL, not the original mime type - so the real type is read back off the
   * stored file's extension. Guessing "pdf" for everything non-image would
   * have shown a broken PDF frame for Word files, spreadsheets and the rest.
   */
  const mediaTypeOf = (msg) => {
    if (!msg) return '';
    if (msg.message_type === 'image') return 'image/*';
    const ext = String(msg.media_url || '').split('?')[0].split('.').pop().toLowerCase();
    const byExt = {
      pdf: 'application/pdf',
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
      mp4: 'video/mp4', webm: 'video/webm',
      ogg: 'audio/ogg', mp3: 'audio/mpeg', m4a: 'audio/mp4',
    };
    return byExt[ext] || 'application/octet-stream';
  };

  const mediaNameOf = (msg) => {
    if (!msg) return 'Attachment';
    const fromUrl = String(msg.media_url || '').split('?')[0].split('/').pop();
    return fromUrl || (msg.message_type === 'image' ? 'Photo' : 'Attachment');
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /**
   * Sends the composer's contents. Returns whether it succeeded so the preview
   * can stay open on failure - closing it would hide the very attachments the
   * agent needs to retry, while the files are in fact still staged.
   */
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (sending) return false;
    if ((!inputText.trim() && !attachments.length) || !selectedChat) return false;

    setSending(true);
    try {
      await whatsappWebService.sendMessage(
        selectedChat.id,
        inputText.trim(),
        attachments.map((a) => a.file)
      );
      setInputText('');
      setQuickReplyQuery(null);
      clearAttachment();
      await loadChatMessages(selectedChat.id);
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send the message. Please try again.');
      return false;
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
      toast.error('Could not change the AI setting for this chat.');
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
      toast.error('Could not change the AI default for new chats.');
    }
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
    }
  };

  /**
   * Discards everything staged and releases the blob URLs.
   * The file input is reset too, so picking the same file again still fires
   * a change event - without that, re-attaching the file you just removed
   * silently does nothing.
   */
  const clearAttachment = () => {
    attachments.forEach((a) => URL.revokeObjectURL(a.url));
    setAttachments([]);
    setActiveFileIndex(0);
    setAttachmentPreviewOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /** Drops one file, keeping the preview on a valid index. */
  const removeFileAt = (index) => {
    const target = attachments[index];
    if (!target) return;

    URL.revokeObjectURL(target.url);
    const next = attachments.filter((_, i) => i !== index);

    // Computed outside the state updater on purpose. React may call an updater
    // more than once (StrictMode does, in development), so an updater has to be
    // pure - side effects like these belong here, where they run once.
    setAttachments(next);
    setActiveFileIndex((cur) => Math.max(0, Math.min(cur, next.length - 1)));

    if (!next.length) {
      setAttachmentPreviewOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /**
   * Stages a picked batch.
   *
   * Everything is checked here rather than after the upload: the count cap,
   * the per-file size the backend enforces, and duplicates - picking the same
   * file twice would otherwise send the customer two copies of it.
   */
  const addFiles = (picked) => {
    const incoming = Array.from(picked || []);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!incoming.length) return;

    const problems = [];
    const accepted = [];
    let room = MAX_ATTACHMENTS - attachments.length;

    for (const file of incoming) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        problems.push(`${file.name} is ${formatFileSize(file.size)} - the limit is ${formatFileSize(MAX_ATTACHMENT_BYTES)}.`);
        continue;
      }
      if (file.size === 0) {
        problems.push(`${file.name} is empty.`);
        continue;
      }
      const isDuplicate =
        attachments.some((a) => a.file.name === file.name && a.file.size === file.size) ||
        accepted.some((a) => a.file.name === file.name && a.file.size === file.size);
      if (isDuplicate) {
        problems.push(`${file.name} is already attached.`);
        continue;
      }
      if (room <= 0) {
        problems.push(`${file.name} was skipped - only ${MAX_ATTACHMENTS} files can be sent at once.`);
        continue;
      }

      accepted.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        url: URL.createObjectURL(file),
      });
      room -= 1;
    }

    if (accepted.length) {
      setAttachments((prev) => [...prev, ...accepted]);
      setAttachmentPreviewOpen(true);
    }
    if (problems.length) {
      toast.error(problems.join(' '));
    }
  };

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

  const insertEmoji = (emoji) => {
    setInputText((prev) => prev + emoji);
    setEmojiOpen(false);
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
      toast.error(err.response?.data?.message || 'Could not send the itinerary PDF.');
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
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search chats by name, phone or IG handle..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  loadChats(e.target.value);
                }}
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
              <button
                type="button"
                onClick={() => setPlatformFilter('instagram')}
                className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition flex items-center justify-center gap-1 ${
                  platformFilter === 'instagram'
                    ? 'bg-pink-600 text-white'
                    : 'bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 hover:bg-pink-100'
                }`}
              >
                <Instagram size={10} />
                Instagram ({chats.filter((c) => c.phone?.startsWith('IG_')).length})
              </button>
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredChats.length === 0 ? (
              <div className="text-center py-12 px-4 text-slate-400">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                <p className="text-xs font-medium">No conversations found.</p>
                <p className="text-[11px] mt-1 text-slate-500">
                  Inbound messages from WhatsApp & Instagram DMs will auto-appear here!
                </p>
              </div>
            ) : (
              filteredChats.map((chat) => {
                const isSelected = selectedChat?.id === chat.id;
                const isIg = chat.phone?.startsWith('IG_') || chat.chat_id?.startsWith('IG_');
                const igHandle = isIg ? chat.phone.replace('IG_', '') : '';

                return (
                  <button
                    key={chat.id}
                    onClick={() => loadChatMessages(chat.id)}
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

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {chat.last_message || 'Message'}
                      </p>

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

        {/* Center Column: Active Chat Thread */}
        <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-950/80">
          {selectedChat ? (
            <>
              {/* Chat Thread Header */}
              <div className="px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${
                      isSelectedIg
                        ? 'bg-gradient-to-tr from-pink-500 to-rose-600 text-white'
                        : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {isSelectedIg ? (
                      <Instagram className="w-4 h-4 text-white" />
                    ) : selectedChat.customer_name ? (
                      selectedChat.customer_name.charAt(0).toUpperCase()
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 min-w-0">
                      <span className="truncate">{selectedChat.customer_name || (isSelectedIg ? `@${selectedIgHandle}` : 'WhatsApp Contact')}</span>
                      {isSelectedIg ? (
                        <span className="text-[10px] font-extrabold bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full border border-pink-200 flex items-center gap-1 shrink-0">
                          <Instagram size={10} /> Instagram Direct DM
                        </span>
                      ) : (
                        <span className="text-xs font-normal text-slate-500 whitespace-nowrap shrink-0">+{selectedChat.phone}</span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-400 truncate">
                      {selectedChat.formatted_lead_id
                        ? `CRM Lead: ${selectedChat.formatted_lead_id} (${selectedChat.lead_stage || 'Inquiry'})`
                        : selectedChat.booking_trip
                        ? `Active Booking: ${selectedChat.booking_trip}`
                        : isSelectedIg
                        ? `Direct Instagram DM (@${selectedIgHandle})`
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

                        {msg.media_url && (
                          <button
                            type="button"
                            onClick={() => setViewingMedia(msg)}
                            className="block mb-1.5 w-full text-left"
                            title="Open attachment"
                          >
                            {msg.message_type === 'image' ? (
                              <img
                                src={msg.media_url}
                                alt={msg.message_text || 'Attachment'}
                                className="rounded-xl max-h-64 w-auto object-cover border border-black/5"
                                loading="lazy"
                              />
                            ) : (
                              <span
                                className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border ${
                                  isOutbound
                                    ? 'bg-white/15 border-white/20'
                                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                <FileText className="w-4 h-4 shrink-0" />
                                <span className="truncate underline underline-offset-2">Open attachment</span>
                              </span>
                            )}
                          </button>
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
                  );
                })}
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
                      onClick={() => setAttachmentPreviewOpen(true)}
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

              {!session.canSend && (
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
                      onClick={() => setIsQrModalOpen(true)}
                      className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-colors"
                    >
                      Scan QR
                    </button>
                  )}
                </div>
              )}

              {/* Message Input Box */}
              <form onSubmit={handleSendMessage} className={`px-4 pb-4 ${attachments.length ? 'pt-2' : 'pt-4 border-t border-slate-200 dark:border-slate-800'} bg-white dark:bg-slate-900 flex items-center gap-2`}>
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
                  className={`p-2.5 rounded-xl border transition-colors ${
                    attachments.length
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-300'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                  title="Attach PDF / Image"
                >
                  <Paperclip className="w-4 h-4" />
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
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-amber-500 hover:border-amber-300 transition-colors"
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                </div>

                {/* AI actions. A menu rather than one guessed action - the
                    agent decides what should happen to what they wrote. */}
                <div className="relative shrink-0">
                  {aiMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setAiMenuOpen(false)} />
                      <div className="absolute bottom-full right-0 mb-2 z-20 w-60 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
                        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                          AI assist
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
                    className="p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 disabled:opacity-50 transition-colors"
                    title="AI assist"
                  >
                    {aiDrafting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : inputText.trim() ? (
                      <Wand2 className="w-4 h-4" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={sending || !session.canSend || (!inputText.trim() && !attachments.length)}
                  title={session.canSend ? 'Send' : 'WhatsApp is not connected right now'}
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
      <AttachmentPreviewModal
        open={attachmentPreviewOpen && attachments.length > 0}
        mode="compose"
        attachments={attachments}
        activeIndex={activeFileIndex}
        onActiveIndexChange={setActiveFileIndex}
        onRemoveFile={removeFileAt}
        onAddFiles={() => fileInputRef.current?.click()}
        maxFiles={MAX_ATTACHMENTS}
        caption={inputText}
        onCaptionChange={setInputText}
        sending={sending}
        onSend={async () => {
          const sent = await handleSendMessage();
          // clearAttachment() already closes the preview on success; leaving
          // it open on failure keeps the retry in front of the agent.
          if (sent) setAttachmentPreviewOpen(false);
        }}
        onDiscardAll={clearAttachment}
        onClose={() => setAttachmentPreviewOpen(false)}
      />

      <AttachmentPreviewModal
        open={!!viewingMedia}
        mode="view"
        url={viewingMedia?.media_url}
        fileName={mediaNameOf(viewingMedia)}
        mimeType={mediaTypeOf(viewingMedia)}
        onClose={() => setViewingMedia(null)}
      />

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
