import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata = {
  title: "EzzySync vs Zoho CRM for Travel Agencies (2026 Comparison)",
  description: "Comparing EzzySync and Zoho CRM for Indian travel agencies. See why a specialized travel CRM with day-wise itinerary building and built-in WhatsApp automation wins over generic CRMs.",
  alternates: {
    canonical: "/compare/zoho",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function CompareZohoPage() {
  const crmUrl = process.env.NEXT_PUBLIC_CRM_URL || "http://localhost:5173";

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-brand-500 selection:text-white">
      <Navbar crmUrl={crmUrl} />
      
      <main className="relative pt-24 pb-20 sm:pt-32 bg-slate-50">
        <div className="max-w-[1000px] mx-auto px-5 sm:px-6 relative z-10 space-y-12">
          
          <div className="text-center max-w-[700px] mx-auto">
            <h1 className="font-bold text-slate-950 text-3xl sm:text-4xl lg:text-5xl tracking-[-0.02em] leading-[1.1] mb-6">
              EzzySync vs Zoho CRM
            </h1>
            <p className="text-lg text-slate-600">
              Why Indian Travel Agencies are switching from generic business CRMs to a specialized Travel CRM.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-4 sm:p-6 font-bold text-slate-900 w-1/3">Feature</th>
                    <th className="p-4 sm:p-6 font-bold text-brand-600 bg-brand-50/30 w-1/3 border-x border-slate-200">EzzySync</th>
                    <th className="p-4 sm:p-6 font-bold text-slate-500 w-1/3">Zoho CRM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-4 sm:p-6 text-slate-700 font-medium">Built for Travel</td>
                    <td className="p-4 sm:p-6 text-slate-900 bg-brand-50/10 border-x border-slate-100">✅ 100% Focused on Travel Agencies</td>
                    <td className="p-4 sm:p-6 text-slate-500">❌ Generic business tool</td>
                  </tr>
                  <tr>
                    <td className="p-4 sm:p-6 text-slate-700 font-medium">Day-Wise Itinerary Builder</td>
                    <td className="p-4 sm:p-6 text-slate-900 bg-brand-50/10 border-x border-slate-100">✅ Built-in AI Itinerary generator</td>
                    <td className="p-4 sm:p-6 text-slate-500">❌ Requires 3rd party add-ons</td>
                  </tr>
                  <tr>
                    <td className="p-4 sm:p-6 text-slate-700 font-medium">WhatsApp Cloud API</td>
                    <td className="p-4 sm:p-6 text-slate-900 bg-brand-50/10 border-x border-slate-100">✅ Native integration (No extension needed)</td>
                    <td className="p-4 sm:p-6 text-slate-500">⚠️ Complicated Webhooks & API limits</td>
                  </tr>
                  <tr>
                    <td className="p-4 sm:p-6 text-slate-700 font-medium">Travel Invoicing & Ledgers</td>
                    <td className="p-4 sm:p-6 text-slate-900 bg-brand-50/10 border-x border-slate-100">✅ Calculates B2B Supplier Cost & Net Margin</td>
                    <td className="p-4 sm:p-6 text-slate-500">❌ Basic invoicing only (Requires Zoho Books)</td>
                  </tr>
                  <tr>
                    <td className="p-4 sm:p-6 text-slate-700 font-medium">Implementation Time</td>
                    <td className="p-4 sm:p-6 text-slate-900 bg-brand-50/10 border-x border-slate-100">✅ 5 Minutes (Ready to use)</td>
                    <td className="p-4 sm:p-6 text-slate-500">⚠️ Weeks of custom setup & developer costs</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <Footer crmUrl={crmUrl} />
    </div>
  );
}
