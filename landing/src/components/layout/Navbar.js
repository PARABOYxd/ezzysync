"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PlaneTakeoff } from "lucide-react";

export default function Navbar({ crmUrl }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 h-16 flex items-center transition-all duration-300 ${
        scrolled ? "backdrop-blur-md bg-white/75 border-b border-slate-200" : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-[1100px] w-full mx-auto px-5 sm:px-6">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-lg">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center text-white">
              <PlaneTakeoff className="w-3.5 h-3.5" aria-hidden="true" focusable="false" />
            </div>
            <span className="font-semibold tracking-tight text-[15px] text-slate-900">
              EzzySync
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav aria-label="Main" className="hidden md:flex items-center gap-8 text-[14px] font-medium text-slate-600">
            <Link href="/features" className="hover:text-slate-950 transition-colors focus-visible:outline-none focus-visible:text-slate-950">Features</Link>
            <Link href="/pricing" className="hover:text-slate-950 transition-colors focus-visible:outline-none focus-visible:text-slate-950">Pricing</Link>
            <Link href="/about" className="hover:text-slate-950 transition-colors focus-visible:outline-none focus-visible:text-slate-950">About</Link>
            <Link href="/contact" className="hover:text-slate-950 transition-colors focus-visible:outline-none focus-visible:text-slate-950">Contact</Link>
          </nav>

          {/* Navigation CTAs */}
          <div className="hidden md:flex items-center gap-5">
            <a
              href={`${crmUrl}/login`}
              className="text-[14px] font-medium text-slate-600 hover:text-slate-950 transition-colors focus-visible:outline-none focus-visible:text-slate-950"
            >
              Sign in
            </a>
            <a
              href={`${crmUrl}/login`}
              className="px-4 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 text-white text-[14px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
            >
              Go to Dashboard
            </a>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              className="p-2 -mr-2 rounded-lg text-slate-600 hover:text-slate-950 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true" focusable="false">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-16 inset-x-0 border-b border-slate-200 bg-white px-5 pt-3 pb-6 space-y-1 shadow-sm">
          <Link
            href="/features"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-3 rounded-lg text-[15px] font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none"
          >
            Features
          </Link>
          <Link
            href="/pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-3 rounded-lg text-[15px] font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none"
          >
            Pricing
          </Link>
          <Link
            href="/about"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-3 rounded-lg text-[15px] font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none"
          >
            About
          </Link>
          <Link
            href="/contact"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-3 rounded-lg text-[15px] font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none"
          >
            Contact
          </Link>
          <div className="grid grid-cols-2 gap-3 pt-3 mt-2 border-t border-slate-100">
            <a
              href={`${crmUrl}/login`}
              className="flex justify-center items-center h-11 rounded-lg border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 focus-visible:outline-none"
            >
              Sign in
            </a>
            <a
              href={`${crmUrl}/login`}
              className="flex justify-center items-center h-11 rounded-lg bg-slate-950 text-white font-medium text-sm hover:bg-slate-800 focus-visible:outline-none"
            >
              Dashboard
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
