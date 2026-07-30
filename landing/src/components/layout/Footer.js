"use client";
import React from "react";
import Link from "next/link";
import { PlaneTakeoff } from "lucide-react";

export default function Footer({ crmUrl }) {
  return (
    <footer className="bg-white border-t border-slate-200 py-16 sm:py-24">
      <div className="max-w-[1100px] mx-auto px-5 sm:px-6 flex flex-col items-center gap-8 text-center">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-lg">
          <div className="w-8.5 h-8.5 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 border border-brand-100/80 transition-colors hover:bg-brand-100/50">
            <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
              <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 2L15 21L11 13L3 9L22 2Z" fill="currentColor" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-bold tracking-tight text-[17px] text-slate-900">EzzySync</span>
        </Link>

        {/* One row of links */}
        <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-500">
          <Link href="/features" className="hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:text-slate-900">Features</Link>
          <Link href="/pricing" className="hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:text-slate-900">Pricing</Link>
          <Link href="/about" className="hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:text-slate-900">About</Link>
          <Link href="/contact" className="hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:text-slate-900">Contact</Link>
          <a href={`${crmUrl}/login`} className="hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:text-slate-900">Sign in</a>
        </nav>

        <nav aria-label="Legal" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-400">
          <Link href="/terms" className="hover:text-slate-600 transition-colors focus-visible:outline-none focus-visible:text-slate-600">Terms</Link>
          <Link href="/privacy" className="hover:text-slate-600 transition-colors focus-visible:outline-none focus-visible:text-slate-600">Privacy</Link>
          <Link href="/refund-policy" className="hover:text-slate-600 transition-colors focus-visible:outline-none focus-visible:text-slate-600">Refund Policy</Link>
        </nav>

        <p className="text-xs text-slate-400">
          &copy; {new Date().getFullYear()} EzzySync CRM. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
