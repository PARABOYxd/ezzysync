"use client";

import React from "react";
import {
  Kanban,
  MessageSquare,
  Compass,
  FileCheck,
  Car,
  CreditCard,
  ShieldCheck,
  Check,
  ExternalLink,
  ArrowRight,
  Lock,
  Clock,
} from "lucide-react";
import ScrollReveal from "../ScrollReveal";
import { getTrialUrl } from "@/lib/crmUrl";

export default function FeaturesDeepDive({ crmUrl }) {
  const trialUrl = getTrialUrl(crmUrl);

  return (
    <div className="space-y-0 text-slate-900">

      {/* ========================================================================= */}
      {/* 1. LEAD PIPELINE & INQUIRY INTAKE */}
      {/* ========================================================================= */}
      <section id="pipeline" className="py-16 sm:py-24 bg-white border-b border-slate-200 scroll-mt-20">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* Left: Feature Details with 2x2 Grid */}
            <div className="lg:col-span-6 space-y-5">
              <ScrollReveal className="space-y-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 block">
                  Inquiry Intake &amp; Sales Pipeline
                </span>
                <h2 className="font-extrabold text-2xl sm:text-3xl lg:text-[2.2rem] text-slate-950 tracking-[-0.03em] leading-tight">
                  Track Every Traveler from Fresh Inquiry to Confirmed Booking
                </h2>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                  Eliminate lost inquiries across personal phones. EzzySync captures leads automatically from WhatsApp, Instagram DMs and your website form into one visual pipeline, and every lead gets an owner.
                </p>
              </ScrollReveal>

              <ScrollReveal delay={80} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/90 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                    <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                    <span>Auto-Capture Ingestion</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    WhatsApp chats, Instagram DMs &amp; website forms become leads instantly.
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/90 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                    <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                    <span>Round-Robin Routing</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Distribute leads among coordinators by destination or active workload.
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/90 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                    <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                    <span>Traveler Preference Dossier</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Log departure dates, pax count, hotel star category &amp; budget range.
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/90 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                    <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                    <span>Follow-Up Reminders</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Automated WhatsApp and desktop alerts before inquiries go cold.
                  </p>
                </div>
              </ScrollReveal>

              <div className="pt-1">
                <a
                  href={trialUrl}
                  className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-brand-600 hover:text-brand-700 group"
                >
                  <span>Explore Inquiry Pipeline</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>

            {/* Right: Realistic Software UI Mockup */}
            <div className="lg:col-span-6">
              <ScrollReveal delay={120}>
                <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3.5">
                  
                  {/* Browser Bar */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                      <span className="ml-2 font-mono text-[11px] text-slate-500">app.ezzysync.com/leads</span>
                    </div>
                    <span className="text-[11px] font-mono font-medium text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded">
                      In Discussion: ₹6,40,000
                    </span>
                  </div>

                  {/* Kanban Preview */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    
                    {/* Stage 1 */}
                    <div className="bg-slate-100/70 p-3 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex justify-between items-center font-semibold text-slate-700 text-[11px]">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500" /> New Leads (2)
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs space-y-1">
                        <div className="flex justify-between items-start font-semibold text-slate-900">
                          <span>Ankit Verma</span>
                          <span className="text-[10px] text-brand-700 bg-brand-50 border border-brand-100 px-1.5 py-0.2 rounded">Dubai</span>
                        </div>
                        <p className="text-[11px] text-slate-500">4 Pax Family • Oct Travel</p>
                        <div className="text-[11px] font-bold text-emerald-700">₹1,80,000</div>
                      </div>
                    </div>

                    {/* Stage 2 */}
                    <div className="bg-slate-100/70 p-3 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex justify-between items-center font-semibold text-slate-700 text-[11px]">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500" /> Quoted (3)
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs space-y-1">
                        <div className="flex justify-between items-start font-semibold text-slate-900">
                          <span>Neha Kapoor</span>
                          <span className="text-[10px] text-cyan-800 bg-cyan-50 border border-cyan-100 px-1.5 py-0.2 rounded">Bali</span>
                        </div>
                        <p className="text-[11px] text-slate-500">Sent Itinerary v2 on WhatsApp</p>
                        <div className="text-[11px] font-bold text-emerald-700">₹2,80,000</div>
                      </div>
                    </div>

                    {/* Stage 3 */}
                    <div className="bg-slate-100/70 p-3 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex justify-between items-center font-semibold text-slate-700 text-[11px]">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-purple-500" /> Negotiation (1)
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs space-y-1">
                        <div className="flex justify-between items-start font-semibold text-slate-900">
                          <span>Pooja Mehra</span>
                          <span className="text-[10px] text-purple-800 bg-purple-50 border border-purple-100 px-1.5 py-0.2 rounded">Kashmir</span>
                        </div>
                        <p className="text-[11px] text-slate-500">Hotel upgraded to 4★</p>
                        <div className="text-[11px] font-bold text-emerald-700">₹85,000</div>
                      </div>
                    </div>

                    {/* Stage 4 */}
                    <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200 space-y-1.5">
                      <div className="flex justify-between items-center font-semibold text-emerald-700 text-[11px]">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-600" /> Won (1)
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-emerald-200 shadow-2xs space-y-1">
                        <div className="flex justify-between items-start font-semibold text-slate-900">
                          <span>Siddharth Sen</span>
                          <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">Maldives</span>
                        </div>
                        <p className="text-[11px] text-slate-500">Advance ₹75,000 logged</p>
                        <div className="text-[11px] font-bold text-emerald-700">₹2,45,000</div>
                      </div>
                    </div>

                  </div>

                </div>
              </ScrollReveal>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. WHATSAPP BUSINESS API & TEAM INBOX (Zig-Zag: UI Left, Text Right) */}
      {/* ========================================================================= */}
      <section id="whatsapp" className="py-16 sm:py-24 bg-slate-50 border-b border-slate-200 scroll-mt-20">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* Left: UI Mockup */}
            <div className="lg:col-span-6 order-2 lg:order-1">
              <ScrollReveal delay={120}>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3.5">
                  
                  {/* WhatsApp Window Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 text-xs text-slate-600">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">
                        WA
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">Royal Escapes Holidays (Verified)</div>
                        <div className="text-[10px] text-slate-400">Assigned Agent: Pooja Sharma</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                      Meta Cloud API
                    </span>
                  </div>

                  {/* Chat Bubbles */}
                  <div className="space-y-3 font-sans text-xs">
                    
                    {/* Outgoing Message */}
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl rounded-tr-xs p-3.5 ml-auto max-w-sm space-y-2">
                      <div className="flex items-center justify-between text-[10px] text-emerald-800">
                        <span className="font-semibold">Royal Escapes Holidays</span>
                        <span>11:32 AM</span>
                      </div>
                      <p className="text-slate-800 text-xs leading-relaxed">
                        Hello Rahul Sharma! ✈️ Your customized 6N/7D Bali Itinerary and Quotation is ready.
                      </p>
                      
                      {/* Attached Itinerary Card */}
                      <div className="bg-white p-2.5 rounded-lg border border-emerald-100 flex items-center justify-between text-[11px]">
                        <div>
                          <div className="font-semibold text-slate-900">Bali Discovery (Seminyak + Ubud)</div>
                          <div className="text-slate-500 text-[10px]">Includes 4★ Resorts, Transfers &amp; Tours</div>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                      </div>

                      <div className="text-[10px] text-emerald-700 text-right font-medium">
                        Delivered &amp; Read ✓✓
                      </div>
                    </div>

                    {/* Incoming Message */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-xs p-3 max-w-xs space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span className="font-semibold text-slate-700">Rahul Sharma</span>
                        <span>11:36 AM</span>
                      </div>
                      <p className="text-slate-800 text-xs leading-relaxed">
                        Looks great! Can you please send the advance payment details for 2 adults?
                      </p>
                    </div>

                  </div>

                </div>
              </ScrollReveal>
            </div>

            {/* Right: Feature Details with 2x2 Grid */}
            <div className="lg:col-span-6 space-y-5 order-1 lg:order-2">
              <ScrollReveal className="space-y-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 block">
                  Official WhatsApp Business Cloud API
                </span>
                <h2 className="font-extrabold text-2xl sm:text-3xl lg:text-[2.2rem] text-slate-950 tracking-[-0.03em] leading-tight">
                  One Shared Agency Number for Your Entire Sales &amp; Operations Team
                </h2>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                  Stop staff from using personal phone SIMs where client history is lost when employees leave. EzzySync connects directly to Meta&apos;s Cloud API so your team communicates from one verified business number with manager oversight.
                </p>
              </ScrollReveal>

              <ScrollReveal delay={80} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                    <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Meta Direct API</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Zero risk of unofficial QR code bans or scraping tool shutdowns.
                  </p>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                    <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Multi-Agent Inbox</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Multiple coordinators manage chats simultaneously from one number.
                  </p>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                    <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>1-Click Proposal Dispatch</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Send mobile itinerary links, PDF quotes &amp; vouchers directly into chat.
                  </p>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                    <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Verified Read Receipts</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Track delivery and blue-tick read receipts for timely follow-up calls.
                  </p>
                </div>
              </ScrollReveal>

              <div className="pt-1">
                <a
                  href={trialUrl}
                  className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-brand-600 hover:text-brand-700 group"
                >
                  <span>See WhatsApp Inbox Features</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. DAY-WISE ITINERARY BUILDER */}
      {/* ========================================================================= */}
      <section id="itinerary" className="py-16 sm:py-24 bg-white border-b border-slate-200 scroll-mt-20">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* Left: Feature Details with 2x2 Grid */}
            <div className="lg:col-span-6 space-y-5">
              <ScrollReveal className="space-y-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 block">
                  AI Day-by-Day Itinerary Builder
                </span>
                <h2 className="font-extrabold text-2xl sm:text-3xl lg:text-[2.2rem] text-slate-950 tracking-[-0.03em] leading-tight">
                  Assemble Custom AI Day-Wise Itineraries in Minutes, Not Hours
                </h2>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                  Eliminate tedious formatting across Word and Canva. EzzySync provides a smart AI itinerary engine where coordinators draft day-by-day programs with pre-saved hotel stays, transfer vehicles, and sightseeing tours.
                </p>
              </ScrollReveal>

              <ScrollReveal delay={80} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/90 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                    <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                    <span>AI Route &amp; Schedule Drafting</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Pre-built blocks for Airport Pickups, Excursions, Stays &amp; Departures.
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/90 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                    <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                    <span>Hotel &amp; Meal Repository</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Save properties once with room categories &amp; meal plans (CP, MAP, AP).
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/90 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                    <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                    <span>Transport Inclusions</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Include dedicated vehicles (Innova, Tempo), ferries, tickets &amp; guides.
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/90 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                    <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                    <span>Mobile Link &amp; PDF</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Share an interactive mobile web viewer or download a branded PDF.
                  </p>
                </div>
              </ScrollReveal>

              <div className="pt-1">
                <a
                  href={trialUrl}
                  className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-brand-600 hover:text-brand-700 group"
                >
                  <span>Build AI Day-Wise Itineraries</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>

            {/* Right: UI Mockup */}
            <div className="lg:col-span-6">
              <ScrollReveal delay={120}>
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_6px_24px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.03)] space-y-3 text-xs">
                  
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 text-slate-600">
                    <div>
                      <span className="font-bold text-slate-900 text-sm">Bali Discovery Tour (6N / 7D)</span>
                      <p className="text-[10px] text-slate-500">Seminyak • Nusa Penida • Ubud Rainforest</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-emerald-800 font-semibold">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                      </span>
                      AI Itinerary Ready
                    </span>
                  </div>

                  {/* Day 1 */}
                  <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-brand-700 text-[11px] uppercase tracking-wider">Day 1</span>
                      <span className="text-[10px] text-slate-500">Seminyak</span>
                    </div>
                    <h4 className="font-bold text-slate-900">Arrival &amp; Hotel Check-In</h4>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Private airport pick-up. Check-in at 4★ Beach Resort. Evening leisure at Seminyak Beach.
                    </p>
                    <div className="text-[10px] bg-slate-50 px-2 py-0.5 rounded text-slate-600 border border-slate-200">
                      <span className="font-semibold text-slate-700">Stay:</span> 4★ Luxury Room • Breakfast Included • Private Transfer
                    </div>
                  </div>

                  {/* Day 2 */}
                  <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-brand-700 text-[11px] uppercase tracking-wider">Day 2</span>
                      <span className="text-[10px] text-slate-500">Nusa Penida</span>
                    </div>
                    <h4 className="font-bold text-slate-900">Island Tour &amp; Snorkeling</h4>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Speedboat transfer. Visit Kelingking Beach, Broken Beach, Angel&apos;s Billabong, and crystal bay.
                    </p>
                    <div className="text-[10px] bg-slate-50 px-2 py-0.5 rounded text-slate-600 border border-slate-200">
                      <span className="font-semibold text-slate-700">Transfer:</span> Speedboat Transfer + Private Island Cab + Snorkeling Kit
                    </div>
                  </div>

                  {/* Day 3 */}
                  <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-brand-700 text-[11px] uppercase tracking-wider">Day 3</span>
                      <span className="text-[10px] text-slate-500">Ubud</span>
                    </div>
                    <h4 className="font-bold text-slate-900">Rice Terraces &amp; Waterfalls</h4>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Scenic drive to Ubud rainforest. Visit Tegallalang Rice Terraces, coffee plantation, and Tegenungan waterfall.
                    </p>
                    <div className="text-[10px] bg-slate-50 px-2 py-0.5 rounded text-slate-600 border border-slate-200">
                      <span className="font-semibold text-slate-700">Stay:</span> Private Ubud Rainforest Villa • Breakfast &amp; Dinner (MAP)
                    </div>
                  </div>

                </div>
              </ScrollReveal>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. SAC 998555 TRAVEL QUOTATIONS & GST INVOICING (Zig-Zag: UI Left, Text Right) */}
      {/* ========================================================================= */}
      <section id="quotations" className="py-16 sm:py-24 bg-slate-50 border-b border-slate-200 scroll-mt-20">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* Left: UI Mockup */}
            <div className="lg:col-span-6 order-2 lg:order-1">
              <ScrollReveal delay={120}>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3.5 font-sans text-xs">
                  
                  {/* Invoice Header */}
                  <div className="flex justify-between items-start border-b border-slate-200 pb-2.5">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">ROYAL ESCAPES TOURS</h4>
                      <p className="text-slate-500 text-[10px]">New Delhi, India • GSTIN: 07AAAAA0000A1Z5</p>
                    </div>
                    <div className="text-right">
                      <span className="bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded text-[10px]">
                        CONFIRMED QUOTE
                      </span>
                      <div className="text-[10px] font-mono text-slate-500 mt-1">QT-2026-0842</div>
                    </div>
                  </div>

                  {/* Client & Tax Metadata */}
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Traveler:</span>
                      <span className="font-semibold text-slate-800">Siddharth Sen</span>
                      <p className="text-slate-500">Destination: Maldives (5D/4N)</p>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block">SAC Code:</span>
                      <span className="font-mono font-semibold text-slate-800">998555 (Tour Operator)</span>
                      <p className="text-slate-500 text-[10px]">5% GST Calculated</p>
                    </div>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1 text-[11px]">
                    <div className="flex justify-between text-slate-600">
                      <span>Package Base Cost:</span>
                      <span>₹2,33,333</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>GST (5% under SAC 998555):</span>
                      <span>₹11,667</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1 text-xs">
                      <span>Total Package Value:</span>
                      <span className="text-sm font-extrabold text-slate-950">₹2,45,000</span>
                    </div>
                  </div>

                  {/* Deposit Schedule & Bank Account */}
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div className="bg-emerald-50/80 p-2 rounded-lg border border-emerald-200">
                      <span className="text-emerald-800 block text-[10px]">Advance Deposit:</span>
                      <span className="font-bold text-emerald-800 text-xs">₹75,000</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[10px]">Remaining Balance:</span>
                      <span className="font-bold text-slate-800 text-xs">₹1,70,000</span>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 border-t border-slate-100 pt-1.5 flex justify-between items-center">
                    <span>HDFC Bank (IFSC: HDFC0001234)</span>
                    <span className="font-mono">UPI: royalescapes@hdfcbank</span>
                  </div>

                </div>
              </ScrollReveal>
            </div>

            {/* Right: Feature Details with 2x2 Grid */}
            <div className="lg:col-span-6 space-y-5 order-1 lg:order-2">
              <ScrollReveal className="space-y-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 block">
                  GST Compliant Travel Invoicing
                </span>
                <h2 className="font-extrabold text-2xl sm:text-3xl lg:text-[2.2rem] text-slate-950 tracking-[-0.03em] leading-tight">
                  Itemized Travel Quotes &amp; Tax Invoices with SAC 998555 Compliance
                </h2>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                  Indian tourism taxation has strict rules for tour operators under SAC Code 998555. EzzySync automates GST calculations, locks gross profit margins before sending, and issues professional PDF invoices with complete agency banking details.
                </p>
              </ScrollReveal>

              <ScrollReveal delay={80} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                    <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                    <span>SAC 998555 Invoicing</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Auto-calculates 5% GST without ITC or customized tax splits.
                  </p>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                    <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                    <span>Gross Margin Safeguard</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Auto-checks DMC net rates to prevent coordinators quoting at a loss.
                  </p>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                    <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                    <span>Multi-Tier Options</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Present Standard, Deluxe &amp; Super Deluxe options in a single proposal.
                  </p>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                    <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                    <span>Branded PDF &amp; UPI QR</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Agency logo, GSTIN, PAN, terms, and bank UPI QR codes.
                  </p>
                </div>
              </ScrollReveal>

              <div className="pt-1">
                <a
                  href={trialUrl}
                  className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-brand-600 hover:text-brand-700 group"
                >
                  <span>Explore Travel Invoicing</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. TOUR OPERATIONS, HOTEL VOUCHERS & CAB DUTY SLIPS */}
      {/* ========================================================================= */}
      <section id="operations" className="py-16 sm:py-24 bg-white border-b border-slate-200 scroll-mt-20">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* Left: Feature Details with 2x2 Grid */}
            <div className="lg:col-span-6 space-y-5">
              <ScrollReveal className="space-y-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 block">
                  Operational Fulfillment &amp; Service Vouchers
                </span>
                <h2 className="font-extrabold text-2xl sm:text-3xl lg:text-[2.2rem] text-slate-950 tracking-[-0.03em] leading-tight">
                  Generate Driver Duty Slips &amp; Hotel Reservation Vouchers in 1 Click
                </h2>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                  The sale doesn&apos;t end when the deposit is received. EzzySync automates operations handover by generating confirmed hotel vouchers and driver duty slips directly from booking records without re-typing traveler details.
                </p>
              </ScrollReveal>

              <ScrollReveal delay={80} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/90 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                    <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                    <span>Hotel Reservation Vouchers</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Check-in dates, meal plans, room counts &amp; supplier codes.
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/90 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                    <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                    <span>Driver Cab Duty Slips</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Vehicle number, driver contact, flight arrival number &amp; pickup time.
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/90 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                    <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                    <span>Supplier Cost Ledger</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Track amounts payable to local DMCs, hotels &amp; fleet vendors.
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/90 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                    <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                    <span>Vendor WhatsApp Dispatch</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Send vouchers and duty slips directly to drivers &amp; hotel desks.
                  </p>
                </div>
              </ScrollReveal>

              <div className="pt-1">
                <a
                  href={trialUrl}
                  className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-brand-600 hover:text-brand-700 group"
                >
                  <span>Explore Tour Operations</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>

            {/* Right: UI Mockup */}
            <div className="lg:col-span-6">
              <ScrollReveal delay={120}>
                <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3 text-xs">
                  
                  {/* Hotel Voucher */}
                  <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs space-y-1.5">
                    <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                      <span className="font-bold text-slate-900">Hotel Reservation Voucher</span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                        CONFIRMED
                      </span>
                    </div>
                    <div className="space-y-0.5 text-[11px]">
                      <div className="font-semibold text-slate-800">Grand Palace Resort • 2 Deluxe Rooms • MAP</div>
                      <div className="text-slate-500">Dates: 12 Oct – 16 Oct • Voucher #GP-88421</div>
                      <div className="text-slate-500 font-mono">Supplier: Royal DMCs (Reconciled)</div>
                    </div>
                  </div>

                  {/* Cab Duty Slip */}
                  <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs space-y-1.5">
                    <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                      <span className="font-bold text-slate-900">Driver Cab Duty Slip</span>
                      <span className="text-[10px] font-bold text-brand-700 bg-brand-100 px-2 py-0.5 rounded">
                        ASSIGNED
                      </span>
                    </div>
                    <div className="space-y-0.5 text-[11px]">
                      <div className="font-semibold text-slate-800">Innova Crysta • GA 03 X 9123</div>
                      <div className="text-slate-500">Driver: Rajesh Kumar (+91 94220 18892)</div>
                      <div className="text-slate-500 font-mono">Pickup: MOPA Airport (Flight 6E-204) • 11:45 AM</div>
                    </div>
                  </div>

                </div>
              </ScrollReveal>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. MILESTONE PAYMENTS & RAZORPAY SYNC (Zig-Zag: UI Left, Text Right) */}
      {/* ========================================================================= */}
      <section id="payments" className="py-16 sm:py-24 bg-slate-50 border-b border-slate-200 scroll-mt-20">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* Left: UI Mockup */}
            <div className="lg:col-span-6 order-2 lg:order-1">
              <ScrollReveal delay={120}>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2.5 font-sans text-xs">
                  
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
                    <div>
                      <h4 className="font-bold text-slate-900">Milestone Payment Reconciliation</h4>
                      <p className="text-[10px] text-slate-500">Traveler: Siddharth Sen • Total: ₹2,45,000</p>
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      Razorpay Webhook Active
                    </span>
                  </div>

                  {/* Stage 1 */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                        <Check className="w-3 h-3" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 text-[11px]">Booking Advance (30%)</div>
                        <div className="text-[10px] text-slate-500">Paid via Razorpay UPI • Webhook Verified</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-700 text-xs">₹75,000</div>
                      <div className="text-[9px] text-emerald-600 font-medium">Reconciled</div>
                    </div>
                  </div>

                  {/* Stage 2 */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                        <Clock className="w-3 h-3" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 text-[11px]">Hotel Confirmation Installment (50%)</div>
                        <div className="text-[10px] text-slate-500">Due before hotel voucher dispatch</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-amber-700 text-xs">₹1,20,000</div>
                      <div className="text-[9px] text-amber-600 font-medium">Pending Due</div>
                    </div>
                  </div>

                  {/* Stage 3 */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                        3
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 text-[11px]">Final Departure Balance (20%)</div>
                        <div className="text-[10px] text-slate-500">Due 7 days before departure</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-700 text-xs">₹50,000</div>
                      <div className="text-[9px] text-slate-500">Scheduled</div>
                    </div>
                  </div>

                </div>
              </ScrollReveal>
            </div>

            {/* Right: Feature Details with 2x2 Grid */}
            <div className="lg:col-span-6 space-y-5 order-1 lg:order-2">
              <ScrollReveal className="space-y-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 block">
                  Financial Control &amp; Payment Schedules
                </span>
                <h2 className="font-extrabold text-2xl sm:text-3xl lg:text-[2.2rem] text-slate-950 tracking-[-0.03em] leading-tight">
                  Split Bookings into Milestones with Automated Razorpay Reconciliation
                </h2>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                  Eliminate manual bank statement hunting and screenshot verifications in WhatsApp. EzzySync allows you to establish multi-stage payment schedules and accept payments through direct Razorpay links that reconcile booking ledgers automatically.
                </p>
              </ScrollReveal>

              <ScrollReveal delay={80} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                    <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Multi-Stage Deposits</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Custom deposit stages (Advance, Hotel Lock-in, Final Balance).
                  </p>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                    <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Razorpay UPI Links</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Send payment links for UPI (GPay, PhonePe), Cards &amp; Net Banking.
                  </p>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                    <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Webhook Reconciliation</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Ledger updates to &quot;Reconciled&quot; immediately on bank confirmation.
                  </p>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                    <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>WhatsApp Receipts</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Travelers receive payment acknowledgments &amp; remaining balance alerts.
                  </p>
                </div>
              </ScrollReveal>

              <div className="pt-1">
                <a
                  href={trialUrl}
                  className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-brand-600 hover:text-brand-700 group"
                >
                  <span>Explore Payment Milestones</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. SECURITY & ACCESS CONTROL */}
      {/* ========================================================================= */}
      <section id="security" className="py-16 sm:py-24 bg-white border-b border-slate-200 scroll-mt-20">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* Left: Feature Details with 2x2 Grid */}
            <div className="lg:col-span-6 space-y-5">
              <ScrollReveal className="space-y-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 block">
                  Data Security &amp; Access Control
                </span>
                <h2 className="font-extrabold text-2xl sm:text-3xl lg:text-[2.2rem] text-slate-950 tracking-[-0.03em] leading-tight">
                  Protect Your Agency Client Database from Leakage and Staff Theft
                </h2>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                  Your traveler database is your agency&apos;s most valuable asset. EzzySync enforces strict role-based access control and phone number masking so coordinators only access their assigned leads, with zero ability to bulk-export your client lists.
                </p>
              </ScrollReveal>

              <ScrollReveal delay={80} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/90 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                    <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                    <span>Role-Based Control (RBAC)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Owners see margins &amp; financials; coordinators only see assigned leads.
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/90 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                    <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                    <span>Client Contact Masking</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Mask phone numbers and emails to prevent staff downloading client lists.
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/90 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                    <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                    <span>Multi-Tenant Cloud Isolation</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Isolated database instances ensure agency records are never co-mingled.
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/90 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                    <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                    <span>Full Activity Audit Log</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Complete timestamp history of all quotation edits and status changes.
                  </p>
                </div>
              </ScrollReveal>

              <div className="pt-1">
                <a
                  href={trialUrl}
                  className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-brand-600 hover:text-brand-700 group"
                >
                  <span>Learn About Agency Data Security</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>

            {/* Right: Security Matrix UI Mockup */}
            <div className="lg:col-span-6">
              <ScrollReveal delay={120}>
                <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3 text-xs">
                  
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 text-slate-600">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-brand-600" />
                      <span className="font-bold text-slate-900 text-sm">Role-Based Permission Matrix</span>
                    </div>
                    <span className="font-mono text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                      Encrypted Isolation
                    </span>
                  </div>

                  {/* Owner Role */}
                  <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs space-y-1">
                    <div className="flex justify-between items-center font-semibold text-slate-900">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Agency Owner / Director
                      </span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono font-medium">Full Access</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      All pipelines, agency profit margins, financial reports &amp; billing exports.
                    </p>
                  </div>

                  {/* Sales Coordinator */}
                  <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs space-y-1">
                    <div className="flex justify-between items-center font-semibold text-slate-900">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500" /> Sales Coordinator
                      </span>
                      <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-mono font-medium">Assigned Leads Only</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Only assigned inquiries, create itineraries, send WhatsApp. Numbers masked.
                    </p>
                  </div>

                  {/* Operations Staff */}
                  <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs space-y-1">
                    <div className="flex justify-between items-center font-semibold text-slate-900">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500" /> Operations Executive
                      </span>
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-mono font-medium">Booking Fulfillment</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Generate hotel vouchers &amp; driver duty slips. No access to financial margins.
                    </p>
                  </div>

                </div>
              </ScrollReveal>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
