import React, { useEffect, useState } from 'react';
import * as settingsService from '../services/settingsService';
import { getFeatures, fetchFeatures } from '../services/featureService';
import { uploadFile } from '../services/uploadService';
import { useToast } from '../hooks/useToast.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { Settings, Palette, MessageSquare, Instagram, Link2 } from 'lucide-react';
import GeneralTab from '../components/settings/GeneralTab.jsx';
import WhatsAppTab from '../components/settings/WhatsAppTab.jsx';
import InstagramTab from '../components/settings/InstagramTab.jsx';
import InvoiceTab from '../components/settings/InvoiceTab.jsx';
import LeadCaptureTab from '../components/settings/LeadCaptureTab.jsx';

export default function SettingsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [selectedLogoFile, setSelectedLogoFile] = useState(null);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [selectedQrFile, setSelectedQrFile] = useState(null);

  const [features, setFeatures] = useState(getFeatures());
  useEffect(() => {
    fetchFeatures().then(setFeatures).catch(() => {});
  }, []);

  useEffect(() => {
    settingsService.getSettings()
      .then(setSettings)
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
          const { code: waCode, accessToken: waAccessToken, phone_number_id, waba_id } = data.data || data;
          try {
            const res = await settingsService.connectWhatsappEmbedded({
              code: waCode,
              accessToken: waAccessToken,
              phoneNumberId: phone_number_id,
              wabaId: waba_id
            });
            setSettings(res.settings);
            toast.success('WhatsApp Business connected successfully via Meta!');
          } catch {
            toast.error('Failed to link WhatsApp account.');
          }
        }
      } catch {
        // ignore malformed postMessage payloads
      }
    };

    window.addEventListener('message', handleMetaMessage);
    return () => window.removeEventListener('message', handleMetaMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      let finalQrUrl = settings.paymentQrUrl;
      if (selectedQrFile) {
        setUploadingQr(true);
        try {
          finalQrUrl = await uploadFile(selectedQrFile);
          setSelectedQrFile(null);
        } catch (uploadErr) {
          toast.error(uploadErr.response?.data?.message || 'Failed to upload payment QR.');
          setSaving(false);
          setUploadingQr(false);
          return;
        }
        setUploadingQr(false);
      }

      const payload = { ...settings, companyLogoUrl: finalLogoUrl, paymentQrUrl: finalQrUrl };
      const updated = await settingsService.updateSettings(payload);
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
            WhatsApp Configuration
          </button>
        )}
        {user?.role === 'ADMIN' && features?.instagram && (
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

      {activeTab === 'general' && (
        <GeneralTab
          settings={settings}
          setSettings={setSettings}
          errors={errors}
          setErrors={setErrors}
          saving={saving}
          handleSave={handleSave}
          uploadingLogo={uploadingLogo}
          setSelectedLogoFile={setSelectedLogoFile}
        />
      )}

      {user?.role === 'ADMIN' && activeTab === 'whatsapp' && (
        <WhatsAppTab settings={settings} setSettings={setSettings} />
      )}

      {user?.role === 'ADMIN' && features?.instagram && activeTab === 'instagram' && (
        <InstagramTab settings={settings} setSettings={setSettings} />
      )}

      {activeTab === 'invoice' && (
        <InvoiceTab
          settings={settings}
          setSettings={setSettings}
          saving={saving}
          handleSave={handleSave}
          uploadingQr={uploadingQr}
          setSelectedQrFile={setSelectedQrFile}
        />
      )}

      {user?.role === 'ADMIN' && activeTab === 'leadCapture' && (
        <LeadCaptureTab />
      )}
    </div>
  );
}
