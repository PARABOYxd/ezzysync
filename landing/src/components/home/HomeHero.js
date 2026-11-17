import React from "react";
import Pill from "../ui/Pill";
import ProductShot from "./ProductShot";
import WhatsAppIcon from "../common/WhatsAppIcon";
import { waLink, WA_DEMO_TEXT } from "@/lib/contact";
import { getTrialUrl } from "@/lib/crmUrl";

// The H1 keeps the page's target keyword. Each word slides up out of its own
// mask with CSS only, so it starts at first paint instead of waiting for JS.
const HEADLINE = ["Travel", "CRM", "Software", "for", "Tour", "Operators", "&", "Travel", "Agencies"];

export default function HomeHero({ crmUrl }) {
  const trialUrl = getTrialUrl(crmUrl);

  return (
    <section className="pt-[clamp(40px,7vw,112px)]">
      <div className="wrap">
        <p className="t-label text-ink-600 fade-in-up">Travel CRM · Built in India for Indian agencies</p>

        <h1 className="t-h1 mt-8 text-ink-900 max-w-[15ch]" aria-label={HEADLINE.join(" ")}>
          {HEADLINE.map((w, i) => (
            <React.Fragment key={i}>
              <span className="word-mask" aria-hidden="true">
                <span style={{ "--i": i }} className={w === "&" ? "text-accent" : undefined}>
                  {w}
                </span>
              </span>{" "}
            </React.Fragment>
          ))}
        </h1>

        <div className="grid-12 gap-y-8 mt-[clamp(40px,5vw,72px)] items-end">
          <p className="col-span-12 md:col-span-6 lg:col-span-5 t-lead text-ink-600 fade-in-up" style={{ "--d": "450ms" }}>
            Capture every inquiry, build day-wise itineraries, send GST quotes on WhatsApp and track every advance,
            without Excel sheets or lost chats.
          </p>
          <div
            className="col-span-12 md:col-span-6 lg:col-start-8 lg:col-span-5 flex flex-wrap items-center gap-x-6 gap-y-4 md:justify-end fade-in-up"
            style={{ "--d": "550ms" }}
          >
            <Pill href={trialUrl}>Start free trial</Pill>
            <a
              href={waLink(WA_DEMO_TEXT)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 min-h-11 text-[16px] text-ink-900"
            >
              <WhatsAppIcon className="w-4 h-4 text-emerald-700" />
              <span className="link-line">Get a demo on WhatsApp</span>
            </a>
          </div>
        </div>
        <p className="mt-6 text-[14px] text-ink-600 md:text-right fade-in-up" style={{ "--d": "650ms" }}>
          Free trial · No credit card required · Cancel anytime
        </p>
      </div>

      {/* Full-width media */}
      <div className="wrap mt-[clamp(48px,6vw,96px)]">
        <div data-reveal="media" data-cursor="Explore" className="media-frame">
          <div data-zoom>
            <ProductShot />
          </div>
        </div>
        <p className="mt-5 text-[14px] text-ink-600">
          Leads come in from WhatsApp, Instagram DMs and your website form, or from an Excel import.
        </p>
      </div>
    </section>
  );
}
