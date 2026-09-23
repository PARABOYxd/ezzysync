"use client";

import React from "react";
import { ArrowRight, MessageSquare, CheckCircle2, Lock } from "lucide-react";

export default function Hero({ crmUrl }) {
  const loginUrl = crmUrl ? `${crmUrl}/login` : "/pricing";

  return (
    <section className="relative pt-12 pb-16 sm:pt-16 sm:pb-24 bg-[#fafbfc] border-b border-slate-200">
      <div className="max-w-[1240px] mx-auto px-5 sm:px-6">
        
        {/* Header Content */}
        <div className="text-center space-y-5 max-w-4xl mx-auto">
          {/* Eyebrow */}
          <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-600 block">
            Dedicated Travel Agency Management Software
          </span>

          {/* Main Headline */}
          <h1 className="font-bold text-slate-950 text-2xl sm:text-4xl lg:text-[2.75rem] leading-[1.18] tracking-tight">
            Travel CRM Software Built for <br className="hidden sm:inline" />
            <span className="text-brand-600">Tour Operators &amp; Travel Agencies</span>
          </h1>

          {/* Subheadline */}
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl mx-auto">
            Manage inquiries, automate WhatsApp client communication, assemble day-wise itineraries, issue GST quotations, and track payments from a single cloud dashboard.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3.5 pt-2">
            <a
              href={loginUrl}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-[15px] shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </a>
            <a
              href="#demo"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-[15px] shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>Schedule a Demo</span>
            </a>
          </div>

          {/* Reassurance Micro-Copy */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-1 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> No credit card required
            </span>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Setup in 5 minutes
            </span>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Official Meta WhatsApp Cloud API
            </span>
          </div>
        </div>

        {/* Dashboard Visual Frame (Solid, Sharp, Enterprise standard) */}
        <div className="relative mt-12 sm:mt-16 max-w-5xl mx-auto">
          {/* Subtle Ambient Glow */}
          <div className="absolute -inset-2 bg-gradient-to-r from-brand-500/10 via-emerald-500/10 to-brand-500/10 rounded-3xl blur-2xl -z-10 opacity-70" />

          <div className="w-full bg-slate-900 rounded-2xl border border-slate-700/80 shadow-[0_20px_50px_rgba(0,0,0,0.18)] overflow-hidden">
            {/* Window bar */}
            <div className="flex items-center justify-between py-2.5 px-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
                <div className="ml-3 hidden sm:flex items-center gap-1.5 px-3 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
                  <Lock className="w-3 h-3 text-emerald-500" />
                  <span>https://app.ezzysync.com/leads/pipeline</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                  Live Sync
                </span>
              </div>
            </div>

            {/* Dashboard Screenshot */}
            <div className="bg-slate-950 overflow-hidden">
              <img
                src="/dashboard_mockup.jpg"
                alt="EzzySync Travel CRM Pipeline Dashboard"
                className="w-full h-auto object-cover"
                loading="eager"
              />
            </div>
          </div>
        </div>

        {/* Channel Integration Ribbon */}
        <div className="mt-12 pt-8 border-t border-slate-200 max-w-4xl mx-auto text-center space-y-3">
          <p className="text-xs uppercase tracking-wider font-bold text-slate-500">
            Automatically Capture Inquiries From Your Marketing Channels
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs font-semibold text-slate-700">
            <span className="px-3.5 py-1.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
              WhatsApp Official API
            </span>
            <span className="px-3.5 py-1.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
              Meta Ads (Facebook &amp; Instagram)
            </span>
            <span className="px-3.5 py-1.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
              Google Ads &amp; Search
            </span>
            <span className="px-3.5 py-1.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
              Website Lead Forms
            </span>
            <span className="px-3.5 py-1.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
              CSV / Excel Bulk Import
            </span>
          </div>
        </div>

      </div>
    </section>
  );
}
