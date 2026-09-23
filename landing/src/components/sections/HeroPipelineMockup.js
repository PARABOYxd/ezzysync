import React from "react";
import { Lock, FileCheck, IndianRupee } from "lucide-react";
import WhatsAppIcon from "../common/WhatsAppIcon";

// Illustrative sample data only - every name and amount here is made up.
const columns = [
  {
    title: "New Inquiry",
    dot: "bg-blue-500",
    cards: [
      { name: "Rahul Sharma", place: "Goa", meta: "2 Adults + 1 Child · 4N/5D", amount: "₹48,500", source: "WhatsApp" },
      { name: "Priya Patel", place: "Kashmir", meta: "Honeymoon · 5N/6D", amount: "₹85,000", source: "Meta Ads" },
    ],
  },
  {
    title: "Itinerary Shared",
    dot: "bg-amber-500",
    cards: [
      { name: "Amit Verma", place: "Dubai", meta: "Family of 4 · 4N/5D", amount: "₹1,20,000", note: "Viewed 2 times" },
    ],
  },
  {
    title: "Advance Received",
    dot: "bg-violet-500",
    cards: [
      { name: "Pooja Malhotra", place: "Kerala", meta: "₹25,000 of ₹54,000 paid", amount: "₹54,000", progress: 46 },
    ],
  },
  {
    title: "Vouchers Issued",
    dot: "bg-emerald-500",
    cards: [
      { name: "Vikram Singh", place: "Manali", meta: "Hotel + cab confirmed", amount: "₹72,000", done: true },
    ],
  },
];

function LeadCard({ card }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-2.5 sm:p-3 space-y-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[12px] sm:text-[13px] font-semibold text-slate-900 leading-tight">{card.name}</span>
        <span className="text-[10px] sm:text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-100 px-1.5 py-0.5 rounded shrink-0">
          {card.place}
        </span>
      </div>
      <p className="text-[11px] sm:text-xs text-slate-500 leading-snug">{card.meta}</p>
      {card.progress != null && (
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full bg-violet-500 rounded-full" style={{ width: `${card.progress}%` }} />
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-[12px] sm:text-[13px] font-bold text-emerald-700">{card.amount}</span>
        {card.source && <span className="text-[10px] text-slate-400">{card.source}</span>}
        {card.note && <span className="text-[10px] text-amber-600 font-medium">{card.note}</span>}
        {card.done && <span className="text-[10px] text-emerald-600 font-semibold">✓ Ready</span>}
      </div>
    </div>
  );
}

function FloatingCard({ icon: Icon, iconClass, title, sub, className, delay }) {
  return (
    <div
      className={`hidden xl:flex absolute items-center gap-3 bg-white rounded-xl border border-slate-200 shadow-[0_12px_32px_rgba(15,23,42,0.14)] px-3.5 py-2.5 float-y ${className}`}
      style={{ "--float-delay": delay }}
    >
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}>
        <Icon className="w-4 h-4" />
      </span>
      <div className="leading-tight">
        <div className="text-[13px] font-semibold text-slate-900">{title}</div>
        <div className="text-[11px] text-slate-500">{sub}</div>
      </div>
    </div>
  );
}

export default function HeroPipelineMockup() {
  return (
    <div className="relative">
      <div className="absolute -inset-3 bg-gradient-to-r from-brand-500/15 via-emerald-500/10 to-brand-500/15 rounded-3xl blur-2xl -z-10" />

      <div
        role="img"
        aria-label="EzzySync lead pipeline showing travel inquiries moving from new inquiry to vouchers issued, with rupee amounts"
        className="bg-white rounded-2xl border border-slate-200 shadow-[0_24px_60px_rgba(15,23,42,0.14)] overflow-hidden"
      >
        {/* Window bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 bg-slate-50">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
          <span className="ml-3 hidden sm:flex items-center gap-1.5 px-3 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] text-slate-500">
            <Lock className="w-3 h-3 text-emerald-600" /> app.ezzysync.com/leads
          </span>
        </div>

        {/* Toolbar with totals */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-100">
          <div>
            <div className="text-sm sm:text-base font-bold text-slate-900">Leads Pipeline</div>
            <div className="text-[11px] sm:text-xs text-slate-500">This month · 5 active trips</div>
          </div>
          <div className="flex gap-4 sm:gap-6">
            <div>
              <div className="text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Pipeline value</div>
              <div className="text-sm sm:text-base font-bold text-slate-900">₹3,79,500</div>
            </div>
            <div>
              <div className="text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Advance collected</div>
              <div className="text-sm sm:text-base font-bold text-emerald-700">₹97,000</div>
            </div>
          </div>
        </div>

        {/* Kanban */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 p-3 sm:p-4 bg-slate-50/70">
          {columns.map((col, i) => (
            <div key={col.title} className={`space-y-2 ${i > 1 ? "hidden lg:block" : ""}`}>
              <div className="flex items-center gap-1.5 px-0.5 text-[11px] sm:text-xs font-semibold text-slate-700">
                <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                {col.title}
                <span className="text-slate-400 font-medium">({col.cards.length})</span>
              </div>
              {col.cards.map((card) => (
                <LeadCard key={card.name} card={card} />
              ))}
            </div>
          ))}
        </div>
      </div>

      <FloatingCard
        icon={WhatsAppIcon}
        iconClass="bg-emerald-50 text-emerald-600"
        title="New lead from WhatsApp"
        sub="+91 98201 xxxxx · Goa family trip"
        className="-left-20 -top-6"
        delay="0s"
      />
      <FloatingCard
        icon={FileCheck}
        iconClass="bg-brand-50 text-brand-600"
        title="Quote sent ✓"
        sub="Goa 4N/5D · PDF + mobile link"
        className="-right-14 bottom-14"
        delay="1.2s"
      />
      <FloatingCard
        icon={IndianRupee}
        iconClass="bg-violet-50 text-violet-600"
        title="₹25,000 advance received"
        sub="UPI via Razorpay · Pooja Malhotra"
        className="left-[44%] -bottom-7"
        delay="2.4s"
      />
    </div>
  );
}
