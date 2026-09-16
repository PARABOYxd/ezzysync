import React from 'react';
import { Eye, QrCode } from 'lucide-react';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Textarea from '../ui/Textarea.jsx';
import Button from '../ui/Button.jsx';
import ImageUploadField from '../ui/ImageUploadField.jsx';

export default function InvoiceTab({
  settings, setSettings, saving, handleSave,
  uploadingQr, setSelectedQrFile,
}) {
  return (
    <form onSubmit={handleSave} className="space-y-6">
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

                <label className="flex items-center gap-3 cursor-pointer p-2.5 rounded-lg border border-slate-100 bg-emerald-50 text-xs font-medium text-emerald-800">
                  <input
                    type="checkbox"
                    checked={!!settings.autoSendInvoiceEmail}
                    onChange={(e) => setSettings({ ...settings, autoSendInvoiceEmail: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500/20 border-emerald-300"
                  />
                  Auto-send Invoice via Email on new bookings
                </label>

                <label className="flex items-center gap-3 cursor-pointer p-2.5 rounded-lg border border-slate-100 bg-emerald-50 text-xs font-medium text-emerald-800">
                  <input
                    type="checkbox"
                    checked={!!settings.autoSendInvoiceWhatsapp}
                    onChange={(e) => setSettings({ ...settings, autoSendInvoiceWhatsapp: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500/20 border-emerald-300"
                  />
                  Auto-send Invoice via WhatsApp on new bookings
                </label>

                <label className="flex items-start gap-3 cursor-pointer p-2.5 rounded-lg border border-slate-100 bg-amber-50 text-xs font-medium text-amber-900 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={!!settings.autoRemindersEnabled}
                    onChange={(e) => setSettings({ ...settings, autoRemindersEnabled: e.target.checked })}
                    className="mt-0.5 rounded text-amber-600 focus:ring-amber-500/20 border-amber-300"
                  />
                  <span>
                    Automatic trip &amp; payment reminders (8:30 AM daily)
                    <span className="block font-normal text-amber-800/80 mt-0.5">
                      For Booked trips: an alert 3 days and 1 day before departure, and a balance reminder 7 and 2 days before.
                      Sent on WhatsApp and email. On a QR-linked number, automated messages to many customers raise the
                      risk of WhatsApp banning the number.
                    </span>
                  </span>
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

      {/* Payment Collection Details - configured once here, then reused on
          every invoice PDF instead of an agent typing/attaching it per chat. */}
      <div className="card space-y-5 max-w-3xl">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
          <QrCode size={18} className="text-brand-600" />
          <div>
            <h3 className="font-bold text-slate-800">Payment Collection Details</h3>
            <p className="text-xs text-slate-400">Shown on every invoice PDF so customers know where to pay</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
          <Input
            label="Account / Payee Name"
            placeholder="e.g. TravelGo Holidays Pvt Ltd"
            hint="Whose name the payment should be made to"
            value={settings.paymentAccountName || ''}
            onChange={(e) => setSettings({ ...settings, paymentAccountName: e.target.value })}
          />
          <Input
            label="UPI ID"
            placeholder="e.g. travelgo@okhdfcbank"
            hint="Printed as text on the invoice"
            value={settings.paymentUpiId || ''}
            onChange={(e) => setSettings({ ...settings, paymentUpiId: e.target.value })}
          />
        </div>

        <ImageUploadField
          label="Payment QR Code (Optional)"
          hint="Scannable UPI QR code, printed on the invoice alongside the UPI ID"
          value={settings.paymentQrUrl}
          uploading={uploadingQr}
          emptyLabel="No QR"
          size="md"
          imageFit="contain"
          buttonLabel="Upload QR Image"
          onFileSelected={(file) => {
            setSelectedQrFile(file);
            if (!file) setSettings({ ...settings, paymentQrUrl: '' });
          }}
        />
      </div>

      <div className="flex justify-end pt-2 max-w-3xl">
        <Button type="submit" disabled={saving} className="w-full sm:w-auto px-8 text-sm">
          {saving ? 'Saving Changes…' : 'Save Customizations'}
        </Button>
      </div>
    </form>
  );
}
