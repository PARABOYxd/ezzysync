"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import Pill from "../ui/Pill";
import { waLink, WA_BOOK_DEMO_TEXT, DISPLAY_PHONE, SUPPORT_EMAIL, TEL_PHONE } from "@/lib/contact";
import { getLoginUrl, getTrialUrl } from "@/lib/crmUrl";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/solutions", label: "Solutions" },
  { href: "/free-itinerary-builder", label: "Itinerary builder" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact sales" },
];

const SOCIALS = [
  { href: "https://www.instagram.com/ezzysync", label: "Instagram" },
  { href: "https://www.facebook.com/share/1BtkdG3H7G/", label: "Facebook" },
];

export default function Navbar({ crmUrl }) {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const menuButton = useRef(null);
  const firstLink = useRef(null);

  // Close the menu whenever the route changes.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  // Hide on scroll down, show on scroll up.
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 12);
      setHidden(y > 160 && y > last);
      last = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Menu open: stop page scroll, focus the first link, Esc closes.
  useEffect(() => {
    if (!open) return;
    window.__lenis?.stop();
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => firstLink.current?.focus(), 350);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const button = menuButton.current;
    return () => {
      clearTimeout(t);
      window.__lenis?.start();
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      button?.focus();
    };
  }, [open]);

  const loginUrl = getLoginUrl(crmUrl);
  const trialUrl = getTrialUrl(crmUrl);
  const isCurrent = (path) => (path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(path + "/"));

  return (
    <>
      <header
        style={{ viewTransitionName: "site-header" }}
        className={`fixed top-0 inset-x-0 z-50 transition-[transform,background-color,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          hidden && !open ? "-translate-y-full" : "translate-y-0"
        } ${scrolled && !open ? "bg-paper/85 backdrop-blur-md border-b border-line" : "border-b border-transparent"}`}
      >
        <div className="wrap h-[76px] flex items-center justify-between gap-6">
          <Link href="/" aria-label="EzzySync home" className="flex items-center gap-2.5">
            <img src="/logo-icon.png" alt="" width={386} height={177} className="h-8 w-auto object-contain" />
            <span className="font-display text-[22px] tracking-[-0.04em] text-ink-900">EzzySync</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <a href={loginUrl} className="hidden md:inline-flex items-center h-11 px-3 text-[15px] text-ink-700 hover:text-ink-900">
              <span className="link-line">Sign in</span>
            </a>
            <span className="hidden sm:inline-flex">
              <Pill href={trialUrl} size="sm">Start free trial</Pill>
            </span>
            <button
              ref={menuButton}
              type="button"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              aria-controls="site-menu"
              className="group inline-flex items-center gap-3 h-11 pl-4 pr-3 rounded-full text-[15px] text-ink-900 hover:bg-ink-900/5 transition-colors"
            >
              Menu
              <span aria-hidden="true" className="flex flex-col gap-[5px] w-5">
                <span className="h-px bg-current transition-transform duration-500 group-hover:translate-x-1" />
                <span className="h-px bg-current w-3/4 ml-auto transition-[width] duration-500 group-hover:w-full" />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Full-screen menu */}
      <div
        id="site-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        data-theme="dark"
        inert={!open}
        className={`fixed inset-0 z-[60] bg-ink-900 text-paper transition-[clip-path] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? "[clip-path:inset(0_0_0_0)]" : "[clip-path:inset(0_0_100%_0)]"
        }`}
      >
        <div className="wrap h-full flex flex-col">
          <div className="h-[76px] shrink-0 flex items-center justify-between">
            <span className="font-display text-[22px] tracking-[-0.04em]">EzzySync</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-3 h-11 px-4 rounded-full text-[15px] hover:bg-white/10 transition-colors"
            >
              Close
              <span aria-hidden="true" className="relative w-4 h-4">
                <span className="absolute inset-x-0 top-1/2 h-px bg-current rotate-45" />
                <span className="absolute inset-x-0 top-1/2 h-px bg-current -rotate-45" />
              </span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto grid gap-12 lg:grid-cols-12 py-6 lg:py-10" data-lenis-prevent>
            <nav aria-label="Main" className="lg:col-span-8">
              <ul>
                {NAV_LINKS.map(({ href, label }, i) => (
                  <li key={href} className="overflow-hidden">
                    <Link
                      ref={i === 0 ? firstLink : undefined}
                      href={href}
                      onClick={() => setOpen(false)}
                      aria-current={isCurrent(href) ? "page" : undefined}
                      style={{ transitionDelay: open ? `${150 + i * 55}ms` : "0ms" }}
                      className={`flex items-baseline gap-4 py-1 font-display tracking-[-0.045em] leading-[1.04] text-[clamp(36px,min(6.2vw,8.4vh),92px)] transition-[transform,color] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        open ? "translate-y-0" : "translate-y-full"
                      } ${isCurrent(href) ? "text-accent" : "text-paper hover:text-accent"}`}
                    >
                      <span className="t-label text-white/40 tabular-nums w-8 shrink-0">0{i + 1}</span>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div
              className={`lg:col-span-4 lg:pt-6 flex flex-col gap-10 pb-10 transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                open ? "opacity-100 translate-y-0 delay-500" : "opacity-0 translate-y-6"
              }`}
            >
              <div className="flex flex-col items-start gap-3">
                <Pill href={trialUrl} variant="light">Start free trial</Pill>
                <Pill href={waLink(WA_BOOK_DEMO_TEXT)} variant="ghost-light">Book a demo on WhatsApp</Pill>
              </div>
              <div className="space-y-2 text-[17px]">
                <p className="t-label text-white/50 mb-3">Get in touch</p>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="block w-fit link-line">{SUPPORT_EMAIL}</a>
                <a href={`tel:${TEL_PHONE}`} className="block w-fit link-line">{DISPLAY_PHONE}</a>
                <a href={loginUrl} className="inline-flex items-center gap-1.5 w-fit text-white/75 hover:text-paper">
                  <span className="link-line">Agency sign in</span>
                  <ArrowUpRight className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
                </a>
              </div>
              <ul className="flex gap-6 text-[15px] text-white/75">
                {SOCIALS.map((s) => (
                  <li key={s.href}>
                    <a href={s.href} target="_blank" rel="noopener noreferrer" className="link-line hover:text-paper">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer for the fixed header */}
      <div aria-hidden="true" className="h-[76px]" />
    </>
  );
}
