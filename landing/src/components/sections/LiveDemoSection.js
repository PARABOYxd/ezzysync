"use client";

import React, { useState } from "react";
import { PhoneCall, CheckCircle2, ShieldCheck } from "lucide-react";
import WhatsAppIcon from "../common/WhatsAppIcon";
import ScrollReveal from "../ScrollReveal";
import { waLink, DISPLAY_PHONE } from "@/lib/contact";

/** Validates an Indian mobile number and returns the normalised +91XXXXXXXXXX form, or null. */
function validateIndianPhone(raw) {
  const match = raw.trim().match(/^(?:\+91|91|0)?([6-9]\d{9})$/);
  return match ? `+91${match[1]}` : null;
}

export default function LiveDemoSection({ crmUrl }) {
  const [submitted, setSubmitted] = useState(false);
  const [agencyName, setAgencyName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [city, setCity] = useState("");
  const [preferredTime, setPreferredTime] = useState("");

  const handlePhoneBlur = () => {
    if (phone && !validateIndianPhone(phone)) {
      setPhoneError("Please enter a valid 10-digit Indian mobile number.");
    } else {
      setPhoneError("");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const normalised = validateIndianPhone(phone);
    if (!normalised) {
      setPhoneError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }
    const msg = `Hello EzzySync Team! I want a live demo for my agency: "${agencyName || "Travel Agency"}" in ${city || "India"}. WhatsApp: ${normalised} | Preferred time: ${preferredTime || "Flexible"}`;
    window.open(waLink(msg), "_blank");
    setSubmitted(true);
  };

  const trialUrl = crmUrl ? `${crmUrl}/login` : "/pricing";

  return (
    <section id="demo" className="py-20 sm:py-28 bg-slate-50 text-slate-900 scroll-mt-16 border-t border-b border-slate-200">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center max-w-5xl mx-auto">

          {/* Left Column */}
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
                <span>Sales: {DISPLAY_PHONE}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>No commitment required</span>
              </span>
            </div>
          </div>

          {/* Right Column: Demo Form */}
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
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="demo-agency" className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Agency Name *
                  </label>
                  <input
                    id="demo-agency"
                    type="text"
                    required
                    placeholder="e.g. Royal Escapes Holidays"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-base focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="demo-phone" className="block text-sm font-semibold text-slate-700 mb-1.5">
                      WhatsApp Number *
                    </label>
                    <input
                      id="demo-phone"
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value); if (phoneError) setPhoneError(""); }}
                      onBlur={handlePhoneBlur}
                      aria-invalid={!!phoneError}
                      aria-describedby={phoneError ? "phone-error" : undefined}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-base focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white ${
                        phoneError ? "border-rose-400" : "border-slate-300"
                      }`}
                    />
                    {phoneError && (
                      <p id="phone-error" role="alert" className="mt-1 text-xs text-rose-600">
                        {phoneError}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="demo-city" className="block text-sm font-semibold text-slate-700 mb-1.5">
                      City
                    </label>
                    <input
                      id="demo-city"
                      type="text"
                      placeholder="e.g. Delhi, Mumbai, Jaipur"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-base focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="demo-time" className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Preferred time
                  </label>
                  <select
                    id="demo-time"
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-base focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white"
                  >
                    <option value="">Any time (flexible)</option>
                    <option value="Morning (9am–12pm)">Morning (9am–12pm)</option>
                    <option value="Afternoon (12pm–4pm)">Afternoon (12pm–4pm)</option>
                    <option value="Evening (4pm–8pm)">Evening (4pm–8pm)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer btn-press"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  <span>Book My Demo on WhatsApp</span>
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-200" />
                  <span className="flex-shrink mx-3 text-slate-400 text-xs uppercase tracking-wider font-semibold">Or</span>
                  <div className="flex-grow border-t border-slate-200" />
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
