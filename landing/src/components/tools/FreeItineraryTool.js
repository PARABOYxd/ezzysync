"use client";

import React, { useState } from "react";
import {
  Sparkles,
  MapPin,
  Calendar,
  Building2,
  Phone,
  Mail,
  Printer,
  Copy,
  Check,
  Loader2,
  CheckCircle,
  XCircle,
  Lightbulb,
  Edit3,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  SlidersHorizontal,
  Eye,
  FileCheck2,
} from "lucide-react";
import { generateFreeItinerary } from "@/lib/api";
import {
  buildSmartItinerary,
  parseMarkdownToStructuredItinerary,
  formatItineraryForWhatsapp,
} from "@/lib/smartItineraryEngine";

export default function FreeItineraryTool({ crmUrl }) {
  // Simple form state (Cleaned: Quick Prompts & Trip Style removed per request)
  const [destination, setDestination] = useState("Manali & Solang Valley");
  const [days, setDays] = useState(4);
  const [agencyName, setAgencyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [roughNotes, setRoughNotes] = useState(
    "Create a 4 days scenic Manali trip with Solang Valley, Atal Tunnel, Sissu, and Old Manali cafes"
  );

  // Workflow steps: 'studio' | 'final'
  const [step, setStep] = useState("studio");
  // Mobile/tablet active tab: 'generator' | 'preview'
  const [mobileTab, setMobileTab] = useState("generator");

  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Pre-seed with rich realistic itinerary so right-side preview is immediately alive and editable
  const [itinerary, setItinerary] = useState(() => {
    try {
      return buildSmartItinerary({
        destination: "Manali & Solang Valley",
        days: 4,
        tripType: "Custom Tour",
        agencyName: "Your Travel Partner",
        phone: "",
        email: "",
        roughNotes:
          "Create a 4 days scenic Manali trip with Solang Valley, Atal Tunnel, Sissu, and Old Manali cafes",
      });
    } catch {
      return null;
    }
  });

  // Helper inputs for adding new items
  const [newInclusionInput, setNewInclusionInput] = useState("");
  const [newExclusionInput, setNewExclusionInput] = useState("");
  const [newTipInput, setNewTipInput] = useState("");

  // Sync agency branding into itinerary live if user updates form fields
  const handleAgencyChange = (val) => {
    setAgencyName(val);
    if (itinerary) {
      setItinerary((prev) => ({
        ...prev,
        agencyName: val.trim() || "Your Travel Partner",
      }));
    }
  };

  const handlePhoneChange = (val) => {
    setPhone(val);
    if (itinerary) {
      setItinerary((prev) => ({
        ...prev,
        phone: val.trim(),
      }));
    }
  };

  const handleEmailChange = (val) => {
    setEmail(val);
    if (itinerary) {
      setItinerary((prev) => ({
        ...prev,
        email: val.trim(),
      }));
    }
  };

  // Generation handler
  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!destination.trim() && !roughNotes.trim()) return;

    let effectiveDest = destination.trim();
    if (!effectiveDest) {
      const lower = roughNotes.toLowerCase();
      if (lower.includes("aadrai")) effectiveDest = "Aadrai Jungle Trek";
      else if (lower.includes("chopta")) effectiveDest = "Chopta Tungnath";
      else if (lower.includes("mussoorie") || lower.includes("mussorie")) effectiveDest = "Mussoorie";
      else if (lower.includes("bali")) effectiveDest = "Bali";
      else if (lower.includes("goa")) effectiveDest = "Goa";
      else if (lower.includes("kashmir")) effectiveDest = "Kashmir";
      else if (lower.includes("prabal")) effectiveDest = "Prabalgad Fort";
      else {
        const m = roughNotes.match(/(?:itinerary\s+(?:of|for)|trip\s+(?:to|for))\s+([a-zA-Z\s]+?)(?:\s+(?:from|with|in|for|\d+|\.|$))/i);
        effectiveDest = m && m[1] ? m[1].trim() : "Custom Tour";
      }
      setDestination(effectiveDest);
    }

    setLoading(true);
    setCopied(false);

    let structuredData = null;

    try {
      const res = await generateFreeItinerary({
        destination: effectiveDest,
        days,
        tripType: "Custom Tour",
        agencyName: agencyName.trim() || "Your Travel Partner",
        phone: phone.trim(),
        email: email.trim(),
        description: roughNotes.trim(),
      });

      if (res?.structured && res.structured.days && res.structured.days.length > 0) {
        structuredData = res.structured;
      } else if (res?.itinerary && res.itinerary.trim().length > 50) {
        structuredData = parseMarkdownToStructuredItinerary(res.itinerary, {
          destination: effectiveDest,
          days,
          tripType: "Custom Tour",
          agencyName: agencyName.trim() || "Your Travel Partner",
          phone: phone.trim(),
          email: email.trim(),
        });
      }
    } catch (err) {
      console.warn("API itinerary error, running client smart engine:", err);
    }

    // Fallback: high-quality destination-aware itinerary engine
    if (!structuredData) {
      structuredData = buildSmartItinerary({
        destination: effectiveDest,
        days,
        tripType: "Custom Tour",
        agencyName: agencyName.trim() || "Your Travel Partner",
        phone: phone.trim(),
        email: email.trim(),
        roughNotes: roughNotes.trim(),
      });
    }

    // Clean any markdown bold asterisks
    if (structuredData && structuredData.days) {
      structuredData.days = structuredData.days.map((d) => ({
        ...d,
        title: (d.title || "").replace(/\*\*/g, "").trim(),
        points: (d.points || []).map((p) => {
          if (!p) return "";
          let s = p.trim().replace(/^[-*•]\s*/, "");
          s = s.replace(/\*\*(Morning|Afternoon|Evening|Night|Stay|Overnight|Trek|Ascent|Descent|Breakfast|Lunch|Dinner)\*\*[:\s]*/gi, "$1: ");
          s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
          s = s.replace(/\*\*/g, "");
          return s.replace(/:\s*:/g, ":").trim();
        }),
      }));
    }

    setItinerary(structuredData);
    setLoading(false);
    // On mobile, automatically show the preview tab upon generation
    setMobileTab("preview");
  };

  // ==========================================
  // ITINERARY EDITING HANDLERS
  // ==========================================
  const handleTitleChange = (val) => {
    setItinerary((prev) => ({ ...prev, title: val }));
  };

  const handleDayTitleChange = (dayIdx, val) => {
    setItinerary((prev) => {
      const updatedDays = [...prev.days];
      updatedDays[dayIdx] = { ...updatedDays[dayIdx], title: val };
      return { ...prev, days: updatedDays };
    });
  };

  const handleDayPointChange = (dayIdx, ptIdx, val) => {
    setItinerary((prev) => {
      const updatedDays = [...prev.days];
      const updatedPoints = [...updatedDays[dayIdx].points];
      updatedPoints[ptIdx] = val;
      updatedDays[dayIdx] = { ...updatedDays[dayIdx], points: updatedPoints };
      return { ...prev, days: updatedDays };
    });
  };

  const handleAddDayPoint = (dayIdx) => {
    setItinerary((prev) => {
      const updatedDays = [...prev.days];
      const updatedPoints = [
        ...updatedDays[dayIdx].points,
        "Sightseeing & activities at top attraction",
      ];
      updatedDays[dayIdx] = { ...updatedDays[dayIdx], points: updatedPoints };
      return { ...prev, days: updatedDays };
    });
  };

  const handleRemoveDayPoint = (dayIdx, ptIdx) => {
    setItinerary((prev) => {
      const updatedDays = [...prev.days];
      const updatedPoints = updatedDays[dayIdx].points.filter((_, i) => i !== ptIdx);
      updatedDays[dayIdx] = { ...updatedDays[dayIdx], points: updatedPoints };
      return { ...prev, days: updatedDays };
    });
  };

  const handleAddDay = () => {
    setItinerary((prev) => {
      const newDayNumber = prev.days.length + 1;
      const newDay = {
        dayNumber: newDayNumber,
        title: `Day ${newDayNumber}: ${prev.destination} Sightseeing & Leisure`,
        points: [
          `Morning: Hotel breakfast. Morning visit to local sightseeing spots.`,
          `Afternoon: Leisure time for shopping and enjoying regional cuisine.`,
          `Evening: Sunset walk and relaxation.`,
          `Stay: Hotel in ${prev.destination}.`,
        ],
      };
      return {
        ...prev,
        daysCount: newDayNumber,
        days: [...prev.days, newDay],
      };
    });
  };

  const handleRemoveDay = (dayIdx) => {
    if (!itinerary || itinerary.days.length <= 1) return;
    setItinerary((prev) => {
      const remainingDays = prev.days
        .filter((_, i) => i !== dayIdx)
        .map((d, i) => ({
          ...d,
          dayNumber: i + 1,
          title: d.title.replace(/^Day\s*\d+/i, `Day ${i + 1}`),
        }));
      return {
        ...prev,
        daysCount: remainingDays.length,
        days: remainingDays,
      };
    });
  };

  const handleAddInclusion = () => {
    if (!newInclusionInput.trim()) return;
    setItinerary((prev) => ({
      ...prev,
      inclusions: [...prev.inclusions, newInclusionInput.trim()],
    }));
    setNewInclusionInput("");
  };

  const handleRemoveInclusion = (idx) => {
    setItinerary((prev) => ({
      ...prev,
      inclusions: prev.inclusions.filter((_, i) => i !== idx),
    }));
  };

  const handleAddExclusion = () => {
    if (!newExclusionInput.trim()) return;
    setItinerary((prev) => ({
      ...prev,
      exclusions: [...prev.exclusions, newExclusionInput.trim()],
    }));
    setNewExclusionInput("");
  };

  const handleRemoveExclusion = (idx) => {
    setItinerary((prev) => ({
      ...prev,
      exclusions: prev.exclusions.filter((_, i) => i !== idx),
    }));
  };

  const handleAddTip = () => {
    if (!newTipInput.trim()) return;
    setItinerary((prev) => ({
      ...prev,
      tips: [...(prev.tips || []), newTipInput.trim()],
    }));
    setNewTipInput("");
  };

  const handleRemoveTip = (idx) => {
    setItinerary((prev) => ({
      ...prev,
      tips: prev.tips.filter((_, i) => i !== idx),
    }));
  };

  // Actions
  const handleFinalize = () => {
    setStep("final");
    setTimeout(() => {
      const el = document.getElementById("printable-itinerary");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const handleBackToStudio = () => {
    setStep("studio");
    setTimeout(() => {
      const el = document.getElementById("itinerary-studio-anchor");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const handleCopy = () => {
    if (!itinerary) return;
    const text = formatItineraryForWhatsapp(itinerary);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setDestination("");
    setRoughNotes("");
    setDays(3);
    setAgencyName("");
    setPhone("");
    setEmail("");
    setItinerary(null);
    setStep("studio");
    setMobileTab("generator");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-8">
      <div id="itinerary-studio-anchor" />

      {/* ==========================================================
          STREAMLINED 2-STEP WORKFLOW BAR (NO BACK & FORTH)
          ========================================================== */}
      <div className="flex items-center justify-center gap-3 sm:gap-6 print-hide text-xs sm:text-sm font-semibold">
        <button
          type="button"
          onClick={() => setStep("studio")}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full transition-all cursor-pointer ${
            step === "studio"
              ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20 ring-2 ring-slate-900/10"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-black">
            1
          </span>
          <span className="font-bold">Itinerary Studio (AI & Editor)</span>
        </button>

        <span className="text-slate-300 font-bold">➔</span>

        <button
          type="button"
          disabled={!itinerary}
          onClick={handleFinalize}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full transition-all ${
            !itinerary
              ? "opacity-50 cursor-not-allowed bg-slate-100 text-slate-400 border border-slate-200"
              : step === "final"
              ? "bg-brand-600 text-white shadow-lg shadow-brand-500/25 ring-2 ring-brand-500/20 cursor-pointer"
              : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 cursor-pointer"
          }`}
        >
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${
              step === "final" ? "bg-white text-brand-600" : "bg-slate-200 text-slate-700"
            }`}
          >
            2
          </span>
          <span className="font-bold">Final Itinerary & PDF Voucher</span>
        </button>
      </div>

      {/* ==========================================================
          STEP 1: UNIFIED ITINERARY STUDIO (SIDE-BY-SIDE ON DESKTOP)
          ========================================================== */}
      {step === "studio" && (
        <div className="space-y-6 print-hide">
          {/* Mobile Tab Selector (Visible only on < lg screens) */}
          <div className="lg:hidden flex rounded-2xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setMobileTab("generator")}
              className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition ${
                mobileTab === "generator"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <SlidersHorizontal size={14} className="text-brand-600" />
              <span>AI Tool & Details</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("preview")}
              className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition ${
                mobileTab === "preview"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Eye size={14} className="text-brand-600" />
              <span>
                Live Preview & Fields {itinerary?.days ? `(${itinerary.days.length}D)` : ""}
              </span>
            </button>
          </div>

          {/* Side-by-Side Studio Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-start">
            {/* =====================================================
                LEFT PANE: AI TOOL & TRIP INPUTS
                ===================================================== */}
            <div
              className={`lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24 space-y-4 ${
                mobileTab === "generator" ? "block" : "hidden lg:block"
              }`}
            >
              <div
                id="generator-card"
                className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xl shadow-slate-200/40 relative overflow-hidden"
              >
                {/* Subtle top decoration */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-brand-500/10 via-amber-500/5 to-transparent rounded-bl-full pointer-events-none" />

                <div className="relative z-10 space-y-5">
                  {/* Panel Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-600">
                        <Sparkles size={18} />
                      </div>
                      <div>
                        <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                          AI Itinerary Creator
                        </h2>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Smart day-wise builder with live preview
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Live Sync
                    </span>
                  </div>

                  {/* Clean Form */}
                  <form onSubmit={handleGenerate} className="space-y-4">
                    {/* Main Prompt Field */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-900 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Sparkles size={13} className="text-brand-600" />
                          AI Itinerary Command / Travel Prompt *
                        </span>
                        <span className="text-[10px] font-semibold text-brand-600 uppercase tracking-wider">
                          Natural AI
                        </span>
                      </label>
                      <textarea
                        rows={4}
                        value={roughNotes}
                        onChange={(e) => setRoughNotes(e.target.value)}
                        placeholder='e.g. "Create 4 days Manali itinerary covering Solang Valley, Atal Tunnel, Sissu, and Old Manali cafes with private cab and family hotels"'
                        className="w-full text-xs sm:text-sm bg-slate-50 border-2 border-slate-200 focus:border-brand-500 focus:bg-white rounded-2xl p-3.5 outline-none transition font-medium text-slate-800 leading-relaxed placeholder:text-slate-400 resize-y shadow-inner"
                      />
                    </div>

                    {/* Destination Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <MapPin size={13} className="text-brand-600" />
                        Destination Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Manali, Goa, Kashmir, Dubai, Bali..."
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 focus:border-brand-500 focus:bg-white rounded-xl px-3.5 py-2.5 outline-none transition font-semibold text-slate-900 placeholder:text-slate-400"
                      />
                    </div>

                    {/* Trip Duration */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Calendar size={13} className="text-brand-600" />
                        Trip Duration (Days)
                      </label>
                      <select
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                        className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 focus:border-brand-500 focus:bg-white rounded-xl px-3.5 py-2.5 outline-none transition font-semibold text-slate-900 cursor-pointer"
                      >
                        <option value={1}>1 Day (Day Hike / Day Tour)</option>
                        <option value={2}>2 Days / 1 Night (Weekend Trip)</option>
                        <option value={3}>3 Days / 2 Nights</option>
                        <option value={4}>4 Days / 3 Nights</option>
                        <option value={5}>5 Days / 4 Nights</option>
                        <option value={6}>6 Days / 5 Nights</option>
                        <option value={7}>7 Days / 6 Nights (1 Week)</option>
                        <option value={8}>8 Days / 7 Nights</option>
                        <option value={9}>9 Days / 8 Nights</option>
                        <option value={10}>10 Days / 9 Nights</option>
                        <option value={12}>12 Days / 11 Nights</option>
                        <option value={14}>14 Days / 13 Nights (2 Weeks)</option>
                      </select>
                    </div>

                    {/* Agency Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Building2 size={13} className="text-brand-600" />
                        Agency Name (For PDF Header)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Royal Travels Pvt Ltd"
                        value={agencyName}
                        onChange={(e) => handleAgencyChange(e.target.value)}
                        className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 focus:border-brand-500 focus:bg-white rounded-xl px-3.5 py-2.5 outline-none transition font-medium text-slate-900 placeholder:text-slate-400"
                      />
                    </div>

                    {/* WhatsApp / Mobile */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Phone size={13} className="text-emerald-600" />
                        WhatsApp / Mobile Number
                      </label>
                      <input
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 focus:border-brand-500 focus:bg-white rounded-xl px-3.5 py-2.5 outline-none transition font-medium text-slate-900 placeholder:text-slate-400"
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Mail size={13} className="text-blue-600" />
                        Email Address (Optional)
                      </label>
                      <input
                        type="email"
                        placeholder="info@travelagency.com"
                        value={email}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 focus:border-brand-500 focus:bg-white rounded-xl px-3.5 py-2.5 outline-none transition font-medium text-slate-900 placeholder:text-slate-400"
                      />
                    </div>

                    {/* Generate with AI Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={loading || (!destination.trim() && !roughNotes.trim())}
                        className="w-full py-3.5 px-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl font-extrabold text-xs sm:text-sm shadow-lg shadow-brand-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Generating Realistic AI Plan...
                          </>
                        ) : (
                          <>
                            <Sparkles size={16} />
                            Generate / Update with AI ➔
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* =====================================================
                RIGHT PANE: LIVE ITINERARY PREVIEW & FIELDS EDITOR
                ===================================================== */}
            <div
              className={`lg:col-span-7 xl:col-span-8 space-y-6 relative ${
                mobileTab === "preview" ? "block" : "hidden lg:block"
              }`}
            >
              {/* Full-section AI Generation Loader Overlay */}
              {loading && (
                <div className="absolute inset-0 z-40 bg-white/85 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center p-8 text-center space-y-5 transition-all animate-in fade-in duration-200 border-2 border-brand-500/20 shadow-2xl">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-amber-500 flex items-center justify-center text-white shadow-xl shadow-brand-500/30">
                      <Sparkles size={32} className="animate-spin" style={{ animationDuration: "3s" }} />
                    </div>
                    <div className="absolute -inset-2 rounded-3xl bg-brand-500/20 blur-lg -z-10 animate-pulse" />
                  </div>

                  <div className="space-y-2 max-w-md">
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 flex items-center justify-center gap-2">
                      <span>AI is Crafting Your Itinerary</span>
                      <span className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-brand-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1.5 h-1.5 bg-brand-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-1.5 bg-brand-600 rounded-full animate-bounce" />
                      </span>
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Building realistic day-by-day sightseeing schedule, timings, stay points, and package inclusions for{" "}
                      <strong className="text-brand-700 font-bold">{destination || "your destination"}</strong>...
                    </p>
                  </div>

                  <div className="w-56 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div className="h-full bg-gradient-to-r from-brand-500 via-amber-500 to-brand-600 rounded-full animate-pulse w-full" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    Updating preview fields in real-time
                  </span>
                </div>
              )}

              {itinerary ? (
                <div className="space-y-6">
                  {/* Top Bar / Single Primary CTA */}
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl sm:rounded-3xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                          Live Itinerary Fields & Document Editor
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Edit day titles, points, inclusions, and tips right here. Once ready, click to create final voucher.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleFinalize}
                      className="px-6 py-3 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-extrabold transition shadow-lg shadow-brand-500/25 cursor-pointer flex items-center justify-center gap-2 shrink-0"
                    >
                      <span>Generate Final Itinerary & PDF Voucher</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>

                  {/* Document Fields Editor Workspace */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xl shadow-slate-200/30 space-y-7">
                    {/* Package Title Field */}
                    <div className="space-y-2 pb-5 border-b border-slate-200">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <Edit3 size={12} className="text-brand-600" />
                          Package Title (Editable)
                        </label>
                        <span className="text-[11px] text-slate-400 font-medium">Click text to edit</span>
                      </div>
                      <input
                        type="text"
                        value={itinerary.title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        className="w-full text-base sm:text-xl font-black text-slate-900 bg-slate-50 focus:bg-white border-2 border-slate-200 focus:border-brand-500 rounded-xl px-4 py-2.5 outline-none transition"
                      />
                      <div className="flex flex-wrap gap-2 sm:gap-3 text-xs text-slate-600 pt-1">
                        <span className="px-2.5 py-1 rounded-md bg-slate-100 font-semibold text-slate-700">
                          📍 {itinerary.destination}
                        </span>
                        <span className="px-2.5 py-1 rounded-md bg-slate-100 font-semibold text-slate-700">
                          📅 {itinerary.days.length} Days / {Math.max(1, itinerary.days.length - 1)} Nights
                        </span>
                        {itinerary.agencyName && (
                          <span className="px-2.5 py-1 rounded-md bg-slate-100 font-semibold text-slate-700">
                            🏢 {itinerary.agencyName}
                          </span>
                        )}
                        {itinerary.phone && (
                          <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 font-semibold border border-emerald-100">
                            📞 {itinerary.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Day-by-Day Schedule Editor */}
                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                        <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                          <Calendar size={16} className="text-brand-600" />
                          Day-by-Day Schedule ({itinerary.days.length} Days)
                        </h3>
                        <button
                          type="button"
                          onClick={handleAddDay}
                          className="px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold border border-brand-200 transition cursor-pointer flex items-center gap-1"
                        >
                          <Plus size={13} />
                          Add Day
                        </button>
                      </div>

                      <div className="space-y-4">
                        {itinerary.days.map((day, dIdx) => (
                          <div
                            key={dIdx}
                            className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3 hover:border-slate-300 transition"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1">
                                <span className="px-2.5 py-1 rounded-md bg-brand-600 text-white font-black text-xs shrink-0">
                                  Day {day.dayNumber || dIdx + 1}
                                </span>
                                <input
                                  type="text"
                                  value={day.title}
                                  onChange={(e) => handleDayTitleChange(dIdx, e.target.value)}
                                  className="w-full text-xs sm:text-sm font-bold text-slate-900 bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:border-brand-500 outline-none"
                                />
                              </div>
                              {itinerary.days.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDay(dIdx)}
                                  title="Remove this day"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>

                            {/* Points list */}
                            <div className="space-y-2 pl-1 sm:pl-2">
                              {day.points.map((point, pIdx) => (
                                <div key={pIdx} className="flex items-start gap-2">
                                  <span className="mt-2 text-brand-500 font-bold text-xs shrink-0">•</span>
                                  <input
                                    type="text"
                                    value={point}
                                    onChange={(e) => handleDayPointChange(dIdx, pIdx, e.target.value)}
                                    className="w-full text-xs sm:text-sm text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:border-brand-500 outline-none"
                                  />
                                  {day.points.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveDayPoint(dIdx, pIdx)}
                                      className="p-1.5 text-slate-400 hover:text-rose-500 transition shrink-0 cursor-pointer"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </div>
                              ))}
                              <div className="pt-1 pl-3">
                                <button
                                  type="button"
                                  onClick={() => handleAddDayPoint(dIdx)}
                                  className="text-[11px] font-bold text-brand-600 hover:text-brand-700 hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <Plus size={12} />
                                  Add activity or stay point
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Inclusions & Exclusions Editor */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-slate-200">
                      {/* Inclusions */}
                      <div className="p-4 sm:p-5 rounded-2xl border border-emerald-200 bg-emerald-50/30 space-y-3.5">
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-xs sm:text-sm text-emerald-900 flex items-center gap-1.5">
                            <CheckCircle size={15} className="text-emerald-600" />
                            Package Inclusions
                          </h4>
                          <span className="text-[11px] text-emerald-700 font-bold">
                            {itinerary.inclusions.length} items
                          </span>
                        </div>

                        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                          {itinerary.inclusions.map((inc, iIdx) => (
                            <div
                              key={iIdx}
                              className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white border border-emerald-200 text-xs text-slate-800"
                            >
                              <span className="flex items-center gap-2 flex-1">
                                <span className="text-emerald-600 font-bold">✓</span>
                                <span>{inc}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveInclusion(iIdx)}
                                className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer transition"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            value={newInclusionInput}
                            onChange={(e) => setNewInclusionInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddInclusion();
                              }
                            }}
                            placeholder="Add custom inclusion..."
                            className="w-full text-xs bg-white border border-emerald-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-500"
                          />
                          <button
                            type="button"
                            onClick={handleAddInclusion}
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer transition"
                          >
                            Add
                          </button>
                        </div>
                      </div>

                      {/* Exclusions */}
                      <div className="p-4 sm:p-5 rounded-2xl border border-rose-200 bg-rose-50/30 space-y-3.5">
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-xs sm:text-sm text-rose-900 flex items-center gap-1.5">
                            <XCircle size={15} className="text-rose-600" />
                            Package Exclusions
                          </h4>
                          <span className="text-[11px] text-rose-700 font-bold">
                            {itinerary.exclusions.length} items
                          </span>
                        </div>

                        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                          {itinerary.exclusions.map((exc, eIdx) => (
                            <div
                              key={eIdx}
                              className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white border border-rose-200 text-xs text-slate-800"
                            >
                              <span className="flex items-center gap-2 flex-1">
                                <span className="text-rose-500 font-bold">✕</span>
                                <span>{exc}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveExclusion(eIdx)}
                                className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer transition"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            value={newExclusionInput}
                            onChange={(e) => setNewExclusionInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddExclusion();
                              }
                            }}
                            placeholder="Add custom exclusion..."
                            className="w-full text-xs bg-white border border-rose-200 rounded-lg px-3 py-2 outline-none focus:border-rose-500"
                          />
                          <button
                            type="button"
                            onClick={handleAddExclusion}
                            className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer transition"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Travel Tips Editor */}
                    <div className="p-4 sm:p-5 rounded-2xl border border-amber-200 bg-amber-50/30 space-y-3.5">
                      <div className="flex items-center justify-between">
                        <h4 className="font-extrabold text-xs sm:text-sm text-amber-900 flex items-center gap-1.5">
                          <Lightbulb size={15} className="text-amber-600" />
                          Specialist Travel Tips
                        </h4>
                        <span className="text-[11px] text-amber-700 font-bold">
                          {(itinerary.tips || []).length} tips
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {(itinerary.tips || []).map((tip, tIdx) => (
                          <div
                            key={tIdx}
                            className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white border border-amber-200 text-xs text-slate-800"
                          >
                            <span className="flex items-center gap-2 flex-1">
                              <span className="text-amber-500 font-bold">💡</span>
                              <span>{tip}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTip(tIdx)}
                              className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer transition"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={newTipInput}
                          onChange={(e) => setNewTipInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddTip();
                            }
                          }}
                          placeholder="Add specialist travel tip..."
                          className="w-full text-xs bg-white border border-amber-200 rounded-lg px-3 py-2 outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={handleAddTip}
                          className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer transition"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Bottom Status Notice (Single final button is at top right header) */}
                    <div className="pt-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                      <p>
                        All edits are automatically saved to your draft session.
                      </p>
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200">
                        <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                        <span>Ready? Click &quot;Generate Final Itinerary & PDF Voucher&quot; in the header above</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Empty / Prompt State if itinerary is null */
                <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
                    <Sparkles size={28} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Your Live Itinerary Preview Will Appear Here
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                    Type your destination or prompt in the left panel and click &quot;Generate with AI&quot; to populate your day-wise itinerary.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================
          STEP 2: FINAL ITINERARY & BRANDED A4 PDF VOUCHER
          ========================================================== */}
      {step === "final" && itinerary && (
        <div className="space-y-6">
          {/* Action Bar (Hidden in Print) */}
          <div
            id="action-bar"
            className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 bg-slate-900 text-white rounded-2xl sm:rounded-3xl shadow-xl print-hide"
          >
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <p className="font-extrabold text-sm sm:text-base text-white">
                  {itinerary.destination} ({itinerary.days.length} Days /{" "}
                  {Math.max(1, itinerary.days.length - 1)} Nights)
                </p>
                <p className="text-xs text-slate-400">
                  Ready to download PDF, print A4, or send on WhatsApp
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleBackToStudio}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-bold transition cursor-pointer border border-amber-300/20 shadow-sm"
              >
                <ArrowLeft size={14} />
                <span>Edit in Studio</span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copied ? "Copied!" : "Copy WhatsApp Text"}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-extrabold transition shadow-md shadow-brand-500/20 cursor-pointer"
              >
                <Printer size={15} />
                <span>Download / Print A4 PDF</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                title="Create New Itinerary"
                className="flex items-center gap-1 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>New</span>
              </button>
            </div>
          </div>

          {/* ==========================================================
              CLEAN A4 PRINTABLE ITINERARY VOUCHER DOCUMENT
              ========================================================== */}
          <div
            id="printable-itinerary"
            className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-xl print:p-0 print:border-none print:shadow-none print:rounded-none"
          >
            {/* Document Header / Agency Banner */}
            <div className="border-b-2 border-brand-500 pb-6 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-md border border-brand-200">
                  Official Travel Itinerary
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                  {itinerary.title}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1.5 font-medium">
                  <span>
                    📅 {itinerary.days.length} Days / {Math.max(1, itinerary.days.length - 1)} Nights
                  </span>
                  <span>•</span>
                  <span>📍 {itinerary.destination}</span>
                </div>
              </div>

              <div className="sm:text-right bg-slate-50 sm:bg-transparent p-4 sm:p-0 rounded-2xl border sm:border-0 border-slate-200 shrink-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Prepared By
                </p>
                <p className="text-base font-extrabold text-slate-900">
                  {itinerary.agencyName || "EzzySync Partner Agency"}
                </p>
                {itinerary.phone && (
                  <p className="text-xs text-brand-700 font-semibold mt-0.5">
                    📞 {itinerary.phone}
                  </p>
                )}
                {itinerary.email && (
                  <p className="text-xs text-slate-500 mt-0.5">✉️ {itinerary.email}</p>
                )}
              </div>
            </div>

            {/* Day-by-Day Timeline Cards */}
            <div className="space-y-6">
              {itinerary.days.map((d, idx) => (
                <div
                  key={idx}
                  className="itinerary-day-card border border-slate-200 rounded-2xl p-5 sm:p-6 bg-slate-50/50 print:bg-white print:border-slate-300"
                >
                  <div className="flex items-center gap-3 mb-3 border-b border-slate-200/60 pb-2.5">
                    <span className="px-3 py-1 bg-brand-600 text-white font-black text-xs rounded-lg uppercase tracking-wide shrink-0">
                      Day {d.dayNumber || idx + 1}
                    </span>
                    <h3 className="font-bold text-sm sm:text-base text-slate-900">
                      {d.title.replace(/^Day\s*\d+[:\s-]*/i, "")}
                    </h3>
                  </div>

                  <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 pl-1">
                    {d.points.map((pt, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-2.5 leading-relaxed">
                        <span className="mt-0.5 shrink-0 text-brand-600 font-bold">•</span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Inclusions & Exclusions Grid */}
            <div className="inclusions-block grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8 pt-6 border-t border-slate-200">
              {/* Inclusions */}
              <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 print:bg-white print:border-emerald-300 space-y-3">
                <h4 className="font-extrabold text-sm text-emerald-900 flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                  Package Inclusions
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {itinerary.inclusions.length > 0 ? (
                    itinerary.inclusions.map((inc, iIdx) => (
                      <li key={iIdx} className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>{inc}</span>
                      </li>
                    ))
                  ) : (
                    <>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold">✓</span> Daily Breakfast at Hotel
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold">✓</span> AC Private Vehicle for transfers & sightseeing
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold">✓</span> Tolls, Parking & Driver Allowances
                      </li>
                    </>
                  )}
                </ul>
              </div>

              {/* Exclusions */}
              <div className="p-5 rounded-2xl border border-rose-200 bg-rose-50/40 print:bg-white print:border-rose-300 space-y-3">
                <h4 className="font-extrabold text-sm text-rose-900 flex items-center gap-2">
                  <XCircle size={16} className="text-rose-600 shrink-0" />
                  Package Exclusions
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {itinerary.exclusions.length > 0 ? (
                    itinerary.exclusions.map((exc, eIdx) => (
                      <li key={eIdx} className="flex items-start gap-2">
                        <span className="text-rose-500 font-bold">✕</span>
                        <span>{exc}</span>
                      </li>
                    ))
                  ) : (
                    <>
                      <li className="flex items-start gap-2">
                        <span className="text-rose-500 font-bold">✕</span> Flights & Train Tickets
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-rose-500 font-bold">✕</span> Personal Expenses, Tips & Laundry
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-rose-500 font-bold">✕</span> Monument Entry Fees & Optional Activities
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </div>

            {/* Travel Tips */}
            {itinerary.tips && itinerary.tips.length > 0 && (
              <div className="inclusions-block mt-6 p-4 rounded-2xl border border-amber-200 bg-amber-50/40 print:bg-white text-xs text-slate-700 space-y-2">
                <p className="font-bold text-amber-900 flex items-center gap-1.5">
                  <Lightbulb size={15} className="text-amber-600 shrink-0" />
                  Specialist Travel Tips
                </p>
                <ul className="space-y-1 pl-5 list-disc marker:text-amber-500">
                  {itinerary.tips.map((tip, tIdx) => (
                    <li key={tIdx}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Document Print Footer */}
            <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
              <p>
                Generated via EzzySync Travel Engine • Contact{" "}
                {itinerary.phone || itinerary.agencyName || "Agency"} for bookings
              </p>
              <p>Rates subject to room availability at time of confirmation</p>
            </div>
          </div>

          {/* Upsell Banner (Hidden in Print) */}
          <div
            id="upsell-cta"
            className="p-8 rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-900 text-white text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl print-hide"
          >
            <div className="space-y-2 max-w-xl">
              <span className="text-xs font-extrabold uppercase tracking-widest bg-white/20 text-white px-3 py-1 rounded-full">
                EzzySync Travel CRM
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                Want to send WhatsApp Itineraries & GST Invoices in 1 Click?
              </h3>
              <p className="text-xs sm:text-sm text-brand-100 leading-relaxed">
                Connect your WhatsApp via QR code, auto-capture leads, manage bookings, and let 24x7 AI handle inquiries.
              </p>
            </div>

            <a
              href={`${crmUrl}/register`}
              className="shrink-0 px-8 py-4 bg-white hover:bg-slate-50 text-brand-700 font-extrabold text-sm rounded-2xl shadow-xl transition transform hover:scale-105"
            >
              Start 30-Day Free Trial ➔
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
