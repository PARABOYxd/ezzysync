"use client";

import React, { useState } from "react";
import { PhoneCall, CheckCircle2, ShieldCheck } from "lucide-react";
import WhatsAppIcon from "../common/WhatsAppIcon";
import ScrollReveal from "../ScrollReveal";

export default function LiveDemoSection({ crmUrl }) {
  const [submitted, setSubmitted] = useState(false);
  const [agencyName, setAgencyName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!phone) return;
    const msg = encodeURIComponent(
      `Hello EzzySync Team! I want a live demo for my agency: "${agencyName || 'Travel Agency'}" in ${city || 'India'}. Phone: ${phone}`
    );
    window.open(`https://wa.me/918826610820?text=${msg}`, "_blank");
    setSubmitted(true);
  };

  const trialUrl = crmUrl ? `${crmUrl}/login` : "/pricing";

  return (
    <section id="demo" className="py-20 sm:py-28 bg-slate-50 text-slate-900 scroll-mt-16 border-t border-b border-slate-200">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center max-w-5xl mx-auto">
          
          {/* Left Column: Commercial Value & Trust */}
          <div className="lg:col-span-6 space-y-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 block">
              Live demo
            </span>

            <h2 className="font-bold text-3xl sm:text-4xl text-slate-950 tracking-tight leading-tight">
              A 15-minute demo, tailored to your agency
            </h2>

            <p className="text-slate-600 text-base leading-relaxed">
              Connect with our team for a personalized 15-minute live screen walkthrough. Bring a real inquiry — we&apos;ll
              show you how it goes from WhatsApp to quote to booking inside EzzySync.
            </p>

            <div className="space-y-3 pt-2 text-sm text-slate-700">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Walkthrough of WhatsApp lead auto-capture &amp; shared inbox</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Day-wise itinerary and GST quotation generation preview</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Free Excel data migration guidance for your existing leads</span>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-5 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5 text-brand-600" />
                <span>Sales: +91 88266 10820</span>
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>No commitment required</span>
              </span>
            </div>
          </div>

          {/* Right Column: Clean White Demo Form */}
          <div className="lg:col-span-6 bg-white text-slate-900 rounded-3xl p-7 sm:p-9 shadow-sm border border-slate-200">
            <h3 className="font-bold text-xl text-slate-950">
              Schedule a 1-on-1 Live Demo
            </h3>
            <p className="text-sm text-slate-500 mt-1 mb-5">
              Fill in your agency details or message us directly on WhatsApp.
            </p>

            {submitted ? (
              <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto font-bold">
                  ✓
                </div>
                <h4 className="font-bold text-emerald-900 text-base">Request Sent!</h4>
                <p className="text-xs text-emerald-700">
                  Opening WhatsApp to connect you directly with our product specialist.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Agency Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Escapes Holidays"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      WhatsApp Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      City
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Delhi, Mumbai, Jaipur"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  <span>Book My Demo on WhatsApp</span>
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink mx-3 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Or</span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <a
                  href={trialUrl}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm text-center block transition-colors"
                >
                  Or start a free trial →
                </a>
              </form>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}
