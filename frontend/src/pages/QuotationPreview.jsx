import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as quotationService from '../services/quotationService';
import { formatCurrency } from '../utils/formatters';
import { Plane, ChevronDown, CheckCircle2 } from 'lucide-react';
import { useToast } from '../hooks/useToast.jsx';

export default function QuotationPreview() {
  const { uuid } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const toast = useToast();

  useEffect(() => {
    quotationService
      .getQuotationPublic(uuid)
      .then((res) => {
        // res contains { quotation, settings }
        setData(res);
        if (res.quotation?.status === 'Accepted') setAccepted(true);
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
      setAccepted(true);
      toast.success('Thank you! Your trip is confirmed.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not confirm this itinerary. Please contact us directly.');
    } finally {
      setAccepting(false);
    }
  };


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
        {/* Trip Name Header Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">ITINERARY</span>
              <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2 mt-1">
                <Plane size={18} style={{ color: brandColor }} />
                {quotation.tripName}
              </h1>
            </div>
            {quotation.priceQuote > 0 && (
              <div className="text-left sm:text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">PACKAGE PRICE</span>
                <div className="text-2xl font-extrabold mt-0.5" style={{ color: brandColor }}>
                  {formatCurrency(quotation.priceQuote)}
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 pt-5 border-t border-slate-100">
            {accepted ? (
              <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
                <CheckCircle2 size={18} />
                Trip confirmed — our team will be in touch shortly.
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAccept}
                disabled={accepting}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition disabled:opacity-60"
                style={{ backgroundColor: brandColor }}
              >
                {accepting ? 'Confirming...' : 'Accept & Confirm This Trip'}
              </button>
            )}
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



      </main>

      <footer className="max-w-4xl mx-auto text-center text-[10px] text-slate-400 mt-12 px-4 leading-normal">
        <p>{settings.companyName || 'EzzySync Travels'} | Address: {settings.address || '-'}</p>
        {settings.invoiceFooter && <p className="mt-1">{settings.invoiceFooter}</p>}
      </footer>
    </div>
  );
}
