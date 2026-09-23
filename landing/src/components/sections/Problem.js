import React from "react";
import { MessageSquareOff, Clock, Receipt } from "lucide-react";
import ScrollReveal from "../ScrollReveal";

const pains = [
  {
    icon: MessageSquareOff,
    title: "Leads WhatsApp mein kho jaate hain",
    body: "Inquiries are spread across 4 staff phones. Nobody knows who replied, follow-ups slip, and the traveler books with someone faster.",
    fix: "One shared inbox + follow-up reminders",
  },
  {
    icon: Clock,
    title: "Quote banane mein 1–2 ghante",
    body: "Copy-pasting hotel rates and day plans into Word or Canva for every small change the client asks for.",
    fix: "Day-wise builder + 1-click PDF quote",
  },
  {
    icon: Receipt,
    title: "Payment ka hisaab nahi",
    body: "Scrolling chats for UPI screenshots. No clear record of who paid the advance and whose balance is still due.",
    fix: "Advance & balance ledger for every trip",
  },
];

export default function Problem() {
  return (
    <section id="problem" className="py-16 sm:py-24 bg-slate-50 border-b border-slate-200">
      <div className="max-w-[1140px] mx-auto px-5 sm:px-6 space-y-10 sm:space-y-14">
        <ScrollReveal className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 block">
            Sound familiar?
          </span>
          <h2 className="font-bold text-3xl sm:text-4xl tracking-tight text-slate-950">
            Running your agency on WhatsApp &amp; Excel?
          </h2>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
            It works for 10 inquiries a month. At 100, things start falling through the cracks.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {pains.map(({ icon: Icon, title, body, fix }, i) => (
            <ScrollReveal key={title} delay={i * 80}>
              <div className="h-full bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 flex flex-col">
                <span className="w-11 h-11 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </span>
                <h3 className="mt-5 font-bold text-lg text-slate-900 tracking-tight">{title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed flex-1">{body}</p>
                <div className="mt-5 pt-4 border-t border-slate-100 text-sm font-semibold text-emerald-700">
                  ✓ {fix}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
