"use client";
import React from "react";
import Link from "next/link";
import { PlaneTakeoff } from "lucide-react";

export default function Footer({ crmUrl }) {
  return (
    <footer className="bg-white border-t border-slate-200 py-16 sm:py-24">
      <div className="max-w-[1100px] mx-auto px-5 sm:px-6 flex flex-col items-center gap-8 text-center">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-lg">
          <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center text-white">
            <PlaneTakeoff className="w-3.5 h-3.5" aria-hidden="true" focusable="false" />
          </div>
          <span className="font-semibold tracking-tight text-[15px] text-slate-900">EzzySync</span>
        </Link>

        {/* One row of links */}
        <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-500">
          <Link href="/features" className="hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:text-slate-900">Features</Link>
          <Link href="/pricing" className="hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:text-slate-900">Pricing</Link>
          <Link href="/about" className="hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:text-slate-900">About</Link>
          <Link href="/contact" className="hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:text-slate-900">Contact</Link>
          <a href={`${crmUrl}/login`} className="hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:text-slate-900">Sign in</a>
        </nav>

        <p className="text-xs text-slate-400">
          &copy; {new Date().getFullYear()} EzzySync CRM. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
