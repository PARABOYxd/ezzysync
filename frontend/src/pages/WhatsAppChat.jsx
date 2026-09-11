import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Copy,
  Edit3,
  Compass,
  Layers,
} from 'lucide-react';
import { whatsappWebService } from '../services/whatsappWebService';
import * as quotationService from '../services/quotationService';
import { API_BASE_URL } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { useToast } from '../hooks/useToast.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import WhatsAppQRModal from '../components/whatsapp/WhatsAppQRModal.jsx';
import AttachmentPreviewModal from '../components/whatsapp/AttachmentPreviewModal.jsx';

// WhatsApp itself caps a multi-attachment send; the backend enforces the same
// number, this is only so the UI can stop the agent before the upload.
const MAX_ATTACHMENTS = 8;

// Matches multer's per-file limit on the server. Checked here too so an
// oversized file is rejected before it is uploaded, rather than after.
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

const getItineraryImage = (bannerUrl) => {
  if (bannerUrl) {
    if (bannerUrl.includes('/uploads/')) {
      const relativePath = bannerUrl.substring(bannerUrl.indexOf('/uploads/'));
      const backendRoot = API_BASE_URL.replace('/api', '');
      return `${backendRoot}${relativePath}`;
    }
    return bannerUrl;
  }
  return 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=400&q=80';
};

