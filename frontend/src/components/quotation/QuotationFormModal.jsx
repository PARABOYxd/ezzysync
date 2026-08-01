import React, { useEffect, useState } from 'react';
import Modal from '../common/Modal.jsx';
import Input from '../ui/Input.jsx';
import Textarea from '../ui/Textarea.jsx';
import Button from '../ui/Button.jsx';
import * as quotationService from '../../services/quotationService';
import { useToast } from '../../hooks/useToast.jsx';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth.jsx';
import {
  MapPin, Plus, Trash, ArrowUp, ArrowDown,
  ClipboardList, Sparkles, Wand2, IndianRupee
} from 'lucide-react';

const emptyForm = {
  tripName: '', priceQuote: '',
  itineraryDays: [{ day: 1, title: '', description: '' }],
};

export default function QuotationFormModal({ open, onClose, onSaved, quotation }) {
  const { user } = useAuth();
  const isEdit = !!quotation;
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

  useEffect(() => {
    if (open) {
      setForm(quotation ? { ...emptyForm, ...quotation } : emptyForm);
      setErrors({});
      setShowAiBuilder(false);
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
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Itinerary' : 'Create Itinerary'} size="xl">
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

        {/* Days Timeline Loop */}
        <div className="relative pl-6 space-y-6 max-h-[380px] overflow-y-auto pr-2 py-2">
          {/* Vertical Timeline Path Line */}
          <div className="absolute left-[1.35rem] top-4 bottom-8 w-0.5 bg-dashed bg-slate-200 border-l-2 border-dashed border-slate-200" />

          {form.itineraryDays.map((d, index) => (
            <div key={index} className="relative bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition duration-200 space-y-4">
              {/* Circle Node on timeline */}
              <div className="absolute -left-[2.375rem] top-[1.375rem] w-6 h-6 rounded-full bg-brand-50 border-2 border-brand-500 flex items-center justify-center shadow-sm">
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
    </Modal>
  );
}
