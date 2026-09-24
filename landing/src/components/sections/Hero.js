import React from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import HeroPipelineMockup from "./HeroPipelineMockup";
import WhatsAppIcon from "../common/WhatsAppIcon";
import { waLink, WA_DEMO_TEXT } from "@/lib/contact";

export default function Hero({ crmUrl }) {
  const loginUrl = crmUrl ? `${crmUrl}/login` : "/pricing";

  return (
    <section className="relative pt-12 pb-16 sm:pt-16 sm:pb-24 bg-[#fafbfc] border-b border-slate-200 overflow-hidden">
      <div className="max-w-[1240px] mx-auto px-5 sm:px-6">
        <div className="text-center space-y-5 max-w-5xl mx-auto">
          <h1 className="font-bold text-slate-950 text-[2rem] sm:text-5xl lg:text-[3rem] leading-[1.12] tracking-tight text-balance">
            <span className="sm:block">Travel CRM Software</span>{" "}
            <span className="sm:block text-brand-600">for Tour Operators &amp; Travel Agencies</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto text-pretty">
            Capture every inquiry, build day-wise itineraries, send branded GST quotes on WhatsApp and track
            advance payments — without Excel sheets or lost chats.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-2">
            <a
              href={loginUrl}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-[15px] shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 group btn-press"
            >
              Start Free Trial
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </a>
            <a
              href={waLink(WA_DEMO_TEXT)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-[15px] transition-all flex items-center justify-center gap-2 btn-press"
            >
              <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
              Get a Demo on WhatsApp
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-1 text-sm text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Setup in minutes
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Cancel anytime
            </span>
          </div>
        </div>

        <div className="mt-12 sm:mt-16 max-w-5xl mx-auto">
          <HeroPipelineMockup />
        </div>

        <div className="mt-14 sm:mt-16 max-w-3xl mx-auto text-center space-y-3">
          <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">
            Auto-capture leads from
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
            {[
              { label: "WhatsApp Chats", color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
              { label: "Facebook & Instagram Ads", color: "bg-blue-50 text-blue-800 border-blue-200" },
              { label: "Google Ads", color: "bg-amber-50 text-amber-800 border-amber-200" },
              { label: "Website Forms", color: "bg-indigo-50 text-indigo-800 border-indigo-200" },
              { label: "Excel / CSV Import", color: "bg-slate-100 text-slate-700 border-slate-200" },
            ].map((s) => (
              <span
                key={s.label}
                className={`inline-flex items-center px-3 py-1.5 rounded-lg border text-xs sm:text-sm font-medium ${s.color}`}
              >
                {s.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
