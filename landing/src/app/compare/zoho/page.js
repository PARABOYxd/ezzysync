import React from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { getCrmUrl } from "@/lib/crmUrl";
import { Check, X, ArrowRight } from "lucide-react";
import { withSeo } from "@/lib/seoOverrides";

export const metadata = withSeo("/compare/zoho", {
  title: "EzzySync vs Zoho CRM — Best Travel Agency CRM Alternative (2026)",
  description: "EzzySync vs Zoho CRM for travel agencies: setup time, WhatsApp automation, itineraries, GST billing and cost compared for tour operators.",
  keywords: [
    "ezzysync vs zoho crm",
    "zoho crm alternative travel agency",
    "zoho travel crm alternative",
    "best travel crm india",
    "travel agency crm software",
    "whatsapp travel crm",
    "tour operator crm"
  ],
  alternates: {
    canonical: "/compare/zoho",
  },
  openGraph: {
    title: "EzzySync vs Zoho CRM — Best Travel Agency CRM Alternative (2026)",
    description: "Why travel agencies choose EzzySync over Zoho CRM: zero setup time, built-in day-wise itineraries, official Meta Cloud WhatsApp integration, and SAC 998555 GST billing.",
    url: "https://www.ezzysync.com/compare/zoho",
    type: "article",
  },
});

