import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bot, QrCode } from 'lucide-react';
import { whatsappWebService } from '../services/whatsappWebService';
import * as settingsService from '../services/settingsService';
import * as quotationService from '../services/quotationService';
import * as bookingService from '../services/bookingService';
import { useToast } from '../hooks/useToast.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import WhatsAppQRModal from '../components/whatsapp/WhatsAppQRModal.jsx';
import AttachmentPreviewModal from '../components/whatsapp/AttachmentPreviewModal.jsx';
import { mediaTypeOf, mediaNameOf } from '../utils/whatsappMessageFormatters';
import ChatListPanel from '../components/whatsapp/ChatListPanel.jsx';
import ChatThread from '../components/whatsapp/ChatThread.jsx';
import CustomerInfoPanel from '../components/whatsapp/CustomerInfoPanel.jsx';
import ItineraryShareModal from '../components/whatsapp/ItineraryShareModal.jsx';
import StartChatModal from '../components/whatsapp/StartChatModal.jsx';

// WhatsApp itself caps a multi-attachment send; the backend enforces the same
// number, this is only so the UI can stop the agent before the upload.
const MAX_ATTACHMENTS = 8;

// Matches multer's per-file limit on the server. Checked here too so an
// oversized file is rejected before it is uploaded, rather than after.
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

