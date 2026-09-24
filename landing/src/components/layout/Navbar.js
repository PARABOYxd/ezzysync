"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, ArrowRight } from "lucide-react";
import { waLink, WA_BOOK_DEMO_TEXT } from "@/lib/contact";
import { getLoginUrl, getTrialUrl } from "@/lib/crmUrl";

export default function Navbar({ crmUrl }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const getLinkClass = (path) => {
    const isActive = pathname === path;
    return isActive
      ? "text-brand-600 font-semibold focus-visible:outline-none"
      : "hover:text-slate-950 transition-colors focus-visible:outline-none focus-visible:text-slate-950";
  };

  const loginUrl = getLoginUrl(crmUrl);
  const trialUrl = getTrialUrl(crmUrl);

  return (
    <header
      className={`sticky top-0 z-50 h-16 flex items-center transition-all duration-300 ${
        scrolled
          ? "backdrop-blur-md bg-white/95 border-b border-slate-200/90 shadow-2xs"
          : "bg-white border-b border-slate-200/60"
      }`}
    >
      <div className="max-w-[1240px] w-full mx-auto px-5 sm:px-6">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-lg group"
          >
            <img
              src="/logo-icon.png"
              alt="EzzySync"
              className="h-9 sm:h-10 w-auto object-contain"
            />
            <span className="font-extrabold tracking-tight text-[19px] text-[#091f44] leading-tight">
              Ezzy<span className="text-[#ed5528]">Sync</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav
            aria-label="Main"
            className="hidden lg:flex items-center gap-7 text-[14px] font-medium text-slate-600"
          >
            <Link href="/features" className={getLinkClass("/features")}>
              Features
            </Link>
            <Link href="/solutions" className={getLinkClass("/solutions")}>
              Solutions
            </Link>
            <Link href="/free-itinerary-builder" className={getLinkClass("/free-itinerary-builder")}>
              Itinerary Builder
            </Link>
            <Link href="/pricing" className={getLinkClass("/pricing")}>
              Pricing
            </Link>
            <Link href="/about" className={getLinkClass("/about")}>
              About
            </Link>
            <Link href="/blog" className={getLinkClass("/blog")}>
              Blog
            </Link>
            <Link href="/contact" className={getLinkClass("/contact")}>
              Contact Sales
            </Link>
          </nav>

          {/* Navigation CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            <a
              href={loginUrl}
              className="text-[14px] font-medium text-slate-700 hover:text-slate-950 px-3 py-2 rounded-lg transition-colors"
            >
              Sign In
            </a>
            <a
              href={waLink(WA_BOOK_DEMO_TEXT)}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>Book Demo</span>
            </a>
            <a
              href={trialUrl}
              className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-semibold transition-all shadow-xs flex items-center gap-1.5"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              className="p-2 -mr-2 rounded-lg text-slate-700 hover:text-slate-950 hover:bg-slate-100 focus:outline-none"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-16 inset-x-0 border-b border-slate-200 bg-white px-5 pt-3 pb-6 space-y-2 shadow-lg">
          <Link
            href="/features"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Features
          </Link>
          <Link
            href="/solutions"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Solutions
          </Link>
          <Link
            href="/free-itinerary-builder"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Itinerary Builder
          </Link>
          <Link
            href="/pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Pricing
          </Link>
          <Link
            href="/about"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            About Us
          </Link>
          <Link
            href="/blog"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Blog
          </Link>
          <Link
            href="/contact"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Contact Sales
          </Link>

          <div className="grid grid-cols-2 gap-3 pt-3 mt-2 border-t border-slate-100">
            <a
              href={loginUrl}
              className="flex justify-center items-center h-10 rounded-lg border border-slate-300 text-slate-700 font-medium text-xs hover:bg-slate-50"
            >
              Sign In
            </a>
            <a
              href={trialUrl}
              className="flex justify-center items-center h-10 rounded-lg bg-brand-600 text-white font-medium text-xs hover:bg-brand-700"
            >
              Start Free Trial
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
