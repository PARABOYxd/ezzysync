import React from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import ScrollReveal from "../ScrollReveal";
import { PLANS as plans } from "@/data/plans";
import { getTrialUrl } from "@/lib/crmUrl";

export default function Pricing({ crmUrl }) {
  const trialUrl = getTrialUrl(crmUrl);

  return (
    <section id="pricing" className="py-20 sm:py-28 bg-white text-slate-900 scroll-mt-16">
      <div className="max-w-[1140px] mx-auto px-5 sm:px-6 space-y-12">
        <ScrollReveal className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="font-bold text-3xl sm:text-4xl tracking-tight text-slate-950">Pricing</h2>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
            Every plan starts with a free trial. No credit card, cancel or switch plans anytime.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
          {plans.map((plan, i) => (
            <ScrollReveal key={plan.name} delay={i * 80}>
              <div
                className={`h-full bg-white p-7 sm:p-8 rounded-2xl flex flex-col ${
                  plan.featured ? "border-2 border-brand-500 shadow-lg" : "border border-slate-200"
                }`}
              >
                <h3 className="font-bold text-lg text-slate-900 tracking-tight">{plan.name}</h3>
                <p className="text-slate-500 text-sm mt-1">{plan.blurb}</p>

                <div className="mt-6 flex items-baseline text-slate-950">
                  <span className="text-3xl sm:text-4xl font-semibold tracking-tight">{plan.price}</span>
                  <span className="ml-1.5 text-sm text-slate-500 font-medium">{plan.period}</span>
                </div>

                <ul className="mt-6 space-y-3 text-sm text-slate-700 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2 items-start">
                      <Check className="w-4 h-4 mt-0.5 text-brand-600 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {plan.cta === "contact" ? (
                  <Link
                    href="/contact"
                    className="mt-8 block w-full text-center py-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-900 font-semibold text-sm transition-colors"
                  >
                    Talk to sales
                  </Link>
                ) : (
                  <a
                    href={trialUrl}
                    className={`mt-8 block w-full text-center py-3 rounded-xl font-semibold text-sm transition-colors ${
                      plan.featured
                        ? "bg-brand-600 hover:bg-brand-700 text-white"
                        : "border border-slate-300 hover:bg-slate-50 text-slate-900"
                    }`}
                  >
                    Start free trial
                  </a>
                )}
              </div>
            </ScrollReveal>
          ))}
        </div>

        <p className="text-center text-sm text-slate-500">
          Payments via Razorpay. Export your data whenever you want.
        </p>
      </div>
    </section>
  );
}
