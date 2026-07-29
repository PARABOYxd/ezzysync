"use client";
import React from "react";
import {
  ClipboardList,
  MessageSquare,
  FileText,
  CheckCircle
} from "lucide-react";

export default function Highlights() {
  return (
    <section aria-label="Core Features Highlights" className="bg-slate-50/50 border-y border-slate-200/80 py-12 sm:py-16 relative overflow-hidden">
      {/* Hide Scrollbar Style */}
      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />

      {/* Background Glow Overlay */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-brand-100/20 filter blur-[100px] -z-10"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Swipe Track on Mobile, Grid on Desktop */}
        <div className="flex md:grid md:grid-cols-3 gap-4 md:gap-8 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-4 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
          
          {/* Card 1: Lead Pipelines */}
          <div className="min-w-[280px] sm:min-w-[320px] md:min-w-0 flex-shrink-0 snap-center bg-white p-5 sm:p-8 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-card hover:border-brand-500 hover:-translate-y-1 transition-all duration-200 ease-in-out flex flex-col items-center text-center group transform">
            <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 group-hover:scale-110 group-hover:bg-brand-600 group-hover:text-white transition-all duration-300 shadow-sm shadow-brand-500/10">
              <ClipboardList className="w-5.5 h-5.5" aria-hidden="true" focusable="false" />
            </div>
            <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 mt-4 sm:mt-5">
              Lead Pipelines
            </h3>
            <p className="text-slate-500 text-xs sm:text-sm mt-2.5 leading-relaxed max-w-xs">
              Organise and track your bookings from first inquiry to trip completion without losing chat threads. Set client details, follow up on deals, and monitor pipelines in real-time.
            </p>
            <div className="mt-4 pt-4 border-t border-slate-100 w-full flex items-center justify-center gap-1.5 text-[10px] sm:text-xs font-bold text-brand-600">
              <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" focusable="false" />
              <span>Pipeline Tracking Included</span>
            </div>
          </div>

          {/* Card 2: WhatsApp Notifications */}
          <div className="min-w-[280px] sm:min-w-[320px] md:min-w-0 flex-shrink-0 snap-center bg-white p-5 sm:p-8 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-card hover:border-brand-500 hover:-translate-y-1 transition-all duration-200 ease-in-out flex flex-col items-center text-center group transform">
            <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 group-hover:scale-110 group-hover:bg-brand-600 group-hover:text-white transition-all duration-300 shadow-sm shadow-brand-500/10">
              <MessageSquare className="w-5.5 h-5.5" aria-hidden="true" focusable="false" />
            </div>
            <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 mt-4 sm:mt-5">
              WhatsApp Notifications
            </h3>
            <p className="text-slate-500 text-xs sm:text-sm mt-2.5 leading-relaxed max-w-xs">
              Send pre-configured text alerts and itinerary links directly using official Meta API keys. Automatically notify clients upon lead updates or confirmed payments.
            </p>
            <div className="mt-4 pt-4 border-t border-slate-100 w-full flex items-center justify-center gap-1.5 text-[10px] sm:text-xs font-bold text-brand-600">
              <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" focusable="false" />
              <span>Official Cloud API Support</span>
            </div>
          </div>

          {/* Card 3: Instant PDF Invoices */}
          <div className="min-w-[280px] sm:min-w-[320px] md:min-w-0 flex-shrink-0 snap-center bg-white p-5 sm:p-8 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-card hover:border-brand-500 hover:-translate-y-1 transition-all duration-200 ease-in-out flex flex-col items-center text-center group transform">
            <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition-all duration-300 shadow-sm shadow-amber-500/10">
              <FileText className="w-5.5 h-5.5" aria-hidden="true" focusable="false" />
            </div>
            <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 mt-4 sm:mt-5">
              Instant PDF Invoices
            </h3>
            <p className="text-slate-500 text-xs sm:text-sm mt-2.5 leading-relaxed max-w-xs">
              Generate beautiful PDF breakdown sheets, receipts, and invoices in seconds with a single click. Maintain structured billing routes, taxes, and balance payments.
            </p>
            <div className="mt-4 pt-4 border-t border-slate-100 w-full flex items-center justify-center gap-1.5 text-[10px] sm:text-xs font-bold text-amber-600">
              <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" focusable="false" />
              <span>One-Click Export</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
