"use client";

import React, { useEffect, useRef, useState } from "react";

const navLinks = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Features",     href: "#features"     },
  { label: "Compare",      href: "#compare"      },
  { label: "Pricing",      href: "#pricing"      },
  { label: "FAQ",          href: "#faq"          },
];

export default function SectionNav() {
  const [visible, setVisible] = useState(false);
  const [activeId, setActiveId] = useState("");

  // Show after user scrolls past the hero (~400px)
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Highlight the section currently in view
  useEffect(() => {
    const ids = navLinks.map((l) => l.href.slice(1));
    const observers = ids.map((id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveId(id);
        },
        { threshold: 0.25, rootMargin: "-80px 0px -40% 0px" }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach((o) => o?.disconnect());
  }, []);

  const handleClick = (e, href) => {
    e.preventDefault();
    const id = href.slice(1);
    const el = document.getElementById(id);
    if (!el) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  return (
    <div
      aria-label="Page sections"
      className={`sticky top-16 z-40 bg-white/95 backdrop-blur border-b border-slate-200 transition-all duration-300 overflow-x-hidden ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-2 pointer-events-none"
      }`}
    >
      <nav className="max-w-[1240px] mx-auto px-5 sm:px-6">
        <ul className="flex items-center gap-0.5 overflow-x-auto scrollbar-none snap-x snap-mandatory">
          {navLinks.map(({ label, href }) => {
            const id = href.slice(1);
            const isActive = activeId === id;
            return (
              <li key={href} className="snap-start shrink-0">
                <a
                  href={href}
                  onClick={(e) => handleClick(e, href)}
                  className={`block px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    isActive
                      ? "text-brand-600 font-semibold border-brand-500"
                      : "text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300"
                  }`}
                >
                  {label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
