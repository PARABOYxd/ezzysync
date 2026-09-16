import React from 'react';
import { User, Mail, Phone, ShieldAlert } from 'lucide-react';
import Input from '../ui/Input.jsx';
import Textarea from '../ui/Textarea.jsx';
import FormRow from '../ui/FormRow.jsx';

export default function CustomerInfoTab({ form, errors, set, isBookedOrBeyond, canEditPhone, isEdit }) {
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
          label="Email Address"
          icon={Mail}
          type="email"
          error={errors.email}
          required={isBookedOrBeyond}
          hint="Receipts & vouchers will be sent here"
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
          hint="Include country code for WhatsApp updates"
          placeholder="e.g. +919876543210"
          value={form.phone}
          onChange={set('phone')}
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
