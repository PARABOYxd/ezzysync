"use client";

import React, { useState } from "react";
import { PhoneCall, Check } from "lucide-react";
import WhatsAppIcon from "../common/WhatsAppIcon";
import { waLink, DISPLAY_PHONE, TEL_PHONE } from "@/lib/contact";
import { getTrialUrl } from "@/lib/crmUrl";

/** Validates an Indian mobile number and returns the normalised +91XXXXXXXXXX form, or null.
 * Spaces, dashes and brackets are ignored: people type "+91 98765 43210" or "98765-43210". */
function validateIndianPhone(raw) {
  const match = raw.replace(/[\s\-().]/g, "").match(/^(?:\+91|91|0)?([6-9]\d{9})$/);
  return match ? `+91${match[1]}` : null;
}

const agenda = [
  "How leads land in the shared WhatsApp inbox",
  "Building the itinerary and GST quote for that inquiry",
  "Moving your existing Excel leads across",
];

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
    window.open(waLink(msg), "_blank", "noopener,noreferrer");
    setSubmitted(true);
  };

  const trialUrl = getTrialUrl(crmUrl);

  return (
    <section id="demo" className="section-y scroll-mt-20 border-t border-line">
      <div className="wrap grid-12 gap-y-16">
        {/* Left: why and what */}
        <div className="col-span-12 lg:col-span-5">
          <p className="t-label text-ink-600">(10) Live demo</p>
          <h2 data-split className="t-h2 mt-6 text-ink-900 !text-[clamp(40px,4.8vw,84px)]">
            See it with one of your own inquiries
          </h2>
          <p data-reveal="fade" className="mt-8 t-lead text-ink-600 max-w-md">
            A 15-minute screen share with our team. Bring a real inquiry and we&apos;ll take it from WhatsApp message to
            quote to booking inside EzzySync.
          </p>
          <ol data-stagger className="mt-10 border-t border-line">
            {agenda.map((item, i) => (
              <li key={item} className="flex gap-6 py-4 border-b border-line text-[16px] text-ink-900">
                <span className="t-label text-ink-600 pt-1 w-6 tabular-nums">0{i + 1}</span>
                {item}
              </li>
            ))}
          </ol>
          <a href={`tel:${TEL_PHONE}`} className="mt-8 inline-flex items-center gap-2.5 min-h-11 text-[16px] text-ink-900">
            <PhoneCall className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
            <span className="text-ink-600">Prefer a call?</span> <span className="link-line">{DISPLAY_PHONE}</span>
          </a>
        </div>

        {/* Right: the form */}
        <div className="col-span-12 lg:col-start-7 lg:col-span-6">
          {submitted ? (
            <div role="status" className="border-t border-ink-900 pt-10">
              <span className="w-14 h-14 rounded-full bg-emerald-700 text-white flex items-center justify-center">
                <Check className="w-6 h-6" strokeWidth={2} aria-hidden="true" />
              </span>
              <h3 className="t-h3 mt-8 text-ink-900">WhatsApp should be open</h3>
              <p className="mt-4 text-[17px] text-ink-600 max-w-md">
                Send the prefilled message and we&apos;ll reply to fix a time.{" "}
                <a href={waLink()} target="_blank" rel="noopener noreferrer" className="text-ink-900 link-line">
                  Didn&apos;t open?
                </a>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-8" aria-label="Book a demo">
              <p className="text-[15px] text-ink-600">We&apos;ll open WhatsApp with these details filled in. Just hit send.</p>

              <div className="field">
                <input
                  id="demo-agency"
                  type="text"
                  autoComplete="organization"
                  placeholder=" "
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                />
                <label htmlFor="demo-agency">Agency name</label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="field" data-invalid={phoneError ? "true" : undefined}>
                  <input
                    id="demo-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    placeholder=" "
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); if (phoneError) setPhoneError(""); }}
                    onBlur={handlePhoneBlur}
                    aria-invalid={!!phoneError}
                    aria-describedby={phoneError ? "phone-error" : "phone-hint"}
                  />
                  <label htmlFor="demo-phone">WhatsApp number *</label>
                  {phoneError ? (
                    <p id="phone-error" role="alert" className="field-error">{phoneError}</p>
                  ) : (
                    <p id="phone-hint" className="mt-2 text-[13px] text-ink-600">10-digit Indian mobile</p>
                  )}
                </div>
                <div className="field">
                  <input
                    id="demo-city"
                    type="text"
                    autoComplete="address-level2"
                    placeholder=" "
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                  <label htmlFor="demo-city">City</label>
                </div>
              </div>

              <div className="field">
                <select id="demo-time" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)}>
                  <option value="">Any time (flexible)</option>
                  <option value="Morning (9am–12pm)">Morning (9am–12pm)</option>
                  <option value="Afternoon (12pm–4pm)">Afternoon (12pm–4pm)</option>
                  <option value="Evening (4pm–8pm)">Evening (4pm–8pm)</option>
                </select>
                <label htmlFor="demo-time">Preferred time</label>
              </div>

              <div className="pt-4 flex flex-wrap items-center gap-x-8 gap-y-4">
                <button type="submit" className="btn-pill">
                  <WhatsAppIcon className="w-4 h-4" />
                  <span>Continue on WhatsApp</span>
                </button>
                <a href={trialUrl} className="text-[16px] text-ink-900 min-h-11 inline-flex items-center">
                  <span className="text-ink-600 mr-1.5">Rather try it yourself?</span>
                  <span className="link-line">Start a free trial</span>
                </a>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
