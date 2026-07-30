"use client";
import React from "react";
import Link from "next/link";
import {
  PlaneTakeoff,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  TrendingUp,
  Bell,
  ChevronDown,
  Users,
  FileText,
} from "lucide-react";

export default function Hero({ crmUrl }) {
  return (
    <section className="relative pt-20 pb-24 sm:pt-28 sm:pb-36 lg:pb-40 overflow-hidden bg-white bg-grid-pattern">

      {/* Single soft ambient glow behind the product shot — no grid, no floating orbs */}
      <div className="absolute top-24 right-0 w-[520px] h-[520px] rounded-full bg-brand-200/25 filter blur-[110px] -z-10" aria-hidden="true"></div>

      <div className="max-w-[1100px] mx-auto px-5 sm:px-6 relative z-10">

        {/* Floating Card Left */}
        <div className="hidden lg:block absolute -left-4 top-16 w-52 bg-white p-3.5 rounded-xl border border-slate-200 shadow-soft text-left load-in" style={{ "--reveal-delay": "350ms" }}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">New Lead</span>
          </div>
          <p className="font-semibold text-[13px] text-slate-800">Rahul (Bali Package)</p>
          <span className="text-[10px] text-slate-400">Captured from Website</span>
        </div>

        {/* Floating Card Right */}
        <div className="hidden lg:block absolute -right-4 top-6 w-56 bg-white p-3.5 rounded-xl border border-slate-200 shadow-soft text-left load-in" style={{ "--reveal-delay": "450ms" }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[10px]">💬</span>
            <span className="text-[9px] font-bold text-brand-600 uppercase tracking-wider">WhatsApp Sent</span>
          </div>
          <p className="font-semibold text-[13px] text-slate-800">Bali Itinerary Link</p>
          <span className="text-[10px] text-slate-400">Delivered & Opened</span>
        </div>

        {/* Floating Card Middle Left */}
        <div className="hidden lg:block absolute -left-12 top-64 w-48 bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 shadow-soft text-left load-in" style={{ "--reveal-delay": "550ms" }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-medium text-slate-400">Invoice Paid</span>
            <span className="text-emerald-400 font-bold text-xs">✓</span>
          </div>
          <p className="font-bold text-[15px] text-white">₹85,000</p>
          <span className="text-[10px] text-slate-500">Booking Ref: #BK-Bali</span>
        </div>

        {/* Floating Card Middle Right */}
        <div className="hidden lg:block absolute -right-12 top-56 w-52 bg-white p-3.5 rounded-xl border border-slate-200 shadow-soft text-left load-in" style={{ "--reveal-delay": "600ms" }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-brand-500 text-xs">✨</span>
            <span className="text-[9px] font-bold text-brand-600 uppercase tracking-wider">AI Itinerary</span>
          </div>
          <p className="font-semibold text-[13px] text-slate-850">Built Maldives 5-Day</p>
          <span className="text-[10px] text-slate-400">Generated in 3.4 seconds</span>
        </div>

        {/* Centered, typography-led heading block */}
        <div className="max-w-[46rem] mx-auto text-center space-y-6">

          <h1
            className="load-in font-semibold text-slate-950 text-[clamp(2.75rem,6vw,5.5rem)] leading-[1.05] tracking-[-0.03em]"
            style={{ "--reveal-delay": "0ms" }}
          >
            The travel CRM built for{" "}
            <span className="text-brand-600">travel agencies</span>
          </h1>

          <p
            className="load-in text-lg sm:text-xl text-slate-500 leading-[1.6] max-w-[46ch] mx-auto"
            style={{ "--reveal-delay": "100ms" }}
          >
            Stop losing clients in scattered chats. Centralize leads, build professional day-wise itineraries, send PDF invoices, and automate alerts via WhatsApp.
          </p>

          {/* GEO/AEO Answer-First Citation Paragraph (Screen-Reader Only for clean layout, fully indexable by search engines & AI bots) */}
          <div className="sr-only">
            <strong>About EzzySync:</strong> EzzySync is a travel CRM and booking management platform that helps travel agencies manage leads, bookings, and itineraries. It is built for tour operators and travel agents, and streamlines client operations through three core capabilities: lead pipeline tracking, instant day-wise itinerary planning, and automated WhatsApp Cloud API confirmations.
          </div>

          {/* Action Buttons */}
          <div
            className="load-in flex flex-col sm:flex-row justify-center items-center gap-3 pt-2"
            style={{ "--reveal-delay": "200ms" }}
          >
            <Link
              href="/contact"
              className="w-full sm:w-auto px-6 py-3 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium text-[15px] transition-colors flex items-center justify-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              <span>Book Free Walkthrough</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" focusable="false" />
            </Link>
            <a
              href={`${crmUrl}/login`}
              className="w-full sm:w-auto px-6 py-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800 font-medium text-[15px] transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            >
              <span>Start Free Trial</span>
            </a>
          </div>

          {/* Subtle trust signals */}
          <div
            className="load-in flex items-center justify-center gap-6 pt-4 text-xs text-slate-400 font-medium select-none"
            style={{ "--reveal-delay": "280ms" }}
          >
            <span>100% Tenant Isolation</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" aria-hidden="true"></span>
            <span>Official Meta API Partner</span>
          </div>
        </div>

        {/* Product shot: flat premium browser frame, no 3D tilt, soft shadow only */}
        <div
          className="load-in relative mt-16 sm:mt-20"
          style={{ "--reveal-delay": "220ms" }}
        >
          <div className="w-full max-w-[900px] mx-auto bg-slate-900 rounded-2xl border border-slate-800 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.35)] p-2 sm:p-3 overflow-x-auto relative">
            {/* subtle top highlight for depth */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-t-2xl" aria-hidden="true"></div>

            <div className="min-w-[760px] lg:min-w-0">

              {/* Simulated window header buttons */}
              <div className="flex items-center justify-between pb-2.5 px-3 border-b border-slate-800 bg-slate-900 rounded-t-xl">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                </div>
                <div className="px-5 py-0.5 rounded bg-slate-800/50 text-slate-400 text-[10px] font-mono select-none">
                  www.ezzysync.com/app/dashboard
                </div>
                <div className="w-10"></div>
              </div>

              {/* Actual Dashboard Screenshot Image */}
              <div className="bg-slate-950/40 rounded-b-xl overflow-hidden">
                <img 
                  src="/dashboard_mockup.jpg" 
                  alt="EzzySync Travel CRM Dashboard Mockup" 
                  className="w-full h-auto object-cover opacity-95 hover:opacity-100 transition-opacity duration-300"
                />
              </div>
          </div>
        </div>

      </div>
    </section>
  );
}
