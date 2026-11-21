"use client";

import React, { useEffect, useState } from "react";
import WhatsAppIcon from "./WhatsAppIcon";
import { waLink, WA_DEMO_TEXT } from "@/lib/contact";
import { getTrialUrl } from "@/lib/crmUrl";

/**
 * Floating WhatsApp button (md and up) and a bottom CTA bar (below md).
 * Both appear once the visitor has scrolled past the hero, where the
 * same two actions are already on screen.
 */
export default function StickyWidgets({ crmUrl }) {
  const trialUrl = getTrialUrl(crmUrl);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > 560);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const hidden = shown ? "" : "translate-y-24 opacity-0 pointer-events-none";

  return (
    <>
      <a
        href={waLink(WA_DEMO_TEXT)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with EzzySync on WhatsApp"
        tabIndex={shown ? 0 : -1}
        className={`hidden md:flex fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#25D366] hover:bg-ink-900 text-white items-center justify-center transition-[background-color,transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${hidden}`}
      >
        <WhatsAppIcon className="w-7 h-7" />
      </a>

      <div
        className={`md:hidden fixed inset-x-0 bottom-0 z-50 bg-paper/95 backdrop-blur border-t border-line px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex gap-2.5 transition-all duration-300 ${hidden}`}
        aria-hidden={!shown}
      >
        <a
          href={trialUrl}
          tabIndex={shown ? 0 : -1}
          className="flex-1 min-h-12 rounded-full bg-ink-900 text-paper font-medium text-[15px] flex items-center justify-center"
        >
          Start free trial
        </a>
        <a
          href={waLink(WA_DEMO_TEXT)}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={shown ? 0 : -1}
          className="flex-1 min-h-12 rounded-full border border-ink-900/25 text-ink-900 font-medium text-[15px] flex items-center justify-center gap-2"
        >
          <WhatsAppIcon className="w-4 h-4 text-emerald-700" /> WhatsApp demo
        </a>
      </div>
    </>
  );
}
