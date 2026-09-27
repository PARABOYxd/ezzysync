import React, { useState } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import * as bookingService from '../../services/bookingService';
import { useToast } from '../../hooks/useToast.jsx';
import { usePlanStatus } from '../../hooks/usePlanStatus.js';

export default function AiAutofillPanel({ user, onParsed }) {
  const toast = useToast();
  const { isExpired: planExpired, isTrial, limits } = usePlanStatus();
  const isLocked = planExpired || (user?.planId === 'FREE' && !isTrial && limits?.canUseAi === false);
  const [aiText, setAiText] = useState('');
  const [aiFile, setAiFile] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAi, setShowAi] = useState(false);

  const handleAiParse = async () => {
    if (!aiText && !aiFile) {
      toast.error('Please enter text or upload a PDF ticket first.');
      return;
    }
    setAiLoading(true);
    try {
      let result;
      if (aiFile) {
        const formData = new FormData();
        formData.append('file', aiFile);
        result = await bookingService.parseTicket(formData, true);
      } else {
        result = await bookingService.parseTicket({ text: aiText }, false);
      }

      onParsed(result);
      toast.success('Successfully parsed details and pre-filled form!');
      setShowAi(false);
      setAiText('');
      setAiFile(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to parse ticket with AI.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl p-4 shadow-sm transition hover:shadow-md">
      <button
        type="button"
        onClick={() => setShowAi(!showAi)}
        className="flex items-center justify-between w-full text-left font-semibold text-slate-800 text-sm focus:outline-none"
      >
        <span className="flex items-center gap-2 text-violet-700">
          <Sparkles size={16} className="animate-pulse" />
          <span>AI Magic: Autofill from ticket PDFs or chat copy</span>
        </span>
        <span className="bg-violet-100 text-violet-700 px-2 py-0.5 rounded-lg text-xs font-semibold">
          {showAi ? 'Hide Assistant' : 'Try Now'}
        </span>
      </button>

      {showAi && (
        isLocked ? (
          <div className="pt-3 mt-3 border-t border-violet-100/60 text-center py-4 space-y-2">
            <p className="text-xs text-slate-500 font-semibold">✨ AI Autofill is a Premium Feature</p>
            <p className="text-[10px] text-slate-400">Upgrade to Pro in the AI Tools page to unlock parsing.</p>
          </div>
        ) : (
          <div className="space-y-3 pt-3 mt-3 border-t border-violet-100/60 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Paste Raw Itinerary / Confirmation Copy</label>
                <textarea
                  placeholder="Paste WhatsApp confirmation messages, flight/hotel confirmation mail copies, or ticket summaries here..."
                  className="input w-full text-xs bg-white focus:ring-violet-400 border-violet-200"
                  rows={3}
                  value={aiText}
                  onChange={(e) => {
                    setAiText(e.target.value);
                    if (e.target.value) setAiFile(null);
                  }}
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Or Upload PDF Ticket File</label>
                <div className="border-2 border-dashed border-violet-200 rounded-xl p-3 bg-white flex flex-col items-center justify-center min-h-[90px] transition hover:border-violet-400">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setAiFile(file);
                        setAiText('');
                      }
                    }}
                    className="hidden"
                    id="ai-file-upload"
                  />
                  <label htmlFor="ai-file-upload" className="cursor-pointer text-center text-slate-500 w-full hover:text-slate-700">
                    <span className="block font-medium mb-1">📁 {aiFile ? aiFile.name : 'Select PDF file'}</span>
                    <span className="text-[10px] text-slate-400">Max size 10MB</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1 border-t border-violet-100/40">
              <button
                type="button"
                disabled={aiLoading}
                onClick={handleAiParse}
                className="px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 text-white font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {aiLoading ? 'Analyzing details...' : 'Autofill Form fields'}
                {!aiLoading && <ArrowRight size={13} />}
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
