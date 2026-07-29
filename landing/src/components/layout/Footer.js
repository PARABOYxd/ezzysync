"use client";
import React from "react";
import { PlaneTakeoff } from "lucide-react";

export default function Footer({ crmUrl }) {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-6 border-b border-slate-800 pb-8 mb-8">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-slate-950 font-bold">
              <PlaneTakeoff className="w-4 h-4 text-white" aria-hidden="true" focusable="false" />
            </div>
            <span className="font-display text-lg font-extrabold tracking-tight text-white">
              Ezzy<span className="text-brand-400 font-medium">Sync</span>
            </span>
          </div>
          
          <p className="text-xs text-slate-500 text-center sm:text-right">
            &copy; {new Date().getFullYear()} EzzySync CRM. All rights reserved. Built for modern travel agencies.
          </p>
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-4 text-xs font-medium justify-center sm:justify-start">
          <a href="#features" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:text-white">Features</a>
          <a href="#problem" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:text-white">Why Us</a>
          <a href="#preview" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:text-white">Preview</a>
          <a href="#faq" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:text-white">FAQ</a>
          <a href="#demo" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:text-white">Contact</a>
          <a href={`${crmUrl}/login`} className="hover:text-white transition-colors focus-visible:outline-none focus-visible:text-white">Sign In</a>
        </div>
      </div>
    </footer>
  );
}
