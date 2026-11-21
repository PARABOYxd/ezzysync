"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";

/*
 * Site-wide motion. Everything is declared in markup with data attributes,
 * so server components stay server components:
 *
 *   data-split            heading lines slide up out of a mask (SplitText)
 *   data-reveal="media"   clip-path opens from inset, inner [data-zoom] scales down
 *   data-reveal="fade"    fades/lifts in once
 *   data-stagger          direct children fade/lift in one after another
 *   data-parallax="-12"   moves by that many % of its height while scrolling
 *
 * Nothing is hidden before this runs, so the page is complete without JS,
 * and none of it runs when the visitor prefers reduced motion.
 */

let lenis = null;

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);
  CustomEase.create("studio", "0.22, 1, 0.36, 1");
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function setupReveals(root) {
  const start = "top 86%";

  gsap.utils.toArray("[data-split]", root).forEach((el) => {
    SplitText.create(el, {
      type: "lines",
      mask: "lines",
      linesClass: "split-line",
      autoSplit: true,
      onSplit(self) {
        return gsap.from(self.lines, {
          yPercent: 110,
          duration: 0.9,
          ease: "studio",
          stagger: 0.08,
          scrollTrigger: { trigger: el, start, once: true },
        });
      },
    });
  });

  gsap.utils.toArray('[data-reveal="media"]', root).forEach((el) => {
    gsap.fromTo(
      el,
      { clipPath: "inset(10% 8% 10% 8% round 16px)" },
      {
        clipPath: "inset(0% 0% 0% 0% round 16px)",
        duration: 1.2,
        ease: "studio",
        scrollTrigger: { trigger: el, start: "top 90%", once: true },
      }
    );
    const zoom = el.querySelector("[data-zoom]");
    if (zoom) {
      gsap.fromTo(zoom, { scale: 1.12 }, {
        scale: 1,
        duration: 1.4,
        ease: "studio",
        scrollTrigger: { trigger: el, start: "top 90%", once: true },
      });
    }
  });

  gsap.utils.toArray('[data-reveal="fade"]', root).forEach((el) => {
    gsap.from(el, {
      y: 32,
      autoAlpha: 0,
      duration: 0.8,
      ease: "studio",
      scrollTrigger: { trigger: el, start, once: true },
    });
  });

  gsap.utils.toArray("[data-stagger]", root).forEach((el) => {
    gsap.from(el.children, {
      y: 28,
      autoAlpha: 0,
      duration: 0.7,
      ease: "studio",
      stagger: 0.07,
      scrollTrigger: { trigger: el, start, once: true },
    });
  });

  gsap.utils.toArray("[data-parallax]", root).forEach((el) => {
    const amount = parseFloat(el.dataset.parallax) || -10;
    gsap.fromTo(el, { yPercent: -amount / 2 }, {
      yPercent: amount / 2,
      ease: "none",
      scrollTrigger: { trigger: el.parentElement || el, start: "top bottom", end: "bottom top", scrub: true },
    });
  });
}

export default function MotionProvider({ children }) {
  const pathname = usePathname();

  // Smooth scrolling, once for the whole session.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    lenis = new Lenis({ duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 4), anchors: true });
    window.__lenis = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      lenis = null;
      window.__lenis = null;
    };
  }, []);

  // Reveals, rebuilt for each page.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    lenis?.scrollTo(0, { immediate: true });
    const ctx = gsap.context(() => setupReveals(document.body));
    let cancelled = false;
    document.fonts?.ready.then(() => !cancelled && ScrollTrigger.refresh());
    return () => {
      cancelled = true;
      ctx.revert();
    };
  }, [pathname]);

  return children;
}
