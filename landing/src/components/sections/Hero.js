import React from "react";
import { ArrowRight } from "lucide-react";
import HeroPipelineMockup from "./HeroPipelineMockup";
import WhatsAppIcon from "../common/WhatsAppIcon";
import { waLink, WA_DEMO_TEXT } from "@/lib/contact";
import { getTrialUrl } from "@/lib/crmUrl";

export default function Hero({ crmUrl }) {
  const trialUrl = getTrialUrl(crmUrl);

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
              href={trialUrl}
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

          <p className="pt-1 text-sm text-slate-500">No credit card required. Cancel anytime.</p>
        </div>

        <div className="mt-12 sm:mt-16 max-w-5xl mx-auto">
          <HeroPipelineMockup />
        </div>

        <p className="mt-8 text-center text-sm text-slate-500">
          Leads come in automatically from WhatsApp, Instagram DMs and your website form — or from an Excel import.
        </p>
      </div>
    </section>
  );
}
