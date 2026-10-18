import React, { useState, useEffect } from 'react';
import Drawer from '../common/Drawer.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import FormRow from '../ui/FormRow.jsx';
import Button from '../ui/Button.jsx';
import { Calendar, Users, IndianRupee, MapPin, User, Mail, Navigation } from 'lucide-react';
import * as leadService from '../../services/leadService';
import * as quotationService from '../../services/quotationService';
import { useToast } from '../../hooks/useToast.jsx';
import { quotationRef } from '../../utils/quotationRef';

export default function ConvertLeadDrawer({ open, onClose, lead, onConverted }) {
  const [form, setForm] = useState({
    departure: '',
    members: 1,
    pricePerPerson: '',
    email: '',
    interest: '',
    customerName: '',
    paid: 0,
    sourceQuotationId: '',
    pickup: ''
  });
  const [itineraries, setItineraries] = useState([]);
  const [loadingItineraries, setLoadingItineraries] = useState(false);
  const [tripOther, setTripOther] = useState(false);
  const [pickupOther, setPickupOther] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (open && lead) {
      setForm({
        departure: lead.departureDate || '',
        members: lead.travelers ? Number(lead.travelers) : 1,
        pricePerPerson: '',
        email: lead.email || '',
        interest: lead.interest || '',
        customerName: lead.customerName || '',
        paid: 0,
        sourceQuotationId: '',
        pickup: ''
      });
      setTripOther(false);
      setPickupOther(false);
      setLoadingItineraries(true);

      quotationService
        .getQuotations({ limit: 150 })
        .then((data) => {
          const list = data.quotations || data || [];
          setItineraries(list);
          if (lead?.interest) {
            // The lead's "interest" is free text typed or extracted earlier,
            // not a stored reference - this is the one place a name match is
            // unavoidable, since there is nothing else to match it against.
            // Once matched, the id itself is what carries forward from here.
            const found = list.find((q) => (q.trip_name || q.tripName) === lead.interest);
            if (!found) {
              setTripOther(true);
            } else {
              const rawOpts = found.pickupOptions || [];
              const opts = (Array.isArray(rawOpts) ? rawOpts : [])
                .map((p) => (typeof p === 'string' ? { location: p, price: null } : p))
                .filter((p) => p && (p.location || p.pickupPoint));
              setForm((prev) => ({
                ...prev,
                sourceQuotationId: quotationRef(found),
                pricePerPerson: prev.pricePerPerson || found.priceQuote || '',
                pickup: prev.pickup || (opts.length === 1 ? (opts[0].location || opts[0].pickupPoint) : '')
              }));
            }
          }
        })
        .catch(() => {})
        .finally(() => setLoadingItineraries(false));
    }
  }, [open, lead?.leadId]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleTripChange = (e) => {
    const val = e.target.value;
    if (val === '__other__') {
      setTripOther(true);
      setPickupOther(true);
      setForm((prev) => ({ ...prev, interest: '', sourceQuotationId: '', pickup: '' }));
    } else {
      setTripOther(false);
      const selected = itineraries.find((q) => (q.trip_name || q.tripName) === val);
      const rawOpts = selected?.pickupOptions || [];
      const opts = (Array.isArray(rawOpts) ? rawOpts : [])
        .map((p) => (typeof p === 'string' ? { location: p, price: null } : p))
        .filter((p) => p && (p.location || p.pickupPoint));
      const matchesExisting = opts.some((p) => (p.location || p.pickupPoint) === form.pickup);
      setPickupOther(false);
      setForm((prev) => ({
        ...prev,
        interest: val,
        sourceQuotationId: quotationRef(selected),
        pricePerPerson: selected?.priceQuote ? selected.priceQuote : prev.pricePerPerson,
        pickup: matchesExisting ? prev.pickup : (opts.length === 1 ? (opts[0].location || opts[0].pickupPoint) : '')
      }));
    }
  };

  const selectedQuotation = form.sourceQuotationId
    ? itineraries.find((q) => quotationRef(q) === form.sourceQuotationId)
    : itineraries.find((q) => {
        const name = q.trip_name || q.tripName || '';
        return name && form.interest && name.toLowerCase() === form.interest.toLowerCase();
      });

  const rawPickupOptions = selectedQuotation?.pickupOptions || [];
  const pickupOptions = (Array.isArray(rawPickupOptions) ? rawPickupOptions : [])
    .map((p) => {
      if (!p) return null;
      if (typeof p === 'string') return { location: p, price: null };
      const loc = p.location || p.pickupPoint || p.name || '';
      return loc ? { location: loc, price: p.price != null && !isNaN(Number(p.price)) ? Number(p.price) : null } : null;
    })
    .filter(Boolean);

  const pickupIsCustom = pickupOther || (
    pickupOptions.length > 0 &&
    !!form.pickup &&
    !pickupOptions.some((p) => p.location.toLowerCase() === (form.pickup || '').toLowerCase())
  );

  const handlePickupChange = (e) => {
    const val = e.target.value;
    if (val === '__other__') {
      setPickupOther(true);
      setForm((prev) => ({ ...prev, pickup: '' }));
    } else {
      setPickupOther(false);
      const opt = pickupOptions.find((p) => p.location === val);
      setForm((prev) => ({
        ...prev,
        pickup: val,
        pricePerPerson: opt?.price != null ? opt.price : prev.pricePerPerson
      }));
    }
  };

  const totalAmount = Number(form.members || 1) * Number(form.pricePerPerson || 0);

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!form.customerName || !form.customerName.trim()) {
      toast.error('Customer name is required.');
      return;
    }
    // Email is optional - most leads arrive over WhatsApp and never give one.
    // Invoice/confirmation sends already skip the email channel gracefully
    // when it's blank and use WhatsApp instead.
    if (!form.departure) {
      toast.error('Departure date is required to create the booking.');
      return;
    }
    // Local date, not UTC - between midnight and 05:30 IST the UTC date is
    // still yesterday, which let a past departure through.
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (form.departure < today) {
      toast.error('Departure date must be in the future.');
      return;
    }
    if (form.members > 100) {
      toast.error('Maximum 100 travelers allowed.');
      return;
    }
    if (form.pricePerPerson < 0) {
      toast.error('Price cannot be negative.');
      return;
    }
    if (form.paid < 0) {
      toast.error('Advance paid cannot be negative.');
      return;
    }

    setSaving(true);
    try {
      await leadService.convertLeadToBooking(lead.leadId, {
        departure: form.departure,
        pickup: (form.pickup || '').trim(),
        pickupLocation: (form.pickup || '').trim(),
        members: Number(form.members || 1),
        pricePerPerson: Number(form.pricePerPerson || 0),
        email: form.email,
        interest: form.interest,
        trip: form.interest,
        sourceQuotationId: form.sourceQuotationId || null,
        customerName: form.customerName,
        paid: Number(form.paid || 0)
      });
      toast.success('Lead converted to booking!');
      onConverted?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not convert lead.');
    } finally {
      setSaving(false);
    }
  };

  if (!lead) return null;

  return (
    <Drawer open={open} onClose={onClose} title="Convert Lead to Booking">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <FormRow>
          <Input label="Customer Name" icon={User} required placeholder="e.g. Rahul Kumar" value={form.customerName} onChange={set('customerName')} />
          <Input label="Email Address (Optional)" icon={Mail} type="email" hint="Only needed if you want invoices emailed" placeholder="e.g. rahul@gmail.com" value={form.email} onChange={set('email')} />
        </FormRow>

        <div className="w-full space-y-1.5">
        <Select
          label="Trip Name / Itinerary"
          value={tripOther ? '__other__' : (form.interest || '')}
          onChange={handleTripChange}
          placeholder={loadingItineraries ? 'Loading itineraries...' : 'Select an itinerary'}
          options={[
            { value: '', label: loadingItineraries ? 'Loading itineraries...' : 'Select an itinerary' },
            ...itineraries.map((q) => {
              const name = q.trip_name || q.tripName || '';
              const nights = q.itineraryDays?.length > 1 ? q.itineraryDays.length - 1 : 0;
              const dur = q.itineraryDays?.length
                ? ` (${q.itineraryDays.length}D${nights > 0 ? `/${nights}N` : ''})`
                : '';
              const price = q.priceQuote ? ` - ₹${Number(q.priceQuote).toLocaleString('en-IN')}` : '';
              return { value: name, label: `${name}${dur}${price}` };
            }).filter((o) => o.value),
            { value: '__other__', label: 'Other (Enter custom trip name)' }
          ]}
        />
          {tripOther && (
            <div className="pt-1 animate-in fade-in duration-200">
              <Input
                icon={MapPin}
                placeholder="Enter custom trip name (e.g. Bali Honeymoon Package)"
                value={form.interest}
                onChange={set('interest')}
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Pickup Location Selector */}
        {pickupOptions.length > 0 ? (
          <div className="w-full space-y-1.5">
            <Select
              label="Pickup Location"
              icon={MapPin}
              value={pickupIsCustom ? '__other__' : (form.pickup || '')}
              onChange={handlePickupChange}
              options={[
                { value: '', label: 'Select pickup point' },
                ...pickupOptions.map((p) => ({
                  value: p.location,
                  label: p.price != null ? `${p.location} (₹${Number(p.price).toLocaleString('en-IN')})` : p.location
                })),
                { value: '__other__', label: 'Other (Enter custom pickup location)' }
              ]}
            />
            {pickupIsCustom && (
              <div className="pt-1 animate-in fade-in duration-200">
                <Input
                  icon={Navigation}
                  placeholder="Enter custom pickup location (e.g. Airport T3, Majnu Ka Tilla)"
                  value={form.pickup}
                  onChange={set('pickup')}
                  autoFocus
                />
              </div>
            )}
            <p className="text-[10px] text-slate-400">
              Pickup points configured on this itinerary.
            </p>
          </div>
        ) : (
          <div className="w-full space-y-1.5">
            <Input
              label="Pickup Location (Optional)"
              icon={MapPin}
              placeholder="e.g. Delhi Airport T3, Majnu Ka Tilla"
              value={form.pickup}
              onChange={set('pickup')}
            />
            <p className="text-[10px] text-slate-400">
              Enter the boarding or pickup spot for this booking.
            </p>
          </div>
        )}

        <FormRow>
          <Input
            label="Departure Date"
            icon={Calendar}
            required
            type="date"
            min={new Date().toISOString().split('T')[0]}
            value={form.departure}
            onKeyDown={(e) => {
              if (e.key !== 'Tab' && e.key !== 'Enter') {
                e.preventDefault();
              }
            }}
            onClick={(e) => {
              try { e.target.showPicker?.(); } catch (_) {}
            }}
            onChange={set('departure')}
          />
          <Input label="Number of Travelers" icon={Users} type="number" min={1} max={100} value={form.members} onChange={set('members')} />
        </FormRow>
        
        <FormRow>
          <Input label="Price Per Person (₹)" icon={IndianRupee} type="number" min={0} placeholder="e.g. 15000" value={form.pricePerPerson} onChange={set('pricePerPerson')} />
          <Input label="Advance Paid (₹)" icon={IndianRupee} type="number" min={0} placeholder="e.g. 5000" value={form.paid} onChange={set('paid')} />
        </FormRow>

        <div className="text-right text-sm font-semibold text-slate-700 dark:text-zinc-300">
          Total: ₹{totalAmount.toLocaleString('en-IN')}
        </div>

        <div className="flex justify-end gap-3 pt-5 border-t border-slate-200 dark:border-zinc-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Converting...' : 'Create Booking'}</Button>
        </div>
      </form>
    </Drawer>
  );
}
