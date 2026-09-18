import React, { useState } from 'react';
import { User, Mail, Phone, ShieldAlert } from 'lucide-react';
import Input from '../ui/Input.jsx';
import Textarea from '../ui/Textarea.jsx';
import FormRow from '../ui/FormRow.jsx';
import { isValidPhone } from '../../utils/validators';
import * as customerService from '../../services/customerService';
import { useToast } from '../../hooks/useToast.jsx';

export default function CustomerInfoTab({ form, setForm, errors, set, isBookedOrBeyond, canEditPhone, isEdit }) {
  const toast = useToast();
  const [checkingPhone, setCheckingPhone] = useState(false);

  // New booking only - an existing edit already has its own customer record.
  // Saves retyping name/email for someone who has already booked, been
  // quoted, or been a lead before, instead of always starting from blank.
  const handlePhoneBlur = async () => {
    if (isEdit || !isValidPhone(form.phone) || form.customerName?.trim()) return;
    setCheckingPhone(true);
    try {
      const customer = await customerService.lookupByPhone(form.phone);
      if (customer) {
        setForm((prev) => ({
          ...prev,
          customerName: prev.customerName || customer.name || '',
          email: prev.email || customer.email || '',
        }));
        toast.success(`Found existing customer: ${customer.name || form.phone}. Details pre-filled.`);
      }
    } catch {
      // Silent - this is a convenience lookup, not a required step.
    } finally {
      setCheckingPhone(false);
    }
  };

  return (
    <div className="animate-[fadeIn_0.2s_ease-out] space-y-5">
      <FormRow>
        <Input
          label="Customer Name"
          icon={User}
          error={errors.customerName}
          required={isBookedOrBeyond}
          hint="Main contact passenger name"
          placeholder="e.g. Rahul Kumar"
          value={form.customerName}
          onChange={set('customerName')}
        />
        <Input
          label="Email Address (Optional)"
          icon={Mail}
          type="email"
          error={errors.email}
          hint="Receipts & vouchers go here if given - otherwise WhatsApp only"
          placeholder="e.g. rahul@gmail.com"
          value={form.email}
          onChange={set('email')}
        />
      </FormRow>
      <FormRow className="mt-5">
        <Input
          label="Contact Number"
          icon={Phone}
          error={errors.phone}
          required
          hint={checkingPhone ? 'Checking for an existing customer...' : 'Include country code for WhatsApp updates'}
          placeholder="e.g. +919876543210"
          value={form.phone}
          onChange={set('phone')}
          onBlur={handlePhoneBlur}
          disabled={isEdit && !canEditPhone}
        />
        <Input
          label="Emergency Contact (Optional)"
          icon={ShieldAlert}
          hint="Alternative contact number"
          placeholder="e.g. +919999988888"
          value={form.emergencyContact}
          onChange={set('emergencyContact')}
        />
      </FormRow>

      <div className="pt-4 border-t border-slate-100 mt-4">
        <Textarea
          label="General Notes / History log"
          hint="Traveler special requests or conversation timeline notes"
          rows={2}
          placeholder="e.g. Requesting vegetarian meals, ground floor rooms, check callback after 2 days..."
          value={form.notes}
          onChange={set('notes')}
        />
      </div>
    </div>
  );
}
