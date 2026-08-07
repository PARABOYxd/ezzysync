import React, { useEffect, useState } from 'react';
import * as settingsService from '../services/settingsService';
import api, { API_BASE_URL } from '../services/api';
import { useToast } from '../hooks/useToast.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { connectGoogle } from '../services/googleService';
import { Settings, Palette, Eye, FileCheck, Sparkles, Link2, Copy, RefreshCw, MessageSquare, Instagram } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('general'); // 'general', 'invoice', or 'walkthroughs'
  const [settings, setSettings] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [walkthroughRequests, setWalkthroughRequests] = useState([]);
  const [loadingWalkthroughs, setLoadingWalkthroughs] = useState(false);
  const [publicLeadKey, setPublicLeadKey] = useState(null);
  const [regenerating, setRegenerating] = useState(false);
  const toast = useToast();

  useEffect(() => {
    settingsService.getSettings().then(setSettings).catch(() => toast.error('Could not load settings.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === 'walkthroughs') {
      setLoadingWalkthroughs(true);
      api.get('/public/walkthrough')
        .then((res) => setWalkthroughRequests(res.data.requests || []))
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
      const updated = await settingsService.updateSettings(settings);
      setSettings(updated);
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
            WhatsApp Connection
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
              {FIELDS.map(({ key, label, placeholder, hint, required }) => (
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
              ))}
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

        {activeTab === 'whatsapp' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 card space-y-6">
              <div>
                <h3 className="font-bold text-slate-800">WhatsApp API Credentials</h3>
                <p className="text-xs text-slate-400">Connect your custom Meta WhatsApp Cloud API credentials to automate messages from your own business number.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <Input
                  label="Phone Number ID"
                  placeholder="e.g. 517969018813..."
                  hint="Unique ID for your verified WhatsApp business phone number"
                  value={settings.whatsappPhoneNumberId || ''}
                  onChange={(e) => setSettings({ ...settings, whatsappPhoneNumberId: e.target.value })}
                />
                <Input
                  label="Display Phone Number"
                  placeholder="e.g. +91 98765 43210"
                  hint="The phone number linked to your Meta API account"
                  value={settings.whatsappNumber || ''}
                  onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                />
                <Input
                  label="WABA ID (WhatsApp Business Account ID)"
                  placeholder="e.g. 104825968132..."
                  hint="Your WhatsApp Business Account Identifier"
                  value={settings.whatsappWabaId || ''}
                  onChange={(e) => setSettings({ ...settings, whatsappWabaId: e.target.value })}
                />
                <Input
                  label="Business ID"
                  placeholder="Meta Business Portfolio ID"
                  hint="Your Facebook Business Manager ID"
                  value={settings.whatsappBusinessId || ''}
                  onChange={(e) => setSettings({ ...settings, whatsappBusinessId: e.target.value })}
                />
              </div>

              <Input
                label="Meta Access Token"
                placeholder="EAAGOCSPX-..."
                hint="Your system user access token with whatsapp_business_messaging permission"
                value={settings.whatsappAccessToken || ''}
                onChange={(e) => setSettings({ ...settings, whatsappAccessToken: e.target.value })}
              />

              <Input
                label="App Secret"
                placeholder="Meta App Secret key"
                hint="App Settings -> Basic -> App Secret (Used for webhooks)"
                value={settings.whatsappAppSecret || ''}
                onChange={(e) => setSettings({ ...settings, whatsappAppSecret: e.target.value })}
              />
            </div>

            <div className="lg:col-span-5 space-y-4">
              {/* Critical Warning Box */}
              <div className="bg-red-50/70 border border-red-200/80 text-red-700 rounded-2xl p-4 text-xs space-y-2 shadow-sm">
                <div className="flex items-center gap-2 font-extrabold text-red-800">
                  <span className="text-lg">⚠️</span> CRITICAL WARNING
                </div>
                <p className="leading-relaxed">
                  Once linked to this developer API, you <strong>CANNOT</strong> use this same phone number inside the regular mobile WhatsApp App or WhatsApp Business App.
                </p>
                <p className="font-bold text-red-900 leading-relaxed bg-white/80 p-2.5 rounded-xl border border-red-100">
                  💡 Best Practice: We highly recommend buying a cheap secondary SIM card (new number) purely for CRM alerts.
                </p>
              </div>

              {/* Quick Setup Card */}
              <div className="bg-gradient-to-br from-brand-50/50 to-emerald-50/30 border border-brand-100 rounded-2xl p-5 shadow-sm space-y-4">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-brand-100/50 pb-2">
                  <MessageSquare size={16} className="text-brand-600" />
                  Quick Setup Guide
                </h4>
                <ol className="space-y-3.5 text-xs text-slate-600 list-decimal pl-4 leading-relaxed">
                  <li>Register as a developer on <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-brand-600 font-bold underline">developers.facebook.com</a> and create a <strong>Business App</strong>.</li>
                  <li>Add <strong>WhatsApp</strong> integration, verify your custom business number, and copy the <strong>Phone Number ID</strong>.</li>
                  <li>Generate a <strong>Permanent Access Token</strong> under your Meta Business Settings for a System User with admin permissions.</li>
                  <li>Paste the values in the form fields on the left and click <strong>Save Customizations</strong>.</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'instagram' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 card space-y-6">
              <div>
                <h3 className="font-bold text-slate-800">Instagram API Credentials</h3>
                <p className="text-xs text-slate-400">Connect your custom Instagram Professional Account to manage customer chats directly from your CRM dashboard.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <Input
                  label="Instagram Username"
                  placeholder="e.g. travelgo_holidays"
                  hint="Your Instagram Professional Account handle"
                  value={settings.instagramUsername || ''}
                  onChange={(e) => setSettings({ ...settings, instagramUsername: e.target.value })}
                />
                <Input
                  label="Instagram Account ID"
                  placeholder="e.g. 178414053..."
                  hint="Unique ID of your Instagram Professional Account"
                  value={settings.instagramAccountId || ''}
                  onChange={(e) => setSettings({ ...settings, instagramAccountId: e.target.value })}
                />
              </div>

              <Input
                label="Meta Access Token"
                placeholder="EAAGOCSPX-..."
                hint="Meta system user token with instagram_manage_messages permission"
                value={settings.instagramAccessToken || ''}
                onChange={(e) => setSettings({ ...settings, instagramAccessToken: e.target.value })}
              />
            </div>

            <div className="lg:col-span-5 bg-gradient-to-br from-pink-50/50 to-orange-50/30 border border-pink-100 rounded-2xl p-5 shadow-sm space-y-4">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Instagram size={16} className="text-pink-600" />
                Quick Setup Guide
              </h4>
              <ol className="space-y-3 text-xs text-slate-600 list-decimal pl-4">
                <li>Link your Instagram Professional Account to your Facebook page.</li>
                <li>In your Meta Developer App, add <strong>Instagram Graph API</strong> support.</li>
                <li>Copy your Instagram Account ID from your Facebook page settings.</li>
                <li>Paste details here and click <strong>Save Customizations</strong>.</li>
              </ol>
            </div>
          </div>
        )}

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
        {activeTab !== 'walkthroughs' && activeTab !== 'leadCapture' && (
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
