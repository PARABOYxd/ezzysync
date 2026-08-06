import React, { useState, useEffect } from 'react';
import Drawer from '../common/Drawer.jsx';
import Input from '../ui/Input.jsx';
import FormRow from '../ui/FormRow.jsx';
import Button from '../ui/Button.jsx';
import { Calendar, Users, IndianRupee, MapPin, User, Mail } from 'lucide-react';
import * as leadService from '../../services/leadService';
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
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (open && lead) {
      setForm({
        departure: '',
        members: 1,
        pricePerPerson: '',
        email: lead.email || '',
        interest: lead.interest || '',
        customerName: lead.customerName || '',
        paid: 0
      });
    }
  }, [open, lead]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

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

        <Input
          label="Trip Name"
          icon={MapPin}
          placeholder="e.g. Bali Honeymoon Package"
          value={form.interest}
          onChange={set('interest')}
        />

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
