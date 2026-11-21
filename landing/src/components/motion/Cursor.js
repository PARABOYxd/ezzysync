"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

/**
 * Custom cursor: a dot that grows over links and shows a label over
 * anything with data-cursor="View" (projects, media, cards). Fine pointers
 * only; on touch devices it never mounts its listeners and CSS hides it.
 */
export default function Cursor() {
  const ref = useRef(null);
  const [label, setLabel] = useState("");

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const el = ref.current;
    if (!fine || !el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dur = reduced ? 0 : 0.45;
    const xTo = gsap.quickTo(el, "x", { duration: dur, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: dur, ease: "power3.out" });

    const onMove = (e) => {
      el.classList.add("is-active");
      xTo(e.clientX);
      yTo(e.clientY);
    };
    const onOver = (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const labelled = t.closest("[data-cursor]");
      const link = t.closest("a, button, summary, [role='button'], select, label");
      const dark = t.closest("[data-theme='dark']");
      setLabel(labelled ? labelled.getAttribute("data-cursor") : "");
      el.classList.toggle("has-label", Boolean(labelled));
      el.classList.toggle("is-link", Boolean(link) && !labelled);
      el.classList.toggle("on-dark", Boolean(dark));
    };
    const onLeave = () => el.classList.remove("is-active");

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div ref={ref} className="cursor" aria-hidden="true">
      <span className="cursor-label">{label}</span>
    </div>
  );
}
