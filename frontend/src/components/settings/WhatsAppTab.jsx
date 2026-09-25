import React, { useEffect, useRef, useState } from 'react';
import * as settingsService from '../../services/settingsService';
import * as whatsappTemplateService from '../../services/whatsappTemplateService';
import { whatsappWebService } from '../../services/whatsappWebService';
import { useToast } from '../../hooks/useToast.jsx';
import WhatsAppQRModal from '../whatsapp/WhatsAppQRModal.jsx';
import { FileCheck, Sparkles, RefreshCw, MessageSquare, ChevronDown, ChevronUp, Plus, Edit2, Trash2 } from 'lucide-react';
import Input from '../ui/Input.jsx';
import Button from '../ui/Button.jsx';

export default function WhatsAppTab({ settings, setSettings }) {
  const toast = useToast();
  const templateTextareaRef = useRef(null);

  const [showAdvancedWA, setShowAdvancedWA] = useState(false);
  const [waRequest, setWaRequest] = useState({ phone: '', companyName: '', submitted: false, submitting: false });
  const [connectingWA, setConnectingWA] = useState(false);
  const [disconnectingWA, setDisconnectingWA] = useState(false);
  const [waCreds, setWaCreds] = useState({ whatsappPhoneNumberId: '', whatsappAccessToken: '', whatsappWabaId: '', whatsappBusinessId: '', whatsappAppSecret: '' });
  // The live state of the QR-linked session. This panel used to show a green
  // "Active System" badge that was hardcoded, so a disconnected number still
  // read as connected - the one thing an owner opens this page to check.
  const [qrSession, setQrSession] = useState(null);
  // One checked answer to "what is live, what will a reply use, what may the
  // AI answer" - the page used to leave the owner to work that out from three
  // separate cards.
  const [overview, setOverview] = useState(null);
  const [togglingAutopilot, setTogglingAutopilot] = useState(false);
  const [applyingToAll, setApplyingToAll] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [disconnectingQr, setDisconnectingQr] = useState(false);
  const [savingWaCreds, setSavingWaCreds] = useState(false);

  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [syncingTemplates, setSyncingTemplates] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    type: 'text',
    name: '',
    body: '',
    languageCode: 'en_US',
    category: 'UTILITY',
    variablesMap: {}
  });
  const [addingTemplate, setAddingTemplate] = useState(false);
  const [showAddTemplateForm, setShowAddTemplateForm] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [checkingMeta, setCheckingMeta] = useState(false);
  const [existingMetaFound, setExistingMetaFound] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [submittingMetaId, setSubmittingMetaId] = useState(null);

  // Mirrors the server's values (access token/app secret arrive masked as
  // ••••••••, same placeholder updateSettings knows to leave alone) so this
  // form never starts out of sync with what's actually saved, e.g. right
  // after the embedded-signup popup finishes.
  useEffect(() => {
    if (!settings) return;
    setWaCreds({
      whatsappPhoneNumberId: settings.whatsappPhoneNumberId || '',
      whatsappAccessToken: settings.whatsappAccessToken || '',
      whatsappWabaId: settings.whatsappWabaId || '',
      whatsappBusinessId: settings.whatsappBusinessId || '',
      whatsappAppSecret: settings.whatsappAppSecret || '',
    });
  }, [settings]);

  const refreshQrSession = () => {
    whatsappWebService
      .getStatus()
      .then(setQrSession)
      .catch(() => setQrSession(null));
    whatsappWebService
      .getConnectionOverview()
      .then(setOverview)
      .catch(() => setOverview(null));
  };

  const handleAiForAllChats = async (enabled) => {
    const count = overview?.ai?.totalChats || 0;
    if (!window.confirm(
      enabled
        ? `Hand all ${count} existing conversations to the AI? It will start replying to them on its own.`
        : `Take all ${count} conversations back from the AI? You will reply to them yourself.`
    )) return;
    setApplyingToAll(true);
    try {
      const res = await whatsappWebService.setAiForAllChats(enabled);
      toast.success(`${res.updated} conversation${res.updated === 1 ? '' : 's'} updated.`);
      refreshQrSession();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update the existing chats.');
    } finally {
      setApplyingToAll(false);
    }
  };

  const handleToggleAutopilot = async () => {
    if (!overview) return;
    const next = !overview.ai.autopilotForNewChats;
    setTogglingAutopilot(true);
    try {
      await whatsappWebService.toggleAiAutopilot(next);
      setOverview((prev) => ({ ...prev, ai: { ...prev.ai, autopilotForNewChats: next } }));
      toast.success(next ? 'AI will answer new chats on its own.' : 'New chats will wait for a person.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not change the AI default.');
    } finally {
      setTogglingAutopilot(false);
    }
  };

  useEffect(() => {
    refreshQrSession();
    setLoadingTemplates(true);
    whatsappTemplateService.getTemplates()
      .then(setTemplates)
      .catch(() => toast.error('Failed to load templates.'))
      .finally(() => setLoadingTemplates(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDisconnectQr = async () => {
    if (!window.confirm('Unlink this WhatsApp number? Your chats stay, but nothing can be sent or received until you scan again.')) return;
    setDisconnectingQr(true);
    try {
      await whatsappWebService.disconnect();
      toast.success('WhatsApp unlinked.');
      refreshQrSession();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not unlink WhatsApp.');
    } finally {
      setDisconnectingQr(false);
    }
  };

  // For pasting in credentials directly - a Meta sandbox/test number's Phone
  // Number ID and temporary access token (from developers.facebook.com's
  // WhatsApp > API Setup page) aren't reachable through the embedded-signup
  // popup at all, since that flow is built for onboarding a verified Business
  // Manager WABA, not a developer test number. Posts to the same generic
  // settings endpoint the rest of this page already uses.
  const handleSaveWaCreds = async () => {
    setSavingWaCreds(true);
    try {
      const res = await settingsService.updateSettings(waCreds);
      setSettings(res);
      toast.success('WhatsApp credentials saved.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save WhatsApp credentials.');
    } finally {
      setSavingWaCreds(false);
    }
  };

  const hasOwnWA = !!(settings.whatsappPhoneNumberId && settings.whatsappAccessToken);

  const handleLaunchEmbeddedSignup = () => {
    const effectiveAppId = (import.meta.env.VITE_FACEBOOK_APP_ID || settings.whatsappBusinessId || '1065519269552814').trim();

    setConnectingWA(true);
    const width = 640;
    const height = 750;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const redirectUri = `${window.location.origin}/settings`;
    const metaAuthUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${encodeURIComponent(effectiveAppId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code,token&scope=whatsapp_business_management,whatsapp_business_messaging`;

    const popup = window.open(
      metaAuthUrl,
      'MetaWhatsAppLogin',
      `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=yes`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      toast.error('Popup blocked by browser. Please allow popups for this site.');
      setConnectingWA(false);
      return;
    }

    const interval = setInterval(() => {
      if (popup.closed) {
        clearInterval(interval);
        setConnectingWA(false);
      }
    }, 1000);
  };

  const handleDisconnectWA = async () => {
    if (!window.confirm('Are you sure you want to disconnect this WhatsApp number? Messages will revert to EzzySync Shared Number.')) return;
    setDisconnectingWA(true);
    try {
      const res = await settingsService.disconnectWhatsapp();
      setSettings(res.settings);
      toast.success('WhatsApp disconnected. Reverted to shared number.');
    } catch {
      toast.error('Failed to disconnect WhatsApp.');
    } finally {
      setDisconnectingWA(false);
    }
  };

  const handleWaRequest = async () => {
    if (!waRequest.phone || !waRequest.companyName) {
      toast.error('Please fill in all fields.');
      return;
    }
    setWaRequest(r => ({ ...r, submitting: true }));
    try {
      await settingsService.requestWhatsappSetup({
        phone: waRequest.phone,
        companyName: waRequest.companyName,
      });
      setWaRequest(r => ({ ...r, submitted: true, submitting: false }));
      toast.success('Request submitted! EzzySync team will contact you within 24 hours.');
    } catch {
      toast.error('Could not submit request. Please try again.');
      setWaRequest(r => ({ ...r, submitting: false }));
    }
  };

  const detectedPlaceholders = Array.from(new Set((newTemplate.body || '').match(/\{\{(\d+)\}\}/g) || []))
    .map((p) => p.replace(/[{}]/g, ''))
    .sort((a, b) => parseInt(a) - parseInt(b));

  // Inserts {{n}} at the textarea's current cursor position (or appends, if
  // nothing is focused yet) - this button called a function that was never
  // defined, so every "Quick Variable Insert" click threw a ReferenceError.
  const insertPlaceholder = (num) => {
    const placeholder = `{{${num}}}`;
    const textarea = templateTextareaRef.current;
    if (!textarea) {
      setNewTemplate((prev) => ({ ...prev, body: (prev.body || '') + placeholder }));
      return;
    }
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const nextBody = textarea.value.slice(0, start) + placeholder + textarea.value.slice(end);
    setNewTemplate((prev) => ({ ...prev, body: nextBody }));
    requestAnimationFrame(() => {
      textarea.focus();
      const pos = start + placeholder.length;
      textarea.setSelectionRange(pos, pos);
    });
  };

  const getPreviewText = (body) => {
    if (!body) return '';
    return body
      .replace(/\{\{1\}\}/g, 'Rishabh')
      .replace(/\{\{2\}\}/g, settings?.companyName || 'Goa 3D/2N Tour')
      .replace(/\{\{3\}\}/g, '15th Sept')
      .replace(/\{\{4\}\}/g, '₹12,500')
      .replace(/\{\{5\}\}/g, settings?.companyName || 'EzzySync Travels')
      .replace(/\{\{6\}\}/g, 'https://ezzysync.com/pay/inv_987');
  };

  const handleEditStart = (t) => {
    setEditingTemplateId(t.id);
    setNewTemplate({
      type: t.type || 'text',
      name: t.name || '',
      body: t.body || '',
      languageCode: t.language_code || 'en_US',
      category: t.category || 'UTILITY',
      variablesMap: typeof t.variables_map === 'string' ? JSON.parse(t.variables_map) : (t.variables_map || {})
    });
    setShowAddTemplateForm(true);
    setExistingMetaFound(null);
  };

  const handleSaveTemplate = async (submitToMeta = true) => {
    if (!newTemplate.name || !newTemplate.body) {
      toast.error('Name/shortcut and body content are required.');
      return;
    }
    setAddingTemplate(true);
    try {
      if (editingTemplateId) {
        const updated = await whatsappTemplateService.updateTemplate(editingTemplateId, {
          ...newTemplate,
          submitToMeta
        });
        setTemplates((prev) => prev.map((item) => item.id === editingTemplateId ? updated : item));
        if (newTemplate.type === 'text') {
          toast.success('Quick Message updated successfully!');
        } else if (submitToMeta) {
          toast.success('Template update submitted to Meta for review!');
        } else {
          toast.success('Meta Template draft updated!');
        }
      } else {
        const created = await whatsappTemplateService.createTemplate({
          ...newTemplate,
          submitToMeta
        });
        setTemplates((prev) => [created, ...prev]);
        if (newTemplate.type === 'text') {
          toast.success('Quick Message saved successfully!');
        } else if (submitToMeta) {
          toast.success(existingMetaFound ? 'Template imported and saved!' : 'Template submitted to Meta for review!');
        } else {
          toast.success('Meta Template saved as local draft!');
        }
      }
      setShowAddTemplateForm(false);
      setShowPreviewModal(false);
      setEditingTemplateId(null);
      setExistingMetaFound(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save template.');
    } finally {
      setAddingTemplate(false);
    }
  };

  const handleCheckMetaTemplate = async (name) => {
    if (!name || name.length < 2 || newTemplate.type !== 'template') return;
    setCheckingMeta(true);
    try {
      const res = await whatsappTemplateService.lookupTemplate(name);
      if (res.exists) {
        setExistingMetaFound(res.template);
        setNewTemplate((prev) => ({
          ...prev,
          body: res.template.body || prev.body,
          category: res.template.category || prev.category || 'UTILITY',
          languageCode: res.template.language || prev.languageCode || 'en_US'
        }));
        toast.info(`Found existing Meta template "${res.template.name}"! Details auto-filled below.`);
      } else {
        setExistingMetaFound(null);
      }
    } catch {
      setExistingMetaFound(null);
    } finally {
      setCheckingMeta(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* What is actually connected, and what a reply will use. Each line is
          checked against the live socket or Meta itself - the cards below
          only ever showed whether credentials had been typed in once. */}
      {overview && (
        <div className="card space-y-4">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-800">Your WhatsApp setup right now</h3>
            <p className="text-xs text-slate-400">Checked live, not remembered from when you set it up.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className={`p-3.5 rounded-xl border ${overview.qr.canSend ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-slate-50/50'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-700">QR (WhatsApp Web)</span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${overview.qr.canSend ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {overview.qr.canSend ? 'Ready' : overview.qr.status === 'connected' ? 'Reconnecting' : 'Not connected'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1.5">
                {overview.qr.canSend
                  ? `Sending and receiving on ${overview.qr.phoneNumber}.`
                  : 'Scan the QR code below to link a number.'}
              </p>
            </div>

            <div className={`p-3.5 rounded-xl border ${overview.cloud.healthy ? 'border-emerald-200 bg-emerald-50/50' : overview.cloud.configured ? 'border-rose-200 bg-rose-50/50' : 'border-slate-200 bg-slate-50/50'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-700">Business API (Meta)</span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${overview.cloud.healthy ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : overview.cloud.configured ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {overview.cloud.healthy ? 'Ready' : overview.cloud.configured ? 'Needs attention' : 'Not set up'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1.5">
                {overview.cloud.healthy
                  ? `Meta accepted these credentials${overview.cloud.displayPhoneNumber ? ` for ${overview.cloud.displayPhoneNumber}` : ''}.`
                  : overview.cloud.configured
                    ? overview.cloud.error
                    : 'Optional. Needed only for campaigns and high volume.'}
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <p className="text-xs text-slate-700">
              <span className="font-bold">A brand-new chat goes out on:</span>{' '}
              {overview.routing.newChatsUse === 'qr'
                ? `QR (${overview.qr.phoneNumber})`
                : overview.routing.newChatsUse === 'cloud_api'
                  ? 'Business API (Meta)'
                  : 'nothing yet - connect one of the two above'}
            </p>
            <p className="text-[11px] text-slate-500">
              An existing chat always replies on whichever of the two the customer&apos;s own last
              message came in on, so a conversation never answers back on the wrong number.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-700">What the AI is allowed to do</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Answer brand-new chats by itself, before anyone reads them.
                </p>
              </div>
              <Button
                type="button"
                variant={overview.ai.autopilotForNewChats ? 'danger' : 'primary'}
                onClick={handleToggleAutopilot}
                disabled={togglingAutopilot}
                className="text-xs px-4 shrink-0"
              >
                {togglingAutopilot ? 'Saving...' : overview.ai.autopilotForNewChats ? 'Turn off' : 'Turn on'}
              </Button>
            </div>
            <div className="pt-2.5 border-t border-slate-100 space-y-2">
              <p className="text-[11px] text-slate-600">
                Right now the AI is answering{' '}
                <span className="font-bold text-slate-800">{overview.ai.chatsWithAiOn} of {overview.ai.totalChats}</span>{' '}
                conversations
                {overview.ai.chatsNeedingHuman > 0 && (
                  <span className="text-amber-700 font-semibold"> · {overview.ai.chatsNeedingHuman} waiting for a person</span>
                )}
                . The switch above only decides the starting point for <em>new</em> chats, so chats
                you already have keep whatever they are on now.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => handleAiForAllChats(true)}
                  disabled={applyingToAll || overview.ai.totalChats === 0 || overview.ai.chatsWithAiOn === overview.ai.totalChats}
                  className="text-xs px-3"
                >
                  {applyingToAll ? 'Applying...' : 'Let AI answer all existing chats'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleAiForAllChats(false)}
                  disabled={applyingToAll || overview.ai.chatsWithAiOn === 0}
                  className="text-xs px-3"
                >
                  Take them all back
                </Button>
              </div>
              <p className="text-[11px] text-slate-400">
                A single conversation can always be switched from the AI button inside that chat.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* How this agency is connected to WhatsApp.
          Both channels in one place, each showing what is actually
          true. The card this replaces was decorative - a green pulsing
          dot, "Active System" and "Ready & Active" were hardcoded, so a
          number that had been unlinked for a week still read as
          connected, and connecting was a link to a different page. */}
      <div className="card space-y-4">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="font-bold text-slate-800">WhatsApp connection</h3>
          <p className="text-xs text-slate-400">
            Two ways to connect. Most agencies start with the QR code and move to the
            Business API as volume grows.
          </p>
        </div>

        {/* Quick connect - QR */}
        <div className="p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-emerald-600" />
                <h4 className="font-semibold text-slate-800 text-sm">Quick connect (QR code)</h4>
                {qrSession?.status === 'connected' ? (
                  <span className="text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                    Connected
                  </span>
                ) : qrSession?.status === 'connecting' || qrSession?.status === 'qrcode' ? (
                  <span className="text-[10px] font-bold uppercase bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                    Connecting
                  </span>
                ) : (
                  <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">
                    Not connected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Scan once from your phone. Ready in a minute, no fees, no approvals.
                Best for replying to customers who message you first.
              </p>
              {qrSession?.status === 'connected' && qrSession?.phoneNumber && (
                <p className="text-xs text-slate-600 mt-1.5">
                  <span className="font-semibold text-slate-800">Linked number:</span> {qrSession.phoneNumber}
                </p>
              )}
            </div>

            {qrSession?.status === 'connected' ? (
              <Button
                type="button"
                variant="danger"
                onClick={handleDisconnectQr}
                disabled={disconnectingQr}
                className="text-xs px-4 shrink-0"
              >
                {disconnectingQr ? 'Unlinking...' : 'Unlink'}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => setQrModalOpen(true)}
                className="text-xs px-4 shrink-0"
              >
                Scan QR
              </Button>
            )}
          </div>

          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Uses WhatsApp&apos;s companion-device protocol, the same as WhatsApp Web.
            Bulk or unsolicited messaging can get a number restricted — for campaigns
            and high volume, use the Business API below.
          </p>
        </div>
      </div>

      {/* Meta WhatsApp Business Cloud API */}
      <div className="card space-y-5">
        <div className="border-b border-slate-100 pb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-800">Meta WhatsApp Business API</h3>
            <p className="text-xs text-slate-400">Connect a Cloud API number - your own business number, or a Meta sandbox/test number for development.</p>
          </div>
          {hasOwnWA && (
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 shrink-0">
              Connected
            </span>
          )}
        </div>

        {hasOwnWA ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-600">
              <p><span className="font-semibold text-slate-800">Phone Number ID:</span> {settings.whatsappPhoneNumberId}</p>
              {settings.whatsappNumber && <p className="mt-0.5"><span className="font-semibold text-slate-800">Number:</span> {settings.whatsappNumber}</p>}
            </div>
            <Button
              type="button"
              variant="danger"
              onClick={handleDisconnectWA}
              disabled={disconnectingWA}
              className="text-xs px-4"
            >
              {disconnectingWA ? 'Disconnecting...' : 'Disconnect'}
            </Button>
          </div>
        ) : (
          <>
            <Button
              type="button"
              onClick={handleLaunchEmbeddedSignup}
              disabled={connectingWA}
              className="text-sm px-6"
            >
              {connectingWA ? 'Connecting...' : 'Connect via Meta'}
            </Button>

            <button
              type="button"
              onClick={() => setShowAdvancedWA((v) => !v)}
              className="text-xs font-semibold text-brand-700 hover:text-brand-800 flex items-center gap-1"
            >
              {showAdvancedWA ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              Advanced: enter credentials manually
            </button>

            {showAdvancedWA && (
              <div className="pt-2 space-y-4 border-t border-slate-100">
                <p className="text-xs text-slate-400">
                  For a Meta sandbox/test number, copy these from developers.facebook.com under your app's WhatsApp &gt; API Setup page.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                  <Input
                    label="Phone Number ID"
                    placeholder="e.g. 109876543210987"
                    value={waCreds.whatsappPhoneNumberId}
                    onChange={(e) => setWaCreds((c) => ({ ...c, whatsappPhoneNumberId: e.target.value }))}
                  />
                  <Input
                    label="WABA ID"
                    placeholder="e.g. 123456789012345"
                    value={waCreds.whatsappWabaId}
                    onChange={(e) => setWaCreds((c) => ({ ...c, whatsappWabaId: e.target.value }))}
                  />
                  <Input
                    label="Access Token"
                    type="password"
                    placeholder="Temporary or permanent token"
                    hint="Left as-is (shown as dots) means the saved one is kept"
                    value={waCreds.whatsappAccessToken}
                    onChange={(e) => setWaCreds((c) => ({ ...c, whatsappAccessToken: e.target.value }))}
                  />
                  <Input
                    label="App Secret"
                    type="password"
                    placeholder="From App Dashboard > Settings > Basic"
                    hint="Only needed to verify incoming webhooks"
                    value={waCreds.whatsappAppSecret}
                    onChange={(e) => setWaCreds((c) => ({ ...c, whatsappAppSecret: e.target.value }))}
                  />
                  <Input
                    label="Meta App ID"
                    placeholder="e.g. 1065519269552814"
                    hint="Business/App ID, not the WABA ID"
                    value={waCreds.whatsappBusinessId}
                    onChange={(e) => setWaCreds((c) => ({ ...c, whatsappBusinessId: e.target.value }))}
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleSaveWaCreds}
                  disabled={savingWaCreds}
                  className="text-sm px-6"
                >
                  {savingWaCreds ? 'Saving...' : 'Save Credentials'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Request Own Number */}
      <div className="card space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="font-bold text-slate-800">Request Dedicated Setup</h3>
          <p className="text-xs text-slate-400">Want our team to set up and verify a dedicated WhatsApp Business number for your agency?</p>
        </div>

        {waRequest.submitted ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-700 font-semibold flex items-center justify-center gap-2">
            <FileCheck size={18} /> Request submitted! We'll contact you within 24 hours.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
            <Input
              label="Your WhatsApp Number"
              placeholder="e.g. +91 98765 43210"
              hint="Number you want to use"
              value={waRequest.phone}
              onChange={(e) => setWaRequest(r => ({ ...r, phone: e.target.value }))}
            />
            <Input
              label="Agency / Company Name"
              placeholder="e.g. Himalaya Travel Co."
              hint="Will appear as sender name"
              value={waRequest.companyName}
              onChange={(e) => setWaRequest(r => ({ ...r, companyName: e.target.value }))}
            />
            <div className="sm:col-span-2 pt-2">
              <Button
                type="button"
                onClick={handleWaRequest}
                disabled={waRequest.submitting}
                className="w-full sm:w-auto text-sm px-6"
              >
                {waRequest.submitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* WhatsApp Templates & Quick Replies Management */}
      <div className="card space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Sparkles size={18} className="text-emerald-500" />
              Templates & Quick Replies
            </h3>
            <p className="text-xs text-slate-400">Add canned text responses (shortcuts) or submit & sync Meta template configurations.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={syncingTemplates}
              onClick={async () => {
                setSyncingTemplates(true);
                try {
                  const res = await whatsappTemplateService.syncTemplates();
                  if (res.templates) setTemplates(res.templates);
                  toast.success(res.message || 'Synced templates with Meta!');
                } catch (err) {
                  toast.error(err.response?.data?.message || 'Failed to sync templates from Meta.');
                } finally {
                  setSyncingTemplates(false);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
              title="Sync live approval statuses from Meta Graph API"
            >
              <RefreshCw size={13} className={syncingTemplates ? 'animate-spin' : ''} />
              Sync Status
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddTemplateForm(!showAddTemplateForm);
                setNewTemplate({ type: 'text', name: '', body: '', languageCode: 'en_US', category: 'UTILITY', variablesMap: {} });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              <Plus size={14} />
              Add New
            </button>
          </div>
        </div>

        {showAddTemplateForm && (() => {
          const metaWarnings = [];
          const bodyText = newTemplate.body || '';

          if (newTemplate.type === 'template' && bodyText) {
            const nums = detectedPlaceholders.map((n) => parseInt(n));
            for (let i = 0; i < nums.length; i++) {
              if (nums[i] !== i + 1) {
                metaWarnings.push(`Placeholder numbers must start from {{1}} and be sequential (e.g. {{1}}, {{2}}, {{3}}). Detected missing {{${i + 1}}}.`);
                break;
              }
            }

            if (/\{\{\d+\}\}\s*$/.test(bodyText)) {
              metaWarnings.push('Meta disallows placing a variable tag (e.g. {{2}}) at the very end of the text. Add trailing punctuation or text (e.g. "Regards, {{2}} Team").');
            }

            if (/thanks\s+you/i.test(bodyText)) {
              metaWarnings.push('Typo detected: "thanks you" — replace with "thank you".');
            }

            if (newTemplate.category === 'UTILITY' && /(detail|inquir|share|plan|trip|packag|offer|book)/i.test(bodyText)) {
              metaWarnings.push('Category Tip: Templates asking customers for trip details or inquiries get approved much faster under the MARKETING category rather than UTILITY.');
            }
          }

          return (
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-4">
              <p className="text-xs font-bold text-slate-700">
                {editingTemplateId ? `Editing Template: ${newTemplate.name}` : 'New Template Configuration'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 font-medium">Type</label>
                  <select
                    value={newTemplate.type}
                    onChange={(e) => setNewTemplate({ ...newTemplate, type: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 outline-none font-medium text-slate-700 focus:border-brand-500 transition"
                  >
                    <option value="text">Quick Message (Text / Shortcut)</option>
                    <option value="template">Meta Template (WhatsApp Official API)</option>
                  </select>
                </div>
                <div>
                  <Input
                    label={newTemplate.type === 'text' ? 'Shortcut / Keyword (e.g. /welcome)' : 'Meta Template Code Name (e.g. welcome_message)'}
                    placeholder={newTemplate.type === 'text' ? 'e.g. /welcome' : 'e.g. welcome_message'}
                    value={newTemplate.name}
                    disabled={!!editingTemplateId}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (newTemplate.type === 'text' && val && !val.startsWith('/')) {
                        val = '/' + val;
                      }
                      setNewTemplate({ ...newTemplate, name: val });
                    }}
                    onBlur={() => {
                      if (newTemplate.type === 'template' && !editingTemplateId) {
                        handleCheckMetaTemplate(newTemplate.name);
                      }
                    }}
                  />
                  {checkingMeta && (
                    <p className="text-[10px] text-brand-600 animate-pulse mt-1">Checking Meta API for template details...</p>
                  )}
                </div>
                {newTemplate.type === 'template' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 font-medium">Meta Category</label>
                      <select
                        value={newTemplate.category || 'UTILITY'}
                        onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 outline-none font-medium text-slate-700 focus:border-brand-500 transition"
                      >
                        <option value="UTILITY">UTILITY (Transactional / Confirmations)</option>
                        <option value="MARKETING">MARKETING (Promotions / Offers)</option>
                        <option value="AUTHENTICATION">AUTHENTICATION (OTPs / Security)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 font-medium">Language Code</label>
                      <select
                        value={newTemplate.languageCode || 'en_US'}
                        onChange={(e) => setNewTemplate({ ...newTemplate, languageCode: e.target.value })}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 outline-none font-medium text-slate-700 focus:border-brand-500 transition"
                      >
                        <option value="en_US">English (US) [en_US]</option>
                        <option value="en_IN">English (India) [en_IN]</option>
                        <option value="en">English [en]</option>
                        <option value="hi">Hindi [hi]</option>
                      </select>
                    </div>
                  </>
                )}

                {existingMetaFound && (
                  <div className="sm:col-span-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                    <span className="font-semibold flex items-center gap-1.5">
                      ✨ Found existing template <strong>"{existingMetaFound.name}"</strong> on Meta! Status: <strong>{existingMetaFound.status} 🟢</strong>
                    </span>
                    <span className="text-[10px] font-bold bg-emerald-100 px-2 py-0.5 rounded text-emerald-900">Auto-filled</span>
                  </div>
                )}

                <div className="sm:col-span-2 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-semibold text-slate-500 font-medium">Template Content (Body)</label>
                    {newTemplate.type === 'template' && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="text-slate-400 font-semibold">Quick Variable Insert:</span>
                        {[1, 2, 3, 4].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => insertPlaceholder(num)}
                            className="px-2 py-0.5 rounded bg-white hover:bg-slate-200 text-brand-700 border border-slate-200 font-mono font-bold transition cursor-pointer"
                          >
                            + &#123;&#123;{num}&#125;&#125;
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <textarea
                    ref={templateTextareaRef}
                    rows={3}
                    placeholder={newTemplate.type === 'template' ? "e.g. Hi {{1}}, your booking for {{2}} on {{3}} is confirmed!" : "Type your canned message text..."}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 outline-none font-medium text-slate-700 focus:border-brand-500 transition"
                    value={newTemplate.body}
                    onChange={(e) => setNewTemplate({ ...newTemplate, body: e.target.value })}
                  />
                </div>

                {newTemplate.type === 'template' && metaWarnings.length > 0 && (
                  <div className="sm:col-span-2 p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 text-xs text-amber-900">
                    <p className="font-bold flex items-center gap-1.5 text-amber-950">
                      <Sparkles size={14} className="text-amber-600" />
                      Meta Approval & Policy Suggestions:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-[11px] font-medium text-amber-800">
                      {metaWarnings.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Explicit Dropdown Mapper for Detected Placeholders */}
                {newTemplate.type === 'template' && detectedPlaceholders.length > 0 && (
                  <div className="sm:col-span-2 p-3 bg-white rounded-xl border border-slate-200 space-y-3">
                    <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-indigo-500" />
                      Map Detected Placeholders to CRM Data Fields:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {detectedPlaceholders.map((num) => (
                        <div key={num} className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-lg border border-slate-150">
                          <span className="text-xs font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                            &#123;&#123;{num}&#125;&#125;
                          </span>
                          <select
                            value={newTemplate.variablesMap?.[num] || 'customer_name'}
                            onChange={(e) => {
                              setNewTemplate({
                                ...newTemplate,
                                variablesMap: { ...newTemplate.variablesMap, [num]: e.target.value }
                              });
                            }}
                            className="text-xs bg-white border border-slate-200 rounded-lg p-2 outline-none font-medium text-slate-700"
                          >
                            <option value="customer_name">Customer Name</option>
                            <option value="customer_phone">Customer Phone</option>
                            <option value="company_name">Company / Agency Name</option>
                            <option value="trip_name">Trip / Package Name</option>
                            <option value="departure_date">Departure Date</option>
                            <option value="total_price">Total Booking Amount</option>
                            <option value="invoice_link">Invoice / Payment Link</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowAddTemplateForm(false);
                    setEditingTemplateId(null);
                    setExistingMetaFound(null);
                  }}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={addingTemplate}
                  onClick={() => {
                    if (!newTemplate.name || !newTemplate.body) {
                      toast.error('Name/shortcut and body content are required.');
                      return;
                    }
                    if (newTemplate.type === 'template') {
                      setShowPreviewModal(true);
                    } else {
                      handleSaveTemplate(false);
                    }
                  }}
                  className="text-xs px-4"
                >
                  {addingTemplate ? 'Saving...' : (newTemplate.type === 'template' ? 'Preview & Submit options' : 'Save Template')}
                </Button>
              </div>
            </div>
          );
        })()}

        {/* WhatsApp Template Live Preview Modal */}
        {showPreviewModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
              <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <MessageSquare className="text-emerald-400" size={18} />
                  <span className="font-bold text-xs">WhatsApp Template Live Preview</span>
                </div>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="text-slate-400 hover:text-white transition text-xs font-bold px-2 py-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 bg-slate-100 space-y-3">
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-center justify-between">
                  <span>Live WhatsApp chat appearance with test data:</span>
                  <span className="text-[10px] font-bold bg-amber-100 px-1.5 py-0.5 rounded text-amber-900">Sample</span>
                </div>

                {/* Chat Bubble Preview */}
                <div className="bg-[#dcf8c6] border border-emerald-200 rounded-2xl rounded-tl-none p-3 shadow-sm text-slate-800 text-xs leading-relaxed font-sans relative">
                  <p className="whitespace-pre-wrap font-medium">
                    {getPreviewText(newTemplate.body)}
                  </p>
                  <div className="flex justify-end items-center gap-1 text-[9px] text-slate-400 font-semibold pt-1">
                    <span>10:45 AM</span>
                    <span className="text-blue-500 font-bold">✓✓</span>
                  </div>
                </div>

                {/* Summary Meta Details */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 font-semibold block text-[9px]">TEMPLATE CODE NAME</span>
                    <span className="font-bold text-slate-700 font-mono">{newTemplate.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[9px]">META CATEGORY</span>
                    <span className="font-bold text-slate-700">{newTemplate.category || 'UTILITY'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[9px]">LANGUAGE</span>
                    <span className="font-bold text-slate-700">{newTemplate.languageCode || 'en_US'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[9px]">MAPPED VARIABLES</span>
                    <span className="font-bold text-slate-700">{detectedPlaceholders.length} field(s)</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-white border-t border-slate-100 flex flex-col sm:flex-row gap-2 justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={addingTemplate}
                  onClick={() => handleSaveTemplate(false)}
                  className="text-xs border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  💾 Save as Local Draft (Submit Later)
                </Button>
                <Button
                  type="button"
                  disabled={addingTemplate}
                  onClick={() => handleSaveTemplate(true)}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  🚀 Submit to Meta & Save
                </Button>
              </div>
            </div>
          </div>
        )}

        {loadingTemplates ? (
          <div className="text-center py-6 text-xs text-slate-400">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
            No templates or canned replies configured yet. Add one above to get started!
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-150 rounded-xl">
            <table className="w-full border-collapse text-left text-xs text-slate-600">
              <thead className="bg-slate-50/75 border-b border-slate-150 font-semibold text-slate-700">
                <tr>
                  <th className="p-3">Shortcut / Name</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Body Preview</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {templates.map((t) => {
                  const status = t.meta_status || 'APPROVED';
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-800">{t.name}</td>
                      <td className="p-3">
                        {t.type === 'template' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            Meta ({t.category || 'UTILITY'})
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Quick Message
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {t.type === 'template' ? (
                          status === 'APPROVED' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              APPROVED 🟢
                            </span>
                          ) : status === 'PENDING' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              PENDING 🟡
                            </span>
                          ) : status === 'DRAFT' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                              DRAFT 📄
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              REJECTED 🔴
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ACTIVE 🟢
                          </span>
                        )}
                      </td>
                      <td className="p-3 truncate max-w-[200px]" title={t.body}>
                        {t.body}
                      </td>
                      <td className="p-3 text-right">
                        {t.type === 'template' && (status === 'DRAFT' || status === 'REJECTED') && (
                          <button
                            type="button"
                            disabled={submittingMetaId === t.id}
                            onClick={async () => {
                              try {
                                setSubmittingMetaId(t.id);
                                toast.info(`Submitting "${t.name}" to Meta...`);
                                const updated = await whatsappTemplateService.submitMetaTemplate(t.id);
                                setTemplates((prev) => prev.map((item) => item.id === t.id ? updated : item));
                                toast.success('Submitted to Meta successfully!');
                              } catch (err) {
                                toast.error(err.response?.data?.message || 'Failed to submit to Meta.');
                              } finally {
                                setSubmittingMetaId(null);
                              }
                            }}
                            className="text-emerald-600 hover:text-emerald-800 text-xs font-bold mr-3 transition cursor-pointer"
                          >
                            {submittingMetaId === t.id ? 'Submitting...' : '🚀 Submit to Meta'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleEditStart(t)}
                          className="text-slate-500 hover:text-brand-600 hover:bg-slate-100 p-1.5 rounded-md transition cursor-pointer mr-1"
                          title="Edit Template"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!window.confirm('Delete this template?')) return;
                            try {
                              await whatsappTemplateService.deleteTemplate(t.id);
                              setTemplates((prev) => prev.filter((item) => item.id !== t.id));
                              toast.success('Template deleted.');
                            } catch {
                              toast.error('Failed to delete template.');
                            }
                          }}
                          className="text-rose-600 hover:bg-rose-50 p-1.5 rounded-md transition cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Scanning happens here now, rather than sending the owner to the
          Live Chat page to find it. */}
      <WhatsAppQRModal
        isOpen={qrModalOpen}
        onClose={() => {
          setQrModalOpen(false);
          refreshQrSession();
        }}
        onConnected={() => {
          refreshQrSession();
          toast.success('WhatsApp connected.');
        }}
      />
    </div>
  );
}
