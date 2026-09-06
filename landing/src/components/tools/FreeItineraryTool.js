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
  CheckCircle2,
  CheckCircle,
  XCircle,
  Lightbulb,
  Edit3,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  FileText,
} from "lucide-react";
import { generateFreeItinerary } from "@/lib/api";
import {
  buildSmartItinerary,
  parseMarkdownToStructuredItinerary,
  formatItineraryForWhatsapp,
} from "@/lib/smartItineraryEngine";

const TRIP_STYLES = [
  "Family Vacation",
  "Honeymoon & Romantic",
  "Friends & Group Tour",
  "Luxury & Leisure",
  "Budget Backpacker",
  "Adventure & Trekking",
];

export default function FreeItineraryTool({ crmUrl }) {
  // Step 1: Input Form state
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState(5);
  const [tripType, setTripType] = useState("Family Vacation");
  const [agencyName, setAgencyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [roughNotes, setRoughNotes] = useState("");

  // Workflow steps: 'input' | 'preview' | 'final'
  const [step, setStep] = useState("input");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Structured itinerary state (editable)
  const [itinerary, setItinerary] = useState(null);

  // Helper inputs for adding new items in preview
  const [newInclusionInput, setNewInclusionInput] = useState("");
  const [newExclusionInput, setNewExclusionInput] = useState("");
  const [newTipInput, setNewTipInput] = useState("");

  // Generation handler
  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!destination.trim()) return;

    setLoading(true);
    setCopied(false);

    let structuredData = null;

    try {
      const res = await generateFreeItinerary({
        destination: destination.trim(),
        days,
        tripType,
        agencyName: agencyName.trim() || "Your Travel Partner",
        phone: phone.trim(),
        email: email.trim(),
        description: roughNotes.trim(),
      });

      if (res?.itinerary && res.itinerary.trim().length > 50) {
        structuredData = parseMarkdownToStructuredItinerary(res.itinerary, {
          destination: destination.trim(),
          days,
          tripType,
          agencyName: agencyName.trim() || "Your Travel Partner",
          phone: phone.trim(),
          email: email.trim(),
        });
      }
    } catch (err) {
      console.warn("Backend AI call error, running client smart engine:", err);
    }

    // If backend unavailable or returned blank, generate high-quality destination-aware itinerary
    if (!structuredData) {
      structuredData = buildSmartItinerary({
        destination: destination.trim(),
        days,
        tripType,
        agencyName: agencyName.trim() || "Your Travel Partner",
        phone: phone.trim(),
        email: email.trim(),
        roughNotes: roughNotes.trim(),
      });
    }

    setItinerary(structuredData);
    setStep("preview");
    setLoading(false);

    setTimeout(() => {
      const el = document.getElementById("itinerary-step-anchor");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }, 150);
  };

  // ==========================================
  // ITINERARY EDITING HANDLERS (PREVIEW MODE)
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
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }, 100);
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
    setStep("input");
    setDestination("");
    setRoughNotes("");
    setItinerary(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-12">
      <div id="itinerary-step-anchor" />

      {/* ==========================================================
          STEP PROGRESS BAR
          ========================================================== */}
      <div className="flex items-center justify-center gap-2 sm:gap-4 print-hide text-xs sm:text-sm font-semibold">
        <button
          type="button"
          onClick={() => setStep("input")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full transition cursor-pointer ${
            step === "input"
              ? "bg-brand-600 text-white shadow-md shadow-brand-500/20"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-black/15 flex items-center justify-center text-xs font-black">
            1
          </span>
          <span>Trip Details</span>
        </button>

        <span className="text-slate-300">➔</span>

        <button
          type="button"
          disabled={!itinerary}
          onClick={() => itinerary && setStep("preview")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full transition ${
            !itinerary
              ? "opacity-50 cursor-not-allowed bg-slate-100 text-slate-400 border border-slate-200"
              : step === "preview"
              ? "bg-brand-600 text-white shadow-md shadow-brand-500/20 cursor-pointer"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-black/15 flex items-center justify-center text-xs font-black">
            2
          </span>
          <span>Review & Edit Preview</span>
        </button>

        <span className="text-slate-300">➔</span>

        <button
          type="button"
          disabled={!itinerary}
          onClick={() => itinerary && setStep("final")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full transition ${
            !itinerary
              ? "opacity-50 cursor-not-allowed bg-slate-100 text-slate-400 border border-slate-200"
              : step === "final"
              ? "bg-brand-600 text-white shadow-md shadow-brand-500/20 cursor-pointer"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-black/15 flex items-center justify-center text-xs font-black">
            3
          </span>
          <span>Final Itinerary & PDF</span>
        </button>
      </div>

      {/* ==========================================================
          STEP 1: GENERATOR FORM
          ========================================================== */}
      {step === "input" && (
        <div
          id="generator-card"
          className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-xl shadow-slate-200/50 relative overflow-hidden print-hide"
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-brand-500/10 via-amber-500/5 to-transparent rounded-bl-full pointer-events-none" />

          <form onSubmit={handleGenerate} className="space-y-8 relative z-10">
            {/* Form Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Destination */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <MapPin size={14} className="text-brand-600" />
                  Destination Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Manali, Kashmir, Bali, Goa, Dubai, Paris..."
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 focus:border-brand-500 focus:bg-white rounded-xl px-4 py-3 outline-none transition font-medium text-slate-800 placeholder:text-slate-400"
                />
              </div>

              {/* Number of Days */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar size={14} className="text-brand-600" />
                  Trip Duration (Days)
                </label>
                <select
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="w-full text-sm bg-slate-50 border border-slate-200 focus:border-brand-500 focus:bg-white rounded-xl px-4 py-3 outline-none transition font-medium text-slate-800 cursor-pointer"
                >
                  <option value={3}>3 Days / 2 Nights</option>
                  <option value={4}>4 Days / 3 Nights</option>
                  <option value={5}>5 Days / 4 Nights</option>
                  <option value={6}>6 Days / 5 Nights</option>
                  <option value={7}>7 Days / 6 Nights (1 Week)</option>
                  <option value={8}>8 Days / 7 Nights</option>
                  <option value={10}>10 Days / 9 Nights</option>
                </select>
              </div>

              {/* Trip Style */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-brand-600" />
                  Trip Style
                </label>
                <select
                  value={tripType}
                  onChange={(e) => setTripType(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 focus:border-brand-500 focus:bg-white rounded-xl px-4 py-3 outline-none transition font-medium text-slate-800 cursor-pointer"
                >
                  {TRIP_STYLES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Agency Name */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Building2 size={14} className="text-brand-600" />
                  Agency Name (For PDF Header)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Royal Travels Pvt Ltd"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 focus:border-brand-500 focus:bg-white rounded-xl px-4 py-3 outline-none transition font-medium text-slate-800"
                />
              </div>

              {/* WhatsApp Number */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Phone size={14} className="text-emerald-600" />
                  WhatsApp / Mobile Number
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 focus:border-brand-500 focus:bg-white rounded-xl px-4 py-3 outline-none transition font-medium text-slate-800"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Mail size={14} className="text-blue-600" />
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  placeholder="info@travelagency.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 focus:border-brand-500 focus:bg-white rounded-xl px-4 py-3 outline-none transition font-medium text-slate-800"
                />
              </div>
            </div>

            {/* Rough Itinerary / Description Textarea */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <FileText size={15} className="text-brand-600" />
                  <span>Rough Itinerary Description & Custom Requirements</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-brand-100 text-brand-700">
                    AI Guided
                  </span>
                </label>
                <span className="text-[11px] text-slate-400 font-medium">
                  Optional • Freeform Notes
                </span>
              </div>

              <textarea
                rows={4}
                value={roughNotes}
                onChange={(e) => setRoughNotes(e.target.value)}
                placeholder="Type your rough itinerary notes here. For example:
Day 1: Reach from Delhi, check-in to hotel, evening walk at Mall Road.
Day 2: Solang Valley adventure activities and Atal Tunnel, night stay at resort.
Day 3: Naggar Castle and local cafes.
Day 4: River rafting & departure.
Included: 3-Star Hotel Stay, Daily Breakfast & Dinner, Private AC Cab for all sightseeing."
                className="w-full text-sm bg-slate-50 border border-slate-200 focus:border-brand-500 focus:bg-white rounded-2xl p-4 outline-none transition font-medium text-slate-800 leading-relaxed placeholder:text-slate-400 resize-y"
              />

              <p className="text-xs text-slate-500 flex items-center gap-1.5 pl-1">
                <Lightbulb size={14} className="text-amber-500 shrink-0" />
                <span>
                  Mention day-wise stops, night stays, and inclusions (meals, cab, hotels). AI
                  will format it into a professional day-wise voucher that you can edit!
                </span>
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                <span>100% Free • Preview & Edit Before Finalizing • A4 Printable PDF</span>
              </div>

              <button
                type="submit"
                disabled={loading || !destination.trim()}
                className="w-full sm:w-auto px-8 py-3.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-500/25 transition cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating Itinerary...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Generate & Review Itinerary ➔
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==========================================================
          STEP 2: INTERACTIVE EDITABLE PREVIEW
          ========================================================== */}
      {step === "preview" && itinerary && (
        <div className="space-y-6 print-hide">
          {/* Notification / Control Bar */}
          <div className="p-5 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-amber-500 text-white font-extrabold text-[11px] uppercase tracking-wide">
                  Draft Preview Mode
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {itinerary.days.length} Days • {itinerary.destination}
                </span>
              </div>
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Edit3 size={16} className="text-brand-600" />
                Review & Edit Itinerary Details
              </h3>
              <p className="text-xs text-slate-600">
                You can edit day titles, activities, stay points, inclusions, and exclusions before
                generating the final voucher.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setStep("input")}
                className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft size={14} />
                Back to Form
              </button>

              <button
                type="button"
                onClick={handleFinalize}
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-extrabold transition shadow-md shadow-brand-500/20 cursor-pointer flex items-center gap-2"
              >
                <span>Confirm & Create Final Itinerary</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Editable Itinerary Workspace */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-lg space-y-8">
            {/* Header info */}
            <div className="space-y-3 pb-6 border-b border-slate-200">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Package Title
              </label>
              <input
                type="text"
                value={itinerary.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full text-lg sm:text-xl font-black text-slate-900 bg-slate-50 focus:bg-white border border-slate-200 focus:border-brand-500 rounded-xl px-4 py-2.5 outline-none transition"
              />
              <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-1">
                <span>📍 Destination: <strong className="text-slate-800">{itinerary.destination}</strong></span>
                <span>📅 Duration: <strong className="text-slate-800">{itinerary.days.length} Days / {Math.max(1, itinerary.days.length - 1)} Nights</strong></span>
                <span>✨ Style: <strong className="text-slate-800">{itinerary.tripType}</strong></span>
                <span>🏢 Agency: <strong className="text-slate-800">{itinerary.agencyName}</strong></span>
              </div>
            </div>

            {/* Day by Day Cards Editor */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <Calendar size={16} className="text-brand-600" />
                  Day-by-Day Schedule ({itinerary.days.length} Days)
                </h4>
                <button
                  type="button"
                  onClick={handleAddDay}
                  className="px-3.5 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold border border-brand-200 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  Add Another Day
                </button>
              </div>

              <div className="space-y-4">
                {itinerary.days.map((day, dIdx) => (
                  <div
                    key={dIdx}
                    className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3.5 hover:border-slate-300 transition"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="px-2.5 py-1 rounded-md bg-brand-600 text-white font-black text-xs shrink-0">
                          Day {day.dayNumber || dIdx + 1}
                        </span>
                        <input
                          type="text"
                          value={day.title}
                          onChange={(e) => handleDayTitleChange(dIdx, e.target.value)}
                          className="w-full text-sm font-bold text-slate-900 bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:border-brand-500 outline-none"
                        />
                      </div>
                      {itinerary.days.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDay(dIdx)}
                          title="Remove this day"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>

                    {/* Points list */}
                    <div className="space-y-2 pl-2">
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
                      <div className="pt-1 pl-4">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
              {/* Inclusions */}
              <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/30 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-emerald-900 flex items-center gap-2">
                    <CheckCircle size={16} className="text-emerald-600" />
                    Package Inclusions
                  </h4>
                  <span className="text-xs text-emerald-700 font-semibold">
                    {itinerary.inclusions.length} items
                  </span>
                </div>

                <div className="space-y-2">
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
              <div className="p-5 rounded-2xl border border-rose-200 bg-rose-50/30 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-rose-900 flex items-center gap-2">
                    <XCircle size={16} className="text-rose-600" />
                    Package Exclusions
                  </h4>
                  <span className="text-xs text-rose-700 font-semibold">
                    {itinerary.exclusions.length} items
                  </span>
                </div>

                <div className="space-y-2">
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
            <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50/30 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-amber-900 flex items-center gap-2">
                  <Lightbulb size={16} className="text-amber-600" />
                  Specialist Travel Tips
                </h4>
                <span className="text-xs text-amber-700 font-semibold">
                  {(itinerary.tips || []).length} tips
                </span>
              </div>

              <div className="space-y-2">
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

            {/* Bottom Finalize CTA */}
            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setStep("input")}
                className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ArrowLeft size={14} />
                Back to Edit Form
              </button>

              <button
                type="button"
                onClick={handleFinalize}
                className="w-full sm:w-auto px-8 py-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-extrabold transition shadow-lg shadow-brand-500/25 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Confirm & Create Final Itinerary</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================
          STEP 3: FINAL ITINERARY VOUCHER & PRINT VIEW
          ========================================================== */}
      {step === "final" && itinerary && (
        <div className="space-y-6">
          {/* Action Bar (Hidden in Print) */}
          <div
            id="action-bar"
            className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900 text-white rounded-2xl shadow-xl print-hide"
          >
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <div>
                <p className="font-bold text-sm text-white">
                  {itinerary.destination} ({itinerary.days.length} Days /{" "}
                  {Math.max(1, itinerary.days.length - 1)} Nights)
                </p>
                <p className="text-xs text-slate-400">
                  Ready to download PDF, print, or send on WhatsApp
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setStep("preview")}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-bold transition cursor-pointer border border-amber-300/20"
              >
                <Edit3 size={14} />
                Edit Details
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                {copied ? "Copied!" : "Copy WhatsApp Text"}
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-extrabold transition shadow-md shadow-brand-500/20 cursor-pointer"
              >
                <Printer size={15} />
                Download / Print A4 PDF
              </button>

              <button
                type="button"
                onClick={handleReset}
                title="Create New Itinerary"
                className="flex items-center gap-1 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <RotateCcw size={13} />
                New
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
                  <span>✨ {itinerary.tripType}</span>
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
                        <span className="text-emerald-600 font-bold">✓</span> Daily Breakfast at
                        Hotel
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold">✓</span> AC Private Vehicle for
                        transfers & sightseeing
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold">✓</span> Tolls, Parking & Driver
                        Allowances
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
                        <span className="text-rose-500 font-bold">✕</span> Personal Expenses, Tips &
                        Laundry
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-rose-500 font-bold">✕</span> Monument Entry Fees &
                        Optional Activities
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </div>

            {/* Travel Tips (If any) */}
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
                Connect your WhatsApp via QR code, auto-capture leads, manage bookings, and let 24x7
                AI handle inquiries.
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
