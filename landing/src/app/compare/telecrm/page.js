import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata = {
  title: "EzzySync vs TeleCRM for Travel Agencies (2026 Comparison)",
  description: "Comparing EzzySync and TeleCRM. Discover why travel agencies in India prefer a specialized CRM with day-wise itineraries over a generic WhatsApp telecalling CRM.",
  alternates: {
    canonical: "/compare/telecrm",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function CompareTeleCrmPage() {
  const crmUrl = process.env.NEXT_PUBLIC_CRM_URL || "http://localhost:5173";

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-brand-500 selection:text-white">
      <Navbar crmUrl={crmUrl} />
      
      <main className="relative pt-24 pb-20 sm:pt-32 bg-slate-50">
        <div className="max-w-[1000px] mx-auto px-5 sm:px-6 relative z-10 space-y-12">
          
          <div className="text-center max-w-[700px] mx-auto">
            <h1 className="font-bold text-slate-950 text-3xl sm:text-4xl lg:text-5xl tracking-[-0.02em] leading-[1.1] mb-6">
              EzzySync vs TeleCRM
            </h1>
            <p className="text-lg text-slate-600">
              Choosing the right WhatsApp CRM for your Travel Agency. Why a specialized Travel CRM outperforms a generic calling CRM.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-4 sm:p-6 font-bold text-slate-900 w-1/3">Feature</th>
                    <th className="p-4 sm:p-6 font-bold text-brand-600 bg-brand-50/30 w-1/3 border-x border-slate-200">EzzySync</th>
                    <th className="p-4 sm:p-6 font-bold text-slate-500 w-1/3">TeleCRM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-4 sm:p-6 text-slate-700 font-medium">Core Focus</td>
                    <td className="p-4 sm:p-6 text-slate-900 bg-brand-50/10 border-x border-slate-100">✅ Travel Agencies & Tour Operators</td>
                    <td className="p-4 sm:p-6 text-slate-500">❌ General B2B Telecalling</td>
                  </tr>
                  <tr>
                    <td className="p-4 sm:p-6 text-slate-700 font-medium">Itinerary Builder</td>
                    <td className="p-4 sm:p-6 text-slate-900 bg-brand-50/10 border-x border-slate-100">✅ AI Day-wise Itinerary Generator</td>
                    <td className="p-4 sm:p-6 text-slate-500">❌ Not available</td>
                  </tr>
                  <tr>
                    <td className="p-4 sm:p-6 text-slate-700 font-medium">Supplier Margins & Profitability</td>
                    <td className="p-4 sm:p-6 text-slate-900 bg-brand-50/10 border-x border-slate-100">✅ Track B2B supplier cost vs selling price</td>
                    <td className="p-4 sm:p-6 text-slate-500">❌ General sales tracking only</td>
                  </tr>
                  <tr>
                    <td className="p-4 sm:p-6 text-slate-700 font-medium">WhatsApp Automation</td>
                    <td className="p-4 sm:p-6 text-slate-900 bg-brand-50/10 border-x border-slate-100">✅ Official Cloud API (Safe & reliable)</td>
                    <td className="p-4 sm:p-6 text-slate-500">✅ Unofficial/Official WhatsApp options</td>
                  </tr>
                  <tr>
                    <td className="p-4 sm:p-6 text-slate-700 font-medium">Booking Management</td>
                    <td className="p-4 sm:p-6 text-slate-900 bg-brand-50/10 border-x border-slate-100">✅ Custom fields for travel dates, pax, destination</td>
                    <td className="p-4 sm:p-6 text-slate-500">❌ Standard lead fields only</td>
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
