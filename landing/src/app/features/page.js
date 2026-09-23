import React from "react";
import Link from "next/link";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import FeaturesDeepDive from "../../components/sections/FeaturesDeepDive";
import WhyEzzySync from "../../components/sections/WhyEzzySync";
import FAQ from "../../components/sections/FAQ";
import { faqData } from "../../data/landingData";
import { getCrmUrl } from "@/lib/crmUrl";
import {
  ArrowRight,
  MessageSquare,
  CheckCircle2,
  Kanban,
  Compass,
  FileCheck,
  Car,
  CreditCard,
  ShieldCheck,
} from "lucide-react";

export const metadata = {
  title: "Travel CRM Features — Lead Management, Itineraries & Invoicing | EzzySync",
  description: "See every EzzySync feature: lead pipeline tracking, day-wise itinerary builder, automated WhatsApp alerts, SAC 998555 PDF invoicing, and multi-tenant data isolation for travel agencies.",
  alternates: {
    canonical: "/features",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Travel CRM Features — Lead Management, Itineraries & Invoicing | EzzySync",
    description: "See every EzzySync feature: lead pipeline tracking, day-wise itinerary builder, automated WhatsApp alerts, SAC 998555 PDF invoicing, and multi-tenant data isolation for travel agencies.",
    url: "https://www.ezzysync.com/features",
    siteName: "EzzySync",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Travel CRM Features — Lead Management, Itineraries & Invoicing | EzzySync",
    description: "See every EzzySync feature: lead pipeline tracking, day-wise itinerary builder, automated WhatsApp alerts, SAC 998555 PDF invoicing, and multi-tenant data isolation for travel agencies.",
  },
};

export default function FeaturesPage() {
  const crmUrl = getCrmUrl();
  const trialUrl = crmUrl ? `${crmUrl}/login` : "/pricing";
  const featureFaqs = faqData.filter((item) => item.category === "feature");

  const pageJsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.ezzysync.com/" },
        { "@type": "ListItem", "position": 2, "name": "Features", "item": "https://www.ezzysync.com/features" }
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": featureFaqs.map((item) => ({
        "@type": "Question",
        "name": item.q,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": item.a
        }
      }))
    }
  ];

  const quickNav = [
    { name: "Inquiry Pipeline", href: "#pipeline", icon: Kanban },
    { name: "WhatsApp Team Inbox", href: "#whatsapp", icon: MessageSquare },
    { name: "Itinerary Builder", href: "#itinerary", icon: Compass },
    { name: "GST Invoicing", href: "#quotations", icon: FileCheck },
    { name: "Tour Operations", href: "#operations", icon: Car },
    { name: "Milestone Payments", href: "#payments", icon: CreditCard },
    { name: "Agency Security", href: "#security", icon: ShieldCheck },
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
        {/* HERO SECTION */}
        {/* ========================================================================= */}
        <section className="relative pt-12 pb-12 sm:pt-16 sm:pb-16 bg-[#fafbfc] border-b border-slate-200">
          <div className="max-w-[1240px] mx-auto px-5 sm:px-6">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              
              {/* Eyebrow */}
              <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-600 block">
                Complete Travel CRM Capability Suite
              </span>

              {/* Title */}
              <h1 className="font-bold text-slate-950 text-2xl sm:text-4xl lg:text-[2.5rem] leading-[1.2] tracking-tight">
                The Complete Travel Operating System <br className="hidden sm:inline" />
                Built for Daily Agency Operations
              </h1>

              {/* Subheadline */}
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl mx-auto">
                From initial WhatsApp inquiry to final driver duty slip and payment reconciliation — explore every purpose-built module engineered for tour operators and travel agencies.
              </p>

              {/* Action CTAs */}
              <div className="flex flex-col sm:flex-row justify-center items-center gap-3.5 pt-2">
                <a
                  href={trialUrl}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-[15px] shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <span>Start Free Evaluation</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </a>
                <a
                  href="https://wa.me/918826610820?text=Hi%20EzzySync,%20I%20want%20a%20guided%20walkthrough%20of%20all%20features"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-[15px] shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>Schedule 1-on-1 Walkthrough</span>
                </a>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-1 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> No credit card required
                </span>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Setup in 5 minutes
                </span>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Official Meta Cloud API
                </span>
              </div>

            </div>

            {/* Quick Sticky In-Page Navigation Bar */}
            <div className="mt-12 pt-6 border-t border-slate-200/80">
              <div className="flex items-center justify-start lg:justify-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {quickNav.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <a
                      key={idx}
                      href={item.href}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold whitespace-nowrap transition-colors shadow-2xs"
                    >
                      <Icon className="w-3.5 h-3.5 text-brand-600" />
                      <span>{item.name}</span>
                    </a>
                  );
                })}
              </div>
            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* 7 DEEP-DIVE FEATURE MODULES (Alternating White & Slate-50) */}
        {/* ========================================================================= */}
        <FeaturesDeepDive crmUrl={crmUrl} />

        {/* ========================================================================= */}
        {/* COMPARISON MATRIX (EzzySync vs Spreadsheets vs Generic CRM) */}
        {/* ========================================================================= */}
        <WhyEzzySync />

        {/* ========================================================================= */}
        {/* BOTTOM COMMERCIAL CTA BANNER */}
        {/* ========================================================================= */}
        <section className="py-16 sm:py-24 bg-white border-b border-slate-200">
          <div className="max-w-[1100px] mx-auto px-5 sm:px-6">
            <div className="bg-slate-900 rounded-3xl p-8 sm:p-14 text-white text-center space-y-6 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-400 block">
                Upgrade Your Daily Agency Operations
              </span>
              <h2 className="font-extrabold text-2xl sm:text-4xl lg:text-[2.6rem] tracking-tight text-white max-w-2xl mx-auto">
                Ready to Run Your Travel Business with Modern Systems?
              </h2>
              <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
                Join travel agencies across India who have eliminated missed inquiries, delayed quotations, and manual spreadsheet chaos.
              </p>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-3">
                <a
                  href={trialUrl}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all shadow-sm"
                >
                  Start Free Evaluation
                </a>
                <a
                  href="https://wa.me/918826610820?text=Hi%20EzzySync,%20I%20want%20to%20see%20a%20live%20demo%20of%20EzzySync"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-semibold text-sm transition-all flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>WhatsApp Consultant</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* FAQ SECTION (SEO Schema Enabled) */}
        {/* ========================================================================= */}
        <FAQ items={featureFaqs} heading="Frequently Asked Feature Questions" />
      </main>

      <Footer crmUrl={crmUrl} />
    </div>
  );
}
