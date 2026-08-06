import React, { useEffect, useState } from 'react';
import Drawer from '../common/Drawer.jsx';
import Input from '../ui/Input.jsx';
import Textarea from '../ui/Textarea.jsx';
import Button from '../ui/Button.jsx';
import * as quotationService from '../../services/quotationService';
import { useToast } from '../../hooks/useToast.jsx';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth.jsx';
import {
  MapPin, Plus, Trash, ArrowUp, ArrowDown, X,
  ClipboardList, Sparkles, Wand2, IndianRupee, CheckCircle2, XCircle, Navigation,
  Home, Plane, Car, Tag
} from 'lucide-react';

const emptyForm = {
  tripName: '', priceQuote: '',
  itineraryDays: [{ day: 1, title: '', description: '' }],
  inclusions: [], exclusions: [], highlights: [], pickupOptions: [],
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

  const [aiDays, setAiDays] = useState(5);
  const [aiTheme, setAiTheme] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiBuilder, setShowAiBuilder] = useState(false);

  const handleAiItineraryGenerate = async () => {
    if (!form.tripName) {
      toast.error('Please fill in the Trip Name / Package Title first.');
      return;
    }
    if (Number(aiDays) < 1 || Number(aiDays) > 15) {
      toast.error('Please enter a valid number of days (1 to 15).');
      return;
    }
    setAiLoading(true);
    try {
      const response = await api.post('/ai/generate-itinerary', {
        tripName: form.tripName,
        days: Number(aiDays),
        notes: aiTheme,
        format: 'json',
      });
      
      if (response.data?.itinerary && Array.isArray(response.data.itinerary)) {
        setForm((prev) => ({
          ...prev,
          itineraryDays: response.data.itinerary,
        }));
        toast.success(`✨ AI generated and autofilled a ${aiDays}-day itinerary successfully!`);
        setShowAiBuilder(false);
        setAiTheme('');
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
      setForm(quotation ? { ...emptyForm, ...quotation } : emptyForm);
      setErrors({});
      setShowAiBuilder(false);
      
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
      const payload = {
        ...form,
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

        {/* AI Auto-Planner Widget */}
        <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl p-4 shadow-sm transition hover:shadow-md">
          <button
            type="button"
            onClick={() => setShowAiBuilder(!showAiBuilder)}
            className="flex items-center justify-between w-full text-left font-semibold text-slate-800 text-xs focus:outline-none"
          >
            <span className="flex items-center gap-2 text-violet-700 font-bold">
              <Wand2 size={15} className="animate-pulse text-violet-600" />
              <span>✨ AI Tour Planner: Auto-generate detailed day-by-day itineraries</span>
            </span>
            <span className="bg-violet-100 text-violet-700 px-2 py-0.5 rounded-lg text-[10px] font-bold">
              {showAiBuilder ? 'Hide Planner' : 'Open Planner'}
            </span>
          </button>

          {showAiBuilder && (
            user?.planId === 'FREE' ? (
              <div className="pt-3 mt-3 border-t border-violet-100/60 text-center py-4 space-y-2">
                <p className="text-xs text-slate-500 font-semibold">✨ AI Tour Planner is a Premium Feature</p>
                <p className="text-[10px] text-slate-400">Upgrade to Pro in the AI Tools page to unlock auto-generation.</p>
              </div>
            ) : (
              <div className="space-y-4 pt-3 mt-3 border-t border-violet-100/60 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                  <Input
                    className="sm:col-span-1"
                    label="Number of Days"
                    type="number"
                    min={1}
                    max={15}
                    value={aiDays}
                    onChange={(e) => setAiDays(Math.max(1, Math.min(15, Number(e.target.value))))}
                    inputClassName="bg-white focus:ring-violet-400/20 focus:border-violet-400 border-violet-200"
                  />
                  <Input
                    className="sm:col-span-3"
                    label="Travel Theme & Preferences (Optional)"
                    type="text"
                    placeholder="e.g. Include houseboat luxury stay, beach activities, traditional dinners, slow paced travel..."
                    value={aiTheme}
                    onChange={(e) => setAiTheme(e.target.value)}
                    inputClassName="bg-white focus:ring-violet-400/20 focus:border-violet-400 border-violet-200"
                  />
                </div>

                <div className="flex justify-end pt-2 border-t border-violet-100/40">
                  <button
                    type="button"
                    disabled={aiLoading}
                    onClick={handleAiItineraryGenerate}
                    className="px-5 h-11 bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 text-white font-bold rounded-lg text-xs shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Sparkles size={13} />
                    {aiLoading ? 'AI is drafting itinerary...' : 'Generate & Prefill Days'}
                  </button>
                </div>
              </div>
            )
          )}
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
          <Input
            label="Banner Image URL (Optional)"
            placeholder="e.g. https://example.com/banner.jpg"
            hint="This image will be used as the background banner for the public itinerary link."
            value={form.bannerUrl || ''}
            onChange={set('bannerUrl')}
          />

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
