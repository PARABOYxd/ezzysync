import React from "react";
import { CreditCard, ReceiptIndianRupee, Cloud } from "lucide-react";
import WhatsAppIcon from "../common/WhatsAppIcon";

// Capability facts only. Customer counts or usage numbers belong here once
// they come from real data - never typed in by hand.
const badges = [
  { icon: WhatsAppIcon, title: "Official Meta WhatsApp Cloud API", sub: "Your own verified business number" },
  { icon: CreditCard, title: "UPI, cards & netbanking", sub: "Collect advances via your Razorpay" },
  { icon: ReceiptIndianRupee, title: "GST-ready quotes & invoices", sub: "Tour operator SAC 998555" },
  { icon: Cloud, title: "Cloud-based", sub: "Works on laptop & phone, no install" },
];

export default function TrustStrip() {
  return (
    <section aria-label="Platform highlights" className="bg-white border-b border-slate-200">
      <div className="max-w-[1240px] mx-auto px-5 sm:px-6 py-8 sm:py-10">
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5">
          {badges.map(({ icon: Icon, title, sub }) => (
            <li key={title} className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </span>
              <div className="leading-snug">
                <div className="text-sm font-semibold text-slate-900">{title}</div>
                <div className="text-sm text-slate-500">{sub}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
