import React from "react";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import DemoForm from "../../components/sections/DemoForm";

export const metadata = {
  title: "Contact EzzySync — Book a Free Travel CRM Walkthrough",
  description: "Talk to EzzySync about your travel agency's booking workflow. Book a free product walkthrough — no credit card required, response within 24 hours.",
  alternates: {
    canonical: "/contact",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Contact EzzySync — Book a Free Travel CRM Walkthrough",
    description: "Talk to EzzySync about your travel agency's booking workflow. Book a free product walkthrough — no credit card required, response within 24 hours.",
    url: "https://www.ezzysync.com/contact",
    siteName: "EzzySync",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact EzzySync — Book a Free Travel CRM Walkthrough",
    description: "Talk to EzzySync about your travel agency's booking workflow. Book a free product walkthrough — no credit card required, response within 24 hours.",
  },
};

export default function ContactPage() {
  const crmUrl = process.env.NEXT_PUBLIC_CRM_URL || "http://localhost:5173";

  const pageJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.ezzysync.com/" },
      { "@type": "ListItem", "position": 2, "name": "Contact", "item": "https://www.ezzysync.com/contact" }
    ]
  };

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
              
              {/* Left Column: Contact Text Details */}
              <div className="lg:col-span-5 text-center lg:text-left space-y-6">
                <h1 className="load-in font-semibold text-slate-950 text-[clamp(2.25rem,5vw,3.5rem)] lg:text-[3.25rem] leading-[1.1] tracking-[-0.02em]" style={{ "--reveal-delay": "0ms" }}>
                  Talk to EzzySync
                </h1>
                <p className="load-in text-slate-500 text-base sm:text-lg leading-relaxed" style={{ "--reveal-delay": "100ms" }}>
                  Book a free walkthrough and we'll show you how EzzySync fits your agency's booking workflow. Let's configure your isolated workspace together.
                </p>
                <div className="load-in flex flex-wrap justify-center lg:justify-start gap-2 pt-2" style={{ "--reveal-delay": "160ms" }}>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded bg-brand-50 border border-brand-200 text-brand-700">Response within 24 hours</span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded bg-brand-50 border border-brand-200 text-brand-700">1-on-1 walkthrough</span>
                </div>
              </div>
              
              {/* Right Column: Creative Walkthrough Next Steps Flowchart */}
              <div className="lg:col-span-7 load-in mt-8 lg:mt-0 relative" style={{ "--reveal-delay": "220ms" }}>
                <div className="absolute -inset-4 bg-brand-500/5 rounded-3xl filter blur-xl -z-10" aria-hidden="true"></div>
                
                <div className="max-w-md mx-auto space-y-3.5 relative z-10 font-sans text-xs">
                  {/* Step 1 */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-soft flex items-center gap-3.5 text-left relative overflow-hidden">
                    <div className="w-8.5 h-8.5 rounded-lg bg-brand-50 flex items-center justify-center text-sm">📝</div>
                    <div className="space-y-0.5">
                      <div className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Step 1</div>
                      <p className="font-semibold text-slate-900 text-xs">Submit the walkthrough form below</p>
                    </div>
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 border border-brand-100">1 Min</span>
                  </div>

                  {/* Connector */}
                  <div className="w-px h-6 bg-gradient-to-b from-brand-300 to-brand-500 mx-auto"></div>

                  {/* Step 2 */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-soft flex items-center gap-3.5 text-left relative overflow-hidden">
                    <div className="w-8.5 h-8.5 rounded-lg bg-emerald-50 flex items-center justify-center text-sm">📅</div>
                    <div className="space-y-0.5">
                      <div className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Step 2</div>
                      <p className="font-semibold text-slate-900 text-xs">Schedule a slot for your live demo meet</p>
                    </div>
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">Pick Date</span>
                  </div>

                  {/* Connector */}
                  <div className="w-px h-6 bg-gradient-to-b from-brand-300 to-brand-500 mx-auto"></div>

                  {/* Step 3 */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-soft flex items-center gap-3.5 text-left relative overflow-hidden">
                    <div className="w-8.5 h-8.5 rounded-lg bg-emerald-500 flex items-center justify-center text-sm text-white font-bold">🚀</div>
                    <div className="space-y-0.5">
                      <div className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Step 3</div>
                      <p className="font-semibold text-slate-900 text-xs">Get your custom sandbox database credentials</p>
                    </div>
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">Instant</span>
                  </div>
                </div>

              </div>
              
            </div>
          </div>
        </section>
        <DemoForm />
      </main>
      <Footer crmUrl={crmUrl} />
    </div>
  );
}
