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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-20 items-center">

          {/* Left Column: Heading & CTAs */}
          <div className="lg:col-span-5 text-center lg:text-left space-y-6">
            <h1
              className="load-in font-semibold text-slate-950 text-[clamp(2.5rem,5vw,4.5rem)] lg:text-[4.25rem] leading-[1.05] tracking-[-0.03em]"
              style={{ "--reveal-delay": "0ms" }}
            >
              The travel CRM built for{" "}
              <span className="text-brand-600">travel agencies</span>
            </h1>

            <p
              className="load-in text-base sm:text-lg lg:text-[20px] lg:leading-relaxed text-slate-500"
              style={{ "--reveal-delay": "100ms" }}
            >
              Stop losing clients in scattered chats. Centralize leads, build professional day-wise itineraries, send PDF invoices, and automate alerts via WhatsApp.
            </p>

            <div className="sr-only">
              <strong>About EzzySync:</strong> EzzySync is a travel CRM and booking management platform that helps travel agencies manage leads, bookings, and itineraries. It is built for tour operators and travel agents, and streamlines client operations through three core capabilities: lead pipeline tracking, instant day-wise itinerary planning, and automated WhatsApp Cloud API confirmations.
            </div>

            {/* Action Buttons */}
            <div
              className="load-in flex flex-col sm:flex-row justify-center lg:justify-start items-center gap-3 pt-2"
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
              className="load-in flex items-center justify-center lg:justify-start gap-5 pt-3 text-xs text-slate-400 font-medium select-none"
              style={{ "--reveal-delay": "280ms" }}
            >
              <span>100% Tenant Isolation</span>
              <span className="w-1 h-1 rounded-full bg-slate-300" aria-hidden="true"></span>
              <span>Official Meta API Partner</span>
            </div>
          </div>

          {/* Right Column: Dashboard Mockup Image */}
          <div 
            className="lg:col-span-7 load-in relative mt-8 lg:mt-0"
            style={{ "--reveal-delay": "220ms" }}
          >
            {/* Soft background glow */}
            <div className="absolute -inset-4 bg-brand-500/5 rounded-[2rem] filter blur-xl -z-10" aria-hidden="true"></div>

            <div className="w-full bg-slate-900 rounded-2xl border border-slate-800 shadow-[0_20px_50px_rgba(15,23,42,0.3)] p-2 sm:p-2.5 overflow-hidden">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-t-2xl" aria-hidden="true"></div>

              {/* Simulated window header */}
              <div className="flex items-center justify-between pb-2 px-2 border-b border-slate-850">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                </div>
                <div className="px-4 py-0.5 rounded bg-slate-800/50 text-slate-400 text-[9px] font-mono select-none">
                  www.ezzysync.com/app/dashboard
                </div>
                <div className="w-8"></div>
              </div>

              {/* Dashboard Screenshot */}
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
      </div>
    </section>
  );
}