export default function WhatsAppChat() {
  const toast = useToast();
  // Needed to tell this agent's own messages apart from a colleague's.
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const phoneParam = searchParams.get('phone');
  const openItineraryParam = searchParams.get('openItinerary');

  const [session, setSession] = useState({
    status: 'disconnected',
    phoneNumber: '',
    aiAutopilotEnabled: false,
    // Only a live socket can deliver. The stored status alone used to show
    // "Connected" while every send failed.
    canSend: false,
  });
  // "Start New Chat" used to require a live QR socket (session.status ===
  // 'connected'), even for a tenant that only ever configured Cloud API and
  // has no QR session at all - the button simply never appeared for them,
  // with nothing on screen explaining why. Cloud API needs no socket, just
  // these credentials being present.
  const [cloudApiConfigured, setCloudApiConfigured] = useState(false);
  useEffect(() => {
    settingsService.getSettings()
      .then((s) => setCloudApiConfigured(!!s.whatsappPhoneNumberId))
      .catch(() => {});
  }, []);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
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
  const [togglingAi, setTogglingAi] = useState(false);
  const [quickReplies, setQuickReplies] = useState([]);
  const [viewingMedia, setViewingMedia] = useState(null); // a message already in the thread
  const [attachmentPreviewOpen, setAttachmentPreviewOpen] = useState(false);
  const [platformFilter, setPlatformFilter] = useState('all'); // 'all' | 'whatsapp' | 'instagram'
  const [startChatModal, setStartChatModal] = useState(false);
  const [startChatPhone, setStartChatPhone] = useState('');
  const [startChatMsg, setStartChatMsg] = useState('');
  const [startingChat, setStartingChat] = useState(false);
  const [sendingVoucherType, setSendingVoucherType] = useState(null);

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
    } catch {
      // ignore - the poller will retry
    }
  };

  const loadChats = async (search = searchQuery) => {
    try {
      const data = await whatsappWebService.listChats(search);
      setChats(data.chats || []);
    } catch {
      // ignore - the poller will retry
    }
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
    try {
      const data = await whatsappWebService.getChatMessages(chatId);
      setSelectedChat(data.chat);
      setChatWindow(data.window || null);
      setMessages(data.messages || []);
      // Refresh chats to clear unread badge
      loadChats();
    } catch {
      // ignore - the poller will retry
    } finally {
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
          // Lets a "Share Itinerary" link elsewhere in the app (e.g. a booking
          // row) land directly on the modal instead of just the bare chat.
          if (openItineraryParam) {
            handleOpenItineraryModal();
          }
          setSearchParams({}, { replace: true });
        }
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || 'Could not open chat for this phone number.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const chatMediaFiles = useMemo(() => {
    return (messages || []).filter((m) => m && m.media_url);
  }, [messages]);

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
    } catch {
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
    } catch {
      toast.error('Could not change the AI default for new chats.');
    }
  };

  const handleSendChatVoucher = async (type) => {
    const bookingId = selectedChat?.formatted_booking_id || selectedChat?.booking_uuid || selectedChat?.booking_id;
    if (!bookingId) {
      toast.error('No booking linked to this conversation.');
      return;
    }
    setSendingVoucherType(type);
    try {
      const res = await bookingService.sendVoucherToWhatsApp(bookingId, { type });
      if (res.sentToWhatsApp) {
        toast.success(`Official ${type === 'hotel' ? 'Hotel' : 'Transport'} Voucher PDF dispatched to ${selectedChat.customer_name || 'customer'}!`);
      } else {
        toast.success('Voucher PDF generated and ready.');
      }
      const data = await whatsappWebService.getChatMessages(selectedChat.id);
      setMessages(data.messages || []);
      loadChats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send voucher via WhatsApp.');
    } finally {
      setSendingVoucherType(null);
    }
  };

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
        problems.push(`${file.name} is ${Math.round(file.size / (1024 * 1024))}MB - too large.`);
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
        <ChatListPanel
          chats={chats}
          selectedChat={selectedChat}
          searchQuery={searchQuery}
          onSearchChange={(value) => {
            setSearchQuery(value);
            loadChats(value);
          }}
          platformFilter={platformFilter}
          setPlatformFilter={setPlatformFilter}
          sessionStatus={session.status}
          cloudApiConfigured={cloudApiConfigured}
          onSelectChat={loadChatMessages}
          onStartNewChat={(phone) => {
            setStartChatPhone(phone);
            setStartChatMsg('');
            setStartChatModal(true);
          }}
        />

        {/* Center Column: Active Chat Thread */}
        <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-950/80">
          <ChatThread
            selectedChat={selectedChat}
            messages={messages}
            user={user}
            isSelectedIg={isSelectedIg}
            selectedIgHandle={selectedIgHandle}
            chatWindow={chatWindow}
            session={session}
            attachments={attachments}
            addFiles={addFiles}
            clearAttachment={clearAttachment}
            fileInputRef={fileInputRef}
            inputText={inputText}
            setInputText={setInputText}
            templates={templates}
            sendingTemplateId={sendingTemplateId}
            onSendTemplate={handleSendTemplate}
            quickReplies={quickReplies}
            sending={sending}
            onSendMessage={handleSendMessage}
            togglingAi={togglingAi}
            onToggleChatAi={handleToggleChatAi}
            onOpenItineraryModal={handleOpenItineraryModal}
            onViewMedia={setViewingMedia}
            onOpenQrModal={() => setIsQrModalOpen(true)}
            onOpenAttachmentPreview={() => setAttachmentPreviewOpen(true)}
            messagesEndRef={messagesEndRef}
          />
        </div>

        {/* Right Column: Customer Lead & Booking 360° Sidebar */}
        {selectedChat && (
          <CustomerInfoPanel
            selectedChat={selectedChat}
            chatMediaFiles={chatMediaFiles}
            sendingVoucherType={sendingVoucherType}
            onSendVoucher={handleSendChatVoucher}
            onViewMedia={setViewingMedia}
          />
        )}
      </div>

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

      {itineraryModalOpen && (
        <ItineraryShareModal
          open={itineraryModalOpen}
          onClose={() => setItineraryModalOpen(false)}
          selectedChat={selectedChat}
          itineraryTab={itineraryTab}
          setItineraryTab={setItineraryTab}
          catalogQuotations={catalogQuotations}
          loadingCatalog={loadingCatalog}
          catalogSearch={catalogSearch}
          setCatalogSearch={setCatalogSearch}
          sendingQuotationId={sendingQuotationId}
          sendingActionType={sendingActionType}
          onSendExistingLink={handleSendExistingLink}
          onSendExistingPdf={handleSendExistingPdf}
          onInsertExistingLink={handleInsertExistingLink}
          onCustomizeExisting={handleCustomizeExisting}
          itineraryForm={itineraryForm}
          setItineraryForm={setItineraryForm}
          sendingItinerary={sendingItinerary}
          onSendItinerary={handleSendItinerary}
        />
      )}

      <StartChatModal
        open={startChatModal}
        onClose={() => setStartChatModal(false)}
        phone={startChatPhone}
        setPhone={setStartChatPhone}
        message={startChatMsg}
        setMessage={setStartChatMsg}
        onSubmit={handleStartChat}
        starting={startingChat}
      />
    </div>
  );
}
