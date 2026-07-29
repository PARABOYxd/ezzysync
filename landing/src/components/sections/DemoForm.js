"use client";

import React, { useState } from "react";
import { Shield, CheckCircle2 } from "lucide-react";

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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
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

  return (
    <section id="demo" className="py-16 sm:py-28 bg-white border-t border-slate-200 relative z-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Column: CTA description */}
          <div className="lg:col-span-5 space-y-5 sm:space-y-6 text-center lg:text-left">
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Ready to Automate Your Travel Business?
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-xl mx-auto lg:mx-0">
              Sign up for an online product walkthrough. Discover how EzzySync CRM simplifies lead management, automates itinerary building, and keeps agency files organized.
            </p>
            <div className="flex gap-4 items-center justify-center lg:justify-start pt-2">
              <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 flex-shrink-0">
                <Shield className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="text-left">
                <p className="font-bold text-slate-800 text-xs sm:text-sm">No Credit Card Needed</p>
                <p className="text-slate-500 text-[10px] sm:text-xs">Start a free demo walkthrough instantly.</p>
              </div>
            </div>
          </div>

          {/* Right Column: Demo booking form */}
          <div className="lg:col-span-7 bg-slate-50 p-5 sm:p-8 rounded-2xl border border-slate-200/80 shadow-md relative w-full max-w-lg mx-auto">
            {demoRequested ? (
              <div className="text-center py-10 sm:py-12 space-y-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
                </div>
                <h3 className="font-display text-lg sm:text-xl font-bold text-slate-800">Demo Request Submitted!</h3>
                <p className="text-slate-600 text-xs sm:text-sm max-w-sm mx-auto leading-relaxed">
                  Thank you, our team will reach out to you within 24 hours at the email or phone number provided.
                </p>
              </div>
            ) : (
              <form onSubmit={handleDemoSubmit} className="space-y-4" noValidate>
                <h3 className="font-display text-base sm:text-lg font-bold text-slate-800 mb-1">Book Your Walkthrough</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="demo-name" className="text-[10px] sm:text-xs font-bold text-slate-500 block">Your Name *</label>
                    <input
                      id="demo-name"
                      type="text"
                      placeholder="John Doe"
                      value={demoData.name}
                      onChange={(e) => {
                        setDemoData({ ...demoData, name: e.target.value });
                        if (errors.name) setErrors({ ...errors, name: "" });
                      }}
                      className={`w-full bg-white border rounded-xl px-3 py-2 sm:py-2.5 text-xs text-slate-800 focus:outline-none focus-visible:ring-1 transition-colors ${
                        errors.name ? "border-red-500 focus:border-red-500 focus-visible:ring-red-500" : "border-slate-200 focus:border-brand-500 focus-visible:ring-brand-500"
                      }`}
                    />
                    {errors.name && <p className="text-[10px] text-red-500 font-semibold">{errors.name}</p>}
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="demo-agency" className="text-[10px] sm:text-xs font-bold text-slate-500 block">Agency Name *</label>
                    <input
                      id="demo-agency"
                      type="text"
                      placeholder="Apex Travels"
                      value={demoData.agency}
                      onChange={(e) => {
                        setDemoData({ ...demoData, agency: e.target.value });
                        if (errors.agency) setErrors({ ...errors, agency: "" });
                      }}
                      className={`w-full bg-white border rounded-xl px-3 py-2 sm:py-2.5 text-xs text-slate-800 focus:outline-none focus-visible:ring-1 transition-colors ${
                        errors.agency ? "border-red-500 focus:border-red-500 focus-visible:ring-red-500" : "border-slate-200 focus:border-brand-500 focus-visible:ring-brand-500"
                      }`}
                    />
                    {errors.agency && <p className="text-[10px] text-red-500 font-semibold">{errors.agency}</p>}
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="demo-email" className="text-[10px] sm:text-xs font-bold text-slate-500 block">Work Email *</label>
                  <input
                    id="demo-email"
                    type="email"
                    placeholder="john@agency.com"
                    value={demoData.email}
                    onChange={(e) => {
                      setDemoData({ ...demoData, email: e.target.value });
                      if (errors.email) setErrors({ ...errors, email: "" });
                    }}
                    className={`w-full bg-white border rounded-xl px-3 py-2 sm:py-2.5 text-xs text-slate-800 focus:outline-none focus-visible:ring-1 transition-colors ${
                      errors.email ? "border-red-500 focus:border-red-500 focus-visible:ring-red-500" : "border-slate-200 focus:border-brand-500 focus-visible:ring-brand-500"
                    }`}
                  />
                  {errors.email && <p className="text-[10px] text-red-500 font-semibold">{errors.email}</p>}
                </div>

                <div className="space-y-1">
                  <label htmlFor="demo-phone" className="text-[10px] sm:text-xs font-bold text-slate-500 block">Phone Number (Optional)</label>
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
                    className={`w-full bg-white border rounded-xl px-3 py-2 sm:py-2.5 text-xs text-slate-800 focus:outline-none focus-visible:ring-1 transition-colors ${
                      errors.phone ? "border-red-500 focus:border-red-500 focus-visible:ring-red-500" : "border-slate-200 focus:border-brand-500 focus-visible:ring-brand-500"
                    }`}
                  />
                  {errors.phone && <p className="text-[10px] text-red-500 font-semibold">{errors.phone}</p>}
                </div>

                {submitError && (
                  <p className="text-xs text-red-500 font-semibold mt-1">{submitError}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 sm:py-3 rounded-xl shadow-md shadow-brand-500/10 hover:shadow-lg transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Submitting Request..." : "Request Free Access"}
                </button>
              </form>
            )}
          </div>

        </div>

      </div>
    </section>
  );
}
