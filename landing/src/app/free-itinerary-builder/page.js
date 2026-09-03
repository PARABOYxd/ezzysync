import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import FreeItineraryTool from "@/components/tools/FreeItineraryTool";

export const metadata = {
  title: "Free AI Travel Itinerary Builder & Generator (No Login Required) | EzzySync",
  description: "Create professional day-wise travel itineraries in 30 seconds with AI. Free branded PDF download for travel agents & tour operators. 100% free with zero sign-up.",
  keywords: [
    "free travel itinerary builder",
    "ai itinerary generator",
    "day wise itinerary maker",
    "itinerary builder for travel agents",
    "free travel itinerary template",
    "travel quotation builder free",
    "tour operator itinerary software",
    "ezzysync free tool"
  ],
  alternates: {
    canonical: "/free-itinerary-builder",
  },
  openGraph: {
    title: "Free AI Travel Itinerary Builder & Generator (No Login Required)",
    description: "Generate customized day-wise itineraries for Dubai, Goa, Kashmir, Bali and 100+ destinations in 30 seconds with AI. Download branded PDF instantly.",
    url: "https://www.ezzysync.com/free-itinerary-builder",
    type: "website",
  },
};

export default function FreeItineraryBuilderPage() {
  const crmUrl = process.env.NEXT_PUBLIC_CRM_URL || "https://www.ezzysync.com/app";

  const webAppSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "EzzySync Free Travel Itinerary Builder",
    "url": "https://www.ezzysync.com/free-itinerary-builder",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "All (Web Browser)",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "INR"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "ratingCount": "218"
    },
    "description": "Free AI-powered day-wise travel itinerary maker and branded PDF generator for travel agencies."
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Is this travel itinerary builder completely free?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, EzzySync Free Itinerary Builder is 100% free with no sign-up or credit card required. You can generate unlimited day-wise itineraries and download branded PDFs."
        }
      },
      {
        "@type": "Question",
        "name": "Can I add my travel agency's branding to the itinerary PDF?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! Simply enter your agency name and contact number in the form, and the generated PDF and WhatsApp text will be customized with your agency branding."
        }
      },
      {
        "@type": "Question",
        "name": "Which destinations can this AI itinerary maker generate?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "You can generate itineraries for any destination worldwide, including Dubai, Goa, Kashmir, Bali, Thailand, Europe, Maldives, Himachal, Kerala, Singapore, and more."
        }
      },
      {
        "@type": "Question",
        "name": "How can I send this itinerary directly on WhatsApp to my client?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Once generated, click 'Copy for WhatsApp' to instantly copy an emoji-formatted summary ready to paste into WhatsApp, or click 'Download / Print PDF' to send the document directly."
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-brand-500 selection:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Navbar crmUrl={crmUrl} />

      <main className="relative pt-24 pb-20 sm:pt-32">
        <div className="max-w-[1100px] mx-auto px-5 sm:px-6 relative z-10 space-y-16">
          
          {/* Header */}
          <div id="generator-hero" className="text-center max-w-[800px] mx-auto space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200">
              ⚡ 100% Free AI Tool for Travel Agents
            </span>
            <h1 className="font-extrabold text-slate-950 text-3xl sm:text-5xl tracking-[-0.02em] leading-[1.15]">
              Free AI Travel Itinerary Builder
            </h1>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
              Create beautiful, day-wise travel itineraries in <strong>30 seconds</strong>. 
              Add your agency branding, download a printable PDF, or copy formatted text for WhatsApp — no login required.
            </p>
          </div>

          {/* Interactive Tool Component */}
          <FreeItineraryTool crmUrl={crmUrl} />

          {/* SEO Content: Why use this tool */}
          <div id="why-use-section" className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2.5">
              <span className="text-2xl">⚡</span>
              <h3 className="font-bold text-slate-900 text-base">Save 2 Hours Per Inquiry</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Stop manually typing Word documents or editing Canva templates. Let AI craft complete sightseeing, hotel stays, and transfers in seconds.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2.5">
              <span className="text-2xl">📄</span>
              <h3 className="font-bold text-slate-900 text-base">Instant Branded PDF</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Clean, professional PDF formatting with your company name, contact number, inclusions, exclusions, and travel tips.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2.5">
              <span className="text-2xl">💬</span>
              <h3 className="font-bold text-slate-900 text-base">WhatsApp-Optimized Text</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Copy bulleted itinerary highlights formatted specifically for WhatsApp messaging with emojis and bold headers.
              </p>
            </div>
          </div>

          {/* FAQ Section */}
          <div id="faq-section" className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 space-y-8 shadow-sm">
            <div className="text-center max-w-[600px] mx-auto space-y-2">
              <h2 className="font-extrabold text-2xl sm:text-3xl text-slate-950">Frequently Asked Questions</h2>
              <p className="text-sm text-slate-500">Everything you need to know about EzzySync Free Itinerary Builder.</p>
            </div>

            <div className="space-y-4 divide-y divide-slate-100">
              {faqSchema.mainEntity.map((faq, idx) => (
                <div key={idx} className="pt-4 first:pt-0 space-y-2">
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <span className="text-brand-600 font-bold">Q.</span> {faq.name}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed pl-6">{faq.acceptedAnswer.text}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>

      <Footer crmUrl={crmUrl} />
    </div>
  );
}
