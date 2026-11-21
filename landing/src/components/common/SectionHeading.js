import React from "react";

/**
 * Editorial section intro: small "(01) Label" index, a very large headline
 * whose lines slide up on scroll (data-split), and a narrow intro column
 * that sits low on the right.
 *
 *   <SectionHeading index="02" label="How it works" title="..." intro="..." />
 *
 * `tone="dark"` for sections on ink. `code` is accepted and ignored (older callers).
 */
export default function SectionHeading({ index, label, title, intro, tone = "light", id, code }) {
  const dark = tone === "dark";
  return (
    <div className="grid-12 gap-y-8">
      <p className={`col-span-12 lg:col-span-3 t-label pt-3 ${dark ? "text-white/50" : "text-ink-600"}`}>
        {index && <span className="tabular-nums mr-3">({index})</span>}
        {label}
      </p>
      <h2
        id={id}
        data-split
        className={`col-span-12 lg:col-span-9 t-h2 text-balance ${dark ? "text-paper" : "text-ink-900"}`}
      >
        {title}
      </h2>
      {intro && (
        <p
          data-reveal="fade"
          className={`col-span-12 md:col-start-5 md:col-span-6 lg:col-start-7 lg:col-span-5 t-lead ${
            dark ? "text-white/65" : "text-ink-600"
          }`}
        >
          {intro}
        </p>
      )}
    </div>
  );
}
