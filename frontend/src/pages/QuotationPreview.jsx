import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as quotationService from '../services/quotationService';
import { formatCurrency } from '../utils/formatters';
import { Plane, Calendar, CheckCircle2, ChevronDown, User, ShieldCheck } from 'lucide-react';

export default function QuotationPreview() {
  const { uuid } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [expandedDay, setExpandedDay] = useState(1); // default expand Day 1

  useEffect(() => {
    quotationService
      .getQuotationPublic(uuid)
      .then((res) => {
        // res contains { quotation, settings }
        setData(res);
      })
      .catch((err) => {
        setErrorMsg(err.response?.data?.message || 'Could not load itinerary details.');
      })
      .finally(() => setLoading(false));
  }, [uuid]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 text-slate-500 gap-3">
        <span className="loading loading-spinner text-brand-600" />
        <p className="text-xs font-medium">Loading your personalized itinerary plan...</p>
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 text-slate-500 p-4">
        <div className="card max-w-md w-full text-center space-y-4">
          <h2 className="text-red-500 font-bold text-lg">Error Loading Plan</h2>
          <p className="text-sm text-slate-400">{errorMsg || 'This itinerary link is invalid or expired.'}</p>
        </div>
      </div>
    );
  }

  const { quotation, settings } = data;
  const brandColor = settings.invoiceAccentColor || '#0f766e';

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await quotationService.acceptQuotationPublic(quotation.quotationId, quotation.tenantId);
      setSuccess(true);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Could not accept quotation.');
    } finally {
      setAccepting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 p-4">
        <div className="card max-w-lg w-full text-center space-y-6 shadow-xl py-10">
          <div className="mx-auto w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={36} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-800">Booking Confirmed!</h2>
            <p className="text-sm text-slate-400 px-6">
              Thank you for accepting the travel quotation. We have automatically registered your package booking inside our CRM. Our agent will connect with you shortly with vouchers and payment steps.
            </p>
          </div>
          <div className="border-t border-slate-100 pt-4 px-6 text-left space-y-2 text-xs text-slate-500">
            <p><strong>Package:</strong> {quotation.tripName}</p>
            <p><strong>Client:</strong> {quotation.customerName}</p>
            <p><strong>Price:</strong> {formatCurrency(quotation.priceQuote)}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16 font-sans">
      {/* Centered Logo / Branding Header */}
      <header className="bg-white border-b border-slate-100 py-6 text-center shadow-sm">
        <div className="max-w-4xl mx-auto px-4 flex flex-col items-center">
          {settings.companyLogoUrl ? (
            <img src={settings.companyLogoUrl} alt="Logo" className="h-10 object-contain mb-2" />
          ) : (
            <div className="h-10 flex items-center justify-center font-bold text-slate-800 text-lg">
              {settings.companyName || 'EzzySync Travels'}
            </div>
          )}
          <p className="text-[10px] text-slate-400 uppercase tracking-widest">Personalized Travel Proposal</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8 space-y-6">
        {/* Main Proposal Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">PROPOSAL FOR</span>
              <h2 className="text-xl font-bold text-slate-800 mt-1">{quotation.customerName}</h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                <span className="flex items-center gap-1"><User size={13} /> {quotation.phone}</span>
                <span className="text-slate-300">|</span>
                <span>{quotation.email}</span>
              </div>
            </div>
            <div className="text-left md:text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">TOTAL PACKAGE PRICE</span>
              <div className="text-2xl font-extrabold mt-0.5" style={{ color: brandColor }}>
                {formatCurrency(quotation.priceQuote)}
              </div>
              {quotation.validUntil && (
                <div className="flex items-center gap-1 text-[10px] text-amber-600 mt-1 justify-start md:justify-end">
                  <Calendar size={12} /> Valid until: {quotation.validUntil.slice(0, 10)}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">SELECTED TOUR PACKAGE</span>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Plane size={18} style={{ color: brandColor }} />
              {quotation.tripName}
            </h1>
          </div>
        </div>

        {/* Dynamic Day-by-Day Timeline */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Detailed Itinerary Schedule</h3>
          
          <div className="space-y-3">
            {quotation.itineraryDays.map((d) => {
              const isExpanded = expandedDay === d.day;
              return (
                <div
                  key={d.day}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedDay(isExpanded ? null : d.day)}
                    className="w-full flex justify-between items-center px-5 py-4 text-left font-medium text-slate-800 hover:bg-slate-50/50 transition focus:outline-none"
                  >
                    <div className="flex items-start gap-4">
                      <span
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5"
                        style={{ backgroundColor: brandColor }}
                      >
                        {d.day}
                      </span>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400">DAY {d.day}</span>
                        <h4 className="text-sm font-bold text-slate-800 leading-tight mt-0.5">
                          {d.title || `Day ${d.day} Outline`}
                        </h4>
                      </div>
                    </div>
                    <ChevronDown
                      size={18}
                      className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 pl-16 border-t border-slate-100 pt-3 bg-slate-50/20">
                      <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                        {d.description || 'Outline details not specified.'}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Terms and Acceptance Action Footer */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="space-y-1 max-w-md">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 justify-center sm:justify-start">
                <ShieldCheck size={16} className="text-emerald-500" />
                Confirm Your Booking Proposal
              </h4>
              <p className="text-[11px] text-slate-400 leading-normal">
                By confirming, this proposal converts directly to a lead booking record in our CRM. We will hold your seats and contact you with details.
              </p>
            </div>
            {quotation.status === 'Accepted' ? (
              <div className="bg-emerald-50 text-emerald-700 px-6 py-3 rounded-xl font-bold text-sm border border-emerald-100 flex items-center gap-1.5">
                <CheckCircle2 size={16} /> Booking Confirmed
              </div>
            ) : (
              <button
                onClick={handleAccept}
                disabled={accepting}
                style={{ backgroundColor: brandColor }}
                className="hover:opacity-90 text-white px-8 py-3.5 rounded-xl font-bold text-sm shadow-sm transition disabled:opacity-50"
              >
                {accepting ? 'Confirming booking…' : 'Accept & Book Package'}
              </button>
            )}
          </div>
        </div>
      </main>

      <footer className="max-w-4xl mx-auto text-center text-[10px] text-slate-400 mt-12 px-4 leading-normal">
        <p>{settings.companyName || 'EzzySync Travels'} | Address: {settings.address || '-'}</p>
        {settings.invoiceFooter && <p className="mt-1">{settings.invoiceFooter}</p>}
      </footer>
    </div>
  );
}
