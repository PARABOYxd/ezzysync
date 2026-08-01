import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal.jsx';
import Input from '../ui/Input.jsx';
import FormRow from '../ui/FormRow.jsx';
import Button from '../ui/Button.jsx';
import { Calendar, Users, IndianRupee, MapPin } from 'lucide-react';
import * as leadService from '../../services/leadService';
import * as quotationService from '../../services/quotationService';
import { useToast } from '../../hooks/useToast.jsx';

export default function ConvertLeadModal({ open, onClose, lead, onConverted }) {
  const [form, setForm] = useState({ 
    departure: '', 
    members: 1, 
    pricePerPerson: '',
    email: '',
    interest: ''
  });
  const [itineraries, setItineraries] = useState([]);
  const [interestOther, setInterestOther] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (open && lead) {
      const initialInterest = lead.interest || '';
      setForm({
        departure: '',
        members: 1,
        pricePerPerson: '',
        email: lead.email || '',
        interest: initialInterest
      });
      setInterestOther(false);

      quotationService.getQuotations({ limit: 100 }).then((data) => {
        const list = data.quotations || [];
        setItineraries(list);
        if (initialInterest) {
          const found = list.find((q) => q.trip_name === initialInterest || q.tripName === initialInterest);
          if (!found) setInterestOther(true);
        }
      }).catch(() => {});
    }
  }, [open, lead]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const totalAmount = Number(form.members || 1) * Number(form.pricePerPerson || 0);

  const handleSubmit = async (ev) => {
    ev.preventDefault();
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

    setSaving(true);
    try {
      await leadService.convertLeadToBooking(lead.leadId, {
        departure: form.departure,
        members: Number(form.members || 1),
        pricePerPerson: Number(form.pricePerPerson || 0),
        email: form.email,
        interest: form.interest
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
    <Modal open={open} onClose={onClose} title="Convert Lead to Booking" size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-sm text-slate-500">
          Creating a booking for <b className="text-slate-700">{lead.customerName}</b>.
          Fill in the trip details below to finalize.
        </p>
        
        {(!lead.email || !lead.interest) && (
          <div className="space-y-4">
            {!lead.email && <Input label="Email Address" required type="email" value={form.email} onChange={set('email')} />}
            {!lead.interest && (
              <div className="w-full space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">Trip / Destination Interest</label>
                <select
                  className="w-full text-sm bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500 font-medium text-slate-700 dark:text-zinc-300 transition"
                  value={interestOther ? '__other__' : (form.interest || '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__other__') {
                      setInterestOther(true);
                      setForm({ ...form, interest: '' });
                    } else {
                      setInterestOther(false);
                      setForm({ ...form, interest: val });
                    }
                  }}
                >
                  <option value="">-- Select an itinerary or type manually --</option>
                  {itineraries.map((q) => {
                    const name = q.trip_name || q.tripName || '';
                    return name ? <option key={q.quotation_id || q.id} value={name}>{name}</option> : null;
                  })}
                  <option value="__other__">✏️ Other (type manually)</option>
                </select>
                {interestOther && (
                  <Input
                    icon={MapPin}
                    placeholder="e.g. Bali Honeymoon Package"
                    value={form.interest}
                    onChange={set('interest')}
                  />
                )}
              </div>
            )}
          </div>
        )}

        <FormRow>
          <Input label="Departure Date" icon={Calendar} required type="date" value={form.departure} onChange={set('departure')} />
          <Input label="Number of Travelers" icon={Users} type="number" min={1} max={100} value={form.members} onChange={set('members')} />
        </FormRow>
        <Input label="Price Per Person (₹)" icon={IndianRupee} type="number" min={0} placeholder="e.g. 15000" value={form.pricePerPerson} onChange={set('pricePerPerson')} />

        <div className="text-right text-sm font-semibold text-slate-700 dark:text-zinc-300">
          Total: ₹{totalAmount.toLocaleString('en-IN')}
        </div>

        <div className="flex justify-end gap-3 pt-5 border-t border-slate-200 dark:border-zinc-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Converting...' : 'Create Booking'}</Button>
        </div>
      </form>
    </Modal>
  );
}
