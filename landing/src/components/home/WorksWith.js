import React from "react";

// Stands in for a client-logo strip: these are the tools EzzySync actually
// connects to, set as plain wordmarks (no third-party logos).
const TOOLS = ["WhatsApp Cloud API", "Instagram", "Razorpay", "UPI", "Excel / CSV", "Website forms"];

export default function WorksWith() {
  return (
    <section aria-labelledby="works-with" className="pt-[clamp(72px,8vw,128px)]">
      <div className="wrap grid-12 gap-y-6 items-center">
        <h2 id="works-with" className="col-span-12 lg:col-span-2 t-label !font-sans !tracking-[0.14em] text-ink-600">
          Works with
        </h2>
        <ul data-stagger className="col-span-12 lg:col-span-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border-t border-l border-line">
          {TOOLS.map((t) => (
            <li
              key={t}
              className="flex items-center justify-center text-center h-24 sm:h-28 px-3 border-r border-b border-line font-display text-[clamp(17px,1.5vw,22px)] tracking-[-0.03em] text-ink-500 hover:text-ink-900 transition-colors duration-500"
            >
              {t}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
