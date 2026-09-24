"use client";

import React, { useState } from "react";
import Image from "next/image";
import { PhoneCall, CheckCircle2 } from "lucide-react";
import WhatsAppIcon from "../common/WhatsAppIcon";
import ScrollReveal from "../ScrollReveal";
import { waLink, DISPLAY_PHONE, TEL_PHONE } from "@/lib/contact";
import { getTrialUrl } from "@/lib/crmUrl";

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
    const msg = `Hi EzzySync, I would like a live demo.
Agency: ${agencyName.trim() || "-"}
City: ${city.trim() || "-"}
WhatsApp: ${normalised}
Preferred time: ${preferredTime || "Any time"}`;
    window.open(waLink(msg), "_blank");
    setSubmitted(true);
  };

  const trialUrl = getTrialUrl(crmUrl);

  return (
    <section id="demo" className="py-20 sm:py-28 bg-white text-slate-900 scroll-mt-16 border-t border-slate-200">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center max-w-5xl mx-auto">

          {/* Left Column */}
          <div className="lg:col-span-6 space-y-6">
            <div className="relative w-full h-48 sm:h-56 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
              <Image
                src="/images/demo-walkthrough.jpg"
                alt="EzzySync team member demonstrating live itinerary and CRM workflow on a laptop"
                fill
                sizes="(max-width: 1024px) 100vw, 480px"
                className="object-cover"
              />
            </div>

            <h2 className="font-bold text-3xl sm:text-4xl text-slate-950 tracking-tight leading-tight">
              See it with one of your own inquiries
            </h2>

            <p className="text-slate-600 text-base leading-relaxed">
              A 15-minute screen share with our team. Bring a real inquiry and we&apos;ll take it from WhatsApp message
              to quote to booking inside EzzySync.
            </p>

            <div className="space-y-3 pt-2 text-sm text-slate-700">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>How leads land in the shared WhatsApp inbox</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Building the itinerary and GST quote for that inquiry</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Moving your existing Excel leads across</span>
              </div>
            </div>

            <a
              href={`tel:${TEL_PHONE}`}
              className="inline-flex items-center gap-1.5 pt-2 text-sm text-slate-600 hover:text-slate-900"
            >
              <PhoneCall className="w-3.5 h-3.5 text-brand-600" />
              Prefer a call? {DISPLAY_PHONE}
            </a>
          </div>

          {/* Right Column: Demo Form */}
          <div className="lg:col-span-6 bg-slate-50 text-slate-900 rounded-2xl p-7 sm:p-9 border border-slate-200">
            <h3 className="font-bold text-xl text-slate-950">
              Book a demo
            </h3>
            <p className="text-sm text-slate-500 mt-1 mb-5">
              We&apos;ll open WhatsApp with these details filled in — just hit send.
            </p>

            {submitted ? (
              <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto font-bold">
                  ✓
                </div>
                <h4 className="font-bold text-emerald-900 text-base">WhatsApp should be open</h4>
                <p className="text-sm text-emerald-800">
                  Send the prefilled message and we&apos;ll reply to fix a time.{" "}
                  <a href={waLink()} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                    Didn&apos;t open?
                  </a>
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="demo-agency" className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Agency name
                  </label>
                  <input
                    id="demo-agency"
                    type="text"
                    placeholder="e.g. Royal Escapes Holidays"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-base focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="demo-phone" className="block text-sm font-semibold text-slate-700 mb-1.5">
                      WhatsApp number
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
                  <span>Continue on WhatsApp</span>
                </button>

                <p className="text-center text-sm text-slate-500">
                  Rather try it yourself?{" "}
                  <a href={trialUrl} className="font-semibold text-brand-600 hover:underline">
                    Start a free trial
                  </a>
                </p>
              </form>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}
