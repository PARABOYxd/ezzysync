import React, { useEffect, useState } from 'react';
import { useToast } from '../../hooks/useToast.jsx';
import { connectGoogle, getGmailStatus, disconnectGmail } from '../../services/googleService';
import Input from '../ui/Input.jsx';
import Textarea from '../ui/Textarea.jsx';
import Button from '../ui/Button.jsx';

const FIELDS = [
  { key: 'companyName', label: 'Company Name', placeholder: 'e.g. TravelGo Holidays Pvt Ltd', hint: 'Appears on invoices & emails', required: true },
  { key: 'companyLogoUrl', label: 'Company Logo URL', placeholder: 'e.g. https://cdn.example.com/logo.png', hint: 'Direct link to your logo image' },
  { key: 'emailSenderName', label: 'Email Sender Name', placeholder: 'e.g. TravelGo Support', hint: 'Display name in outgoing emails' },
  { key: 'whatsappNumber', label: 'WhatsApp Number', placeholder: 'e.g. +919876543210', hint: 'Business WhatsApp for customer updates' },
  { key: 'gstNumber', label: 'GST Number', placeholder: 'e.g. 07AAACT1234A1Z5', hint: 'Printed on tax invoices' },
  { key: 'address', label: 'Office Address', placeholder: 'e.g. 42, MG Road, New Delhi - 110001', hint: 'Appears on invoices & letterheads' },
];

export default function GeneralTab({
  settings, setSettings, errors, setErrors, saving, handleSave,
  logoPreviewUrl, setLogoPreviewUrl, uploadingLogo, selectedLogoFile, setSelectedLogoFile,
}) {
  const toast = useToast();

  // Gmail linkage is read once on mount and after any change, so the panel
  // reflects the server rather than whatever the page assumed at load.
  const [gmailStatus, setGmailStatus] = useState(null);
  const [gmailBusy, setGmailBusy] = useState(false);

  const refreshGmailStatus = () => {
    getGmailStatus()
      .then(setGmailStatus)
      .catch(() => setGmailStatus(null));
  };

  useEffect(() => {
    refreshGmailStatus();
  }, []);

  const handleDisconnectGmail = async () => {
    setGmailBusy(true);
    try {
      const res = await disconnectGmail();
      toast.success(res.message || 'Gmail disconnected.');
      refreshGmailStatus();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not disconnect Gmail.');
    } finally {
      setGmailBusy(false);
    }
  };

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

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="card space-y-6 max-w-3xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-bold text-slate-800">Company & Contacts Profile</h3>
            <p className="text-xs text-slate-400">Basic organizational settings and details</p>
          </div>
          {/* Gmail state, not just a connect button. Until this showed the
              linked address, a tenant had no way to tell whether they were
              connected at all - the button read "Connect Gmail" either
              way - or which of their accounts we were sending as. */}
          {gmailStatus?.connected ? (
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs text-slate-500 dark:text-zinc-400">
                Sending invoices from{' '}
                <span className="font-semibold text-slate-700 dark:text-zinc-200">{gmailStatus.googleEmail}</span>
              </span>
              <button
                type="button"
                onClick={handleDisconnectGmail}
                disabled={gmailBusy}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-50 transition cursor-pointer"
              >
                {gmailBusy ? 'Disconnecting...' : 'Disconnect Gmail'}
              </button>
            </div>
          ) : (
            <Button type="button" onClick={connectGoogle} className="text-sm px-4">
              Connect Gmail
            </Button>
          )}
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
        <div className="flex justify-end pt-2 max-w-3xl">
          <Button type="submit" disabled={saving} className="w-full sm:w-auto px-8 text-sm">
            {saving ? 'Saving Changes…' : 'Save Customizations'}
          </Button>
        </div>
      </div>
    </form>
  );
}
