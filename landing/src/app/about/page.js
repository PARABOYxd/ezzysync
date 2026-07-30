import React from "react";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import Problem from "../../components/sections/Problem";
import FAQ from "../../components/sections/FAQ";
import { faqData } from "../../data/landingData";

export const metadata = {
  title: "About EzzySync — Travel CRM Built for Travel Agencies",
  description: "EzzySync is a travel CRM and booking management platform built for independent travel agents, small agencies, and tour operators moving off spreadsheets and generic CRMs.",
  alternates: {
    canonical: "/about",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "About EzzySync — Travel CRM Built for Travel Agencies",
    description: "EzzySync is a travel CRM and booking management platform built for independent travel agents, small agencies, and tour operators moving off spreadsheets and generic CRMs.",
    url: "https://www.ezzysync.com/about",
    siteName: "EzzySync",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About EzzySync — Travel CRM Built for Travel Agencies",
    description: "EzzySync is a travel CRM and booking management platform built for independent travel agents, small agencies, and tour operators moving off spreadsheets and generic CRMs.",
  },
};

export default function AboutPage() {
  const crmUrl = process.env.NEXT_PUBLIC_CRM_URL || "http://localhost:5173";
  const generalFaqs = faqData.filter((item) => item.category === "general");

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
      "@type": "FAQPage",
      "mainEntity": generalFaqs.map((item) => ({
        "@type": "Question",
        "name": item.q,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": item.a
        }
      }))
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
        <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-24 bg-white bg-grid-pattern overflow-hidden">
          <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-brand-100/20 filter blur-[110px] -z-10" aria-hidden="true"></div>
          
          <div className="max-w-[1100px] mx-auto px-5 sm:px-6 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
              
              {/* Left Column: Mission text details */}
              <div className="lg:col-span-5 text-center lg:text-left space-y-6">
                <h1 className="load-in font-semibold text-slate-950 text-[clamp(2.25rem,5vw,3.5rem)] lg:text-[3.25rem] leading-[1.1] tracking-[-0.02em]" style={{ "--reveal-delay": "0ms" }}>
                  About EzzySync
                </h1>
                <p className="load-in text-slate-500 text-base leading-relaxed" style={{ "--reveal-delay": "100ms" }}>
                  EzzySync is a travel CRM and booking management platform that helps travel agencies manage leads,
                  bookings, and itineraries in one system. It's built for independent agents and tour operators moving off spreadsheets and generic CRMs.
                </p>
                <p className="load-in text-slate-500 text-base leading-relaxed" style={{ "--reveal-delay": "160ms" }}>
                  Every part of EzzySync maps to a real step in a travel booking: log the inquiry, build a day-wise
                  itinerary, send it to the client on WhatsApp, generate the invoice, and track the booking through to departure.
                </p>
              </div>
              
              {/* Right Column: Creative Secure Multi-Tenant Security Widget */}
              <div className="lg:col-span-7 load-in mt-8 lg:mt-0 relative" style={{ "--reveal-delay": "220ms" }}>
                <div className="absolute -inset-4 bg-brand-500/5 rounded-3xl filter blur-xl -z-10" aria-hidden="true"></div>
                
                <div className="max-w-md mx-auto p-6 rounded-2xl border border-slate-200 bg-white text-slate-800 text-left space-y-5 shadow-soft relative overflow-hidden">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent rounded-t-2xl" aria-hidden="true"></div>
                  
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Enterprise Security</span>
                    <span className="text-[10px] font-bold text-emerald-600 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-100">Shield Active</span>
                  </div>
                  
                  {/* Database Isolation Nodes */}
                  <div className="space-y-3">
                    {/* Database Node 1 */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs">🔒</span>
                        <div>
                          <p className="text-xs font-semibold text-slate-900">Apex Travels Database</p>
                          <p className="text-[9px] text-slate-400">tenant_id: apex-travels</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-emerald-600">Isolated</span>
                    </div>

                    {/* Database Node 2 */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs">🔒</span>
                        <div>
                          <p className="text-xs font-semibold text-slate-900">Bharat Holidays Database</p>
                          <p className="text-[9px] text-slate-400">tenant_id: bharat-holidays</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-emerald-600">Isolated</span>
                    </div>

                    {/* Database Node 3 */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs">🔒</span>
                        <div>
                          <p className="text-xs font-semibold text-slate-900">Royal Escapes Database</p>
                          <p className="text-[9px] text-slate-400">tenant_id: royal-escapes</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-emerald-600">Isolated</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 text-center italic">
                    Strict multi-tenant access controls at the database layer. No agency can ever access another's bookings.
                  </p>
                </div>
              </div>
              
            </div>
          </div>
        </section>
        <Problem />
        <FAQ items={generalFaqs} heading="Common questions about EzzySync" />
      </main>
      <Footer crmUrl={crmUrl} />
    </div>
  );
}
