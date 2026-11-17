import React from "react";
import SectionHeading from "../common/SectionHeading";
import Pill from "../ui/Pill";
import { PLANS as plans } from "@/data/plans";
import { getTrialUrl } from "@/lib/crmUrl";

/**
 * Plans as three columns of a single sheet (thin rules, no cards). The
 * featured plan is inverted to ink rather than lifted with a shadow.
 */
export default function Pricing({ crmUrl, index = "07" }) {
  const trialUrl = getTrialUrl(crmUrl);

  return (
    <section id="pricing" className="section-y scroll-mt-20">
      <div className="wrap">
        <SectionHeading
          index={index}
          label="Pricing"
          title="Simple monthly plans, every feature included"
          intro="Every plan starts with a free trial. No credit card, cancel or switch plans anytime."
        />

        <div data-stagger className="mt-[clamp(56px,7vw,112px)] grid grid-cols-1 lg:grid-cols-3 border-t border-ink-900">
          {plans.map((plan) => {
            const featured = plan.featured;
            const isContact = plan.cta === "contact";
            return (
              <article
                key={plan.name}
                {...(featured && { "data-theme": "dark" })}
                className={`flex flex-col p-7 sm:p-10 border-b border-line lg:border-b-0 lg:border-r last:border-r-0 ${
                  featured ? "bg-ink-900 text-paper lg:-mt-px" : ""
                }`}
              >
                <p className="h-7">
                  {featured && <span className="t-label whitespace-nowrap rounded-full bg-accent text-ink-900 px-3 py-1.5">Most popular</span>}
                </p>
                <h3 className="mt-4 font-display text-[clamp(26px,2.4vw,36px)] tracking-[-0.04em] leading-none">{plan.name}</h3>
                <p className={`mt-3 text-[15px] ${featured ? "text-white/65" : "text-ink-600"}`}>{plan.blurb}</p>

                <div className="mt-10 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="font-display text-[clamp(56px,6vw,88px)] tracking-[-0.05em] leading-none tabular-nums">{plan.price}</span>
                  <span className={`text-[15px] ${featured ? "text-white/65" : "text-ink-600"}`}>{plan.period}</span>
                </div>

                <ul className={`mt-10 flex-1 border-t ${featured ? "border-white/15" : "border-line"}`}>
                  {plan.features.map((f) => (
                    <li key={f} className={`py-3 border-b text-[15px] ${featured ? "border-white/15 text-white/85" : "border-line text-ink-800"}`}>
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="mt-10">
                  {isContact ? (
                    <Pill href="/contact" variant={featured ? "ghost-light" : "ghost"}>Talk to sales</Pill>
                  ) : (
                    <Pill href={trialUrl} variant={featured ? "light" : "ghost"}>Start free trial</Pill>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <p className="mt-8 text-[14px] text-ink-600">Payments via Razorpay. Export your data whenever you want.</p>
      </div>
    </section>
  );
}
