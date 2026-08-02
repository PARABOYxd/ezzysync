import React, { useEffect, useState } from 'react';
import Drawer from '../common/Drawer.jsx';
import Input from '../ui/Input.jsx';
import Combobox from '../ui/Combobox.jsx';
import Button from '../ui/Button.jsx';
import * as batchService from '../../services/batchService';
import * as quotationService from '../../services/quotationService';
import { useToast } from '../../hooks/useToast.jsx';
import { MapPin, Calendar, Users, ClipboardList, Loader2 } from 'lucide-react';

const OTHER = '__other__';
const FIELD_H = 'h-11 rounded-xl';

const emptyForm = {
  departureDate: '', totalCapacity: '', selectedItinerary: '', manualTripName: '',
};

function SectionLabel({ children }) {
  return <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">{children}</h4>;
}

export default function BatchFormModal({ open, onClose, onSaved, batch }) {
  const isEdit = !!batch;
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const toast = useToast();

  const [quotations, setQuotations] = useState([]);

  useEffect(() => {
    if (open) {
      if (batch) {
        setForm({
          departureDate: batch.departureDate?.slice(0, 10) || '',
          totalCapacity: batch.totalCapacity,
          selectedItinerary: batch.sourceQuotationId || OTHER,
          manualTripName: batch.tripName || '',
        });
      } else {
        setForm(emptyForm);
      }
      setErrors({});
      quotationService.getQuotations({ limit: 100 }).then((data) => {
        setQuotations(data.quotations || data || []);
      }).catch(() => {});
    }
  }, [open, batch]);

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
    if (errors[key]) setErrors({ ...errors, [key]: '' });
  };

  const setItinerary = (val) => {
    setForm((prev) => ({ ...prev, selectedItinerary: val }));
    setErrors((prev) => ({ ...prev, selectedItinerary: '' }));
  };

  const selectedQuotation = quotations.find((q) => q.quotationId === form.selectedItinerary);

  const validate = () => {
    const e = {};
    if (!form.departureDate) e.departureDate = 'Departure date is required.';
    if (!form.totalCapacity || Number(form.totalCapacity) <= 0) e.totalCapacity = 'Total seat capacity is required.';
    if (!form.selectedItinerary) e.selectedItinerary = 'Pick a saved itinerary or "Other".';
    if (form.selectedItinerary === OTHER && !form.manualTripName.trim()) e.manualTripName = 'Trip name is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;

    const isOther = form.selectedItinerary === OTHER;
    const tripName = isOther ? form.manualTripName.trim() : (selectedQuotation?.tripName || '');

    const payload = {
      name: `${tripName} - ${form.departureDate}`,
      tripName,
      departureDate: form.departureDate,
      totalCapacity: Number(form.totalCapacity || 0),
      pricePerPerson: isOther ? 0 : (selectedQuotation?.priceQuote || 0),
      itineraryDays: isOther ? [] : (selectedQuotation?.itineraryDays || []),
      sourceQuotationId: isOther ? null : (selectedQuotation?.quotationId || null),
      status: batch?.status || 'Planning',
      notes: batch?.notes || '',
    };

    setSaving(true);
    try {
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

  const itineraryOptions = [
    ...quotations.filter((q) => q.tripName).map((q) => ({ value: q.quotationId, label: q.tripName })),
    { value: OTHER, label: '✏️ Other (type trip name manually)' },
  ];

  return (
    <Drawer open={open} onClose={onClose} title={isEdit ? 'Edit Tour Batch' : 'Create Group Batch'}>
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <div className="flex-1 space-y-6">
          <div className="space-y-4">
            <SectionLabel>Schedule &amp; capacity</SectionLabel>
            <Input
              label="Departure Date"
              icon={Calendar}
              type="date"
              required
              accentAsterisk
              error={errors.departureDate}
              value={form.departureDate}
              onChange={set('departureDate')}
              inputClassName={FIELD_H}
            />
            <Input
              label="Total Seat Capacity"
              icon={Users}
              type="number"
              min={1}
              required
              accentAsterisk
              error={errors.totalCapacity}
              hint="How many seats this fixed departure can hold"
              placeholder="e.g. 20"
              value={form.totalCapacity}
              onChange={set('totalCapacity')}
              inputClassName={FIELD_H}
            />
          </div>

          <div className="space-y-4 pt-2 border-t border-[var(--border)]">
            <SectionLabel>Itinerary</SectionLabel>
            <Combobox
              label="Select Itinerary"
              icon={ClipboardList}
              required
              accentAsterisk
              error={errors.selectedItinerary}
              hint="Trip name, price & day-by-day plan are pulled from the itinerary you pick"
              placeholder="-- Choose an itinerary --"
              value={form.selectedItinerary}
              onChange={setItinerary}
              options={itineraryOptions}
            />

            {form.selectedItinerary === OTHER && (
              <Input
                label="Trip / Package Name"
                icon={MapPin}
                required
                accentAsterisk
                error={errors.manualTripName}
                hint="No saved itinerary - this batch will use a plain trip name only"
                placeholder="e.g. 5N/6D Manali Getaway"
                value={form.manualTripName}
                onChange={set('manualTripName')}
                inputClassName={FIELD_H}
              />
            )}
          </div>
        </div>

        <div className="sticky bottom-0 -mx-6 px-6 pt-4 pb-1 mt-6 bg-[var(--surface)]/95 backdrop-blur-sm border-t border-[var(--border)] flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose} className="h-11 px-4">Cancel</Button>
          <Button type="submit" disabled={saving} className="h-11 px-5 gap-2">
            {saving && <Loader2 size={15} className="animate-spin" />}
            {saving ? 'Saving…' : isEdit ? 'Update Batch' : 'Create Batch'}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
