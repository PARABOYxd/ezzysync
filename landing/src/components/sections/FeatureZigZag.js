import React from "react";
import { Check, Hotel, Car } from "lucide-react";
import ScrollReveal from "../ScrollReveal";
import WhatsAppIcon from "../common/WhatsAppIcon";

function InboxVisual() {
  return (
    <div className="bg-[#efeae2] rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3 text-sm">
      <div className="flex items-center gap-2 pb-3 border-b border-black/5">
        <span className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center">
          <WhatsAppIcon className="w-4 h-4" />
        </span>
        <div className="leading-tight">
          <div className="font-semibold text-slate-900">Neha Kapoor</div>
          <div className="text-[11px] text-slate-500">Assigned to Rohit · Bali inquiry</div>
        </div>
      </div>
      <div className="bg-white rounded-xl rounded-tl-sm px-3 py-2 max-w-[80%] shadow-2xs">
        Hi, looking for a Bali 5N/6D honeymoon package in December. Budget around ₹1.2L.
      </div>
      <div className="bg-[#d9fdd3] rounded-xl rounded-tr-sm px-3 py-2 max-w-[80%] ml-auto shadow-2xs">
        Hi Neha! Here&apos;s your day-wise Bali plan with 2 hotel options 👇
        <div className="mt-2 bg-white/70 rounded-lg px-2.5 py-1.5 text-xs text-emerald-800 font-medium">
          📄 Bali-Honeymoon-Quote.pdf
        </div>
        <div className="text-[10px] text-slate-500 text-right mt-1">Rohit · 11:24 AM ✓✓</div>
      </div>
      <div className="flex gap-2 pt-1 text-[11px]">
        <span className="px-2 py-1 rounded-md bg-white text-slate-600">3 agents online</span>
        <span className="px-2 py-1 rounded-md bg-white text-slate-600">1 shared number</span>
      </div>
    </div>
  );
}

function ItineraryVisual() {
  const days = [
    ["Day 1", "Arrive Srinagar · Houseboat stay"],
    ["Day 2", "Gulmarg gondola ride"],
    ["Day 3", "Pahalgam · Betaab Valley"],
    ["Day 4", "Sonamarg day trip"],
  ];
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgba(15,23,42,0.08)] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="font-bold text-slate-900">Kashmir 5N/6D</div>
          <div className="text-xs text-slate-500">2 Adults · Deluxe houseboat + 4★ hotels</div>
        </div>
        <span className="inline-flex items-center text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-md">
          Day-wise plan
        </span>
      </div>
      <ol className="pt-3 space-y-2.5">
        {days.map(([d, t]) => (
          <li key={d} className="flex gap-3 text-sm">
            <span className="w-14 shrink-0 font-semibold text-brand-600">{d}</span>
            <span className="text-slate-700">{t}</span>
          </li>
        ))}
      </ol>
      <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2 text-xs">
        <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium">PDF</span>
        <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium">Mobile link</span>
      </div>
    </div>
  );
}

function QuoteVisual() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgba(15,23,42,0.08)] overflow-hidden">
      <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
        <div>
          <div className="font-bold">Your Agency Name</div>
          <div className="text-[11px] text-slate-400">Your logo · GSTIN · address</div>
        </div>
        <span className="text-xs text-slate-300">Quote #QT-112</span>
      </div>
      <div className="p-5 sm:p-6 text-sm space-y-2.5">
        {[
          ["Dubai 4N/5D package (4 pax)", "₹1,14,286"],
          ["GST 5% (SAC 998555)", "₹5,714"],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4">
            <span className="text-slate-600">{k}</span>
            <span className="font-medium text-slate-900">{v}</span>
          </div>
        ))}
        <div className="flex justify-between gap-4 pt-3 border-t border-slate-200 font-bold text-base">
          <span>Total</span>
          <span className="text-emerald-700">₹1,20,000</span>
        </div>
        <div className="text-xs text-slate-500">₹30,000 per person · Inclusions &amp; exclusions listed</div>
      </div>
    </div>
  );
}

