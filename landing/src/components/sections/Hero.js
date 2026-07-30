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
              <div className="flex items-center justify-between pb-2 px-1 border-b border-slate-850">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                </div>
                <div className="px-5 py-0.5 rounded bg-slate-800/50 text-slate-400 text-[9px] font-mono select-none">
                  www.ezzysync.com/app/dashboard
                </div>
                <div className="w-10"></div>
              </div>

              {/* Dashboard Frame Content */}
              <div className="grid grid-cols-5 bg-slate-950/40 text-slate-300 min-h-[400px] rounded-b-xl overflow-hidden font-sans text-xs">

                {/* Sidebar navigation */}
                <aside className="col-span-1 bg-slate-900/80 border-r border-slate-800/80 p-3 flex flex-col gap-4">
                  <div className="flex items-center gap-2 px-1 mb-2">
                    <div className="w-6 h-6 rounded bg-brand-500 flex items-center justify-center text-white font-bold">E</div>
                    <span className="font-bold tracking-tight text-white">EzzySync</span>
                  </div>
                  <nav className="space-y-1">
                    <div className="flex items-center gap-2 px-2 py-1.5 bg-brand-600/10 text-brand-400 rounded-lg font-medium cursor-pointer">
                      <ClipboardList className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Dashboard</span>
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 rounded-lg cursor-pointer transition-colors">
                      <Users className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Leads</span>
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 rounded-lg cursor-pointer transition-colors">
                      <PlaneTakeoff className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Bookings</span>
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 rounded-lg cursor-pointer transition-colors">
                      <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Invoices</span>
                    </div>
                  </nav>
                </aside>

                {/* Main Panel Content Area */}
                <main className="col-span-4 p-4 space-y-4 bg-slate-900/30">
                  {/* Header elements inside mockup */}
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg w-48 border border-slate-800">
                      <div className="w-3 h-3 rounded-full border border-slate-500"></div>
                      <span className="text-[10px] text-slate-500">Search bookings...</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Bell className="w-4.5 h-4.5 text-slate-400 cursor-pointer hover:text-slate-200" aria-hidden="true" />
                      <div className="flex items-center gap-1.5 bg-slate-800/60 py-1 px-2 rounded-lg border border-slate-800 cursor-pointer">
                        <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-white">A</div>
                        <span className="font-medium text-[10px] text-slate-200">Admin</span>
                        <ChevronDown className="w-3 h-3 text-slate-400" aria-hidden="true" />
                      </div>
                    </div>
                  </div>

                  {/* Dashboard Stats Row */}
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                      <div className="flex justify-between items-center text-slate-500 mb-1">
                        <span>Total Bookings</span>
                        <ClipboardList className="w-3.5 h-3.5 text-brand-500" aria-hidden="true" />
                      </div>
                      <div className="text-base sm:text-lg font-bold text-white">48</div>
                    </div>
                    <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                      <div className="flex justify-between items-center text-slate-500 mb-1">
                        <span>Upcoming Trips</span>
                        <PlaneTakeoff className="w-3.5 h-3.5 text-brand-500" aria-hidden="true" />
                      </div>
                      <div className="text-base sm:text-lg font-bold text-white">12</div>
                    </div>
                    <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                      <div className="flex justify-between items-center text-slate-500 mb-1">
                        <span>Completed Trips</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                      </div>
                      <div className="text-base sm:text-lg font-bold text-white">32</div>
                    </div>
                    <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                      <div className="flex justify-between items-center text-slate-500 mb-1">
                        <span>Revenue Today</span>
                        <TrendingUp className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                      </div>
                      <div className="text-base sm:text-lg font-bold text-white">₹1,45,000</div>
                    </div>
                  </div>

                  {/* Split Table Layout */}
                  <div className="grid grid-cols-3 gap-4">

                    {/* Recent Bookings Table */}
                    <div className="col-span-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-white">Recent Bookings</span>
                        <span className="text-[10px] text-brand-500 cursor-pointer hover:underline">View All</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-500 text-[10px]">
                              <th className="pb-1.5">Client</th>
                              <th className="pb-1.5">Destination</th>
                              <th className="pb-1.5">Status</th>
                              <th className="pb-1.5">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                            <tr>
                              <td className="py-2 text-white font-medium">Rahul Sharma</td>
                              <td className="py-2">Bali Package</td>
                              <td className="py-2"><span className="px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 font-medium">Confirmed</span></td>
                              <td className="py-2 text-white">₹85,000</td>
                            </tr>
                            <tr>
                              <td className="py-2 text-white font-medium">Priya Patel</td>
                              <td className="py-2">Switzerland Highlights</td>
                              <td className="py-2"><span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium">Completed</span></td>
                              <td className="py-2 text-white">₹2,40,000</td>
                            </tr>
                            <tr>
                              <td className="py-2 text-white font-medium">Amit Goel</td>
                              <td className="py-2">Dubai Special</td>
                              <td className="py-2"><span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-450 font-medium">Pending</span></td>
                              <td className="py-2 text-white">₹65,000</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Upcoming departures summary */}
                    <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
                      <span className="font-semibold text-white block">Departures (7 Days)</span>
                      <div className="space-y-2">
                        <div className="p-2 rounded bg-slate-800/30 border border-slate-800 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-white">Rahul Sharma</p>
                            <p className="text-[10px] text-slate-500">Bali • 26 Jul</p>
                          </div>
                          <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse" aria-hidden="true"></span>
                        </div>
                        <div className="p-2 rounded bg-slate-800/35 border border-slate-800 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-white">Nisha Sen</p>
                            <p className="text-[10px] text-slate-500">Maldives • 29 Jul</p>
                          </div>
                          <span className="w-2.5 h-2.5 rounded-full bg-brand-400" aria-hidden="true"></span>
                        </div>
                      </div>
                    </div>

                  </div>
                </main>

              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
