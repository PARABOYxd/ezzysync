import React, { useState } from 'react';
import Modal from '../common/Modal.jsx';
import Input from '../ui/Input.jsx';
import FormRow from '../ui/FormRow.jsx';
import Button from '../ui/Button.jsx';
import { Calendar, Users, IndianRupee } from 'lucide-react';
import * as leadService from '../../services/leadService';
import { useToast } from '../../hooks/useToast.jsx';

export default function ConvertLeadModal({ open, onClose, lead, onConverted }) {
  const [form, setForm] = useState({ 
    departure: '', 
    members: 1, 
    pricePerPerson: '',
    email: lead?.email || '',
    interest: lead?.interest || ''
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

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
          <FormRow>
            {!lead.email && <Input label="Email" required type="email" value={form.email} onChange={set('email')} />}
            {!lead.interest && <Input label="Trip Interest" required value={form.interest} onChange={set('interest')} />}
          </FormRow>
        )}

        <FormRow>
          <Input label="Departure Date" icon={Calendar} required type="date" value={form.departure} onChange={set('departure')} />
          <Input label="Number of Travelers" icon={Users} type="number" min={1} max={100} value={form.members} onChange={set('members')} />
        </FormRow>
        <Input label="Price Per Person (₹)" icon={IndianRupee} type="number" min={0} placeholder="e.g. 15000" value={form.pricePerPerson} onChange={set('pricePerPerson')} />

        <div className="text-right text-sm font-semibold text-slate-700">
          Total: ₹{totalAmount.toLocaleString('en-IN')}
        </div>

        <div className="flex justify-end gap-3 pt-5 border-t border-slate-200">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Converting...' : 'Create Booking'}</Button>
        </div>
      </form>
    </Modal>
  );
}
