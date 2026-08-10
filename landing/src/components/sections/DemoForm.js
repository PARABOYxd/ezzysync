"use client";

import React, { useState } from "react";
import { Shield, CheckCircle2 } from "lucide-react";
import ScrollReveal from "../ScrollReveal";

export default function DemoForm() {
  const [demoRequested, setDemoRequested] = useState(false);
  const [demoData, setDemoData] = useState({ name: "", email: "", agency: "", phone: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const validate = () => {
    const errs = {};
    if (!demoData.name.trim()) errs.name = "Name is required.";
    if (!demoData.agency.trim()) errs.agency = "Agency name is required.";
    if (!demoData.email.trim()) {
      errs.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(demoData.email)) {
      errs.email = "Enter a valid email address.";
    }
    if (demoData.phone && !/^[0-9+\-\s()]{7,15}$/.test(demoData.phone)) {
      errs.phone = "Enter a valid phone number (7-15 digits).";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleDemoSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || (isLocal ? "http://localhost:5001" : "https://ezzysync-production.up.railway.app");
      const response = await fetch(`${apiUrl}/api/public/walkthrough`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: demoData.name,
          agencyName: demoData.agency,
          email: demoData.email,
          phone: demoData.phone,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to submit request.");
      }

      setDemoRequested(true);
      setDemoData({ name: "", email: "", agency: "", phone: "" });
      setErrors({});
    } catch (err) {
      setSubmitError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (hasError) =>
    `w-full bg-white border rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus-visible:ring-1 transition-colors ${
      hasError ? "border-red-400 focus:border-red-400 focus-visible:ring-red-400" : "border-slate-200 focus:border-brand-500 focus-visible:ring-brand-500"
    }`;

  return (
    <section id="demo" className="py-16 sm:py-32 bg-white relative z-10">
      <div className="max-w-[1100px] mx-auto px-5 sm:px-6">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">

          {/* Left Column: CTA description */}
          <ScrollReveal as="div" className="lg:col-span-5 space-y-5 text-center lg:text-left">
            <h2 className="font-semibold text-2xl sm:text-4xl tracking-[-0.02em] text-slate-950 leading-tight">
              Ready to automate your travel business?
            </h2>
            <p className="text-slate-500 text-base leading-relaxed max-w-[45ch] mx-auto lg:mx-0">
              Sign up for an online product walkthrough. Discover how EzzySync simplifies lead management, automates itinerary building, and keeps agency files organized.
            </p>
            <div className="flex gap-3 items-center justify-center lg:justify-start pt-2">
              <div className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 flex-shrink-0">
                <Shield className="w-4.5 h-4.5" aria-hidden="true" />
              </div>
              <div className="text-left">
                <p className="font-medium text-slate-800 text-sm">No credit card needed</p>
                <p className="text-slate-500 text-xs">Start a free demo walkthrough instantly.</p>
              </div>
            </div>
          </ScrollReveal>

          {/* Right Column: Demo booking form */}
          <ScrollReveal as="div" delay={120} className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 relative w-full max-w-lg mx-auto">
            {demoRequested ? (
              <div className="text-center py-10 sm:py-12 space-y-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" aria-hidden="true" />
                </div>
                <h3 className="font-semibold text-lg sm:text-xl text-slate-900 tracking-tight">Demo request submitted!</h3>
                <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">
                  Thank you, our team will reach out to you within 24 hours at the email or phone number provided.
                </p>
              </div>
            ) : (
              <form onSubmit={handleDemoSubmit} className="space-y-4" noValidate>
                <h3 className="font-semibold text-base sm:text-lg text-slate-900 tracking-tight mb-1">Book your walkthrough</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="demo-name" className="text-xs font-medium text-slate-500 block">Your name *</label>
                    <input
                      id="demo-name"
                      type="text"
                      placeholder="John Doe"
                      value={demoData.name}
                      onChange={(e) => {
                        setDemoData({ ...demoData, name: e.target.value });
                        if (errors.name) setErrors({ ...errors, name: "" });
                      }}
                      className={inputClass(errors.name)}
                    />
                    {errors.name && <p className="text-[11px] text-red-500 font-medium">{errors.name}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="demo-agency" className="text-xs font-medium text-slate-500 block">Agency name *</label>
                    <input
                      id="demo-agency"
                      type="text"
                      placeholder="Apex Travels"
                      value={demoData.agency}
                      onChange={(e) => {
                        setDemoData({ ...demoData, agency: e.target.value });
                        if (errors.agency) setErrors({ ...errors, agency: "" });
                      }}
                      className={inputClass(errors.agency)}
                    />
                    {errors.agency && <p className="text-[11px] text-red-500 font-medium">{errors.agency}</p>}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="demo-email" className="text-xs font-medium text-slate-500 block">Work email *</label>
                  <input
                    id="demo-email"
                    type="email"
                    placeholder="john@agency.com"
                    value={demoData.email}
                    onChange={(e) => {
                      setDemoData({ ...demoData, email: e.target.value });
                      if (errors.email) setErrors({ ...errors, email: "" });
                    }}
                    className={inputClass(errors.email)}
                  />
                  {errors.email && <p className="text-[11px] text-red-500 font-medium">{errors.email}</p>}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="demo-phone" className="text-xs font-medium text-slate-500 block">Phone number (optional)</label>
                  <input
                    id="demo-phone"
                    type="tel"
                    placeholder="+91 9876543210"
                    value={demoData.phone}
                    onChange={(e) => {
                      const cleanPhone = e.target.value.replace(/[^0-9+\-\s()]/g, "");
                      setDemoData({ ...demoData, phone: cleanPhone });
                      if (errors.phone) setErrors({ ...errors, phone: "" });
                    }}
                    className={inputClass(errors.phone)}
                  />
                  {errors.phone && <p className="text-[11px] text-red-500 font-medium">{errors.phone}</p>}
                </div>

                {submitError && (
                  <p className="text-xs text-red-500 font-medium mt-1">{submitError}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm py-3 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Submitting request..." : "Request free access"}
                </button>
              </form>
            )}
          </ScrollReveal>

        </div>

      </div>
    </section>
  );
}
