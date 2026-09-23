"use client";

import React, { useState } from "react";
import {
  Kanban,
  MessageSquare,
  Compass,
  FileCheck,
  CreditCard,
  Car,
  ExternalLink,
  ShieldCheck,
  Clock,
  Check,
  Lock,
} from "lucide-react";
import ScrollReveal from "../ScrollReveal";

const tabs = [
  { id: "pipeline", name: "Lead Pipeline", icon: Kanban },
  { id: "whatsapp", name: "WhatsApp", icon: MessageSquare },
  { id: "itinerary", name: "AI Itinerary Builder", icon: Compass },
  { id: "invoices", name: "GST Quotations", icon: FileCheck },
  { id: "operations", name: "Tour Operations", icon: Car },
  { id: "payments", name: "Payments", icon: CreditCard },
];

export default function ProductTour() {
  const [activeTab, setActiveTab] = useState("pipeline");

  return (
    <section id="tour" className="py-20 sm:py-28 bg-white text-slate-900 scroll-mt-16 border-b border-slate-200">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-6 space-y-10 sm:space-y-12">
        
        {/* Section Header */}
        <ScrollReveal className="text-center max-w-3xl mx-auto space-y-3.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 block">
            Product Walkthrough
          </span>

          <h2 className="font-extrabold text-3xl sm:text-4xl lg:text-[2.6rem] tracking-[-0.03em] text-slate-950">
            See How EzzySync Runs Your Travel Agency
          </h2>

          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-[55ch] mx-auto">
            Explore the actual screens your sales coordinators use to manage inquiries, build itineraries, message travelers, and reconcile booking payments.
          </p>
        </ScrollReveal>

        {/* Tab Navigation */}
        <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-100"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-brand-400" : "text-slate-500"}`} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Main Product Showcase Panel (Sleek Modern SaaS Window) */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.03)] border border-slate-200/90 text-slate-900 max-w-5xl mx-auto transition-all">
          {/* Top Browser Chrome Bar */}
          <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-slate-150 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] border border-[#E0443E] inline-block shadow-2xs" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] border border-[#DEA123] inline-block shadow-2xs" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F] border border-[#1AAB29] inline-block shadow-2xs" />
              <div className="ml-3 hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-50 border border-slate-200/80 text-[11px] font-mono text-slate-600">
                <Lock className="w-3 h-3 text-emerald-600" />
                <span>https://app.ezzysync.com/{activeTab}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-mono font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                Live Agency Workspace
              </span>
            </div>
          </div>

          {/* TAB 1: Lead Pipeline */}
          {activeTab === "pipeline" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">Visual Inquiry Pipeline</h3>
                  <p className="text-slate-500">Track travelers from raw inquiry through quotation and confirmed booking.</p>
                </div>
                <div className="text-[12px] text-slate-700 font-mono">
                  In Discussion: <span className="font-bold text-emerald-700">₹6,40,000</span>
                </div>
              </div>

              {/* Kanban Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                {/* Column 1 */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500" /> New Leads (2)
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1 shadow-2xs">
                    <div className="flex justify-between items-start text-xs font-semibold text-slate-900">
                      <span>Ankit Verma</span>
                      <span className="text-[10px] text-brand-700 bg-brand-50 border border-brand-100 px-1.5 py-0.5 rounded">Dubai</span>
                    </div>
                    <p className="text-[11px] text-slate-500">4 Pax Family • Oct Travel</p>
                    <div className="text-[11px] font-semibold text-emerald-700">₹1,80,000</div>
                  </div>
                </div>

                {/* Column 2 */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" /> Quoted (3)
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1 shadow-2xs">
                    <div className="flex justify-between items-start text-xs font-semibold text-slate-900">
                      <span>Neha Kapoor</span>
                      <span className="text-[10px] text-cyan-800 bg-cyan-50 border border-cyan-100 px-1.5 py-0.5 rounded">Bali</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Sent Itinerary v2 via WhatsApp</p>
                    <div className="text-[11px] font-semibold text-emerald-700">₹2,80,000</div>
                  </div>
                </div>

                {/* Column 3 */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-500" /> Negotiation (1)
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1 shadow-2xs">
                    <div className="flex justify-between items-start text-xs font-semibold text-slate-900">
                      <span>Pooja Mehra</span>
                      <span className="text-[10px] text-purple-800 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded">Kashmir</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Hotel upgraded to 4-Star</p>
                    <div className="text-[11px] font-semibold text-emerald-700">₹85,000</div>
                  </div>
                </div>

                {/* Column 4 */}
                <div className="bg-slate-50 rounded-xl p-3 border border-emerald-200 space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-emerald-700">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" /> Booked &amp; Won
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-emerald-200 space-y-1 shadow-2xs">
                    <div className="flex justify-between items-start text-xs font-semibold text-slate-900">
                      <span>Siddharth Sen</span>
                      <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Maldives</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Advance ₹75,000 logged</p>
                    <div className="text-[11px] font-bold text-emerald-700">₹2,45,000</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WhatsApp */}
          {activeTab === "whatsapp" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">Official Meta WhatsApp Cloud API</h3>
                  <p className="text-slate-500">Deliver quotation links and booking updates directly from your verified business number.</p>
                </div>
                <div className="text-[11px] text-emerald-700 font-mono font-semibold">
                  Official Meta Direct API
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 max-w-lg mx-auto space-y-3 font-sans text-xs shadow-2xs">
                {/* Outgoing WhatsApp Msg */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl rounded-tr-xs p-3 ml-auto max-w-md space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-emerald-800">
                    <span className="font-bold">Royal Escapes Holidays (Verified)</span>
                    <span>11:32 AM</span>
                  </div>
                  <p className="text-slate-800 text-xs leading-relaxed">
                    Hello Rahul Sharma! ✈️ Your customized 6N/7D Bali Itinerary and Quotation is ready.
                  </p>
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-100 text-[11px] text-slate-700 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">Bali Discovery (Seminyak + Ubud)</div>
                      <div className="text-slate-500 text-[10px]">Includes 4★ Resorts, Private Transfers &amp; Tours</div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                  </div>
                  <div className="text-[10px] text-emerald-700 text-right font-medium">
                    Delivered &amp; Read ✓✓
                  </div>
                </div>

                {/* Traveler Response */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-xs p-3 max-w-sm space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span className="font-bold text-slate-700">Rahul Sharma</span>
                    <span>11:36 AM</span>
                  </div>
                  <p className="text-slate-800 text-xs">
                    Looks great! Can you please send the advance payment details for 2 adults?
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Itinerary Builder */}
          {activeTab === "itinerary" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">AI Day-Wise Itinerary &amp; Quotation Studio</h3>
                  <p className="text-slate-500">Assemble customized day-by-day programs with AI assistance, verified hotel categories, transfers, and sightseeing.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs">
                <div className="bg-white rounded-xl p-3.5 border border-slate-200 space-y-1.5 shadow-2xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-brand-700 text-[11px] uppercase tracking-wider">Day 1</span>
                    <span className="text-[10px] text-slate-500">Seminyak</span>
                  </div>
                  <h4 className="font-bold text-slate-900">Arrival &amp; Hotel Check-In</h4>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Private airport pick-up. Check-in at 4★ Beach Resort. Evening leisure at Seminyak Beach.
                  </p>
                  <div className="text-[10px] bg-slate-50 px-2 py-1 rounded text-slate-600 border border-slate-200">
                    <span className="font-semibold text-slate-700">Stay:</span> 4★ Luxury Room • Breakfast Included
                  </div>
                </div>

                <div className="bg-white rounded-xl p-3.5 border border-slate-200 space-y-1.5 shadow-2xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-brand-700 text-[11px] uppercase tracking-wider">Day 2</span>
                    <span className="text-[10px] text-slate-500">Nusa Penida</span>
                  </div>
                  <h4 className="font-bold text-slate-900">Island Tour &amp; Snorkeling</h4>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Speedboat transfer. Visit Kelingking Beach, Broken Beach, Angel&apos;s Billabong, and crystal bay.
                  </p>
                  <div className="text-[10px] bg-slate-50 px-2 py-1 rounded text-slate-600 border border-slate-200">
                    <span className="font-semibold text-slate-700">Transfer:</span> Speedboat + Private Cab
                  </div>
                </div>

                <div className="bg-white rounded-xl p-3.5 border border-slate-200 space-y-1.5 shadow-2xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-brand-700 text-[11px] uppercase tracking-wider">Day 3</span>
                    <span className="text-[10px] text-slate-500">Ubud</span>
                  </div>
                  <h4 className="font-bold text-slate-900">Rice Terraces &amp; Waterfalls</h4>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Scenic drive to Ubud rainforest. Visit Tegallalang Rice Terraces, coffee plantation, and Tegenungan waterfall.
                  </p>
                  <div className="text-[10px] bg-slate-50 px-2 py-1 rounded text-slate-600 border border-slate-200">
                    <span className="font-semibold text-slate-700">Stay:</span> Private Ubud Rainforest Villa
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Quotations */}
          {activeTab === "invoices" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">Professional PDF Quotations &amp; Invoices</h3>
                  <p className="text-slate-500">Generate PDF documents with agency branding, itemized cost breakdowns, and bank details.</p>
                </div>
                <div className="text-[11px] font-mono text-slate-600">
                  SAC Code: 998555
                </div>
              </div>

              <div className="bg-white text-slate-900 rounded-xl p-4 sm:p-5 max-w-xl mx-auto border border-slate-200 shadow-2xs space-y-3 font-sans text-xs">
                <div className="flex justify-between items-start border-b border-slate-200 pb-2.5">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">ROYAL ESCAPES TOURS</h4>
                    <p className="text-slate-500 text-[10px]">New Delhi, India • info@royalescapes.com</p>
                  </div>
                  <div className="text-right">
                    <span className="bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded text-[10px]">
                      CONFIRMED QUOTE
                    </span>
                    <div className="text-[10px] font-mono text-slate-500 mt-1">QT-2026-0842</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Traveler:</span>
                    <span className="font-semibold text-slate-800">Siddharth Sen</span>
                    <p className="text-slate-500">Destination: Maldives (5D/4N)</p>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block">Total Package:</span>
                    <span className="font-bold text-slate-900 text-sm">₹2,45,000</span>
                    <p className="text-slate-500 text-[10px]">All taxes included</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex justify-between items-center text-[11px]">
                  <div>
                    <span className="text-slate-500">Advance Deposit: </span>
                    <span className="font-bold text-emerald-700">₹75,000</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Remaining Balance: </span>
                    <span className="font-bold text-slate-800">₹1,70,000</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Tour Operations */}
          {activeTab === "operations" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">Hotel, Cab &amp; Supplier Service Vouchers</h3>
                  <p className="text-slate-500">Dispatch confirmed hotel reservation vouchers and driver duty slips directly from booking records.</p>
                </div>
                <div className="text-[11px] font-mono text-slate-600">
                  Margin Safeguard: Active
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto pt-1 text-xs">
                <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-2 shadow-2xs">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <span className="font-bold text-slate-900">Hotel Reservation Voucher</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      CONFIRMED
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="font-semibold text-slate-800">Grand Palace Resort • 2 Deluxe Rooms • MAP</div>
                    <div className="text-slate-500">Dates: 12 Oct – 16 Oct • Voucher #GP-88421</div>
                    <div className="text-slate-500 font-mono">Supplier: Royal DMCs (Reconciled)</div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-2 shadow-2xs">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <span className="font-bold text-slate-900">Driver Cab Duty Slip</span>
                    <span className="text-[10px] font-bold text-brand-700 bg-brand-100 px-2 py-0.5 rounded">
                      ASSIGNED
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="font-semibold text-slate-800">Innova Crysta • GA 03 X 9123</div>
                    <div className="text-slate-500">Driver: Rajesh Kumar (+91 94220 18892)</div>
                    <div className="text-slate-500 font-mono">Pickup: MOPA Airport (Flight 6E-204)</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: Payments */}
          {activeTab === "payments" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">Milestone Payment Reconciliation</h3>
                  <p className="text-slate-500">Track multi-stage deposits and synchronize payments via verified Razorpay webhooks.</p>
                </div>
              </div>

              <div className="space-y-2.5 max-w-xl mx-auto pt-1 text-xs">
                <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">Booking Advance (30%)</div>
                      <div className="text-[10px] text-slate-500">Paid via Razorpay UPI • Webhook Verified</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-700">₹75,000</div>
                    <div className="text-[10px] text-emerald-600 font-medium">Reconciled</div>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">Hotel Confirmation Installment (50%)</div>
                      <div className="text-[10px] text-slate-500">Due before hotel voucher dispatch</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-amber-700">₹1,20,000</div>
                    <div className="text-[10px] text-amber-600 font-medium">Pending Due</div>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                      3
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">Final Departure Balance (20%)</div>
                      <div className="text-[10px] text-slate-500">Due 7 days before departure</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-700">₹50,000</div>
                    <div className="text-[10px] text-slate-500">Scheduled</div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </section>
  );
}
