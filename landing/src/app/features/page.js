import React from "react";
import PageHero, { heroPrimaryClass, heroSecondaryClass } from "@/components/common/PageHero";
import Link from "next/link";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import FeaturesDeepDive from "../../components/sections/FeaturesDeepDive";
import WhyEzzySync from "../../components/sections/WhyEzzySync";
import FAQ from "../../components/sections/FAQ";
import { faqData } from "../../data/landingData";
import { getCrmUrl, getTrialUrl } from "@/lib/crmUrl";
import { featurePages } from "@/content/seoPages";
import { waLink, WA_FEATURES_WALKTHROUGH_TEXT, WA_FEATURES_DEMO_TEXT } from "@/lib/contact";
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
import { withSeo } from "@/lib/seoOverrides";

export const metadata = withSeo("/features", {
  title: "Travel CRM Features: Leads, Itineraries, Invoices | EzzySync",
  description: "Every EzzySync feature: lead pipeline, shared WhatsApp inbox, day-wise itinerary builder, GST quotes and invoices, vouchers and payment tracking.",
  alternates: {
    canonical: "/features",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Travel CRM Features: Leads, Itineraries, Invoices | EzzySync",
    description: "Every EzzySync feature: lead pipeline, shared WhatsApp inbox, day-wise itinerary builder, GST quotes and invoices, vouchers and payment tracking.",
    url: "https://www.ezzysync.com/features",
    siteName: "EzzySync",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Travel CRM Features: Leads, Itineraries, Invoices | EzzySync",
    description: "Every EzzySync feature: lead pipeline, shared WhatsApp inbox, day-wise itinerary builder, GST quotes and invoices, vouchers and payment tracking.",
  },
});

export default function FeaturesPage() {
  const crmUrl = getCrmUrl();
  const trialUrl = getTrialUrl(crmUrl);
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
    <div className="min-h-screen bg-paper text-ink-900 font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }}
      />
      <Navbar crmUrl={crmUrl} />
      
      <main>
        {/* ========================================================================= */}
        {/* HERO SECTION */}
        {/* ========================================================================= */}
        <PageHero
          code="Cabin"
          label="Complete travel CRM capability suite"
          title="The Complete Travel Operating System Built for Daily Agency Operations"
          intro="From initial WhatsApp inquiry to final driver duty slip and payment reconciliation: explore every purpose-built module engineered for tour operators and travel agencies."
          facts={["No credit card required", "Setup in 5 minutes", "Official Meta Cloud API"]}
          actions={
            <>
              <a href={trialUrl} className={heroPrimaryClass}>
                Start free evaluation <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </a>
              <a href={waLink(WA_FEATURES_WALKTHROUGH_TEXT)} target="_blank" rel="noopener noreferrer" className={heroSecondaryClass}>
                <MessageSquare className="w-4 h-4 text-emerald-400" aria-hidden="true" /> Schedule 1-on-1 walkthrough
              </a>
            </>
          }
        />

        {/* Jump bar to each module */}
        <nav aria-label="Jump to a module" className="border-b border-line">
          <div className="wrap py-5 flex items-center gap-2 overflow-x-auto">
            <span className="t-label text-ink-600 mr-3 shrink-0">Jump to</span>
            {quickNav.map((item, idx) => {
              const Icon = item.icon;
              return (
                <a
                  key={idx}
                  href={item.href}
                  className="flex items-center gap-2 min-h-11 px-4 rounded-full border border-line hover:border-ink-900 hover:bg-ink-900 hover:text-paper text-ink-900 text-[14px] whitespace-nowrap transition-colors duration-500"
                >
                  <Icon className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
                  <span>{item.name}</span>
                </a>
              );
            })}
          </div>
        </nav>

        <nav aria-label="Feature pages" className="border-b border-slate-200 bg-white">
          <ul className="max-w-[1240px] mx-auto px-5 sm:px-6 py-6 flex flex-wrap justify-center gap-2.5">
            {featurePages.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/features/${p.slug}`}
                  className="inline-block px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:border-brand-400 hover:text-brand-700"
                >
                  {p.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

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
                  href={waLink(WA_FEATURES_DEMO_TEXT)}
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
        <FAQ items={featureFaqs} heading="Questions about features" />
      </main>

      <Footer crmUrl={crmUrl} />
    </div>
  );
}