/** "18h 20m" / "45m" - short enough to sit inside a one-line banner. */
function formatWindowRemaining(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function WhatsAppChat() {
  const toast = useToast();
  // Needed to tell this agent's own messages apart from a colleague's.
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const phoneParam = searchParams.get('phone');

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
  // What WhatsApp will accept in the open chat right now. Null for QR-linked
  // numbers, which have no 24-hour rule - see whatsappWindowService.
  const [chatWindow, setChatWindow] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [sendingTemplateId, setSendingTemplateId] = useState(null);
  const [itineraryModalOpen, setItineraryModalOpen] = useState(false);
  const [itineraryTab, setItineraryTab] = useState('catalog'); // 'catalog' | 'custom'
  const [catalogQuotations, setCatalogQuotations] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [sendingQuotationId, setSendingQuotationId] = useState(null);
  const [sendingActionType, setSendingActionType] = useState(null); // 'link' | 'pdf'
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
  const [startChatModal, setStartChatModal] = useState(false);
  const [startChatPhone, setStartChatPhone] = useState('');
  const [startChatMsg, setStartChatMsg] = useState('');
  const [startingChat, setStartingChat] = useState(false);

  // True when the search query looks like a phone number (≥8 digits)
  const isPhoneSearch = /^[\d\s+()-]{8,}$/.test(searchQuery.trim());

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

  // Fetched the first time a closed window is seen, not on every page load -
  // most agencies are on the QR path and will never need these.
  useEffect(() => {
    if (!chatWindow?.applies || chatWindow.isOpen || templates.length) return;
    whatsappWebService
      .listTemplates()
      .then((d) => setTemplates(d.templates || []))
      .catch(() => {});
  }, [chatWindow, templates.length]);

  const handleSendTemplate = async (template) => {
    if (sendingTemplateId) return;
    setSendingTemplateId(template.id);
    try {
      await whatsappWebService.sendTemplate(selectedChat.id, template.id);
      await loadChatMessages(selectedChat.id);
      toast.success('Message sent. The chat re-opens as soon as they reply.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send that message.');
    } finally {
      setSendingTemplateId(null);
    }
  };

  const loadChatMessages = async (chatId) => {
    setLoading(true);
    try {
      const data = await whatsappWebService.getChatMessages(chatId);
      setSelectedChat(data.chat);
      setChatWindow(data.window || null);
      setMessages(data.messages || []);
      // Refresh chats to clear unread badge
      loadChats();
    } catch (e) {
    } finally {
      setLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  // Auto-open or create chat if navigated with ?phone=...
  useEffect(() => {
    if (!phoneParam) return;
    const cleanPhone = phoneParam.trim();
    if (!cleanPhone) return;

    whatsappWebService
      .startChat(cleanPhone, '')
      .then(async (res) => {
        if (res?.chatId) {
          await loadChats();
          await loadChatMessages(res.chatId);
          setSearchParams({}, { replace: true });
        }
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || 'Could not open chat for this phone number.');
      });
  }, [phoneParam]);

  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const selectedChatRef = useRef(selectedChat);
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  useEffect(() => {
    loadStatus();
    loadChats();
    whatsappWebService
      .listQuickReplies()
      .then((d) => setQuickReplies(d.quickReplies || []))
      .catch(() => {});

    // Poll chats and active message updates every 3 seconds
    const interval = setInterval(() => {
      loadStatus();
      loadChats();
      const currentChatId = selectedChatRef.current?.id;
      if (currentChatId) {
        whatsappWebService
          .getChatMessages(currentChatId)
          .then((data) => {
            // The agent may have opened a different conversation while this
            // request was in flight. Without this check its messages were
            // written into whichever chat is open now, so the thread showed
            // someone else's conversation until the next poll corrected it.
            if (selectedChatRef.current?.id !== currentChatId) return;

            if (data?.chat && data.chat.id === currentChatId) {
              setSelectedChat((prev) => (prev ? { ...prev, ...data.chat } : data.chat));
              setChatWindow(data.window || null);
            }
            const incoming = data?.messages || [];
            const current = messagesRef.current;
            const incomingKey = incoming.map((m) => `${m.id}_${m.status}`).join('|');
            const currentKey = current.map((m) => `${m.id}_${m.status}`).join('|');

            if (incomingKey !== currentKey) {
              setMessages(incoming);
              scrollToBottom();
            }
          })
          .catch(() => {});
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

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

  const formatDaysToText = (q) => {
    let text = '';
    if (q.priceQuote > 0) {
      text += `Price Quote: ₹${Number(q.priceQuote).toLocaleString('en-IN')}\n\n`;
    }
    if (q.itineraryDays && q.itineraryDays.length > 0) {
      text += q.itineraryDays
        .map((d, idx) => {
          const dayNum = d.day || d.dayNumber || idx + 1;
          const title = d.title ? `Day ${dayNum}: ${d.title}` : `Day ${dayNum}`;
          const desc = d.description ? `\n${d.description}` : '';
          return `${title}${desc}`;
        })
        .join('\n\n');
    }
    if (q.highlights && q.highlights.length > 0) {
      text += '\n\n## Trip Highlights\n' + q.highlights.map((h) => `- ${h}`).join('\n');
    }
    if (q.inclusions && q.inclusions.length > 0) {
      text += '\n\n## Inclusions\n' + q.inclusions.map((inc) => `- ${inc}`).join('\n');
    }
    return text.trim();
  };

  const loadCatalogQuotations = async () => {
    setLoadingCatalog(true);
    try {
      const data = await quotationService.getQuotations({ limit: 150 });
      setCatalogQuotations(data.quotations || []);
    } catch (err) {
      console.error('Failed to load catalog quotations', err);
    } finally {
      setLoadingCatalog(false);
    }
  };

  const handleOpenItineraryModal = () => {
    setItineraryModalOpen(true);
    setItineraryTab('catalog');
    loadCatalogQuotations();
  };

  const handleSendExistingLink = async (q) => {
    if (!selectedChat) return;
    setSendingQuotationId(q.id || q.quotationId);
    setSendingActionType('link');
    try {
      const link = `${window.location.origin}/quote-preview/${q.id}`;
      const nights = q.itineraryDays?.length > 1 ? q.itineraryDays.length - 1 : 0;
      const duration = `${q.itineraryDays?.length || 1}D / ${nights}N`;

      let msg = `Hi ${selectedChat.customer_name || 'there'}! Here is the customized travel itinerary for *${q.tripName}* (${duration}) ✈️\n\n`;
      msg += `🌐 *Interactive Itinerary Link:*\n${link}\n`;
      if (q.priceQuote > 0) {
        msg += `\n💰 *Price Quote:* ₹${Number(q.priceQuote).toLocaleString('en-IN')}`;
      }
      if (q.highlights && q.highlights.length > 0) {
        msg += `\n\n✨ *Key Highlights:*\n` + q.highlights.slice(0, 4).map((h) => `• ${h}`).join('\n');
      }
      msg += `\n\nFeel free to review and let us know if you'd like any customizations!`;

      await whatsappWebService.sendMessage(selectedChat.id, msg);
      toast.success(`Itinerary link for "${q.tripName}" sent to WhatsApp!`);
      setItineraryModalOpen(false);
      await loadChatMessages(selectedChat.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send the itinerary link.');
    } finally {
      setSendingQuotationId(null);
      setSendingActionType(null);
    }
  };

  const handleInsertExistingLink = (q) => {
    const link = `${window.location.origin}/quote-preview/${q.id}`;
    const nights = q.itineraryDays?.length > 1 ? q.itineraryDays.length - 1 : 0;
    const duration = `${q.itineraryDays?.length || 1}D / ${nights}N`;

    let msg = `Hi ${selectedChat?.customer_name || 'there'}! Here is the customized travel itinerary for *${q.tripName}* (${duration}) ✈️\n\n`;
    msg += `🌐 *Interactive Itinerary Link:*\n${link}\n`;
    if (q.priceQuote > 0) {
      msg += `\n💰 *Price Quote:* ₹${Number(q.priceQuote).toLocaleString('en-IN')}`;
    }
    if (q.highlights && q.highlights.length > 0) {
      msg += `\n\n✨ *Key Highlights:*\n` + q.highlights.slice(0, 4).map((h) => `• ${h}`).join('\n');
    }

    setInputText((prev) => (prev.trim() ? `${prev}\n\n${msg}` : msg));
    toast.success('Itinerary link and details pasted into chat composer!');
    setItineraryModalOpen(false);
  };

  const handleSendExistingPdf = async (q) => {
    if (!selectedChat) return;
    const formattedText = formatDaysToText(q);
    if (!formattedText) {
      toast.error('This itinerary has no day-by-day details to generate a PDF.');
      return;
    }
    setSendingQuotationId(q.id || q.quotationId);
    setSendingActionType('pdf');
    try {
      await whatsappWebService.sendItineraryPdf(selectedChat.id, q.tripName, formattedText);
      toast.success(`Itinerary PDF for "${q.tripName}" generated & sent!`);
      setItineraryModalOpen(false);
      await loadChatMessages(selectedChat.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not generate & send the itinerary PDF.');
    } finally {
      setSendingQuotationId(null);
      setSendingActionType(null);
    }
  };

  const handleCustomizeExisting = (q) => {
    setItineraryForm({
      tripName: q.tripName || '',
      itineraryText: formatDaysToText(q) || '',
    });
    setItineraryTab('custom');
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

  const handleStartChat = async (e) => {
    e.preventDefault();
    if (!startChatPhone.trim()) return;
    setStartingChat(true);
    try {
      const { chatId } = await whatsappWebService.startChat(startChatPhone.trim(), startChatMsg.trim());
      setStartChatModal(false);
      setSearchQuery('');
      await loadChats();
      await loadChatMessages(chatId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start new chat. Make sure WhatsApp is connected.');
    } finally {
      setStartingChat(false);
    }
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

            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredChats.length === 0 ? (
              <div className="text-center py-12 px-4 text-slate-400">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                <p className="text-xs font-medium">No conversations found.</p>
                {isPhoneSearch && session.status === 'connected' ? (
                  <button
                    onClick={() => {
                      setStartChatPhone(searchQuery.trim());
                      setStartChatMsg('');
                      setStartChatModal(true);
                    }}
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

                  {/* Send Itinerary button */}
                  <button
                    onClick={handleOpenItineraryModal}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm whitespace-nowrap"
                    title="Share Itinerary (Select Existing or Create Custom PDF)"
                  >
                    <Compass className="w-3.5 h-3.5 shrink-0" />
                    <span>Itinerary</span>
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

              {/* Only the Cloud API has a 24-hour rule, so this appears only
                  where it actually applies. Without it, a reply typed outside
                  the window is refused by Meta and simply never arrives - with
                  nothing on screen to say so. */}
              {chatWindow?.applies && !chatWindow.isOpen && (
                <div className="mx-4 mt-3 px-3.5 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-start gap-2 text-[11px] text-blue-800 dark:text-blue-300">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
                  <span className="flex-1">
                    <strong>This customer hasn&apos;t replied in 24 hours.</strong>{' '}
                    WhatsApp only allows a ready-made message here. Pick one below — once they
                    reply, you can chat normally again.
                  </span>
                </div>
              )}

              {chatWindow?.applies && chatWindow.isOpen && chatWindow.secondsRemaining < 4 * 3600 && (
                <div className="mx-4 mt-3 px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center gap-2 text-[11px] text-amber-700 dark:text-amber-300">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Free replies end in {formatWindowRemaining(chatWindow.secondsRemaining)} — after
                    that you&apos;ll need a ready-made message.
                  </span>
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
                          onClick={() => handleSendTemplate(tpl)}
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

                {/* Quick Share Itinerary button */}
                <button
                  type="button"
                  onClick={handleOpenItineraryModal}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-colors"
                  title="Share Itinerary (Select Existing or Create Custom PDF)"
                >
                  <Compass className="w-4 h-4" />
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
              )}
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

      {/* ── Share Itinerary Modal (Select Existing or Create Custom PDF) ── */}
      {itineraryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
            
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Compass size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Share Travel Itinerary</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Send interactive link or generated PDF to +{selectedChat?.phone}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setItineraryModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 pt-2 shrink-0 bg-slate-50/30 dark:bg-slate-900/50 gap-2">
              <button
                type="button"
                onClick={() => setItineraryTab('catalog')}
                className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                  itineraryTab === 'catalog'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Layers size={14} />
                <span>Existing Itineraries</span>
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-400">
                  {catalogQuotations.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setItineraryTab('custom')}
                className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                  itineraryTab === 'custom'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Edit3 size={14} />
                <span>Create Custom PDF</span>
              </button>
            </div>

            {/* Modal Body */}
            {itineraryTab === 'catalog' ? (
              <div className="flex-1 overflow-hidden flex flex-col p-4 sm:p-5">
                {/* Search Bar */}
                <div className="relative mb-3 shrink-0">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search itineraries by trip name..."
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-200"
                  />
                  {catalogSearch && (
                    <button
                      type="button"
                      onClick={() => setCatalogSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Itinerary List */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {loadingCatalog ? (
                    <div className="space-y-3 py-4">
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="animate-pulse p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex gap-3">
                          <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-xl shrink-0" />
                          <div className="flex-1 space-y-2 py-1">
                            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                            <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded w-1/3" />
                            <div className="h-3 bg-slate-100 dark:bg-slate-800/40 rounded w-3/4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : catalogQuotations.filter((q) => {
                      if (!catalogSearch.trim()) return true;
                      const s = catalogSearch.toLowerCase();
                      return (
                        q.tripName?.toLowerCase().includes(s) ||
                        q.quotationId?.toLowerCase().includes(s) ||
                        q.customerName?.toLowerCase().includes(s)
                      );
                    }).length === 0 ? (
                    <div className="text-center py-10 px-4 text-slate-400">
                      <Compass className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {catalogSearch ? `No itineraries matching "${catalogSearch}"` : 'No itineraries found in catalog'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                        You can create day-by-day plans in the "Itineraries & Quotes" section, or use the "Create Custom PDF" tab right here.
                      </p>
                      <button
                        type="button"
                        onClick={() => setItineraryTab('custom')}
                        className="mt-3 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                      >
                        Create Custom Itinerary PDF
                      </button>
                    </div>
                  ) : (
                    catalogQuotations
                      .filter((q) => {
                        if (!catalogSearch.trim()) return true;
                        const s = catalogSearch.toLowerCase();
                        return (
                          q.tripName?.toLowerCase().includes(s) ||
                          q.quotationId?.toLowerCase().includes(s) ||
                          q.customerName?.toLowerCase().includes(s)
                        );
                      })
                      .map((q) => {
                        const nights = q.itineraryDays?.length > 1 ? q.itineraryDays.length - 1 : 0;
                        const durationText = `${q.itineraryDays?.length || 1}D${nights > 0 ? ` / ${nights}N` : ''}`;
                        const isSendingThis = sendingQuotationId === (q.id || q.quotationId);

                        return (
                          <div
                            key={q.quotationId || q.id}
                            className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800/80 bg-white dark:bg-slate-800/40 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 transition-all flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between shadow-xs"
                          >
                            {/* Image & Details */}
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <img
                                src={getItineraryImage(q.bannerUrl)}
                                alt={q.tripName}
                                className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shrink-0 border border-slate-100 dark:border-slate-700 shadow-2xs"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                                    {q.tripName}
                                  </h4>
                                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 shrink-0">
                                    {durationText}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                  {q.priceQuote > 0 && (
                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                      {formatCurrency(q.priceQuote)}
                                    </span>
                                  )}
                                  <span>•</span>
                                  <span>{q.itineraryDays?.length || 1} Days Timeline</span>
                                </div>
                                {q.highlights && q.highlights.length > 0 && (
                                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                                    ✨ {q.highlights.slice(0, 2).join(' • ')}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Quick Action Buttons */}
                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
                              {/* Send Link Button */}
                              <button
                                type="button"
                                disabled={isSendingThis}
                                onClick={() => handleSendExistingLink(q)}
                                title="Send interactive preview link directly to customer on WhatsApp"
                                className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                              >
                                {isSendingThis && sendingActionType === 'link' ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <ExternalLink size={12} />
                                )}
                                <span>Send Link</span>
                              </button>

                              {/* Send as PDF */}
                              <button
                                type="button"
                                disabled={isSendingThis}
                                onClick={() => handleSendExistingPdf(q)}
                                title="Generate PDF from this itinerary and send to WhatsApp"
                                className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-500 text-white flex items-center gap-1 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                              >
                                {isSendingThis && sendingActionType === 'pdf' ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <FileText size={12} />
                                )}
                                <span>Send PDF</span>
                              </button>

                              {/* Insert Into Chat */}
                              <button
                                type="button"
                                onClick={() => handleInsertExistingLink(q)}
                                title="Paste link & highlights into composer so you can edit before sending"
                                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                              >
                                <Copy size={14} />
                              </button>

                              {/* Customize in Custom Tab */}
                              <button
                                type="button"
                                onClick={() => handleCustomizeExisting(q)}
                                title="Edit day-by-day text in custom PDF generator"
                                className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-colors cursor-pointer"
                              >
                                <Edit3 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendItinerary} className="p-5 space-y-4 flex-1 overflow-y-auto">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Trip Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 5 Days Luxury Goa Vacation"
                    value={itineraryForm.tripName}
                    onChange={(e) => setItineraryForm({ ...itineraryForm, tripName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Day-by-Day Itinerary Text
                    </label>
                    <span className="text-[10px] text-slate-400">Supports "Day 1: Title" & bullet points</span>
                  </div>
                  <textarea
                    rows={7}
                    placeholder="Day 1: Arrival & Sunset Beach Club&#10;Check-in to resort, welcome drinks and private sunset dinner.&#10;&#10;Day 2: Private Yacht Cruise&#10;Dolphin spotting and secluded island barbecue..."
                    value={itineraryForm.itineraryText}
                    onChange={(e) => setItineraryForm({ ...itineraryForm, itineraryText: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                    required
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setItineraryTab('catalog')}
                    className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Layers size={13} />
                    <span>Back to Catalog</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setItineraryModalOpen(false)}
                      className="px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={sendingItinerary}
                      className="px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 disabled:opacity-50 flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      {sendingItinerary && <Loader2 size={13} className="animate-spin" />}
                      <span>{sendingItinerary ? 'Generating & Sending PDF...' : 'Send PDF via WhatsApp'}</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* ── Start New Chat Modal ── */}
      {startChatModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                  <MessageSquare size={15} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Start New Chat</h3>
              </div>
              <button onClick={() => setStartChatModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleStartChat} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={startChatPhone}
                  onChange={(e) => setStartChatPhone(e.target.value)}
                  placeholder="e.g. 9136520538 or +919136520538"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Opening Message <span className="font-normal text-slate-400">(optional)</span></label>
                <textarea
                  value={startChatMsg}
                  onChange={(e) => setStartChatMsg(e.target.value)}
                  placeholder="Hi! I'm reaching out regarding..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setStartChatModal(false)}
                  className="flex-1 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={startingChat || !startChatPhone.trim()}
                  className="flex-1 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                >
                  {startingChat ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  {startingChat ? 'Starting...' : 'Start Chat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
