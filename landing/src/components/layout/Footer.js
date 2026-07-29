"use client";
import React from "react";
import Link from "next/link";
import { PlaneTakeoff } from "lucide-react";

export default function Footer({ crmUrl }) {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-6 border-b border-slate-800 pb-8 mb-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 rounded-lg">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-slate-950 font-bold">
              <PlaneTakeoff className="w-4 h-4 text-white" aria-hidden="true" focusable="false" />
            </div>
            <span className="font-display text-lg font-extrabold tracking-tight text-white">
              Ezzy<span className="text-brand-400 font-medium">Sync</span>
            </span>
          </Link>

          <p className="text-xs text-slate-500 text-center sm:text-right">
            &copy; {new Date().getFullYear()} EzzySync CRM. All rights reserved. Built for modern travel agencies.
          </p>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-4 text-xs font-medium justify-center sm:justify-start">
          <Link href="/features" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:text-white">Features</Link>
          <Link href="/features#why-ezzysync" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:text-white">EzzySync vs Spreadsheets</Link>
          <Link href="/pricing" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:text-white">Pricing</Link>
          <Link href="/about" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:text-white">About</Link>
          <Link href="/contact" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:text-white">Contact</Link>
          <a href={`${crmUrl}/login`} className="hover:text-white transition-colors focus-visible:outline-none focus-visible:text-white">Sign In</a>
        </nav>
      </div>
    </footer>
  );
}
