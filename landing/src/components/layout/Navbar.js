"use client";

import React, { useState } from "react";
import { PlaneTakeoff } from "lucide-react";

export default function Navbar({ crmUrl }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-slate-200/60 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white font-bold shadow-md shadow-brand-500/20">
              <PlaneTakeoff className="w-5 h-5" aria-hidden="true" focusable="false" />
            </div>
            <span className="font-display text-xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-brand-700 to-brand-500 bg-clip-text text-transparent">
              Ezzy<span className="font-medium text-slate-800">Sync</span>
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 font-medium text-slate-600">
            <a href="#features" className="hover:text-brand-600 transition-colors focus-visible:outline-none focus-visible:text-brand-600">Features</a>
            <a href="#workflow" className="hover:text-brand-600 transition-colors focus-visible:outline-none focus-visible:text-brand-600">Workflow</a>
            <a href="#preview" className="hover:text-brand-600 transition-colors focus-visible:outline-none focus-visible:text-brand-600">Preview</a>
            <a href="#pricing" className="hover:text-brand-600 transition-colors focus-visible:outline-none focus-visible:text-brand-600">Pricing</a>
            <a href="#faq" className="hover:text-brand-600 transition-colors focus-visible:outline-none focus-visible:text-brand-600">FAQ</a>
          </nav>

          {/* Navigation CTAs */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href={`${crmUrl}/login`}
              className="px-4 py-2 text-slate-700 hover:text-brand-600 font-medium transition-colors focus-visible:outline-none focus-visible:text-brand-600"
            >
              Sign In
            </a>
            <a
              href={`${crmUrl}/login`}
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium shadow-md shadow-brand-600/10 hover:shadow-lg hover:shadow-brand-600/20 transition-all transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
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
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true" focusable="false">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-6 space-y-3">
          <a
            href="#features"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50 hover:text-brand-600 focus-visible:outline-none"
          >
            Features
          </a>
          <a
            href="#workflow"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50 hover:text-brand-600 focus-visible:outline-none"
          >
            Workflow
          </a>
          <a
            href="#preview"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50 hover:text-brand-600 focus-visible:outline-none"
          >
            Preview
          </a>
          <a
            href="#pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50 hover:text-brand-600 focus-visible:outline-none"
          >
            Pricing
          </a>
          <a
            href="#faq"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50 hover:text-brand-600 focus-visible:outline-none"
          >
            FAQ
          </a>
          <hr className="border-slate-100 my-2" />
          <div className="grid grid-cols-2 gap-3 pt-2">
            <a
              href={`${crmUrl}/login`}
              className="flex justify-center items-center px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 focus-visible:outline-none"
            >
              Sign In
            </a>
            <a
              href={`${crmUrl}/login`}
              className="flex justify-center items-center px-4 py-2.5 rounded-xl bg-brand-600 text-white font-medium hover:bg-brand-700 shadow-sm focus-visible:outline-none"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
