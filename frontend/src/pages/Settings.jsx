import React, { useEffect, useState, useRef } from 'react';
import * as settingsService from '../services/settingsService';
import { API_BASE_URL } from '../services/api';
import * as publicService from '../services/publicService';
import * as instagramService from '../services/instagramService';
import * as whatsappTemplateService from '../services/whatsappTemplateService';
import { uploadFile } from '../services/uploadService';
import { useToast } from '../hooks/useToast.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { connectGoogle } from '../services/googleService';
import { Settings, Palette, Eye, FileCheck, Sparkles, Link2, Copy, RefreshCw, MessageSquare, Instagram, ChevronDown, ChevronUp, Trash2, Plus } from 'lucide-react';
import Input from '../components/ui/Input.jsx';
import Select from '../components/ui/Select.jsx';
import Textarea from '../components/ui/Textarea.jsx';
import Button from '../components/ui/Button.jsx';

const FIELDS = [
  { key: 'companyName', label: 'Company Name', placeholder: 'e.g. TravelGo Holidays Pvt Ltd', hint: 'Appears on invoices & emails', required: true },
  { key: 'companyLogoUrl', label: 'Company Logo URL', placeholder: 'e.g. https://cdn.example.com/logo.png', hint: 'Direct link to your logo image' },
  { key: 'emailSenderName', label: 'Email Sender Name', placeholder: 'e.g. TravelGo Support', hint: 'Display name in outgoing emails' },
  { key: 'whatsappNumber', label: 'WhatsApp Number', placeholder: 'e.g. +919876543210', hint: 'Business WhatsApp for customer updates' },
  { key: 'gstNumber', label: 'GST Number', placeholder: 'e.g. 07AAACT1234A1Z5', hint: 'Printed on tax invoices' },
  { key: 'address', label: 'Office Address', placeholder: 'e.g. 42, MG Road, New Delhi - 110001', hint: 'Appears on invoices & letterheads' },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const templateTextareaRef = useRef(null);
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [walkthroughRequests, setWalkthroughRequests] = useState([]);
  const [loadingWalkthroughs, setLoadingWalkthroughs] = useState(false);
  const [publicLeadKey, setPublicLeadKey] = useState(null);
  const [regenerating, setRegenerating] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [selectedLogoFile, setSelectedLogoFile] = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('');
  const [showAdvancedWA, setShowAdvancedWA] = useState(false);
  const [waRequest, setWaRequest] = useState({ phone: '', companyName: '', submitted: false, submitting: false });
  const [connectingWA, setConnectingWA] = useState(false);
  const [disconnectingWA, setDisconnectingWA] = useState(false);
  const toast = useToast();

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
  const [checkingMeta, setCheckingMeta] = useState(false);
  const [existingMetaFound, setExistingMetaFound] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [submittingMetaId, setSubmittingMetaId] = useState(null);

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

  const handleCreateTemplate = async (submitToMeta = true) => {
    if (!newTemplate.name || !newTemplate.body) {
      toast.error('Name/shortcut and body content are required.');
      return;
    }
    setAddingTemplate(true);
    try {
      const created = await whatsappTemplateService.createTemplate({
        ...newTemplate,
        submitToMeta
      });
      setTemplates((prev) => [created, ...prev]);
      if (submitToMeta) {
        toast.success(existingMetaFound ? 'Template imported and saved!' : 'Template submitted to Meta and saved!');
      } else {
        toast.success('Template saved as local draft! You can submit to Meta later.');
      }
      setShowAddTemplateForm(false);
      setShowPreviewModal(false);
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

  useEffect(() => {
    if (activeTab === 'whatsapp') {
      setLoadingTemplates(true);
      whatsappTemplateService.getTemplates()
        .then(setTemplates)
        .catch(() => toast.error('Failed to load templates.'))
        .finally(() => setLoadingTemplates(false));
    }
  }, [activeTab]);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size too large. Maximum allowed size is 5MB.');
      return;
    }
    
    setSelectedLogoFile(file);
    setLogoPreviewUrl(URL.createObjectURL(file));
  };

  useEffect(() => {
    settingsService.getSettings()
      .then((data) => {
        setSettings(data);
        if (data && data.companyLogoUrl) {
          setLogoPreviewUrl(data.companyLogoUrl);
        }
      })
      .catch(() => toast.error('Could not load settings.'));

    // Check if returning from Meta OAuth redirect in popup or page
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
    const code = urlParams.get('code') || hashParams.get('code');
    const accessToken = urlParams.get('access_token') || hashParams.get('access_token');

    if (code || accessToken) {
      if (window.opener) {
        window.opener.postMessage({
          type: 'META_AUTH_SUCCESS',
          code,
          accessToken
        }, window.location.origin);
        window.close();
      } else {
        settingsService.connectWhatsappEmbedded({ code, accessToken })
          .then((res) => {
            setSettings(res.settings);
            toast.success('WhatsApp Business connected successfully!');
            window.history.replaceState({}, document.title, window.location.pathname);
          })
          .catch(() => toast.error('Failed to link WhatsApp account.'));
      }
    }

    // Listen to Meta response (both popup and SDK messages)
    const handleMetaMessage = async (event) => {
      if (event.origin !== window.location.origin && !event.origin.includes('facebook.com')) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data.type === 'META_AUTH_SUCCESS' || (data.type === 'WA_EMBEDDED_SIGNUP' && data.event === 'FINISH')) {
          const { code, accessToken, phone_number_id, waba_id } = data.data || data;
          setConnectingWA(true);
          try {
            const res = await settingsService.connectWhatsappEmbedded({
              code,
              accessToken,
              phoneNumberId: phone_number_id,
              wabaId: waba_id
            });
            setSettings(res.settings);
            toast.success('WhatsApp Business connected successfully via Meta!');
          } catch (err) {
            toast.error('Failed to link WhatsApp account.');
          } finally {
            setConnectingWA(false);
          }
        }
      } catch (err) {}
    };

    window.addEventListener('message', handleMetaMessage);
    return () => window.removeEventListener('message', handleMetaMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === 'walkthroughs') {
      setLoadingWalkthroughs(true);
      publicService.listWalkthroughRequests()
        .then(setWalkthroughRequests)
        .catch(() => toast.error('Could not load landing walkthrough requests.'))
        .finally(() => setLoadingWalkthroughs(false));
    }
    if (activeTab === 'leadCapture' && !publicLeadKey) {
      settingsService.getPublicLeadKey().then(setPublicLeadKey).catch(() => toast.error('Could not load lead capture link.'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, toast]);

  const handleRegenerateKey = async () => {
    if (!window.confirm('Regenerating will break any embed already published on your website. Continue?')) return;
    setRegenerating(true);
    try {
      const newKey = await settingsService.regeneratePublicLeadKey();
      setPublicLeadKey(newKey);
      toast.success('Lead capture link regenerated. Update your website with the new snippet.');
    } catch {
      toast.error('Could not regenerate the link.');
    } finally {
      setRegenerating(false);
    }
  };

  const apiBaseUrl = API_BASE_URL;
  const embedSnippet = publicLeadKey
    ? `<form action="${apiBaseUrl}/public/leads/${publicLeadKey}" method="POST" onsubmit="event.preventDefault(); fetch(this.action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(this)))}).then(()=>this.reset()&&alert('Thanks! We will be in touch shortly.'));">
  <input name="customerName" placeholder="Your Name" required />
  <input name="phone" placeholder="Phone Number" required />
  <input name="email" placeholder="Email (optional)" type="email" />
  <input name="interest" placeholder="Destination you're interested in" />
  <button type="submit">Submit Enquiry</button>
</form>`
    : '';

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(embedSnippet);
    toast.success('Embed code copied to clipboard.');
  };

  const validate = () => {
    const errs = {};
    if (!settings.companyName?.trim()) {
      errs.companyName = 'Company name is required.';
    }
    if (settings.whatsappNumber && !/^[0-9+\-\s()]{7,15}$/.test(settings.whatsappNumber)) {
      errs.whatsappNumber = 'Enter a valid phone number (7-15 digits).';
    }
    if (settings.gstNumber && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(settings.gstNumber)) {
      errs.gstNumber = 'Enter a valid 15-digit GSTIN (e.g. 07AAACT1234A1Z5).';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    if (!validate()) {
      toast.error('Please correct the validation errors first.');
      return;
    }
    setSaving(true);
    try {
      let finalLogoUrl = settings.companyLogoUrl;
      
      if (selectedLogoFile) {
        setUploadingLogo(true);
        try {
          finalLogoUrl = await uploadFile(selectedLogoFile);
          setSelectedLogoFile(null);
        } catch (uploadErr) {
          toast.error(uploadErr.response?.data?.message || 'Failed to upload logo.');
          setSaving(false);
          setUploadingLogo(false);
          return;
        }
        setUploadingLogo(false);
      }

      const payload = { ...settings, companyLogoUrl: finalLogoUrl };
      const updated = await settingsService.updateSettings(payload);
      setSettings(updated);
      setLogoPreviewUrl(updated.companyLogoUrl || '');
      toast.success('Settings saved successfully.');
    } catch {
      toast.error('Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <div className="skeleton h-96 rounded-2xl" />;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Tabs Navigator */}
      <div className="flex gap-2 border-b border-slate-100 pb-px overflow-x-auto whitespace-nowrap no-scrollbar">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${activeTab === 'general'
            ? 'border-brand-600 text-brand-700'
            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
            }`}
        >
          <Settings size={16} />
          General Profile
        </button>
        <button
          onClick={() => setActiveTab('invoice')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${activeTab === 'invoice'
            ? 'border-brand-600 text-brand-700'
            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
            }`}
        >
          <Palette size={16} />
          Invoice Builder & Designer
        </button>
        {user?.role === 'ADMIN' && (
          <button
            type="button"
            onClick={() => setActiveTab('whatsapp')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${activeTab === 'whatsapp'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
              }`}
          >
            <MessageSquare size={16} />
            WhatsApp Configuration
          </button>
        )}
        {user?.role === 'ADMIN' && (
          <button
            type="button"
            onClick={() => setActiveTab('instagram')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${activeTab === 'instagram'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
              }`}
          >
            <Instagram size={16} />
            Instagram Connection
          </button>
        )}
        {user?.role === 'ADMIN' && (
          <button
            type="button"
            onClick={() => setActiveTab('leadCapture')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${activeTab === 'leadCapture'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
              }`}
          >
            <Link2 size={16} />
            Lead Capture
          </button>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {activeTab === 'general' && (
          <div className="card space-y-6 max-w-3xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-bold text-slate-800">Company & Contacts Profile</h3>
                <p className="text-xs text-slate-400">Basic organizational settings and details</p>
              </div>
              <Button type="button" onClick={connectGoogle} className="text-sm px-4">
                Connect Gmail
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
              {FIELDS.map(({ key, label, placeholder, hint, required }) => {
                if (key === 'companyLogoUrl') {
                  return (
                    <div key={key} className="flex flex-col gap-1.5 sm:col-span-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <span>{label}</span>
                        {required && <span className="text-rose-500 font-bold">*</span>}
                      </label>
                      <div className="flex items-center gap-4 bg-slate-50/50 dark:bg-zinc-800/25 p-3 rounded-xl border border-slate-200 dark:border-zinc-800">
                        {logoPreviewUrl ? (
                          <div className="relative group shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-700 bg-white">
                            <img src={logoPreviewUrl} alt="Logo" className="w-full h-full object-contain" />
                            <button
                              type="button"
                              onClick={() => {
                                setSettings({ ...settings, companyLogoUrl: '' });
                                setSelectedLogoFile(null);
                                setLogoPreviewUrl('');
                              }}
                              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-medium transition"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 dark:border-zinc-700 flex items-center justify-center text-slate-400 text-xs shrink-0 bg-white dark:bg-zinc-900">
                            No Logo
                          </div>
                        )}
                        <div className="flex flex-col gap-2">
                          <label className={`btn btn-xs ${uploadingLogo ? 'loading btn-disabled' : 'btn-outline btn-primary'} cursor-pointer text-[10px] w-fit px-2.5 py-1 rounded border border-brand-500 text-brand-600 hover:bg-brand-50 transition`}>
                            {uploadingLogo ? 'Uploading...' : 'Upload Image'}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingLogo}
                              onChange={handleLogoUpload}
                            />
                          </label>
                          <p className="text-[10px] text-slate-400">{hint}</p>
                        </div>
                      </div>
                    </div>
                  );
                }
                return (
                  <Input
                    key={key}
                    label={label}
                    required={required}
                    error={errors[key]}
                    hint={hint}
                    placeholder={placeholder}
                    value={settings[key] || ''}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (key === 'whatsappNumber') {
                        val = val.replace(/[^0-9+\-\s()]/g, '');
                      } else if (key === 'gstNumber') {
                        val = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                      }
                      setSettings({ ...settings, [key]: val });
                      if (errors[key]) setErrors({ ...errors, [key]: '' });
                    }}
                  />
                );
              })}
            </div>

            <Textarea
              label="Invoice Footer Message"
              rows={2}
              placeholder="e.g. Thank you for travelling with us! Terms & Conditions apply."
              hint="Custom note printed at the bottom center of the invoice"
              value={settings.invoiceFooter || ''}
              onChange={(e) => setSettings({ ...settings, invoiceFooter: e.target.value })}
            />
          </div>
        )}

        {activeTab === 'whatsapp' && (() => {
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

          return (
            <div className="max-w-3xl mx-auto space-y-6">

              {/* 🚀 1-Click Automated Meta Connect Banner (When Not Connected) */}
              {!hasOwnWA && (
                <div className="card space-y-5 border-2 border-brand-500/30 bg-gradient-to-br from-white via-blue-50/20 to-indigo-50/30 shadow-xl shadow-brand-500/5">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1877F2] to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                        1-Click Automated WhatsApp Connect
                        <span className="text-[10px] font-extrabold uppercase bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-200">Instant</span>
                      </h3>
                      <p className="text-xs text-slate-500">Connect your agency's WhatsApp Business number directly via Meta login.</p>
                    </div>
                  </div>

                  <div className="bg-white/80 border border-blue-100 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-5">
                    <div className="space-y-1.5 text-left">
                      <h4 className="font-bold text-slate-800 text-sm">Automate Inbound Leads & Live Chat</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Incoming messages from customers will automatically create Leads in your CRM without any manual configuration.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={connectingWA}
                      onClick={handleLaunchEmbeddedSignup}
                      className="shrink-0 flex items-center justify-center gap-2.5 px-6 py-3 bg-[#1877F2] hover:bg-[#166fe5] active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/25 transition cursor-pointer"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      {connectingWA ? 'Connecting with Meta...' : 'Connect with Facebook'}
                    </button>
                  </div>
                </div>
              )}

              {/* Current Status Card */}
              <div className="card space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <MessageSquare size={18} className="text-brand-600" />
                      Active Connection
                    </h3>
                    <p className="text-xs text-slate-400">Current routing for messages and lead capture.</p>
                  </div>
                </div>

                {hasOwnWA ? (
                  /* Own number connected */
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
                          <MessageSquare size={22} />
                        </div>
                        <div>
                          <p className="font-bold text-base text-slate-900">{settings.whatsappNumber || 'Custom Business WhatsApp'}</p>
                          <p className="text-xs text-emerald-800 font-mono mt-0.5">
                            Phone ID: {settings.whatsappPhoneNumberId}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100/80 px-3 py-1.5 rounded-lg shrink-0">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          Connected & Live
                        </span>
                        <button
                          type="button"
                          disabled={disconnectingWA}
                          onClick={handleDisconnectWA}
                          className="px-3.5 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition"
                        >
                          {disconnectingWA ? 'Disconnecting...' : 'Disconnect'}
                        </button>
                      </div>
                    </div>

                    {/* AI Auto-Reply Toggle */}
                    <div className="pt-2">
                      <label className="flex items-start gap-3 cursor-pointer p-4 rounded-xl border border-slate-200 bg-indigo-50/40 hover:bg-indigo-50 transition text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={!!settings.whatsappAiAutoReply}
                          onChange={(e) => setSettings({ ...settings, whatsappAiAutoReply: e.target.checked })}
                          className="rounded text-indigo-600 focus:ring-indigo-500/20 border-slate-300 mt-1"
                        />
                        <div>
                          <p className="font-bold text-indigo-950 flex items-center gap-1.5">
                            Enable WhatsApp AI Auto-Replies (Beta)
                          </p>
                          <p className="text-xs text-indigo-700/80 mt-0.5 leading-relaxed">
                            AI will automatically reply to incoming messages when a chat is set to AI-managed. It utilizes bookings, leads, and itineraries data to answer. If the details are missing or customization is requested, it turns off and notifies the team.
                          </p>
                        </div>
                      </label>
                    </div>

                    {/* Default Chat Mode for new incoming chats */}
                    {!!settings.whatsappAiAutoReply && (
                      <div className="pt-1">
                        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                          <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            🆕 Default mode for new incoming chats
                          </p>
                          <p className="text-[11px] text-slate-500 leading-relaxed -mt-1">
                            When a new customer messages for the first time, should the chat start in AI or Human mode?
                          </p>
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => setSettings({ ...settings, whatsappDefaultChatMode: 'ai' })}
                              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-bold transition ${
                                (settings.whatsappDefaultChatMode || 'ai') === 'ai'
                                  ? 'bg-indigo-600 border-indigo-700 text-white shadow-sm'
                                  : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${(settings.whatsappDefaultChatMode || 'ai') === 'ai' ? 'bg-white animate-pulse' : 'bg-slate-400'}`} />
                              🤖 AI Auto-Reply
                            </button>
                            <button
                              type="button"
                              onClick={() => setSettings({ ...settings, whatsappDefaultChatMode: 'human' })}
                              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-bold transition ${
                                settings.whatsappDefaultChatMode === 'human'
                                  ? 'bg-slate-700 border-slate-800 text-white shadow-sm'
                                  : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'
                              }`}
                            >
                              👤 Human (Manual)
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (                  /* Using EzzySync shared number */
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 shrink-0">
                        <MessageSquare size={18} />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-800">EzzySync Shared Number</p>
                        <p className="text-xs text-slate-500">Messages sent via EzzySync's official WhatsApp pool</p>
                      </div>
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-3 py-1 rounded-md shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-500 inline-block"></span>
                        Default Active
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Request Own Number */}
              {!hasOwnWA && (
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
              )}

              {/* Advanced: Own credentials */}
              <div className="card overflow-hidden !p-0">
                <button
                  type="button"
                  onClick={() => setShowAdvancedWA(v => !v)}
                  className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  <span className="flex items-center gap-2">
                    <Settings size={16} className="text-slate-400" />
                    Advanced: Configure API Credentials Manually
                  </span>
                  {showAdvancedWA ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </button>

                {showAdvancedWA && (
                  <div className="px-6 pb-6 pt-2 space-y-5 border-t border-slate-100">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                      <strong>Note:</strong> Once a number is linked to API, it cannot be used in the regular WhatsApp app. Use a dedicated SIM.
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                      <Input
                        label="Phone Number ID"
                        placeholder="e.g. 517969018813..."
                        value={settings.whatsappPhoneNumberId || ''}
                        onChange={(e) => setSettings({ ...settings, whatsappPhoneNumberId: e.target.value })}
                      />
                      <Input
                        label="Display Phone Number"
                        placeholder="e.g. +91 98765 43210"
                        value={settings.whatsappNumber || ''}
                        onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                      />
                      <Input
                        label="WABA ID"
                        placeholder="e.g. 104825968132..."
                        value={settings.whatsappWabaId || ''}
                        onChange={(e) => setSettings({ ...settings, whatsappWabaId: e.target.value })}
                      />
                      <Input
                        label="Business ID"
                        placeholder="Meta Business Portfolio ID"
                        value={settings.whatsappBusinessId || ''}
                        onChange={(e) => setSettings({ ...settings, whatsappBusinessId: e.target.value })}
                      />
                      <div className="sm:col-span-2">
                        <Input
                          label="Meta Access Token"
                          placeholder="EAAGOCSPX-..."
                          value={settings.whatsappAccessToken || ''}
                          onChange={(e) => setSettings({ ...settings, whatsappAccessToken: e.target.value })}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Input
                          label="App Secret"
                          placeholder="Meta App Secret key"
                          value={settings.whatsappAppSecret || ''}
                          onChange={(e) => setSettings({ ...settings, whatsappAppSecret: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="pt-2">
                      <Button type="submit" disabled={saving} className="w-full sm:w-auto text-sm px-6">
                        {saving ? 'Saving...' : 'Save API Credentials'}
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
                  // Detect placeholders {{1}}, {{2}} in template body
                  const detectedPlaceholders = Array.from(new Set((newTemplate.body || '').match(/\{\{(\d+)\}\}/g) || []))
                    .map((p) => p.replace(/[\{\}]/g, ''))
                    .sort((a, b) => parseInt(a) - parseInt(b));

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
                      <p className="text-xs font-bold text-slate-700">New Template Configuration</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1.5 font-medium">Type</label>
                          <select
                            value={newTemplate.type}
                            onChange={(e) => setNewTemplate({ ...newTemplate, type: e.target.value })}
                            className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 outline-none font-medium text-slate-700 focus:border-brand-500 transition"
                          >
                            <option value="text">Canned Response (Text / Shortcut)</option>
                            <option value="template">Meta Template (Submit & Sync via Meta WABA API)</option>
                          </select>
                        </div>
                        <div>
                          <Input
                            label={newTemplate.type === 'text' ? 'Shortcut / Keyword (e.g. /welcome)' : 'Meta Template Code Name (e.g. welcome_message)'}
                            placeholder={newTemplate.type === 'text' ? 'e.g. /welcome' : 'e.g. welcome_message'}
                            value={newTemplate.name}
                            onChange={(e) => {
                              let val = e.target.value;
                              if (newTemplate.type === 'text' && val && !val.startsWith('/')) {
                                val = '/' + val;
                              }
                              setNewTemplate({ ...newTemplate, name: val });
                            }}
                            onBlur={() => {
                              if (newTemplate.type === 'template') {
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
                              handleCreateTemplate(false);
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
                          onClick={() => handleCreateTemplate(false)}
                          className="text-xs border border-slate-200 text-slate-700 hover:bg-slate-50"
                        >
                          💾 Save as Local Draft (Submit Later)
                        </Button>
                        <Button
                          type="button"
                          disabled={addingTemplate}
                          onClick={() => handleCreateTemplate(true)}
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
                                    Quick Reply
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
            </div>
          );
        })()}

        {activeTab === 'instagram' && (() => {
          const isConnected = !!(settings.instagramAccessToken && settings.instagramAccountId);

          const handleConnect = () => {
            const token = localStorage.getItem('hf_token') || '';
            const popup = window.open(
              `${API_BASE_URL}/instagram/auth?token=${encodeURIComponent(token)}`,
              'instagram_oauth',
              'width=600,height=700,scrollbars=yes,resizable=yes'
            );
            const listener = (e) => {
              if (e.data?.instagramOAuth === 'success') {
                window.removeEventListener('message', listener);
                toast.success('Instagram connected successfully! 🎉');
                settingsService.getSettings().then(setSettings).catch(() => {});
              } else if (e.data?.instagramOAuth === 'denied') {
                window.removeEventListener('message', listener);
                toast.error('Instagram connection was cancelled.');
              } else if (e.data?.instagramOAuth === 'error') {
                window.removeEventListener('message', listener);
                toast.error('Something went wrong. Please try again.');
              }
            };
            window.addEventListener('message', listener);
          };

          const handleDisconnect = async () => {
            if (!window.confirm('Disconnect Instagram from EzzySync?')) return;
            try {
              await instagramService.disconnect();
              setSettings({ ...settings, instagramAccessToken: '', instagramAccountId: '', instagramUsername: '' });
              toast.success('Instagram disconnected.');
            } catch {
              toast.error('Could not disconnect. Please try again.');
            }
          };

          return (
            <div className="max-w-2xl mx-auto">
              <div className="card space-y-6 max-w-3xl">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <Instagram size={18} className="text-pink-600" />
                      Instagram Connection
                    </h3>
                    <p className="text-xs text-slate-400">
                      Receive and reply to Instagram DMs directly from your CRM.
                    </p>
                  </div>
                  {!isConnected && (
                    <Button type="button" onClick={handleConnect} className="text-sm px-4 bg-slate-900 hover:bg-slate-800 text-white border-none">
                      <Instagram size={16} className="mr-2" /> Connect Account
                    </Button>
                  )}
                </div>

                {isConnected ? (
                  /* ── Connected State ── */
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <div className="w-12 h-12 rounded-lg bg-pink-100 flex items-center justify-center text-pink-600 font-bold text-lg shrink-0">
                        {(settings.instagramUsername || 'IG')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 truncate">
                          @{settings.instagramUsername || 'Connected Account'}
                        </p>
                        <p className="text-xs text-slate-500 truncate">ID: {settings.instagramAccountId}</p>
                      </div>
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-md shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                        Connected
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600 space-y-2">
                      <p className="font-semibold text-slate-800 flex items-center gap-2">
                        <Sparkles size={16} className="text-brand-600" /> Instagram DMs are active
                      </p>
                      <p className="text-xs">New messages from Instagram will automatically appear as leads in your CRM pipeline. You can chat with them directly.</p>
                    </div>

                    <div className="pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleDisconnect}
                        className="text-sm text-rose-600 hover:bg-rose-50 hover:border-rose-100"
                      >
                        Disconnect Instagram
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* ── Not Connected State ── */
                  <div className="space-y-6">
                    <div className="grid sm:grid-cols-3 gap-4">
                      {[
                        { icon: <MessageSquare size={20}/>, title: 'Sync DMs', text: 'Receive Instagram DMs as CRM leads automatically.' },
                        { icon: <RefreshCw size={20}/>, title: 'Reply Fast', text: 'Reply to customers without leaving EzzySync.' },
                        { icon: <FileCheck size={20}/>, title: 'Secure', text: 'Secure OAuth login — no passwords shared with us.' },
                      ].map((item) => (
                        <div key={item.title} className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2 text-center">
                          <div className="text-brand-600 flex justify-center mb-1">{item.icon}</div>
                          <p className="text-sm font-bold text-slate-700">{item.title}</p>
                          <p className="text-xs text-slate-500 leading-relaxed">{item.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}


        {activeTab === 'invoice' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Controls */}
            <div className="lg:col-span-6 card space-y-6">
              <div>
                <h3 className="font-bold text-slate-800">Dynamic Template controls</h3>
                <p className="text-xs text-slate-400">Style layout options, accent highlights and visibility parameters</p>
              </div>

              <div className="space-y-4">
                {/* Accent Color */}
                <div className="space-y-1.5">
                  <label className="label">Brand Accent Color</label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="color"
                      value={settings.invoiceAccentColor || '#0f766e'}
                      onChange={(e) => setSettings({ ...settings, invoiceAccentColor: e.target.value })}
                      className="w-11 h-11 border border-slate-200 rounded-lg cursor-pointer bg-transparent"
                    />
                    <Input
                      className="w-28"
                      maxLength={7}
                      inputClassName="uppercase font-mono text-center"
                      value={settings.invoiceAccentColor || '#0f766e'}
                      onChange={(e) => setSettings({ ...settings, invoiceAccentColor: e.target.value })}
                    />
                  </div>
                  <p className="helper-text">HEX color code applied to invoice headers and banners</p>
                </div>

                {/* Layout Selector */}
                <Select
                  label="Layout Style"
                  hint="Controls layout guidelines and table header frames"
                  value={settings.invoiceLayout || 'minimal'}
                  onChange={(e) => setSettings({ ...settings, invoiceLayout: e.target.value })}
                  options={[
                    { value: 'minimal', label: 'Minimalist Clean' },
                    { value: 'modern', label: 'Modern Accent Sidebar' },
                    { value: 'classic', label: 'Classic Boxed' },
                  ]}
                />

                {/* Invoice Title */}
                <Input
                  label="Invoice Title Header"
                  placeholder="e.g. TAX INVOICE"
                  hint="Header name printed at the top-right corner of PDFs"
                  value={settings.invoiceTitle || 'INVOICE'}
                  onChange={(e) => setSettings({ ...settings, invoiceTitle: e.target.value })}
                />

                {/* Visibility Toggles */}
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Field Visibility</label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center gap-3 cursor-pointer p-2.5 rounded-lg border border-slate-100 bg-slate-50/20 text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={!!settings.invoiceShowGst}
                        onChange={(e) => setSettings({ ...settings, invoiceShowGst: e.target.checked })}
                        className="rounded text-brand-600 focus:ring-brand-500/20 border-slate-300"
                      />
                      Show GSTIN
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer p-2.5 rounded-lg border border-slate-100 bg-slate-50/20 text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={!!settings.invoiceShowPaymentStatus}
                        onChange={(e) => setSettings({ ...settings, invoiceShowPaymentStatus: e.target.checked })}
                        className="rounded text-brand-600 focus:ring-brand-500/20 border-slate-300"
                      />
                      Show Payment Status
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer p-2.5 rounded-lg border border-slate-100 bg-emerald-50 text-xs font-medium text-emerald-800 sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={!!settings.autoSendInvoice}
                        onChange={(e) => setSettings({ ...settings, autoSendInvoice: e.target.checked })}
                        className="rounded text-emerald-600 focus:ring-emerald-500/20 border-emerald-300"
                      />
                      Automatically send Invoice via Email/WhatsApp on new bookings
                    </label>
                  </div>
                </div>

                {/* Custom Terms */}
                <div className="pt-2">
                  <Textarea
                    label="Invoice Terms & Conditions"
                    rows={4}
                    placeholder="Describe refund, check-in rules..."
                    hint="Detail descriptions printed below payment status checks"
                    value={settings.invoiceTerms || ''}
                    onChange={(e) => setSettings({ ...settings, invoiceTerms: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Right Live Preview Mockup */}
            <div className="lg:col-span-6 space-y-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold px-1">
                <Eye size={14} />
                Live Interactive Invoice Design Preview
              </div>

              {/* Mockup Frame */}
              <div className="relative border border-slate-200 rounded-2xl bg-white p-6 shadow-md text-[10px] text-slate-500 select-none overflow-hidden min-h-[500px]">
                {/* Modern layout color sidebar strip */}
                {settings.invoiceLayout === 'modern' && (
                  <div
                    className="absolute left-0 top-0 bottom-0 w-3"
                    style={{ backgroundColor: settings.invoiceAccentColor || '#0f766e' }}
                  />
                )}

                {/* Brand Header */}
                <div className="flex justify-between items-start mb-6 pl-2">
                  <div className="flex items-center gap-3">
                    {settings.companyLogoUrl && (
                      <img
                        src={settings.companyLogoUrl}
                        alt="Logo"
                        className="w-10 h-10 object-contain rounded border border-slate-100 p-0.5 bg-white"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                    <div>
                      <h4
                        className="text-lg font-bold leading-tight"
                        style={{ color: settings.invoiceAccentColor || '#0f766e' }}
                      >
                        {settings.companyName || 'EzzySync Travels'}
                      </h4>
                      <p className="text-[9px] mt-0.5 text-slate-400">{settings.address || '42, MG Road, New Delhi'}</p>
                      {settings.invoiceShowGst && settings.gstNumber && (
                        <p className="text-[8px] text-slate-400 mt-0.5">GSTIN: {settings.gstNumber}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <h5 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                      {settings.invoiceTitle || 'INVOICE'}
                    </h5>
                    <p className="mt-1">Invoice #: JF-9821</p>
                    <p>Date: {new Date().toLocaleDateString('en-IN')}</p>
                  </div>
                </div>

                {/* Horizontal divider styling */}
                <div
                  className="w-full h-px mb-4"
                  style={{
                    backgroundColor: settings.invoiceLayout === 'classic'
                      ? settings.invoiceAccentColor || '#0f766e'
                      : '#e2e8f0',
                    height: settings.invoiceLayout === 'classic' ? '2px' : '1px'
                  }}
                />

                {/* Details layout */}
                <div className="grid grid-cols-2 gap-4 mb-6 pl-2">
                  <div>
                    <span className="font-bold text-slate-800 block mb-1">BILL TO</span>
                    <p className="font-semibold text-slate-600">Rishab Jain</p>
                    <p>rishab@gmail.com</p>
                    <p>+91 98765 43210</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block mb-1">TRIP DETAILS</span>
                    <p className="font-semibold text-slate-600">Himachal Valley Tour</p>
                    <p>Departure: 26/08/2026</p>
                    <p>Travelers: 4 Members</p>
                  </div>
                </div>

                {/* Table details */}
                <div className="mb-4">
                  {/* Table Header style */}
                  <div
                    className={`grid grid-cols-12 px-3 py-1.5 font-bold ${settings.invoiceLayout === 'modern' ? 'bg-slate-100 text-slate-800 rounded' :
                      settings.invoiceLayout === 'classic' ? 'text-white rounded' : 'border-b border-slate-200 text-slate-800'
                      }`}
                    style={{
                      backgroundColor: settings.invoiceLayout === 'classic'
                        ? settings.invoiceAccentColor || '#0f766e'
                        : undefined
                    }}
                  >
                    <div className="col-span-8">DESCRIPTION</div>
                    <div className="col-span-4 text-right">AMOUNT (INR)</div>
                  </div>

                  <div className="divide-y divide-slate-100 border-b border-slate-200">
                    <div className="grid grid-cols-12 px-3 py-2 text-slate-600">
                      <div className="col-span-8 font-medium">Himachal Luxury Package (4 Travelers)</div>
                      <div className="col-span-4 text-right">₹60,000.00</div>
                    </div>
                    <div className="grid grid-cols-12 px-3 py-2 text-slate-600">
                      <div className="col-span-8">Amount Paid</div>
                      <div className="col-span-4 text-right">₹20,000.00</div>
                    </div>
                    <div className="grid grid-cols-12 px-3 py-2 font-bold" style={{ color: settings.invoiceAccentColor || '#0f766e' }}>
                      <div className="col-span-8">Remaining Balance</div>
                      <div className="col-span-4 text-right">₹40,000.00</div>
                    </div>
                  </div>
                </div>

                {/* Status alert */}
                {settings.invoiceShowPaymentStatus && (
                  <div className="mb-6 pl-2">
                    <span
                      className="font-bold text-xs uppercase tracking-wider"
                      style={{ color: settings.invoiceAccentColor || '#0f766e' }}
                    >
                      Payment Status: PARTIAL
                    </span>
                  </div>
                )}

                {/* Terms conditions text box */}
                <div className="border-t border-slate-100 pt-3 pl-2">
                  <span className="font-bold text-slate-800 block mb-1">TERMS & CONDITIONS</span>
                  <p className="text-[8px] text-slate-400 leading-normal max-w-sm">
                    {settings.invoiceTerms || 'Standard cancellation policies apply. Carry original photo ID during travel.'}
                  </p>
                </div>

                {/* Footer center */}
                <div className="absolute bottom-4 left-6 right-6 text-center text-[8px] text-slate-300">
                  {settings.invoiceFooter || 'Thank you for choosing EzzySync!'}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'leadCapture' && (
          <div className="card space-y-6 max-w-3xl p-6">
            <div>
              <h3 className="font-bold text-slate-800">Landing Page Lead Capture</h3>
              <p className="text-xs text-slate-400 mt-1">
                Embed this form on your own website to capture customer inquiries directly into your Leads pipeline.
                This is separate from EzzySync's own demo-request form.
              </p>
            </div>

            {!publicLeadKey ? (
              <div className="skeleton h-32 rounded-xl" />
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="label">Your Embed Code</label>
                  <div className="relative">
                    <textarea
                      readOnly
                      rows={8}
                      value={embedSnippet}
                      className="input font-mono text-xs bg-slate-50 resize-none"
                    />
                  </div>
                  <Button type="button" variant="ghost" onClick={handleCopySnippet} className="text-xs gap-1.5 mt-2">
                    <Copy size={14} /> Copy Embed Code
                  </Button>
                </div>

                <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Regenerate Capture Link</p>
                    <p className="text-xs text-slate-400 mt-0.5">Invalidates the current embed everywhere it's published. Use if the link has leaked.</p>
                  </div>
                  <Button type="button" variant="ghost" onClick={handleRegenerateKey} disabled={regenerating} className="text-xs gap-1.5">
                    <RefreshCw size={14} /> {regenerating ? 'Regenerating...' : 'Regenerate'}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}


        {/* Global Save Button */}
        {activeTab !== 'walkthroughs' && activeTab !== 'leadCapture' && activeTab !== 'instagram' && (
          <div className="flex justify-end pt-2 max-w-3xl">
            <Button type="submit" disabled={saving} className="w-full sm:w-auto px-8 text-sm">
              {saving ? 'Saving Changes…' : 'Save Customizations'}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