function LedgerVisual() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgba(15,23,42,0.08)] p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-bold text-slate-900">Kerala 4N/5D · Pooja Malhotra</div>
          <div className="text-xs text-slate-500">Travel date: 12 Nov</div>
        </div>
        <span className="text-sm font-bold text-slate-900">₹54,000</span>
      </div>
      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>Paid ₹25,000</span>
          <span>Due ₹29,000</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full w-[46%] bg-emerald-500 rounded-full" />
        </div>
      </div>
      <ul className="text-sm divide-y divide-slate-100">
        <li className="flex justify-between py-2"><span className="text-slate-600">Advance · UPI</span><span className="font-medium text-emerald-700">₹25,000 ✓</span></li>
        <li className="flex justify-between py-2"><span className="text-slate-600">Balance · before travel</span><span className="font-medium text-amber-600">₹29,000 pending</span></li>
      </ul>
      <div className="flex gap-2 text-xs">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium"><Hotel className="w-3.5 h-3.5" /> Hotel voucher</span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium"><Car className="w-3.5 h-3.5" /> Driver duty slip</span>
      </div>
    </div>
  );
}

const features = [
  {
    eyebrow: "Shared WhatsApp inbox",
    title: "One WhatsApp number for your whole team",
    body: "Connect your official business number once. Your sales team replies from the same inbox, every chat is assigned to someone, and nothing lives on a personal phone.",
    points: ["Up to 5 team logins on Agency Growth", "Every chat linked to its lead", "No per-message markup from us"],
    Visual: InboxVisual,
  },
  {
    eyebrow: "Itinerary builder",
    title: "Day-wise itineraries without Word or Canva",
    body: "Build the trip day by day with hotels, sightseeing and transfers, then share a clean PDF or mobile link with your client in minutes.",
    points: ["Hotels, activities & transfers per day", "Branded PDF + shareable mobile link", "Save reusable destination templates"],
    Visual: ItineraryVisual,
  },
  {
    eyebrow: "GST quotations",
    title: "Professional quotes the client trusts",
    body: "Your logo and letterhead on every quote, with tax, totals and per-person price worked out for you. Send it straight to the client's WhatsApp.",
    points: ["GST calculated with tour operator SAC 998555", "Inclusions & exclusions on the quote", "Download as PDF anytime"],
    Visual: QuoteVisual,
  },
  {
    eyebrow: "Payments & vouchers",
    title: "See who paid and what's due at a glance",
    body: "Log every advance and instalment against the trip. When it's confirmed, issue hotel vouchers and driver duty slips without retyping anything.",
    points: ["Advance & balance tracked per booking", "Razorpay payments matched automatically", "Hotel vouchers & driver duty slips"],
    Visual: LedgerVisual,
  },
];

export default function FeatureZigZag() {
  return (
    <section id="features" className="py-20 sm:py-28 bg-white scroll-mt-16">
      <div className="max-w-[1140px] mx-auto px-5 sm:px-6 space-y-16 sm:space-y-20">
        <ScrollReveal className="text-center max-w-3xl mx-auto space-y-3">
          <h2 className="font-bold text-3xl sm:text-4xl tracking-tight text-slate-950">
            Built for how travel agencies actually work
          </h2>
        </ScrollReveal>

        {features.map(({ eyebrow, title, body, points, Visual }, i) => (
          <ScrollReveal key={eyebrow}>
            <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
              <div className={`space-y-4 ${i % 2 === 1 ? "md:order-2" : ""}`}>
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-600">{eyebrow}</span>
                <h3 className="font-bold text-2xl sm:text-3xl tracking-tight text-slate-950">{title}</h3>
                <p className="text-slate-600 text-base leading-relaxed">{body}</p>
                <ul className="space-y-2.5 pt-1">
                  {points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm sm:text-base text-slate-800">
                      <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={i % 2 === 1 ? "md:order-1" : ""}>
                <Visual />
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
