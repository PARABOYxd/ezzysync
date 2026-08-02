import React, { useEffect, useState } from 'react';
import Drawer from '../common/Drawer.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Textarea from '../ui/Textarea.jsx';
import FormRow from '../ui/FormRow.jsx';
import Button from '../ui/Button.jsx';
import * as batchService from '../../services/batchService';
import * as quotationService from '../../services/quotationService';
import { useToast } from '../../hooks/useToast.jsx';
import {
  MapPin, Plus, Trash, ArrowUp, ArrowDown,
  ClipboardList, IndianRupee, Users, Calendar, Layers, DownloadCloud
} from 'lucide-react';

const STATUS_OPTIONS = ['Planning', 'Confirmed', 'Ongoing', 'Completed', 'Cancelled'];

const emptyForm = {
  name: '', tripName: '', departureDate: '', totalCapacity: '', pricePerPerson: '',
  status: 'Planning', notes: '', sourceQuotationId: '',
  itineraryDays: [{ day: 1, title: '', description: '' }],
};

export default function BatchFormModal({ open, onClose, onSaved, batch }) {
  const isEdit = !!batch;
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const toast = useToast();

  const [quotations, setQuotations] = useState([]);
  const [importFrom, setImportFrom] = useState('');

  useEffect(() => {
    if (open) {
      setForm(batch ? { ...emptyForm, ...batch } : emptyForm);
      setErrors({});
      setImportFrom('');
      quotationService.getQuotations({ limit: 100 }).then((data) => {
        setQuotations(data.quotations || data || []);
      }).catch(() => {});
    }
  }, [open, batch]);

  const handleImportItinerary = (quotationId) => {
    setImportFrom(quotationId);
    if (!quotationId) return;
    const q = quotations.find((x) => x.quotationId === quotationId);
    if (!q) return;
    setForm((prev) => ({
      ...prev,
      tripName: q.tripName || prev.tripName,
      pricePerPerson: q.priceQuote || prev.pricePerPerson,
      itineraryDays: q.itineraryDays?.length ? q.itineraryDays.map((d) => ({ ...d })) : prev.itineraryDays,
      sourceQuotationId: q.quotationId,
    }));
    toast.success(`Itinerary imported from "${q.tripName}". You can still edit it below.`);
  };

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
    setForm({ ...form, itineraryDays: days.map((d, idx) => ({ ...d, day: idx + 1 })) });
  };

  const validate = () => {
    const e = {};
    if (!form.name) e.name = 'Batch name is required.';
    if (!form.tripName) e.tripName = 'Trip name is required.';
    if (!form.departureDate) e.departureDate = 'Departure date is required.';
    if (!form.totalCapacity || Number(form.totalCapacity) <= 0) e.totalCapacity = 'Total seat capacity is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        ...form,
        totalCapacity: Number(form.totalCapacity || 0),
        pricePerPerson: Number(form.pricePerPerson || 0),
      };
      if (isEdit) {
        await batchService.updateBatch(batch.batchId, payload);
        toast.success('Tour batch updated successfully.');
      } else {
        await batchService.createBatch(payload);
        toast.success('Tour batch created successfully.');
      }
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save tour batch.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title={isEdit ? 'Edit Tour Batch' : 'Create Tour Batch'}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Batch Name"
          icon={Layers}
          required
          error={errors.name}
          hint="Internal name to identify this fixed-departure group"
          placeholder="e.g. Manali Group Tour - 15th May 2026"
          value={form.name}
          onChange={set('name')}
        />

        <FormRow>
          <Input
            label="Trip / Package Name"
            icon={MapPin}
            required
            error={errors.tripName}
            placeholder="e.g. 5N/6D Manali Getaway"
            value={form.tripName}
            onChange={set('tripName')}
          />
          <Input
            label="Departure Date"
            icon={Calendar}
            type="date"
            required
            error={errors.departureDate}
            value={form.departureDate?.slice(0, 10) || ''}
            onChange={set('departureDate')}
          />
        </FormRow>

        <FormRow>
          <Input
            label="Total Seat Capacity"
            icon={Users}
            type="number"
            min={0}
            required
            error={errors.totalCapacity}
            placeholder="e.g. 20"
            value={form.totalCapacity}
            onChange={set('totalCapacity')}
          />
          <Input
            label="Price Per Person (₹)"
            icon={IndianRupee}
            type="number"
            min={0}
            placeholder="e.g. 15000"
            hint="Master pricing shared by all bookings in this batch"
            value={form.pricePerPerson}
            onChange={set('pricePerPerson')}
          />
        </FormRow>

        <Select
          label="Status"
          value={form.status}
          onChange={set('status')}
          options={STATUS_OPTIONS}
        />

        <Textarea
          label="Notes (Optional)"
          rows={2}
          placeholder="Internal notes about vendors, transport, special arrangements..."
          value={form.notes}
          onChange={set('notes')}
        />

        {/* Import itinerary from an existing Quotation */}
        <Select
          label="Import Itinerary From (Optional)"
          icon={DownloadCloud}
          disabled={quotations.length === 0}
          hint={
            quotations.length === 0
              ? 'No saved itineraries yet — create one under "Itineraries & Quotes" first, or build the days manually below.'
              : "Reuse an existing itinerary's days & price instead of typing it again"
          }
          value={importFrom}
          onChange={(e) => handleImportItinerary(e.target.value)}
          options={[
            { value: '', label: quotations.length === 0 ? '-- No saved itineraries available --' : '-- Build itinerary manually --' },
            ...quotations
              .filter((q) => q.tripName)
              .map((q) => ({ value: q.quotationId, label: q.tripName }))
          ]}
        />

        {/* Itinerary Builder Header */}
        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div>
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <ClipboardList size={15} className="text-brand-500" />
              <span>Master Itinerary ({form.itineraryDays.length} Days)</span>
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5">Shared day-by-day plan for every booking in this batch</p>
          </div>
          <Button type="button" onClick={addDay} className="text-xs gap-1.5 px-4">
            <Plus size={14} /> Add Day
          </Button>
        </div>

        <div className="relative pl-10 space-y-6 max-h-[380px] overflow-y-auto pr-2 py-2">
          <div className="absolute left-[1.5rem] top-4 bottom-8 w-0.5 border-l-2 border-dashed border-slate-200" />

          {form.itineraryDays.map((d, index) => (
            <div key={index} className="relative bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition duration-200 space-y-4">
              <div className="absolute -left-[1.625rem] top-[1.375rem] w-6 h-6 rounded-full bg-brand-50 border-2 border-brand-500 flex items-center justify-center shadow-sm">
                <span className="text-[10px] font-extrabold text-brand-600">{d.day}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="bg-brand-50 text-brand-700 px-3 py-1 rounded-lg text-xs font-extrabold tracking-wide uppercase">
                  Day {d.day} Plan
                </span>

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
                  placeholder={`e.g. Day ${d.day} - Arrival & Welcome Dinner`}
                  value={d.title}
                  onChange={(e) => handleDayChange(index, 'title', e.target.value)}
                />
                <Textarea
                  label="Schedule Details"
                  rows={2}
                  placeholder="Hotel check-ins, activities, transport, meals included..."
                  value={d.description}
                  onChange={(e) => handleDayChange(index, 'description', e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-5 border-t border-slate-200">
          <span className="text-xs text-slate-500 font-medium">Fields with * are mandatory</span>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="text-xs gap-1.5">
              {saving ? 'Saving...' : isEdit ? 'Update Batch' : 'Create Batch'}
            </Button>
          </div>
        </div>
      </form>
    </Drawer>
  );
}
