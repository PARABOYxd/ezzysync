import React, { useEffect, useState } from 'react';
import Drawer from '../common/Drawer.jsx';
import Input from '../ui/Input.jsx';
import Textarea from '../ui/Textarea.jsx';
import Button from '../ui/Button.jsx';
import * as quotationService from '../../services/quotationService';
import { useToast } from '../../hooks/useToast.jsx';
import * as aiService from '../../services/aiService';
import { uploadFile } from '../../services/uploadService';
import { useAuth } from '../../hooks/useAuth.jsx';
import {
  MapPin, Plus, Trash, ArrowUp, ArrowDown, X,
  ClipboardList, Sparkles, Wand2, IndianRupee, CheckCircle2, XCircle, Navigation,
  Home, Plane, Car, Tag, Calendar, CalendarDays, Users
} from 'lucide-react';

const emptyForm = {
  tripName: '', priceQuote: '',
  itineraryDays: [{ day: 1, title: '', description: '' }],
  inclusions: [], exclusions: [], highlights: [], pickupOptions: [],
  departureDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  tripTypes: ['group', 'customized'],
  hotelCostPerPax: 0, flightCostPerPax: 0, transportCostPerPax: 0, otherCostPerPax: 0, costTemplateId: '',
};

/** Add-a-line list editor used for both Inclusions and Exclusions. */
function TagListEditor({ label, icon: Icon, tone, items, onChange, placeholder }) {
  const [draft, setDraft] = useState('');

  const addItem = () => {
    const value = draft.trim();
    if (!value) return;
    onChange([...items, value]);
    setDraft('');
  };

  const removeItem = (index) => onChange(items.filter((_, i) => i !== index));

  return (
    <div className="space-y-2.5">
      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
        <Icon size={15} className={tone} />
        <span>{label}</span>
      </h4>
      <div className="flex gap-2">
        <Input
          className="flex-1"
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addItem();
            }
          }}
        />
        <Button type="button" onClick={addItem} className="text-xs gap-1 px-4 shrink-0">
          <Plus size={14} /> Add
        </Button>
      </div>
      {items.length > 0 && (
        <ul className="space-y-1.5">
          {items.map((item, index) => (
            <li key={index} className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs text-slate-700">
              <span>{item}</span>
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="text-slate-400 hover:text-rose-600 transition shrink-0"
                title="Remove"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Optional per-pickup-point pricing - each entry is its own absolute total price. */
function PickupOptionsEditor({ items, onChange }) {
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');

  const addItem = () => {
    const loc = location.trim();
    if (!loc || price === '') return;
    onChange([...items, { location: loc, price: Number(price) }]);
    setLocation('');
    setPrice('');
  };

  const removeItem = (index) => onChange(items.filter((_, i) => i !== index));

  return (
    <div className="space-y-2.5">
      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
        <Navigation size={15} className="text-blue-500" />
        <span>Pickup Options (Optional)</span>
      </h4>
      <p className="text-[10px] text-slate-400">Each pickup point gets its own total package price, shown on the client preview.</p>
      <div className="flex gap-2">
        <Input
          className="flex-1"
          placeholder="Pickup location, e.g. Delhi"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <Input
          className="w-32 shrink-0"
          type="number"
          min={0}
          icon={IndianRupee}
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addItem();
            }
          }}
        />
        <Button type="button" onClick={addItem} className="text-xs gap-1 px-4 shrink-0">
          <Plus size={14} /> Add
        </Button>
      </div>
      {items.length > 0 && (
        <ul className="space-y-1.5">
          {items.map((item, index) => (
            <li key={index} className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs text-slate-700">
              <span className="flex items-center gap-1.5"><Navigation size={12} className="text-blue-400" /> {item.location}</span>
              <span className="flex items-center gap-3">
                <span className="font-semibold text-slate-600">₹{item.price}</span>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="text-slate-400 hover:text-rose-600 transition shrink-0"
                  title="Remove"
                >
                  <X size={14} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function QuotationFormModal({ open, onClose, onSaved, quotation, allQuotations = [] }) {
  const { user } = useAuth();
  const isEdit = !!(quotation && quotation.id);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const toast = useToast();

  const [aiDays, setAiDays] = useState(3);
  const [aiRoughIdea, setAiRoughIdea] = useState('');
  const [aiTheme, setAiTheme] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiBuilder, setShowAiBuilder] = useState(false);
  const [aiGeneratedSuccess, setAiGeneratedSuccess] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [selectedBannerFile, setSelectedBannerFile] = useState(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState('');

  const handleBannerUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size too large. Maximum allowed size is 5MB.');
      return;
    }
    
    setSelectedBannerFile(file);
    setBannerPreviewUrl(URL.createObjectURL(file));
  };

  const handleAiItineraryGenerate = async () => {
    const rawTrip = (aiRoughIdea || form.tripName || '').trim();
    if (!rawTrip) {
      toast.error('Please enter a destination or rough trip concept in the AI planner.');
      return;
    }
    if (Number(aiDays) < 1 || Number(aiDays) > 15) {
      toast.error('Please enter a valid number of days (1 to 15).');
      return;
    }
    setAiLoading(true);
    setAiGeneratedSuccess(false);
    try {
      const notesCombined = [
        aiRoughIdea.trim() ? `Trip Concept & Pickups: ${aiRoughIdea.trim()}` : '',
        aiTheme.trim() ? `Preferences & Inclusions: ${aiTheme.trim()}` : '',
      ].filter(Boolean).join(' | ');

      const response = await aiService.generateItinerary({
        tripName: rawTrip,
        days: Number(aiDays),
        notes: notesCombined || rawTrip,
        format: 'full_quotation',
        fullQuotation: true,
      });

      const plan = response?.quotationPlan;
      if (plan) {
        setForm((prev) => {
          const updated = { ...prev };
          // If trip name is empty or matched previous rough idea, update it with refined AI title
          if (!prev.tripName?.trim() || prev.tripName.trim() === aiRoughIdea.trim() || prev.tripName.length < 5) {
            updated.tripName = plan.tripName || prev.tripName || rawTrip;
          }
          // If price quote was empty or 0, update with estimated price
          if ((!prev.priceQuote || Number(prev.priceQuote) === 0) && plan.estimatedPrice) {
            updated.priceQuote = plan.estimatedPrice;
          }
          // Days
          if (Array.isArray(plan.itineraryDays) && plan.itineraryDays.length > 0) {
            updated.itineraryDays = plan.itineraryDays;
          }
          // Highlights
          if (Array.isArray(plan.highlights) && plan.highlights.length > 0) {
            updated.highlights = plan.highlights;
          }
          // Inclusions
          if (Array.isArray(plan.inclusions) && plan.inclusions.length > 0) {
            updated.inclusions = plan.inclusions;
          }
          // Exclusions
          if (Array.isArray(plan.exclusions) && plan.exclusions.length > 0) {
            updated.exclusions = plan.exclusions;
          }
          // Pickups
          if (Array.isArray(plan.pickupOptions) && plan.pickupOptions.length > 0) {
            updated.pickupOptions = plan.pickupOptions;
          }
          // Departure Days
          if (Array.isArray(plan.departureDays) && plan.departureDays.length > 0) {
            updated.departureDays = plan.departureDays;
          }
          // Trip Types
          if (Array.isArray(plan.tripTypes) && plan.tripTypes.length > 0) {
            updated.tripTypes = plan.tripTypes;
          }
          return updated;
        });

        setAiGeneratedSuccess(true);
        toast.success(
          `✨ Complete Quotation Generated! ${plan.itineraryDays?.length || 0} Days, ${plan.highlights?.length || 0} Highlights, Inclusions & Pickups populated.`
        );
      } else if (response?.itinerary && Array.isArray(response.itinerary)) {
        setForm((prev) => ({
          ...prev,
          itineraryDays: response.itinerary,
        }));
        setAiGeneratedSuccess(true);
        toast.success(`✨ Generated a ${aiDays}-day itinerary schedule!`);
      } else {
        toast.error('AI generated invalid structured data format.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate itinerary with AI.');
    } finally {
      setAiLoading(false);
    }
  };

  const [templates, setTemplates] = useState([]);
  const [showCosting, setShowCosting] = useState(false);

  useEffect(() => {
    if (open && user?.role === 'ADMIN') {
      import('../../services/expenseService').then((expenseService) => {
        expenseService.listTemplates().then((data) => {
          setTemplates(data || []);
        }).catch(() => { });
      });
    }
  }, [open, user]);

  const handleCostTemplateChange = (e) => {
    const templateId = e.target.value;
    if (!templateId) {
      setForm((prev) => ({
        ...prev,
        costTemplateId: '',
      }));
      return;
    }
    const t = templates.find((x) => x.id === templateId);
    if (t) {
      setForm((prev) => ({
        ...prev,
        costTemplateId: templateId,
        hotelCostPerPax: Number(t.hotel_cost_per_pax || 0),
        flightCostPerPax: Number(t.flight_cost_per_pax || 0),
        transportCostPerPax: Number(t.transport_cost_per_pax || 0),
        otherCostPerPax: Number(t.other_cost_per_pax || 0),
      }));
      toast.success(`Costing template "${t.template_name}" rates pre-filled!`);
    }
  };

  useEffect(() => {
    if (open) {
      setForm(quotation ? {
        ...emptyForm,
        ...quotation,
        departureDays: Array.isArray(quotation.departureDays || quotation.departure_days) && (quotation.departureDays || quotation.departure_days).length > 0
          ? (quotation.departureDays || quotation.departure_days)
          : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        tripTypes: Array.isArray(quotation.tripTypes || quotation.trip_types) && (quotation.tripTypes || quotation.trip_types).length > 0
          ? (quotation.tripTypes || quotation.trip_types)
          : ['group', 'customized'],
      } : emptyForm);
      setErrors({});
      setShowAiBuilder(false);
      setAiGeneratedSuccess(false);
      setAiRoughIdea(quotation?.tripName || '');
      setAiTheme('');
      setAiDays(quotation?.itineraryDays?.length || 3);
      setBannerPreviewUrl(quotation?.bannerUrl || '');
      setSelectedBannerFile(null);
      
      // Auto-expand costing if existing quotation has saved cost values
      if (quotation && (Number(quotation.hotelCostPerPax) > 0 || Number(quotation.flightCostPerPax) > 0 || Number(quotation.transportCostPerPax) > 0 || Number(quotation.otherCostPerPax) > 0)) {
        setShowCosting(true);
      } else {
        setShowCosting(false);
      }
    }
  }, [open, quotation]);

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
    if (errors[key]) setErrors({ ...errors, [key]: '' });
  };

  const handleDayChange = (index, field, value) => {
    const updated = [...form.itineraryDays];
    updated[index][field] = value;
    setForm({ ...form, itineraryDays: updated });
  };

  const addDay = () => {
    const days = [...form.itineraryDays];
    days.push({ day: days.length + 1, title: '', description: '' });
    setForm({ ...form, itineraryDays: days });
    toast.success(`Day ${days.length} added to itinerary!`);
  };

  const removeDay = (index) => {
    let days = form.itineraryDays.filter((_, i) => i !== index);
    days = days.map((d, idx) => ({ ...d, day: idx + 1 }));
    setForm({ ...form, itineraryDays: days });
  };

  const moveDay = (index, direction) => {
    const days = [...form.itineraryDays];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= days.length) return;
    const temp = days[index];
    days[index] = days[targetIdx];
    days[targetIdx] = temp;
    const reindexed = days.map((d, idx) => ({ ...d, day: idx + 1 }));
    setForm({ ...form, itineraryDays: reindexed });
  };

  const validate = () => {
    const e = {};
    if (!form.tripName) e.tripName = 'Trip / Package name is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    
    // Check if any itinerary day title is empty
    const emptyDay = form.itineraryDays.find(d => !d.title.trim());
    if (emptyDay) {
      toast.error(`Please provide a title for Day ${emptyDay.day} in the itinerary.`);
      return;
    }

    setSaving(true);
    try {
      let finalBannerUrl = form.bannerUrl;

      if (selectedBannerFile) {
        setUploadingBanner(true);
        try {
          finalBannerUrl = await uploadFile(selectedBannerFile);
          setSelectedBannerFile(null);
        } catch (uploadErr) {
          toast.error(uploadErr.response?.data?.message || 'Failed to upload banner.');
          setSaving(false);
          setUploadingBanner(false);
          return;
        }
        setUploadingBanner(false);
      }

      const payload = {
        ...form,
        bannerUrl: finalBannerUrl,
        priceQuote: Number(form.priceQuote || 0),
      };
      if (isEdit) {
        await quotationService.updateQuotation(quotation.quotationId, payload);
        toast.success('Itinerary updated successfully.');
      } else {
        await quotationService.createQuotation(payload);
        toast.success('Itinerary created successfully.');
      }
      onSaved?.();
      onClose();
    } catch {
      toast.error('Could not save itinerary.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title={isEdit ? 'Edit Itinerary' : 'Create Itinerary'}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* AI Auto-Planner Widget */}
        <div className="bg-gradient-to-br from-violet-50/90 via-indigo-50/70 to-purple-50/80 border border-violet-200/80 rounded-2xl p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={() => setShowAiBuilder(!showAiBuilder)}
              className="flex items-center gap-2.5 text-left focus:outline-none flex-1 group cursor-pointer"
            >
              <div className="p-2 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-sm shrink-0 group-hover:scale-105 transition">
                <Wand2 size={16} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    AI Tour Planner: 1-Click Complete Package Generator
                  </span>
                  <span className="bg-violet-100 text-violet-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-violet-200/60">
                    Auto-fills All Fields
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                  Fills Days, Route Attractions (Devprayag, Rudraprayag...), Inclusions, Exclusions & Pickups with price
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setShowAiBuilder(!showAiBuilder)}
              className="ml-3 bg-white hover:bg-violet-50 text-violet-700 border border-violet-200 px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer shrink-0"
            >
              {showAiBuilder ? 'Hide Planner' : 'Open Planner'}
            </button>
          </div>

          {showAiBuilder && (
            user?.planId === 'FREE' ? (
              <div className="pt-3 mt-3 border-t border-violet-100/60 text-center py-4 space-y-2">
                <p className="text-xs text-slate-500 font-semibold">✨ AI Tour Planner is a Premium Feature</p>
                <p className="text-[10px] text-slate-400">Upgrade to Pro in the AI Tools page to unlock auto-generation.</p>
              </div>
            ) : (
              <div className="space-y-3.5 pt-3.5 mt-3.5 border-t border-violet-200/60 text-xs">
                {/* Destination & Rough Idea */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Destination / Rough Trip Concept & Pickups <span className="text-rose-500">*</span>
                  </label>
                  <Textarea
                    rows={2}
                    placeholder="e.g. 3D/2N Chopta Tungnath Trek from Delhi 4500 & Rishikesh 3500 via Devprayag, Rudraprayag with camping & meals"
                    value={aiRoughIdea}
                    onChange={(e) => setAiRoughIdea(e.target.value)}
                    className="w-full text-xs"
                    inputClassName="bg-white focus:ring-violet-400/20 focus:border-violet-400 border-violet-200 text-xs placeholder:text-slate-400 rounded-xl"
                  />
                  <p className="text-[10px] text-violet-700 mt-1 flex items-center gap-1 font-medium">
                    <span>💡</span> Mention pickup cities and prices (e.g. "Delhi 4500, Rishikesh 3500") and AI will automatically prefill pickup options with those rates!
                  </p>
                </div>

                {/* Days & Preferences */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <Input
                    className="sm:col-span-1"
                    label="Number of Days"
                    type="number"
                    min={1}
                    max={15}
                    value={aiDays}
                    onChange={(e) => setAiDays(Math.max(1, Math.min(15, Number(e.target.value))))}
                    inputClassName="bg-white focus:ring-violet-400/20 focus:border-violet-400 border-violet-200 text-xs rounded-xl"
                  />
                  <Input
                    className="sm:col-span-3"
                    label="Travel Style & Preferences (Optional)"
                    type="text"
                    placeholder="e.g. Luxury alpine tents, bonfire & music, vegetarian meals, sunset photography..."
                    value={aiTheme}
                    onChange={(e) => setAiTheme(e.target.value)}
                    inputClassName="bg-white focus:ring-violet-400/20 focus:border-violet-400 border-violet-200 text-xs placeholder:text-slate-400 rounded-xl"
                  />
                </div>

                {/* Quick Suggestion Chips */}
                <div className="space-y-1.5 pt-0.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quick Suggestions:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: '🏔️ Chopta Tungnath (3D)', prompt: 'Chopta Tungnath & Chandrashila Peak Trek with Delhi 4500 & Rishikesh 3500 pickup, visiting Devprayag Sangam & Rudraprayag', days: 3 },
                      { label: '🌊 Kerala Backwaters (5D)', prompt: '5N/6D Kerala Backwaters & Munnar Tea Gardens with luxury houseboat and Cochin pickup 18000', days: 5 },
                      { label: '❄️ Manali & Kasol (4D)', prompt: '4D/3N Manali, Solang Valley, Atal Tunnel & Kasol with Delhi pickup 6500 and Chandigarh pickup 5500', days: 4 },
                      { label: '🛕 Kedarnath Yatra (5D)', prompt: '5D/4N Kedarnath Yatra with Guptkashi, Devprayag, Rudraprayag and Haridwar pickup 9500', days: 5 },
                      { label: '🏜️ Jaisalmer Desert (3D)', prompt: '3D/2N Jaisalmer Desert Safari, Sam Sand Dunes camp, Fort visit with Jodhpur pickup 5500', days: 3 },
                      { label: '🏖️ Goa Beach Holiday (4D)', prompt: '4D/3N Goa Holiday covering North & South Goa, Calangute, Dudhsagar and Goa airport pickup 8500', days: 4 },
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setAiRoughIdea(item.prompt);
                          setAiDays(item.days);
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-violet-100/70 border border-violet-200 rounded-lg text-[10px] font-semibold text-violet-800 transition shadow-2xs cursor-pointer active:scale-95"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-violet-200/60">
                  <div className="text-[11px] text-slate-500">
                    {aiLoading ? (
                      <span className="text-violet-700 font-semibold flex items-center gap-1.5 animate-pulse">
                        <Sparkles size={14} className="text-violet-600 animate-spin" />
                        AI is compiling days, attraction spots, inclusions, exclusions & pickup rates...
                      </span>
                    ) : aiGeneratedSuccess ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        Complete package generated! All fields below have been auto-filled.
                      </span>
                    ) : (
                      'Auto-fills itinerary timeline, attractions, inclusions, exclusions & pickups in seconds.'
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={aiLoading}
                    onClick={handleAiItineraryGenerate}
                    className="px-5 h-10 bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-95 text-white font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Sparkles size={14} className={aiLoading ? 'animate-spin' : ''} />
                    {aiLoading ? 'Drafting Full Package...' : '✨ Generate & Prefill Complete Package'}
                  </button>
                </div>
              </div>
            )
          )}
        </div>

        {/* Trip Name + Price Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            className="sm:col-span-2"
            label="Trip / Itinerary Name"
            icon={MapPin}
            required
            error={errors.tripName}
            hint="This name appears on the client preview link"
            placeholder="e.g. 5N/6D Kerala Backwaters Luxury Tour"
            value={form.tripName}
            onChange={set('tripName')}
          />
          <Input
            label="Package Price (₹)"
            icon={IndianRupee}
            type="number"
            min={0}
            placeholder="e.g. 45000"
            hint="Total price shown on itinerary preview"
            value={form.priceQuote}
            onChange={set('priceQuote')}
          />
        </div>

        {/* Departure Days & Tour Availability */}
        <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-4 space-y-3 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-2.5">
            <div>
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                <Calendar size={14} className="text-brand-600" />
                <span>Tour Availability & Departure Schedule</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                AI WhatsApp assistant and client preview links use this to answer when the trip departs and whether it can be customized.
              </p>
            </div>

            {/* Quick Status Pill */}
            <div className="flex items-center gap-1">
              {form.departureDays?.length === 7 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 size={11} className="text-emerald-600" /> Daily Departure
                </span>
              ) : form.departureDays?.length > 0 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  <Calendar size={11} className="text-blue-600" /> Every {form.departureDays.join(', ')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
                  Custom / On Request Dates
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tour Type / Format Checkboxes */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                <Users size={13} className="text-slate-500" />
                <span>Tour Type Availability:</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const exists = form.tripTypes?.includes('group');
                    const updated = exists
                      ? form.tripTypes.filter((t) => t !== 'group')
                      : [...(form.tripTypes || []), 'group'];
                    setForm({ ...form, tripTypes: updated });
                  }}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                    form.tripTypes?.includes('group')
                      ? 'bg-brand-50/90 border-brand-500 text-brand-800 ring-1 ring-brand-500/30 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Users size={14} className={form.tripTypes?.includes('group') ? 'text-brand-600' : 'text-slate-400'} />
                    <span>Fixed Batch / Group</span>
                  </span>
                  <input
                    type="checkbox"
                    readOnly
                    checked={form.tripTypes?.includes('group') || false}
                    className="checkbox checkbox-xs checkbox-primary pointer-events-none"
                  />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const exists = form.tripTypes?.includes('customized');
                    const updated = exists
                      ? form.tripTypes.filter((t) => t !== 'customized')
                      : [...(form.tripTypes || []), 'customized'];
                    setForm({ ...form, tripTypes: updated });
                  }}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                    form.tripTypes?.includes('customized')
                      ? 'bg-violet-50/90 border-violet-500 text-violet-800 ring-1 ring-violet-500/30 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles size={14} className={form.tripTypes?.includes('customized') ? 'text-violet-600' : 'text-slate-400'} />
                    <span>Customized / Private</span>
                  </span>
                  <input
                    type="checkbox"
                    readOnly
                    checked={form.tripTypes?.includes('customized') || false}
                    className="checkbox checkbox-xs checkbox-secondary pointer-events-none"
                  />
                </button>
              </div>
              <p className="text-[10px] text-slate-400">Select both if your agency offers both group batch and private options.</p>
            </div>

            {/* Departure Days Pills */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                  <CalendarDays size={13} className="text-slate-500" />
                  <span>Departure Days:</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, departureDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] })}
                    className="text-[10px] font-bold text-brand-600 hover:underline px-1.5 py-0.5 rounded cursor-pointer"
                  >
                    Daily (All 7)
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, departureDays: ['Fri', 'Sat'] })}
                    className="text-[10px] font-bold text-slate-600 hover:underline px-1.5 py-0.5 rounded cursor-pointer"
                  >
                    Weekends (Fri-Sat)
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, departureDays: [] })}
                    className="text-[10px] font-medium text-slate-400 hover:text-rose-600 px-1 py-0.5 rounded cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* 7 Days of the week */}
              <div className="grid grid-cols-7 gap-1.5">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                  const isSelected = form.departureDays?.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        const days = form.departureDays || [];
                        const updated = days.includes(day)
                          ? days.filter((d) => d !== day)
                          : [...days, day];
                        setForm({ ...form, departureDays: updated });
                      }}
                      className={`h-9 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer border ${
                        isSelected
                          ? 'bg-brand-600 text-white border-brand-600 shadow-xs scale-102'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                      title={day}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400">
                {form.departureDays?.length === 7
                  ? 'All 7 days selected: Means Daily Departure (Departs all 7 days of the week).'
                  : form.departureDays?.length > 0
                  ? `Selected departures: Every ${form.departureDays.join(', ')}`
                  : 'No days selected: Departure on custom request.'}
              </p>
            </div>
          </div>
        </div>

        {/* Itinerary Builder Header */}
        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div>
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <ClipboardList size={15} className="text-brand-500" />
              <span>Day-by-Day Itinerary Timeline ({form.itineraryDays.length} Days)</span>
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5">Rearrange, add or delete tour schedule nodes instantly</p>
          </div>
          <Button type="button" onClick={addDay} className="text-xs gap-1.5 px-4">
            <Plus size={14} /> Add Day
          </Button>
        </div>

        {/* Days Timeline Loop */}
        <div className="relative pl-10 space-y-6 max-h-[380px] overflow-y-auto pr-2 py-2">
          {/* Vertical Timeline Path Line */}
          <div className="absolute left-[1.5rem] top-4 bottom-8 w-0.5 border-l-2 border-dashed border-slate-200" />

          {form.itineraryDays.map((d, index) => (
            <div key={index} className="relative bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition duration-200 space-y-4">
              {/* Circle Node on timeline */}
              <div className="absolute -left-[1.625rem] top-[1.375rem] w-6 h-6 rounded-full bg-brand-50 border-2 border-brand-500 flex items-center justify-center shadow-sm">
                <span className="text-[10px] font-extrabold text-brand-600">{d.day}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bg-brand-50 text-brand-700 px-3 py-1 rounded-lg text-xs font-extrabold tracking-wide uppercase">
                    Day {d.day} Plan
                  </span>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveDay(index, -1)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent transition"
                    title="Move Day Up"
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    type="button"
                    disabled={index === form.itineraryDays.length - 1}
                    onClick={() => moveDay(index, 1)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent transition"
                    title="Move Day Down"
                  >
                    <ArrowDown size={15} />
                  </button>
                  {form.itineraryDays.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDay(index)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 transition ml-1"
                      title="Delete Day"
                    >
                      <Trash size={15} />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <Input
                  label="Day Title / Milestone"
                  placeholder={`e.g. Day ${d.day} - Arrival at Airport, Transfer to Hotel & Welcome Dinner`}
                  value={d.title}
                  onChange={(e) => handleDayChange(index, 'title', e.target.value)}
                />

                <Textarea
                  label="Schedule Details & Inclusions"
                  rows={2}
                  placeholder="Describe hotel check-ins, attractions visited, tour guides, transport type, and meals included (B/L/D)..."
                  value={d.description}
                  onChange={(e) => handleDayChange(index, 'description', e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Inclusions / Exclusions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
          <TagListEditor
            label="Inclusions"
            icon={CheckCircle2}
            tone="text-emerald-500"
            items={form.inclusions}
            onChange={(items) => setForm({ ...form, inclusions: items })}
            placeholder="e.g. Airport pickup & drop"
          />
          <TagListEditor
            label="Exclusions"
            icon={XCircle}
            tone="text-rose-500"
            items={form.exclusions}
            onChange={(items) => setForm({ ...form, exclusions: items })}
            placeholder="e.g. Airfare / train tickets"
          />
        </div>

        {/* Highlights (Optional) */}
        <div className="pt-2 border-t border-slate-200">
          <TagListEditor
            label="Trip Highlights (Optional)"
            icon={Sparkles}
            tone="text-violet-500"
            items={form.highlights}
            onChange={(items) => setForm({ ...form, highlights: items })}
            placeholder="e.g. Sunset houseboat cruise"
          />
        </div>

        {/* Pickup Options (Optional) */}
        <div className="pt-2 border-t border-slate-200">
          <PickupOptionsEditor
            items={form.pickupOptions}
            onChange={(items) => setForm({ ...form, pickupOptions: items })}
          />
        </div>

        {/* Advanced Settings: Banner & Related Trips */}
        <div className="pt-4 border-t border-slate-200 space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <span>Banner Image (Optional)</span>
            </label>
            <div className="flex items-center gap-4 bg-slate-50/50 dark:bg-zinc-800/25 p-3 rounded-xl border border-slate-200 dark:border-zinc-800">
              {bannerPreviewUrl ? (
                <div className="relative group shrink-0 w-24 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-700 bg-white">
                  <img src={bannerPreviewUrl} alt="Banner" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setForm({ ...form, bannerUrl: '' });
                      setSelectedBannerFile(null);
                      setBannerPreviewUrl('');
                    }}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-medium transition"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="w-24 h-16 rounded-lg border-2 border-dashed border-slate-300 dark:border-zinc-700 flex items-center justify-center text-slate-400 text-xs shrink-0 bg-white dark:bg-zinc-900">
                  No Image
                </div>
              )}
              <div className="flex flex-col gap-2">
                <label className={`btn btn-xs ${uploadingBanner ? 'loading btn-disabled' : 'btn-outline btn-primary'} cursor-pointer text-[10px] w-fit px-2.5 py-1 rounded border border-brand-500 text-brand-600 hover:bg-brand-50 transition`}>
                  {uploadingBanner ? 'Uploading...' : 'Upload Banner'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingBanner}
                    onChange={handleBannerUpload}
                  />
                </label>
                <p className="text-[10px] text-slate-400">This image will be used as the background banner for the public itinerary link.</p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-800">Related Trips / Other Itineraries to Show (Optional)</label>
            <p className="text-[10px] text-slate-400">Select other itineraries you want to display at the bottom of this itinerary preview.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto p-2 bg-slate-50 border border-slate-100 rounded-xl">
              {(allQuotations || []).filter(q => q.quotationId !== form.quotationId).map(q => (
                <label key={q.quotationId} className="flex items-center gap-2 text-xs text-slate-700 bg-white p-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-xs rounded-sm checkbox-primary"
                    checked={(form.relatedQuotations || []).some(rq => rq.quotationId === q.quotationId)}
                    onChange={(e) => {
                      let related = [...(form.relatedQuotations || [])];
                      if (e.target.checked) {
                        related.push({
                          quotationId: q.quotationId,
                          id: q.id,
                          tripName: q.tripName,
                          priceQuote: q.priceQuote,
                          days: q.itineraryDays?.length || 0
                        });
                      } else {
                        related = related.filter(rq => rq.quotationId !== q.quotationId);
                      }
                      setForm({ ...form, relatedQuotations: related });
                    }}
                  />
                  <div className="truncate">
                    <span className="font-semibold">{q.tripName}</span>
                    <span className="text-[10px] text-slate-400 ml-1">({q.itineraryDays?.length || 0}D)</span>
                  </div>
                </label>
              ))}
              {(allQuotations || []).length <= 1 && (
                <div className="col-span-full text-center text-xs text-slate-400 py-4">No other itineraries available to link.</div>
              )}
            </div>
          </div>
        </div>

        {/* Toggle Button for Costing Section - Admin Only */}
        {user?.role === 'ADMIN' && (
          <div className="flex justify-start pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowCosting(!showCosting)}
              className="text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100/70 border border-brand-100 rounded-xl px-4 py-2.5 flex items-center gap-1.5 shadow-sm transition active:scale-[0.98]"
            >
              <IndianRupee size={14} />
              {showCosting ? 'Hide Costing' : 'Add Costing (Internal)'}
            </button>
          </div>
        )}

        {/* Costing Section - Admin Only */}
        {user?.role === 'ADMIN' && showCosting && (
          <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-2xl space-y-4 animate-[fadeIn_0.15s_ease-out]">
            <div className="flex flex-col gap-1.5 w-full max-w-md">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Select Costing</label>
              <select
                value={form.costTemplateId || ''}
                onChange={handleCostTemplateChange}
                className="w-full bg-white text-slate-700 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-brand-500/20 focus:border-brand-500 outline-none shadow-sm cursor-pointer"
              >
                <option value="">Select Costing</option>
                {/* Priority matches for current trip name */}
                {templates
                  .filter(t => form.tripName && t.trip_name.toLowerCase() === form.tripName.toLowerCase())
                  .map(t => (
                    <option key={t.id} value={t.id}>{t.trip_name} - {t.template_name} (Hotel: ₹{t.hotel_cost_per_pax})</option>
                  ))
                }
                {templates.length > 0 && <option disabled>────────── Other Trip Templates ──────────</option>}
                {templates
                  .filter(t => !form.tripName || t.trip_name.toLowerCase() !== form.tripName.toLowerCase())
                  .map(t => (
                    <option key={t.id} value={t.id}>{t.trip_name} - {t.template_name} (Hotel: ₹{t.hotel_cost_per_pax})</option>
                  ))
                }
              </select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Input label="Hotel Cost / Pax (₹)" icon={Home} type="number" min={0} placeholder="e.g. 3000" value={form.hotelCostPerPax || ''} onChange={set('hotelCostPerPax')} />
              <Input label="Flight Cost / Pax (₹)" icon={Plane} type="number" min={0} placeholder="e.g. 5000" value={form.flightCostPerPax || ''} onChange={set('flightCostPerPax')} />
              <Input label="Transport Cost / Pax (₹)" icon={Car} type="number" min={0} placeholder="e.g. 15000" value={form.transportCostPerPax || ''} onChange={set('transportCostPerPax')} />
              <Input label="Other Cost / Pax (₹)" icon={Tag} type="number" min={0} placeholder="e.g. 1000" value={form.otherCostPerPax || ''} onChange={set('otherCostPerPax')} />
            </div>
          </div>
        )}

        {/* Footer Controls */}
        <div className="flex justify-between items-center pt-5 border-t border-slate-200">
          <span className="text-xs text-slate-500 font-medium">Fields with * are mandatory</span>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="text-xs gap-1.5">
              {saving ? 'Saving...' : isEdit ? 'Update Itinerary' : 'Create Itinerary'}
            </Button>
          </div>
        </div>
      </form>
    </Drawer>
  );
}
