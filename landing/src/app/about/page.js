import React from "react";
import Link from "next/link";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import FAQ from "../../components/sections/FAQ";
import { faqData } from "../../data/landingData";
import { getCrmUrl } from "@/lib/crmUrl";
import { TEL_PHONE, DISPLAY_PHONE, SUPPORT_EMAIL, waLink, WA_ABOUT_INQUIRY_TEXT, WA_WALKTHROUGH_TEXT } from "@/lib/contact";
import {
  Compass,
  ShieldCheck,
  Users,
  CheckCircle2,
  MessageSquare,
  ArrowRight,
  Lock,
  Building2,
  Globe2,
  Check,
  FileCheck,
  Kanban,
} from "lucide-react";

export const metadata = {
  title: "About EzzySync — The Travel CRM Built for Indian Tour Operators & Agencies",
  description: "Learn about EzzySync's mission: replacing spreadsheets, manual WhatsApp chaos, and generic sales software with a dedicated travel operating system built for Indian tourism.",
  alternates: {
    canonical: "/about",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "About EzzySync — The Travel CRM Built for Indian Tour Operators & Agencies",
    description: "Learn about EzzySync's mission: replacing spreadsheets, manual WhatsApp chaos, and generic sales software with a dedicated travel operating system built for Indian tourism.",
    url: "https://www.ezzysync.com/about",
    siteName: "EzzySync",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About EzzySync — The Travel CRM Built for Indian Tour Operators & Agencies",
    description: "Learn about EzzySync's mission: replacing spreadsheets, manual WhatsApp chaos, and generic sales software with a dedicated travel operating system built for Indian tourism.",
  },
};

