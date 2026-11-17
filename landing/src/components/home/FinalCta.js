import React from "react";
import Pill from "../ui/Pill";
import WhatsAppIcon from "../common/WhatsAppIcon";
import ProductShot from "./ProductShot";
import { waLink, WA_DEMO_TEXT } from "@/lib/contact";
import { getTrialUrl } from "@/lib/crmUrl";

/** Closing call to action over a dimmed, drifting product shot. */
export default function FinalCta({ crmUrl }) {
  return (
    <section data-theme="dark" className="relative isolate overflow-hidden bg-ink-900 text-paper">
      <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-[0.1] grayscale">
        <div data-parallax="-14" className="absolute inset-x-0 -top-[10%] h-[120%]">
          <div className="h-full [&>div]:!aspect-auto [&>div]:h-full">
            <ProductShot />
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-ink-900/70" />

      <div className="wrap py-[clamp(120px,16vw,240px)]">
        <p className="t-label text-white/55">Start today</p>
        <h2 data-split className="t-display mt-8 max-w-[12ch]">Have an inquiry waiting on WhatsApp?</h2>
        <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-4">
          <Pill href={getTrialUrl(crmUrl)} variant="light">Start free trial</Pill>
          <Pill
            href={waLink(WA_DEMO_TEXT)}
            variant="ghost-light"
            arrow={false}
            icon={<WhatsAppIcon className="w-4 h-4" />}
          >
            Get a demo on WhatsApp
          </Pill>
        </div>
        <p className="mt-8 text-[15px] text-white/55">Free trial · No credit card required · Cancel anytime</p>
      </div>
    </section>
  );
}
