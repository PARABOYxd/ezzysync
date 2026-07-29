"use client";

import React, { useState } from "react";
import { MessageSquare, Check, Send } from "lucide-react";
import { whatsappTemplates } from "../../data/landingData";

export default function WhatsAppDemo() {
  const [selectedWhatsAppTab, setSelectedWhatsAppTab] = useState("lead");

  return (
    <section className="py-16 sm:py-24 bg-slate-900 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.08),transparent_50%)]"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center relative z-10">
          
          {/* Left Column: Information */}
          <div className="lg:col-span-5 space-y-5 sm:space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 text-xs font-semibold">
              <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" focusable="false" />
              <span>WhatsApp Cloud API Integration</span>
            </div>
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight">
              Automated Client Communication
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl mx-auto lg:mx-0">
              Connect your Meta developer keys inside the CRM. Send day-by-day itineraries, flight ticket details, payment reminders, and confirmation notes dynamically.
            </p>
            <div className="space-y-3 pt-2 text-left max-w-md mx-auto lg:mx-0">
              <div className="flex gap-2.5 items-center text-slate-300 text-xs sm:text-sm">
                <Check className="w-4 h-4 text-brand-400" aria-hidden="true" focusable="false" />
                <span>No third-party marking fee (Direct Meta API)</span>
              </div>
              <div className="flex gap-2.5 items-center text-slate-300 text-xs sm:text-sm">
                <Check className="w-4 h-4 text-brand-400" aria-hidden="true" focusable="false" />
                <span>Rich text & links for digital itineraries</span>
              </div>
              <div className="flex gap-2.5 items-center text-slate-300 text-xs sm:text-sm">
                <Check className="w-4 h-4 text-brand-400" aria-hidden="true" focusable="false" />
                <span>PDF invoices sent directly as attachments</span>
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic WhatsApp phone simulator */}
          <div className="lg:col-span-7 flex flex-col items-center relative z-20">
            
            {/* Tab Selectors list */}
            <div
              role="tablist"
              aria-label="WhatsApp message simulation modes"
              className="flex bg-slate-800 p-1 rounded-xl mb-6 border border-slate-700/80 max-w-md w-full relative z-30"
            >
              {Object.keys(whatsappTemplates).map((key) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={selectedWhatsAppTab === key}
                  aria-controls="whatsapp-chat-panel"
                  id={`whatsapp-tab-${key}`}
                  onClick={() => setSelectedWhatsAppTab(key)}
                  type="button"
                  className={`flex-1 text-center py-2 sm:py-2.5 text-[10px] sm:text-xs font-semibold rounded-lg transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
                    selectedWhatsAppTab === key
                      ? "bg-brand-500 text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {whatsappTemplates[key].title}
                </button>
              ))}
            </div>

            {/* Simulated Phone Device Mockup */}
            <div className="w-[275px] sm:w-[300px] h-[480px] sm:h-[520px] bg-slate-950 border-[5px] sm:border-[6px] border-slate-800 rounded-[32px] sm:rounded-[36px] shadow-2xl relative flex flex-col overflow-hidden">
              {/* Camera Notch */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 sm:w-28 h-4 bg-slate-800 rounded-full z-20"></div>

              {/* WhatsApp App Mockup container */}
              <div
                id="whatsapp-chat-panel"
                role="tabpanel"
                aria-labelledby={`whatsapp-tab-${selectedWhatsAppTab}`}
                className="flex-1 flex flex-col text-slate-900 bg-[#efeae2] relative pt-6 font-sans select-none"
              >
                {/* Chat Header */}
                <div className="bg-brand-600 text-white p-2.5 sm:p-3 pt-4 flex items-center gap-2 sm:gap-2.5 shadow-sm">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-300 flex items-center justify-center font-bold text-slate-700 text-xs">J</div>
                  <div>
                    <p className="font-bold text-[10px] sm:text-xs">EzzySync Support</p>
                    <p className="text-[7px] sm:text-[8px] text-slate-300">Online</p>
                  </div>
                </div>

                {/* Simulated Chat Feed */}
                <div className="flex-1 p-2.5 sm:p-3 flex flex-col justify-end space-y-2 sm:space-y-3">
                  {/* Incoming client prompt */}
                  <div className="bg-white p-2 sm:p-2.5 rounded-lg text-[9px] sm:text-[10px] leading-relaxed max-w-[85%] self-start shadow-sm border border-slate-200/50">
                    Hi, I want to book a package for Bali for 2 adults. Please share details.
                  </div>

                  {/* Outgoing automated response (dynamic message depending on selected tab) */}
                  <div className="bg-brand-50 p-2 sm:p-2.5 rounded-lg text-[9px] sm:text-[10px] leading-relaxed max-w-[85%] self-end shadow-sm border border-brand-200 flex flex-col gap-1 relative">
                    <span className="font-semibold text-[7px] sm:text-[8px] text-brand-750 block bg-brand-100/60 px-1 py-0.5 rounded self-start">
                      {whatsappTemplates[selectedWhatsAppTab].badge}
                    </span>
                    <p className="whitespace-pre-line text-slate-800">
                      {whatsappTemplates[selectedWhatsAppTab].msg}
                    </p>
                    <span className="text-[7px] text-slate-400 text-right mt-1 block">12:30 PM ✓✓</span>
                  </div>
                </div>

                {/* Bottom Input simulator */}
                <div className="bg-[#f0f2f5] p-2 flex items-center gap-2 border-t border-slate-200">
                  <div className="flex-1 bg-white px-3 py-1 sm:py-1.5 rounded-full text-[9px] text-slate-400 border border-slate-200">
                    Type a message
                  </div>
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-brand-600 flex items-center justify-center text-white cursor-pointer hover:bg-brand-700 transition-colors">
                    <Send className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-white" aria-hidden="true" focusable="false" />
                  </div>
                  {/* TODO: Add physical 1200x630 OG image in public/images/og-image.png */}
                </div>

              </div>

            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