export default function AboutPage() {
  const crmUrl = getCrmUrl();
  const trialUrl = crmUrl ? `${crmUrl}/login` : "/pricing";
  const generalFaqs = faqData.filter((item) => item.category === "general" || item.category === "feature");

  const pageJsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.ezzysync.com/" },
        { "@type": "ListItem", "position": 2, "name": "About", "item": "https://www.ezzysync.com/about" }
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "EzzySync Travel CRM",
      "url": "https://www.ezzysync.com",
      "logo": "https://www.ezzysync.com/logo.png",
      "description": "Dedicated Travel CRM with Meta WhatsApp Business Automation & SAC 998555 Invoicing for Tour Operators.",
      "telephone": TEL_PHONE,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "New Delhi",
        "addressCountry": "IN"
      }
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-brand-500 selection:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }}
      />
      <Navbar crmUrl={crmUrl} />
      
      <main>
        {/* ========================================================================= */}
        {/* 1. HERO SECTION: MISSION & VISION */}
        {/* ========================================================================= */}
        <section className="relative pt-12 pb-12 sm:pt-16 sm:pb-16 bg-[#fafbfc] border-b border-slate-200">
          <div className="max-w-[1240px] mx-auto px-5 sm:px-6">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              
              <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-600 block">
                Our Mission &amp; Purpose
              </span>

              <h1 className="font-bold text-slate-950 text-2xl sm:text-4xl lg:text-[2.5rem] leading-[1.2] tracking-tight">
                Building the Operating System for Modern Indian Tourism
              </h1>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl mx-auto">
                EzzySync was founded on a simple observation: travel agencies across India were running multi-crore businesses on scattered personal WhatsApp chats, fragile Excel sheets, and generic CRMs built for software sales. We set out to change that.
              </p>

              <div className="flex flex-col sm:flex-row justify-center items-center gap-3.5 pt-3">
                <a
                  href={trialUrl}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <span>Start Free Evaluation</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </a>
                <a
                  href={waLink(WA_ABOUT_INQUIRY_TEXT)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>WhatsApp Leadership Team</span>
                </a>
              </div>

            </div>

            {/* Core Stats Banner */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-12 pt-8 border-t border-slate-200/80">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center space-y-1 shadow-2xs">
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-950">100%</div>
                <div className="text-xs font-semibold text-slate-700">Dedicated to Travel</div>
                <p className="text-[11px] text-slate-500">Zero generic CRM filler</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center space-y-1 shadow-2xs">
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-950">SAC 998555</div>
                <div className="text-xs font-semibold text-slate-700">Indian GST Compliant</div>
                <p className="text-[11px] text-slate-500">Built-in tour taxation rules</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center space-y-1 shadow-2xs">
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-950">Meta Cloud</div>
                <div className="text-xs font-semibold text-slate-700">Official Graph API</div>
                <p className="text-[11px] text-slate-500">Zero unofficial QR bans</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center space-y-1 shadow-2xs">
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-950">Encrypted</div>
                <div className="text-xs font-semibold text-slate-700">Tenant Data Isolation</div>
                <p className="text-[11px] text-slate-500">Anti-theft contact masking</p>
              </div>
            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. THE PROBLEM WE SOLVED: WHY GENERIC CRMS FAILED TRAVEL */}
        {/* ========================================================================= */}
        <section className="py-20 sm:py-28 bg-white border-b border-slate-200">
          <div className="max-w-[1140px] mx-auto px-5 sm:px-6 space-y-12">
            
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 block">
                The Travel CRM Dilemma
              </span>
              <h2 className="font-extrabold text-3xl sm:text-4xl text-slate-950 tracking-tight">
                Why Generic Sales Software Never Worked for Travel Agencies
              </h2>
              <p className="text-slate-600 text-base leading-relaxed">
                Most CRM tools like Zoho, HubSpot, or Salesforce were designed for real estate or software companies selling single-item contracts. But tourism sales have fundamentally different requirements:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-slate-50 p-6 sm:p-7 rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold text-sm">
                  01
                </div>
                <h3 className="font-bold text-base text-slate-900">Itineraries &amp; Meal Plans</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Generic CRMs do not understand day-wise tour schedules, hotel room categories (Deluxe vs Pool Villa), or meal plans (CP, MAP, AP). Travel agents are forced to leave the CRM to build quotes manually in Canva or Word.
                </p>
              </div>

              <div className="bg-slate-50 p-6 sm:p-7 rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                  02
                </div>
                <h3 className="font-bold text-base text-slate-900">Hotel Vouchers &amp; Driver Duty Slips</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  When a deal closes in generic software, the CRM journey stops. But in travel, that is when operational fulfillment begins: generating driver cab duty slips, booking codes, and hotel vouchers for guests.
                </p>
              </div>

              <div className="bg-slate-50 p-6 sm:p-7 rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                  03
                </div>
                <h3 className="font-bold text-base text-slate-900">Multi-Stage Travel Deposits</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Travel bookings are never paid in a single lump sum. They require structured milestones (30% booking advance, 50% hotel confirmation installment, 20% departure balance) with Razorpay UPI reconciliation.
                </p>
              </div>

            </div>

            <div className="bg-[#fafbfc] rounded-2xl p-6 sm:p-8 border border-slate-200 text-center max-w-3xl mx-auto space-y-2">
              <span className="font-bold text-slate-900 text-base block">
                EzzySync bridges the entire lifecycle into one continuous system.
              </span>
              <p className="text-xs sm:text-sm text-slate-600">
                Inbound Lead Capture → Day-Wise Itinerary → Official WhatsApp Chat → SAC 998555 Quotation → Hotel Voucher &amp; Duty Slip → Milestone Reconciliation.
              </p>
            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. OUR FOUR PRODUCT PILLARS */}
        {/* ========================================================================= */}
        <section className="py-20 sm:py-28 bg-slate-50 border-b border-slate-200">
          <div className="max-w-[1140px] mx-auto px-5 sm:px-6 space-y-12">
            
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 block">
                Engineering Philosophy
              </span>
              <h2 className="font-extrabold text-3xl sm:text-4xl text-slate-950 tracking-tight">
                How We Build EzzySync
              </h2>
              <p className="text-slate-600 text-base leading-relaxed">
                Four guiding principles shape every feature, interface screen, and integration we release.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
              
              <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-xs">
                  01
                </div>
                <h3 className="font-bold text-base text-slate-900">Zero Duplicate Data Entry</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Information entered once during lead intake flows automatically to day-wise itineraries, GST invoices, and driver duty slips without ever re-typing passenger details.
                </p>
              </div>

              <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                  02
                </div>
                <h3 className="font-bold text-base text-slate-900">Official Meta WhatsApp Integrity</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  We integrate exclusively with Meta&apos;s verified Cloud API. We never use unofficial browser scraping tools or unauthorized bots that jeopardize your agency&apos;s phone number.
                </p>
              </div>

              <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                  03
                </div>
                <h3 className="font-bold text-base text-slate-900">Agency Data Sovereignty &amp; Anti-Theft</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Your traveler database is your business equity. Role-based permissions and masked phone numbers guarantee that sales coordinators cannot export or steal client records.
                </p>
              </div>

              <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs">
                  04
                </div>
                <h3 className="font-bold text-base text-slate-900">Native Indian Commercial Standards</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Engineered specifically for Indian tourism commerce: SAC 998555 tax invoices, INR currency formatting (Lakhs/Crores), Razorpay UPI webhooks, and Indian vehicle categories.
                </p>
              </div>

            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. WHO WE SERVE: AGENCY PERSONAS */}
        {/* ========================================================================= */}
        <section className="py-20 sm:py-28 bg-white border-b border-slate-200">
          <div className="max-w-[1140px] mx-auto px-5 sm:px-6 space-y-12">
            
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 block">
                Tailored Solutions
              </span>
              <h2 className="font-extrabold text-3xl sm:text-4xl text-slate-950 tracking-tight">
                Built for Every Stage of Travel Business Growth
              </h2>
              <p className="text-slate-600 text-base leading-relaxed">
                Whether you are an independent travel designer or an established tour operator with branch offices, EzzySync scales with your operational volume.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Persona 1 */}
              <div className="bg-slate-50 p-7 rounded-2xl border border-slate-200 space-y-4 shadow-2xs flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-brand-600">
                    <Compass className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-900">Solo Travel Designers</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Independent travel planners who handle everything personally and want professional day-wise itineraries, instant WhatsApp delivery, and automated payment tracking without hiring assistants.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-700 pt-2 border-t border-slate-200/80">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-brand-600" />
                      <span>1-Click Day-Wise Itineraries</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-brand-600" />
                      <span>Branded PDF Quotations</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-brand-600" />
                      <span>Automated Follow-up Alerts</span>
                    </li>
                  </ul>
                </div>
                <div className="text-xs font-mono font-semibold text-brand-600 pt-3 border-t border-slate-200">
                  Recommended: Solo Agent Plan (₹999/mo)
                </div>
              </div>

              {/* Persona 2 */}
              <div className="bg-white p-7 rounded-2xl border-2 border-brand-500 shadow-sm space-y-4 flex flex-col justify-between relative">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-900">Boutique Agencies (3–15 Staff)</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Growing tour operators with dedicated sales coordinators who need one shared WhatsApp business number, round-robin lead assignment, and managerial profit oversight.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-700 pt-2 border-t border-slate-200/80">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-brand-600" />
                      <span>Multi-Agent WhatsApp Team Inbox</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-brand-600" />
                      <span>Gross Margin Safeguards</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-brand-600" />
                      <span>Anti-Theft Lead Protection</span>
                    </li>
                  </ul>
                </div>
                <div className="text-xs font-mono font-semibold text-brand-600 pt-3 border-t border-slate-200">
                  Recommended: Agency Growth Plan (₹2,499/mo)
                </div>
              </div>

              {/* Persona 3 */}
              <div className="bg-slate-50 p-7 rounded-2xl border border-slate-200 space-y-4 shadow-2xs flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-brand-600">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-900">DMCs &amp; Multi-Branch Tour Operators</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    High-volume destination management companies handling hundreds of passengers monthly requiring supplier reconciliation, fleet duty slips, and multi-branch coordination.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-700 pt-2 border-t border-slate-200/80">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-brand-600" />
                      <span>Driver Duty Slips &amp; Vouchers</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-brand-600" />
                      <span>Supplier Cost Reconciliation</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-brand-600" />
                      <span>Multi-Milestone Razorpay Sync</span>
                    </li>
                  </ul>
                </div>
                <div className="text-xs font-mono font-semibold text-brand-600 pt-3 border-t border-slate-200">
                  Custom Fleet &amp; Multi-Branch Deployments
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* 5. DATA PRIVACY & BANK-GRADE SECURITY */}
        {/* ========================================================================= */}
        <section className="py-20 sm:py-28 bg-slate-50 border-b border-slate-200">
          <div className="max-w-[1140px] mx-auto px-5 sm:px-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-xs space-y-8">
              
              <div className="text-center max-w-2xl mx-auto space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 block">
                  Enterprise Security Commitment
                </span>
                <h2 className="font-extrabold text-2xl sm:text-3xl text-slate-950 tracking-tight">
                  Your Client Database is Completely Private &amp; Protected
                </h2>
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                  We know that your traveler contacts, supplier net rates, and pricing margins are your most confidential assets.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Strict Tenant Isolation</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Database-level isolation ensures no agency can ever query or view another agency&apos;s client records, booking files, or financial receipts.
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                    <Lock className="w-4 h-4 text-emerald-600" />
                    <span>Phone Masking &amp; Anti-Theft</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Sales coordinators communicate through the official system without having the ability to download or mass-export raw client phone numbers.
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>99.9% Cloud Availability</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Hosted on Tier-4 data center infrastructure with automated daily backups, encrypted transit (TLS 1.3), and zero local server setup needed.
                  </p>
                </div>

              </div>

            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 6. OFFICE & DIRECT SUPPORT */}
        {/* ========================================================================= */}
        <section className="py-16 sm:py-20 bg-white border-b border-slate-200">
          <div className="max-w-[1140px] mx-auto px-5 sm:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center max-w-4xl mx-auto">
              
              <div className="space-y-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 block">
                  Support &amp; Operations
                </span>
                <h3 className="font-extrabold text-2xl text-slate-950">
                  Direct WhatsApp &amp; Phone Support from New Delhi
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  We don&apos;t hide behind automated email ticketing queues. Every EzzySync subscriber has access to direct phone and WhatsApp support during business hours to assist with Meta API setup, invoice templates, and team onboarding.
                </p>
                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">Headquarters:</span> New Delhi, India
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">Official WhatsApp:</span> {DISPLAY_PHONE}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">Email:</span> {SUPPORT_EMAIL}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-6 sm:p-8 rounded-2xl border border-slate-200 space-y-4 text-center sm:text-left">
                <h4 className="font-bold text-slate-900 text-base">Want a Guided Walkthrough?</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Schedule a 15-minute live screen share with our travel automation consultant to see how EzzySync maps to your specific destinations and team structure.
                </p>
                <a
                  href={waLink(WA_WALKTHROUGH_TEXT)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Chat on Official WhatsApp</span>
                </a>
              </div>

            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 7. FREQUENTLY ASKED QUESTIONS */}
        {/* ========================================================================= */}
        <FAQ items={generalFaqs} heading="Common Questions About EzzySync" />
      </main>

      <Footer crmUrl={crmUrl} />
    </div>
  );
}
