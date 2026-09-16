import React from 'react';
import { X, Layers, Edit3, Search, Compass, ExternalLink, FileText, Copy, Loader2 } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { getItineraryImage } from '../../utils/whatsappMessageFormatters';

export default function ItineraryShareModal({
  open,
  onClose,
  selectedChat,
  itineraryTab,
  setItineraryTab,
  catalogQuotations,
  loadingCatalog,
  catalogSearch,
  setCatalogSearch,
  sendingQuotationId,
  sendingActionType,
  onSendExistingLink,
  onSendExistingPdf,
  onInsertExistingLink,
  onCustomizeExisting,
  itineraryForm,
  setItineraryForm,
  sendingItinerary,
  onSendItinerary,
}) {
  if (!open) return null;

  const filteredQuotations = catalogQuotations.filter((q) => {
    if (!catalogSearch.trim()) return true;
    const s = catalogSearch.toLowerCase();
    return (
      q.tripName?.toLowerCase().includes(s) ||
      q.quotationId?.toLowerCase().includes(s) ||
      q.customerName?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">

        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Compass size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Share Travel Itinerary</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Send interactive link or generated PDF to +{selectedChat?.phone}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 pt-2 shrink-0 bg-slate-50/30 dark:bg-slate-900/50 gap-2">
          <button
            type="button"
            onClick={() => setItineraryTab('catalog')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              itineraryTab === 'catalog'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Layers size={14} />
            <span>Existing Itineraries</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-400">
              {catalogQuotations.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setItineraryTab('custom')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              itineraryTab === 'custom'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Edit3 size={14} />
            <span>Create Custom PDF</span>
          </button>
        </div>

        {/* Modal Body */}
        {itineraryTab === 'catalog' ? (
          <div className="flex-1 overflow-hidden flex flex-col p-4 sm:p-5">
            {/* Search Bar */}
            <div className="relative mb-3 shrink-0">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search itineraries by trip name..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-200"
              />
              {catalogSearch && (
                <button
                  type="button"
                  onClick={() => setCatalogSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Itinerary List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {loadingCatalog ? (
                <div className="space-y-3 py-4">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="animate-pulse p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex gap-3">
                      <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-xl shrink-0" />
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                        <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded w-1/3" />
                        <div className="h-3 bg-slate-100 dark:bg-slate-800/40 rounded w-3/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredQuotations.length === 0 ? (
                <div className="text-center py-10 px-4 text-slate-400">
                  <Compass className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {catalogSearch ? `No itineraries matching "${catalogSearch}"` : 'No itineraries found in catalog'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                    You can create day-by-day plans in the "Itineraries & Quotes" section, or use the "Create Custom PDF" tab right here.
                  </p>
                  <button
                    type="button"
                    onClick={() => setItineraryTab('custom')}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    Create Custom Itinerary PDF
                  </button>
                </div>
              ) : (
                filteredQuotations.map((q) => {
                  const nights = q.itineraryDays?.length > 1 ? q.itineraryDays.length - 1 : 0;
                  const durationText = `${q.itineraryDays?.length || 1}D${nights > 0 ? ` / ${nights}N` : ''}`;
                  const isSendingThis = sendingQuotationId === (q.id || q.quotationId);

                  return (
                    <div
                      key={q.quotationId || q.id}
                      className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800/80 bg-white dark:bg-slate-800/40 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 transition-all flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between shadow-xs"
                    >
                      {/* Image & Details */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <img
                          src={getItineraryImage(q.bannerUrl)}
                          alt={q.tripName}
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shrink-0 border border-slate-100 dark:border-slate-700 shadow-2xs"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                              {q.tripName}
                            </h4>
                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 shrink-0">
                              {durationText}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            {q.priceQuote > 0 && (
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(q.priceQuote)}
                              </span>
                            )}
                            <span>•</span>
                            <span>{q.itineraryDays?.length || 1} Days Timeline</span>
                          </div>
                          {q.highlights && q.highlights.length > 0 && (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                              ✨ {q.highlights.slice(0, 2).join(' • ')}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Quick Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
                        {/* Send Link Button */}
                        <button
                          type="button"
                          disabled={isSendingThis}
                          onClick={() => onSendExistingLink(q)}
                          title="Send interactive preview link directly to customer on WhatsApp"
                          className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {isSendingThis && sendingActionType === 'link' ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <ExternalLink size={12} />
                          )}
                          <span>Send Link</span>
                        </button>

                        {/* Send as PDF */}
                        <button
                          type="button"
                          disabled={isSendingThis}
                          onClick={() => onSendExistingPdf(q)}
                          title="Generate PDF from this itinerary and send to WhatsApp"
                          className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-500 text-white flex items-center gap-1 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {isSendingThis && sendingActionType === 'pdf' ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <FileText size={12} />
                          )}
                          <span>Send PDF</span>
                        </button>

                        {/* Insert Into Chat */}
                        <button
                          type="button"
                          onClick={() => onInsertExistingLink(q)}
                          title="Paste link & highlights into composer so you can edit before sending"
                          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                        >
                          <Copy size={14} />
                        </button>

                        {/* Customize in Custom Tab */}
                        <button
                          type="button"
                          onClick={() => onCustomizeExisting(q)}
                          title="Edit day-by-day text in custom PDF generator"
                          className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-colors cursor-pointer"
                        >
                          <Edit3 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={onSendItinerary} className="p-5 space-y-4 flex-1 overflow-y-auto">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Trip Name
              </label>
              <input
                type="text"
                placeholder="e.g. 5 Days Luxury Goa Vacation"
                value={itineraryForm.tripName}
                onChange={(e) => setItineraryForm({ ...itineraryForm, tripName: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Day-by-Day Itinerary Text
                </label>
                <span className="text-[10px] text-slate-400">Supports "Day 1: Title" & bullet points</span>
              </div>
              <textarea
                rows={7}
                placeholder="Day 1: Arrival & Sunset Beach Club&#10;Check-in to resort, welcome drinks and private sunset dinner.&#10;&#10;Day 2: Private Yacht Cruise&#10;Dolphin spotting and secluded island barbecue..."
                value={itineraryForm.itineraryText}
                onChange={(e) => setItineraryForm({ ...itineraryForm, itineraryText: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                required
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setItineraryTab('catalog')}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1 cursor-pointer"
              >
                <Layers size={13} />
                <span>Back to Catalog</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingItinerary}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 disabled:opacity-50 flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  {sendingItinerary && <Loader2 size={13} className="animate-spin" />}
                  <span>{sendingItinerary ? 'Generating & Sending PDF...' : 'Send PDF via WhatsApp'}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