export default function CompareZohoPage() {
  const crmUrl = getCrmUrl();

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Why is EzzySync better than Zoho CRM for a travel agency?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Zoho CRM is a generic tool designed for software and enterprise sales. Setting it up for travel requires hiring consultants and buying extra add-ons like Zoho Books and Zoho Desk. EzzySync is 100% pre-configured for travel agents out of the box with day-wise itineraries, PAX tracking, supplier margins, and official Meta WhatsApp shared inboxes."
        }
      },
      {
        "@type": "Question",
        "name": "Can I generate travel itineraries in Zoho CRM?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No. Zoho CRM has no native travel itinerary builder. With EzzySync, you can create structured day-wise visual itineraries with AI, hotel categories, transfers, and sightseeing details with branded PDF export."
        }
      },
      {
        "@type": "Question",
        "name": "How does WhatsApp integration compare between Zoho and EzzySync?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Zoho requires third-party marketplace extensions or complicated custom webhook setups with per-message fees. EzzySync integrates directly with the official Meta Cloud API, providing shared multi-agent inboxes, verified message templates, and automated itinerary dispatch with zero ban risk and zero third-party connector fees."
        }
      },
      {
        "@type": "Question",
        "name": "Is EzzySync more affordable than Zoho CRM?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. Zoho quickly becomes expensive as you add users, storage, and companion apps (Zoho Books, Zoho Creator). EzzySync offers flat, transparent pricing with all travel tools included."
        }
      }
    ]
  };

  const comparisonRows = [
    {
      feature: "Specialization",
      ezzysync: "100% Purpose-Built for Travel Agencies & DMCs",
      zoho: "Generic CRM for all industries (B2B, SaaS, Real Estate)",
    },
    {
      feature: "Setup & Go-Live Time",
      ezzysync: "5 Minutes — Pre-configured travel pipelines & voucher templates",
      zoho: "3 to 6 Weeks — Requires developer customization & custom modules",
    },
    {
      feature: "AI Day-Wise Travel Itinerary Creator",
      ezzysync: "Built-in AI day-wise itinerary builder with branded PDF export",
      zoho: "Not supported (Requires Canva or manual Word documents)",
    },
    {
      feature: "WhatsApp Integration",
      ezzysync: "Official Meta Cloud API & Shared Team Inbox (Zero ban risk, native automation)",
      zoho: "Requires 3rd-party marketplace plugins and Meta Cloud API fees",
    },
    {
      feature: "Travel GST Billing & Quotations",
      ezzysync: "Built-in GST travel invoice designer with advance payment tracking",
      zoho: "Requires separate subscription to Zoho Books & manual integration",
    },
    {
      feature: "B2B Supplier & Net Margin Ledger",
      ezzysync: "Calculates DMC cost vs customer price to reveal true net profit",
      zoho: "Generic deal values only (No supplier expense breakdown)",
    },
    {
      feature: "Group Departures & Batch Seats",
      ezzysync: "Built-in tour batch departure capacity & room sharing lists",
      zoho: "Not available natively",
    },
    {
      feature: "24/7 AI WhatsApp Auto-Pilot",
      ezzysync: "Answers package inquiries automatically using live CRM data",
      zoho: "Requires complex Zia setup and custom bot programming",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-brand-500 selection:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Navbar crmUrl={crmUrl} />

      <main className="relative pt-24 pb-20 sm:pt-32 bg-slate-50">
        <div className="max-w-[1100px] mx-auto px-5 sm:px-6 relative z-10 space-y-16">
          
          {/* Header */}
          <div className="text-center max-w-[800px] mx-auto space-y-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200">
              2026 Comparison
            </span>
            <h1 className="font-extrabold text-slate-950 text-3xl sm:text-5xl tracking-[-0.02em] leading-[1.15]">
              EzzySync vs Zoho CRM
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed">
              Why Indian and UAE Travel Agencies are switching from <strong>Zoho CRM</strong> to a specialized Travel Operating System.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
              <a
                href={`${crmUrl}/register`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md shadow-brand-500/20 transition"
              >
                <span>Start Free 30-Day Trial</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <Link
                href="/pricing"
                className="px-6 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-sm transition"
              >
                View Transparent Pricing
              </Link>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-6 bg-slate-900 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="font-bold text-lg text-white">Side-by-Side Comparison</h2>
                <p className="text-xs text-slate-400">See why pre-configured travel software beats generic enterprise software.</p>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                Updated for 2026
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
                    <th className="p-4 sm:p-5 w-1/3">Capability</th>
                    <th className="p-4 sm:p-5 w-1/3 text-brand-700 bg-brand-50/50 border-x border-slate-200">EzzySync Travel CRM</th>
                    <th className="p-4 sm:p-5 w-1/3 text-slate-700">Zoho CRM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {comparisonRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 sm:p-5 font-semibold text-slate-800">{row.feature}</td>
                      <td className="p-4 sm:p-5 text-slate-900 bg-brand-50/20 border-x border-slate-150 font-medium">
                        <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 inline" /> {row.ezzysync}</span>
                      </td>
                      <td className="p-4 sm:p-5 text-slate-500">
                        {row.zoho}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Deep Dive Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 rounded-2xl border border-slate-200 bg-white space-y-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <X className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-xl text-slate-900">The Problem with Zoho CRM for Travel</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Zoho CRM was never built for travel. To make it work, travel agencies spend thousands of dollars hiring Zoho consultants to create custom fields for flight numbers, PAX counts, and hotel vouchers. Even after heavy customization, you still can't generate visual itineraries or sync WhatsApp without expensive extensions.
              </p>
            </div>

            <div className="p-8 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                <Check className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-xl text-slate-900">The EzzySync Solution</h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                EzzySync is built from the ground up for travel professionals. The day you sign up, your travel lead stages, quotation templates, day-wise itinerary builder, SAC 998555 GST invoicing, and official Meta WhatsApp Cloud API integration are ready to go. No developers, no extra subscriptions, and zero setup delays.
              </p>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 space-y-8">
            <div className="text-center max-w-[600px] mx-auto space-y-2">
              <h2 className="font-extrabold text-2xl sm:text-3xl text-slate-950">Frequently Asked Questions</h2>
              <p className="text-sm text-slate-500">Comparing Zoho CRM and EzzySync.</p>
            </div>

            <div className="space-y-4 divide-y divide-slate-100">
              {faqSchema.mainEntity.map((faq, idx) => (
                <div key={idx} className="pt-4 first:pt-0 space-y-2">
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <span className="text-brand-600">Q.</span> {faq.name}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed pl-6">{faq.acceptedAnswer.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="p-10 rounded-3xl bg-gradient-to-tr from-slate-950 via-slate-900 to-brand-950 text-white text-center space-y-6 shadow-2xl">
            <h2 className="text-2xl sm:text-4xl font-extrabold">Stop Forcing Generic Software on Your Travel Agency</h2>
            <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto">
              Experience the CRM built specifically for your day-to-day travel bookings, itineraries, and WhatsApp communications.
            </p>
            <div className="pt-2">
              <a
                href={`${crmUrl}/register`}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-base shadow-xl shadow-brand-500/30 transition transform hover:-translate-y-0.5"
              >
                <span>Start Your 30-Day Free Trial</span>
                <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </div>

        </div>
      </main>

      <Footer crmUrl={crmUrl} />
    </div>
  );
}
