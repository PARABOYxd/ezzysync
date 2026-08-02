import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as quotationService from '../services/quotationService';
import { formatCurrency } from '../utils/formatters';
import { Plane, ChevronDown, CheckCircle2, XCircle, MapPin, ShieldCheck, CalendarDays, Sparkles, Navigation } from 'lucide-react';
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
  const days = quotation.itineraryDays?.length || 0;

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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-20 font-sans">
      {/* Top Navbar */}
      <div className="absolute top-0 left-0 right-0 z-10 px-6 py-4 flex items-center justify-between">
        {settings.companyLogoUrl ? (
          <img src={settings.companyLogoUrl} alt="Logo" className="h-10 object-contain bg-white/90 rounded-lg px-3 py-1.5 shadow-sm backdrop-blur-sm" />
        ) : (
          <div className="h-10 flex items-center gap-2 font-bold text-white text-lg bg-black/30 px-3 py-1.5 rounded-lg backdrop-blur-md">
            <Plane size={20} />
            {settings.companyName || 'EzzySync Travels'}
          </div>
        )}
      </div>

      {/* Branded Hero Header */}
      <header
        className="relative overflow-hidden py-24 text-center px-4"
        style={{ 
          background: quotation.bannerUrl 
            ? `linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.7)), url('${quotation.bannerUrl}') center/cover no-repeat` 
            : `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}cc 60%, ${brandColor}99 100%)`
        }}
      >
        <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_20%_20%,white_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="relative max-w-3xl mx-auto flex flex-col items-center mt-4">
          <p className="text-[11px] text-white/80 uppercase tracking-[0.2em] font-semibold mb-3">Personalized Travel Proposal</p>
          <h1
            className="text-3xl sm:text-4xl font-extrabold text-white leading-tight max-w-xl px-2"
            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.25)' }}
          >
            {quotation.tripName}
          </h1>
          {days > 0 && (
            <div className="inline-flex items-center gap-1.5 bg-white text-[13px] font-bold px-4 py-1.5 rounded-full mt-5 shadow-md text-slate-800">
              <CalendarDays size={14} style={{ color: brandColor }} />
              {days} Day{days !== 1 ? 's' : ''} Itinerary
            </div>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 -mt-8 space-y-6 relative">
        {/* Price + Accept Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-lg shadow-slate-900/5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {quotation.priceQuote > 0 ? (
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Package Price</span>
                <div className="text-3xl font-extrabold mt-0.5" style={{ color: brandColor }}>
                  {formatCurrency(quotation.priceQuote)}
                </div>
                <span className="text-[11px] text-slate-400">per person, all inclusions applied</span>
              </div>
            ) : (
              <div className="text-sm text-slate-500 font-medium">Custom quote — contact us for pricing details.</div>
            )}

            {!accepted && (
              <button
                type="button"
                onClick={handleAccept}
                disabled={accepting}
                className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-bold text-white transition disabled:opacity-60 shadow-md hover:opacity-90 shrink-0"
                style={{ backgroundColor: brandColor }}
              >
                {accepting ? 'Confirming...' : 'Accept & Confirm This Trip'}
              </button>
            )}
          </div>
        </div>

        {/* Trip Highlights */}
        {quotation.highlights?.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <Sparkles size={14} className="text-violet-500" /> Trip Highlights
            </h4>
            <div className="flex flex-wrap gap-2">
              {quotation.highlights.map((item, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 bg-violet-50 text-violet-700 text-xs font-medium px-3 py-1.5 rounded-full border border-violet-100"
                >
                  <Sparkles size={11} />
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Dynamic Day-by-Day Timeline */}
        {days > 0 && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1 flex items-center gap-1.5">
              <MapPin size={13} style={{ color: brandColor }} /> Detailed Itinerary Schedule
            </h3>

            <div className="relative pl-5 space-y-3">
              <div className="absolute left-[1.6rem] top-2 bottom-2 w-0.5 border-l-2 border-dashed border-slate-200" />
              {quotation.itineraryDays.map((d) => {
                const isExpanded = expandedDay === d.day;
                return (
                  <div
                    key={d.day}
                    className="relative bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedDay(isExpanded ? null : d.day)}
                      className="w-full flex justify-between items-center px-5 py-4 text-left font-medium text-slate-800 hover:bg-slate-50/50 transition focus:outline-none"
                    >
                      <div className="flex items-start gap-4">
                        <span
                          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5 shadow-sm"
                          style={{ backgroundColor: brandColor }}
                        >
                          {d.day}
                        </span>
                        <div>
                          <span className="text-[9px] uppercase font-bold tracking-wider" style={{ color: brandColor }}>Day {d.day}</span>
                          <h4 className="text-sm font-bold text-slate-800 leading-tight mt-0.5">
                            {d.title || `Day ${d.day} Outline`}
                          </h4>
                        </div>
                      </div>
                      <ChevronDown
                        size={18}
                        className={`text-slate-400 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-5 pl-[4.25rem] border-t border-slate-100 pt-3 bg-slate-50/30">
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
        )}

        {/* Inclusions / Exclusions */}
        {(quotation.inclusions?.length > 0 || quotation.exclusions?.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quotation.inclusions?.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                  <ShieldCheck size={14} className="text-emerald-500" /> What's Included
                </h4>
                <ul className="space-y-2">
                  {quotation.inclusions.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {quotation.exclusions?.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                  <XCircle size={14} className="text-rose-500" /> What's Not Included
                </h4>
                <ul className="space-y-2">
                  {quotation.exclusions.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                      <XCircle size={14} className="text-rose-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Pickup Options */}
        {quotation.pickupOptions?.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <Navigation size={14} className="text-blue-500" /> Pickup Options
            </h4>
            <ul className="divide-y divide-slate-100">
              {quotation.pickupOptions.map((opt, i) => (
                <li key={i} className="flex items-center justify-between py-2.5 text-xs">
                  <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                    <Navigation size={12} className="text-blue-400" /> {opt.location}
                  </span>
                  <span className="font-bold" style={{ color: brandColor }}>{formatCurrency(opt.price)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Related Quotations */}
        {quotation.relatedQuotations?.length > 0 && (
          <div className="mt-10">
            <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
              <span className="w-8 h-px bg-slate-200" />
              Other Recommended Trips
              <span className="w-8 h-px bg-slate-200" />
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {quotation.relatedQuotations.map((rq, idx) => (
                <a
                  key={idx}
                  href={`/app/quote-preview/${rq.id}`}
                  className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:shadow-md hover:border-slate-300 transition group block text-left"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm font-bold text-slate-700 group-hover:text-brand-600 transition truncate pr-2" style={{ color: 'inherit' }} onMouseEnter={(e) => e.currentTarget.style.color = brandColor} onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}>
                      {rq.tripName}
                    </h4>
                    {rq.days > 0 && (
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full shrink-0">
                        {rq.days}D
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-slate-500">
                    {rq.priceQuote > 0 ? formatCurrency(rq.priceQuote) : 'Custom Pricing'}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

      </main>

      <footer className="max-w-3xl mx-auto text-center text-[10px] text-slate-400 mt-12 px-4 leading-normal">
        <p>{settings.companyName || 'EzzySync Travels'} | Address: {settings.address || '-'}</p>
        {settings.invoiceFooter && <p className="mt-1">{settings.invoiceFooter}</p>}
      </footer>
    </div>
  );
}
