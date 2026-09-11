import React, { useState, useEffect } from 'react';
import Drawer from '../common/Drawer.jsx';
import Input from '../ui/Input.jsx';
import FormRow from '../ui/FormRow.jsx';
import Button from '../ui/Button.jsx';
import { Calendar, Users, IndianRupee, MapPin, User, Mail } from 'lucide-react';
import * as leadService from '../../services/leadService';
import * as quotationService from '../../services/quotationService';
import { useToast } from '../../hooks/useToast.jsx';

export default function ConvertLeadDrawer({ open, onClose, lead, onConverted }) {
  const [form, setForm] = useState({
    departure: '',
    members: 1,
    pricePerPerson: '',
    email: '',
    interest: '',
    customerName: '',
    paid: 0
  });
  const [itineraries, setItineraries] = useState([]);
  const [loadingItineraries, setLoadingItineraries] = useState(false);
  const [tripOther, setTripOther] = useState(false);
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
        paid: 0
      });
      setTripOther(false);
      setLoadingItineraries(true);

      quotationService
        .getQuotations({ limit: 150 })
        .then((data) => {
          const list = data.quotations || data || [];
          setItineraries(list);
          if (lead?.interest) {
            const found = list.find((q) => (q.trip_name || q.tripName) === lead.interest);
            if (!found) {
              setTripOther(true);
            } else if (found.priceQuote) {
              setForm((prev) => ({
                ...prev,
                pricePerPerson: prev.pricePerPerson || found.priceQuote
              }));
            }
          }
        })
        .catch(() => {})
        .finally(() => setLoadingItineraries(false));
    }
  }, [open, lead]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleTripChange = (e) => {
    const val = e.target.value;
    if (val === '__other__') {
      setTripOther(true);
      setForm((prev) => ({ ...prev, interest: '' }));
    } else {
      setTripOther(false);
      const selected = itineraries.find((q) => (q.trip_name || q.tripName) === val);
      setForm((prev) => ({
        ...prev,
        interest: val,
        pricePerPerson: selected?.priceQuote ? selected.priceQuote : prev.pricePerPerson
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
    if (!form.email || !form.email.trim()) {
      toast.error('Email address is required.');
      return;
    }
    if (!form.departure) {
      toast.error('Departure date is required to create the booking.');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
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
        members: Number(form.members || 1),
        pricePerPerson: Number(form.pricePerPerson || 0),
        email: form.email,
        interest: form.interest,
        trip: form.interest,
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
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormRow>
          <Input label="Customer Name" icon={User} required placeholder="e.g. Rahul Kumar" value={form.customerName} onChange={set('customerName')} />
          <Input label="Email Address" icon={Mail} required type="email" placeholder="e.g. rahul@gmail.com" value={form.email} onChange={set('email')} />
        </FormRow>

        <div className="w-full space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
            Trip Name / Itinerary
          </label>
          <div className="relative">
            <select
              className="w-full text-sm bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500 font-medium text-slate-700 dark:text-zinc-300 transition"
              value={tripOther ? '__other__' : (form.interest || '')}
              onChange={handleTripChange}
            >
              <option value="">
                {loadingItineraries ? 'Loading itineraries...' : 'Select an itinerary'}
              </option>
              {itineraries.map((q) => {
                const name = q.trip_name || q.tripName || '';
                const nights = q.itineraryDays?.length > 1 ? q.itineraryDays.length - 1 : 0;
                const dur = q.itineraryDays?.length
                  ? ` (${q.itineraryDays.length}D${nights > 0 ? `/${nights}N` : ''})`
                  : '';
                const price = q.priceQuote ? ` - ₹${Number(q.priceQuote).toLocaleString('en-IN')}` : '';
                return name ? (
                  <option key={q.quotation_id || q.id} value={name}>
                    {name}{dur}{price}
                  </option>
                ) : null;
              })}
              <option value="__other__">Other (Enter custom trip name)</option>
            </select>
          </div>
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

        <FormRow>
          <Input label="Departure Date" icon={Calendar} required type="date" value={form.departure} onChange={set('departure')} />
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
