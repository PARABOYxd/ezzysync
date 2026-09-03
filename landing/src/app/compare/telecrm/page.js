import React from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata = {
  title: "EzzySync vs TeleCRM — Best Travel CRM Alternative (2026 Comparison)",
  description: "Comparing EzzySync vs TeleCRM for travel agencies & tour operators in India. Discover why travel businesses switch to EzzySync for direct WhatsApp QR automation, AI day-wise itineraries, and GST billing.",
  keywords: [
    "ezzysync vs telecrm",
    "telecrm alternative",
    "telecrm alternative for travel agency",
    "best travel crm india",
    "travel agency crm software",
    "whatsapp travel crm",
    "tour operator crm software"
  ],
  alternates: {
    canonical: "/compare/telecrm",
  },
  openGraph: {
    title: "EzzySync vs TeleCRM — Best Travel CRM Alternative (2026)",
    description: "See why Indian travel agencies prefer EzzySync over TeleCRM for WhatsApp lead capture, AI itinerary creation, and booking management.",
    url: "https://www.ezzysync.com/compare/telecrm",
    type: "article",
  },
};

export default function CompareTeleCrmPage() {
  const crmUrl = process.env.NEXT_PUBLIC_CRM_URL || "https://www.ezzysync.com/app";

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Why is EzzySync better than TeleCRM for travel agencies?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "TeleCRM is a generic calling CRM built for outbound cold calling. EzzySync is 100% customized for travel agencies with day-wise AI itinerary generation, direct WhatsApp Web QR automation, PAX and hotel booking management, and GST-compliant travel invoicing."
        }
      },
      {
        "@type": "Question",
        "name": "Can I connect my existing WhatsApp number to EzzySync?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! With EzzySync's instant WhatsApp Web QR scanner, you can link your existing agency WhatsApp number in 5 seconds with zero Meta verification delays and zero per-message charges."
        }
      },
      {
        "@type": "Question",
        "name": "Does TeleCRM offer day-wise itinerary generation?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No, TeleCRM does not have travel itinerary builders. EzzySync includes a built-in AI Day-Wise Itinerary Generator that exports branded, customized travel itineraries directly to PDF and WhatsApp in 60 seconds."
        }
      },
      {
        "@type": "Question",
        "name": "How easily can I migrate my leads from TeleCRM to EzzySync?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "You can export your leads as an Excel or CSV file from TeleCRM and import them directly into EzzySync in one click."
        }
      }
    ]
  };

  const comparisonRows = [
    {
      feature: "Target Industry",
      ezzysync: "100% Travel Agencies & Tour Operators",
      telecrm: "Generic Telesales & Outbound Call Centers",
    },
    {
      feature: "WhatsApp Integration",
      ezzysync: "Direct WhatsApp Web QR Scan (Zero Meta fees, instant multi-device)",
      telecrm: "Calling-first, WhatsApp requires setup or extra charges",
    },
    {
      feature: "AI Itinerary Builder",
      ezzysync: "Day-wise AI itinerary generator with branded PDF download",
      telecrm: "Not available (Requires manual Word/Canva design)",
    },
    {
      feature: "Travel Lead Routing & Stages",
      ezzysync: "Custom stages (Inquiry, Quote Sent, Advance Paid, Traveling, Feedback)",
      telecrm: "Generic sales stages (Interested, Call Back, Not Interested)",
    },
    {
      feature: "GST Travel Invoicing & Quotations",
      ezzysync: "Built-in GST travel invoice designer, payment links & ledger",
      telecrm: "No invoice builder (Requires external accounting software)",
    },
    {
      feature: "Supplier Margin & B2B Cost Tracking",
      ezzysync: "Calculates DMC/Hotel net cost vs Selling price & net profit",
      telecrm: "No supplier or margin tracking",
    },
    {
      feature: "24/7 AI Auto-Pilot Response",
      ezzysync: "AI auto-responds to customer queries on WhatsApp at midnight",
      telecrm: "Manual agent intervention required",
    },
    {
      feature: "Departure Batch & Group Tours",
      ezzysync: "Built-in fixed departure batch capacity & passenger list",
      telecrm: "Not available",
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
              2026 Competitive Analysis
            </span>
            <h1 className="font-extrabold text-slate-950 text-3xl sm:text-5xl tracking-[-0.02em] leading-[1.15]">
              EzzySync vs TeleCRM
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed">
              Looking for a <strong>TeleCRM alternative</strong> built specifically for travel agents? 
              Discover why tour operators across India and Dubai are moving from generic calling tools to EzzySync.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
              <a
                href={`${crmUrl}/register`}
                className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md shadow-brand-500/20 transition"
              >
                Start Free 30-Day Trial ➔
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
                <h2 className="font-bold text-lg text-white">Side-by-Side Feature Matrix</h2>
                <p className="text-xs text-slate-400">See how specialized travel workflows beat generic outbound calling software.</p>
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
                    <th className="p-4 sm:p-5 w-1/3 text-slate-700">TeleCRM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {comparisonRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 sm:p-5 font-semibold text-slate-800">{row.feature}</td>
                      <td className="p-4 sm:p-5 text-slate-900 bg-brand-50/20 border-x border-slate-150 font-medium">
                        <span className="text-emerald-600 font-bold mr-1.5">✓</span> {row.ezzysync}
                      </td>
                      <td className="p-4 sm:p-5 text-slate-500">
                        {row.telecrm}
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
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 font-bold flex items-center justify-center text-lg">
                ✕
              </div>
              <h3 className="font-bold text-xl text-slate-900">Why TeleCRM Struggles with Travel Operations</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                TeleCRM is built for outbound telecallers calling cold lists. It treats every inquiry as a simple phone call. 
                However, travel sales require customized package pricing, hotel vouchers, day-wise itineraries, supplier advance tracking, 
                and WhatsApp photo sharing. Forcing travel agents into TeleCRM creates massive manual double-entry.
              </p>
            </div>

            <div className="p-8 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white font-bold flex items-center justify-center text-lg shadow-md shadow-emerald-500/20">
                ✓
              </div>
              <h3 className="font-bold text-xl text-slate-900">The EzzySync Advantage</h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                EzzySync handles the entire travel booking lifecycle from customer "Hi" on WhatsApp to payment receipts. 
                Generate day-wise itineraries with AI in 60 seconds, scan QR to connect WhatsApp without Meta bans, 
                issue GST invoices with supplier margins, and track group departures seamlessly.
              </p>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 space-y-8">
            <div className="text-center max-w-[600px] mx-auto space-y-2">
              <h2 className="font-extrabold text-2xl sm:text-3xl text-slate-950">Frequently Asked Questions</h2>
              <p className="text-sm text-slate-500">Everything you need to know before switching to EzzySync.</p>
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
            <h2 className="text-2xl sm:text-4xl font-extrabold">Ready to Upgrade Your Travel Business?</h2>
            <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto">
              Join hundreds of travel agencies across India and UAE using EzzySync to automate WhatsApp leads and generate beautiful itineraries.
            </p>
            <div className="pt-2">
              <a
                href={`${crmUrl}/register`}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-base shadow-xl shadow-brand-500/30 transition transform hover:-translate-y-0.5"
              >
                Claim Your 30-Day Free Trial ➔
              </a>
            </div>
          </div>

        </div>
      </main>

      <Footer crmUrl={crmUrl} />
    </div>
  );
}
