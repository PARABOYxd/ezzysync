import React from "react";
import { ArrowRight } from "lucide-react";
import WhatsAppIcon from "../common/WhatsAppIcon";
import { waLink, WA_DEMO_TEXT } from "@/lib/contact";

export default function FinalCTA({ crmUrl }) {
  const loginUrl = crmUrl ? `${crmUrl}/login` : "/pricing";

  return (
    <section className="bg-gradient-to-br from-brand-600 to-brand-700 text-white">
      <div className="max-w-[1000px] mx-auto px-5 sm:px-6 py-16 sm:py-20 text-center space-y-6">
        <h2 className="font-bold text-3xl sm:text-4xl tracking-tight">
          Stop losing leads in WhatsApp chats
        </h2>
        <p className="text-brand-100 text-base sm:text-lg max-w-xl mx-auto">
          Start free, import your Excel leads, and send your first branded quote today. No credit card required.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
          <a
            href={loginUrl}
            className="px-8 py-3.5 rounded-xl bg-white text-brand-700 hover:bg-brand-50 font-semibold text-[15px] flex items-center justify-center gap-2 transition-colors"
          >
            Start Free Trial <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href={waLink(WA_DEMO_TEXT)}
            target="_blank"
            rel="noopener noreferrer"
            className="px-7 py-3.5 rounded-xl border border-white/40 hover:bg-white/10 font-semibold text-[15px] flex items-center justify-center gap-2 transition-colors"
          >
            <WhatsAppIcon className="w-4 h-4" /> Get a Demo on WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
