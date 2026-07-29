"use client";
import React from "react";
import { UserPlus, Compass, Share2 } from "lucide-react";

export default function Workflow() {
  return (
    <section id="workflow" className="py-16 sm:py-24 bg-white relative z-10">
      
      {/* Hide Scrollbars Style */}
      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-16">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-600 block">Step-By-Step</span>
          <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-slate-900">
            How JourneyFlow Works
          </h2>
          <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto">
            From the initial customer inquiry to final booking confirmation, manage your entire operations workflow smoothly.
          </p>
        </div>

        {/* Workflow Steps: Swipe Track on Mobile, Grid on Desktop */}
        <div className="flex md:grid md:grid-cols-3 gap-4 md:gap-8 overflow-x-auto md:overflow-visible snap-x snap-mandatory scrollbar-none pt-6 pb-4 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 relative">
          
          {/* Connecting Line (Desktop Only) */}
          <div className="hidden md:block absolute top-1/2 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-brand-200 via-brand-300 to-brand-400 -z-10 -translate-y-16"></div>

          {/* Step 1 */}
          <div className="min-w-[270px] sm:min-w-[310px] md:min-w-0 flex-shrink-0 snap-center bg-slate-50 p-6 sm:p-8 rounded-2xl border border-slate-200/60 flex flex-col items-center text-center relative">
            <span className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-brand-500/20">
              1
            </span>
            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-brand-600 mt-2">
              <UserPlus className="w-6 h-6" aria-hidden="true" focusable="false" />
            </div>
            <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 mt-5">Log Travel Inquiries</h3>
            <p className="text-slate-500 text-xs sm:text-sm mt-3 leading-relaxed">
              Capture leads from your website or social media. Add basic contact details, travel destinations, passenger count, and budget brackets instantly.
            </p>
          </div>

          {/* Step 2 */}
          <div className="min-w-[270px] sm:min-w-[310px] md:min-w-0 flex-shrink-0 snap-center bg-slate-50 p-6 sm:p-8 rounded-2xl border border-slate-200/60 flex flex-col items-center text-center relative">
            <span className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-brand-500/20">
              2
            </span>
            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-brand-500 mt-2">
              <Compass className="w-6 h-6" aria-hidden="true" focusable="false" />
            </div>
            <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 mt-5">Build Custom Itineraries</h3>
            <p className="text-slate-500 text-xs sm:text-sm mt-3 leading-relaxed">
              Use our template engine to design day-by-day itineraries. Add hotels, flight routes, sightseeing tickets, and custom daily details in minutes.
            </p>
          </div>

          {/* Step 3 */}
          <div className="min-w-[270px] sm:min-w-[310px] md:min-w-0 flex-shrink-0 snap-center bg-slate-50 p-6 sm:p-8 rounded-2xl border border-slate-200/60 flex flex-col items-center text-center relative">
            <span className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-brand-600/25">
              3
            </span>
            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-brand-600 mt-2">
              <Share2 className="w-6 h-6" aria-hidden="true" focusable="false" />
            </div>
            <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 mt-5">Send Invoices & Alerts</h3>
            <p className="text-slate-500 text-xs sm:text-sm mt-3 leading-relaxed">
              Generate PDF breakdown invoices with a single click. Send digital billing links and confirmation alerts directly to clients on their WhatsApp.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
}
