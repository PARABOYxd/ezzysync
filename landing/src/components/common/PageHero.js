import React from "react";

/**
 * Inner-page hero: a quiet "(code) label" line, one very large headline whose
 * words rise out of a mask (CSS only, so it paints immediately), a short
 * intro, actions, and an optional right-hand aside. Ends on a hairline.
 *
 *   <PageHero code="Fares" label="Pricing" title="..." intro="..." facts={[...]}
 *             actions={<>buttons</>} aside={<optional />} />
 */
function MaskedWords({ text }) {
  if (typeof text !== "string") return text;
  return text.split(" ").map((w, i) => (
    <React.Fragment key={i}>
      <span className="word-mask" aria-hidden="true">
        <span style={{ "--i": i }}>{w}</span>
      </span>{" "}
    </React.Fragment>
  ));
}

export default function PageHero({ code, label, title, intro, facts, actions, aside, edge }) {
  return (
    <section className="pt-[clamp(40px,7vw,112px)] pb-[clamp(56px,7vw,112px)] border-b border-line">
      <div className="wrap">
        <p className="t-label text-ink-600 fade-in-up">
          {code && <span className="mr-3">({code})</span>}
          {label}
        </p>
        <div className={aside ? "grid-12 gap-y-12 items-end" : ""}>
          <div className={aside ? "col-span-12 lg:col-span-7" : ""}>
            <h1
              className="t-h1 mt-8 text-ink-900 max-w-[18ch] text-balance"
              {...(typeof title === "string" && { "aria-label": title })}
            >
              <MaskedWords text={title} />
            </h1>
            {intro && (
              <p className="mt-10 t-lead text-ink-600 max-w-2xl fade-in-up" style={{ "--d": "400ms" }}>
                {intro}
              </p>
            )}
            {actions && (
              <div className="mt-10 flex flex-wrap items-center gap-3 fade-in-up" style={{ "--d": "500ms" }}>
                {actions}
              </div>
            )}
            {facts?.length > 0 && (
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-ink-600 fade-in-up" style={{ "--d": "600ms" }}>
                {facts.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            )}
          </div>
          {aside && <div className="col-span-12 lg:col-start-9 lg:col-span-4 fade-in-up" style={{ "--d": "500ms" }}>{aside}</div>}
        </div>
      </div>
    </section>
  );
}

/** Shared hero buttons: the site's pill, so every page's CTAs match the homepage. */
export const heroPrimaryClass = "btn-pill";
export const heroSecondaryClass = "btn-pill btn-ghost";
