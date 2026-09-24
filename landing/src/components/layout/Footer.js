"use client";

import React from "react";
import Link from "next/link";
import { MessageSquare, PhoneCall, Mail, MapPin } from "lucide-react";
import { getLoginUrl } from "@/lib/crmUrl";
import { waLink, DISPLAY_PHONE, SUPPORT_EMAIL, SUPPORT_HOURS } from "@/lib/contact";

export default function Footer({ crmUrl }) {
  const loginUrl = getLoginUrl(crmUrl);

  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800 pt-16 pb-12 text-xs sm:text-sm">
      <div className="max-w-[1240px] mx-auto px-5 sm:px-6 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          
          {/* Col 1: Brand & Contact Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <img src="/logo-icon.png" alt="EzzySync logo" className="h-8 w-auto object-contain" />
              <span className="font-bold tracking-tight text-lg text-white">EzzySync Travel CRM</span>
            </Link>

            <p className="text-slate-400 text-xs sm:text-[13px] leading-relaxed max-w-sm">
              A dedicated cloud CRM software built for travel agents, tour operators, and DMCs in India. Manage WhatsApp leads, day-wise itineraries, GST quotations, and milestone bookings.
            </p>

            <div className="space-y-2 text-xs text-slate-300 pt-1 font-mono">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                <span>Sales: {DISPLAY_PHONE}</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>WhatsApp: {DISPLAY_PHONE} ({SUPPORT_HOURS})</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                <span>{SUPPORT_EMAIL}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                <span>India • 100% Cloud SaaS Platform</span>
              </div>
            </div>
          </div>

          {/* Col 2: Core Modules */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider">Travel Modules</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link href="/features" className="hover:text-white transition-colors">
                  Travel Lead Management
                </Link>
              </li>
              <li>
                <Link href="/features" className="hover:text-white transition-colors">
                  WhatsApp Cloud API
                </Link>
              </li>
              <li>
                <Link href="/free-itinerary-builder" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <span>Day-Wise Itinerary Builder</span>
                  <span className="bg-brand-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded">FREE</span>
                </Link>
              </li>
              <li>
                <Link href="/features" className="hover:text-white transition-colors">
                  GST SAC 998555 Invoicing
                </Link>
              </li>
              <li>
                <Link href="/features" className="hover:text-white transition-colors">
                  Hotel &amp; Cab Vouchers
                </Link>
              </li>
              <li>
                <Link href="/features" className="hover:text-white transition-colors">
                  Razorpay Webhook Payments
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Competitor Comparisons */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider">Compare CRMs</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link href="/compare/telecrm" className="hover:text-white transition-colors">
                  EzzySync vs TeleCRM
                </Link>
              </li>
              <li>
                <Link href="/compare/zoho" className="hover:text-white transition-colors">
                  EzzySync vs Zoho CRM
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-white transition-colors">
                  Solo Agent Plan
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-white transition-colors">
                  Agency Growth Pro Plan
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-white transition-colors">
                  Enterprise DMCs
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Company & Legal */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider">Company &amp; Legal</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">About EzzySync</Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-white transition-colors">Travel Business Blog</Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">Contact Sales &amp; Support</Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:text-white transition-colors">Refund &amp; Cancellation</Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            &copy; {new Date().getFullYear()} EzzySync Technologies. All rights reserved. Built for travel agencies across India.
          </div>
          <div className="flex items-center gap-4">
            <a href={loginUrl} className="hover:text-white transition-colors">Agency Login</a>
            <span>•</span>
            <a href={waLink()} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
