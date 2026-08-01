import React, { useEffect, useState } from 'react';
import Modal from '../common/Modal.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Textarea from '../ui/Textarea.jsx';
import FormRow from '../ui/FormRow.jsx';
import Button from '../ui/Button.jsx';
import { User, Mail, Phone, MapPin, Tag, UserCheck } from 'lucide-react';
import { isValidEmail, isValidPhone } from '../../utils/validators';
import * as leadService from '../../services/leadService';
import * as userService from '../../services/userService';
import * as quotationService from '../../services/quotationService';
import { useToast } from '../../hooks/useToast.jsx';

const LEAD_SOURCES = ['Manual', 'Landing Page', 'Referral', 'Website', 'WhatsApp'];
const LEAD_STAGES = ['New', 'Contacted', 'Qualified', 'Negotiating', 'Won', 'Lost'];

const emptyForm = {
  customerName: '', email: '', phone: '', interest: '', source: 'Manual',
  stage: 'New', assignedTo: '', notes: '',
};

export default function LeadFormModal({ open, onClose, onSaved, lead }) {
  const isEdit = !!lead;
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [itineraries, setItineraries] = useState([]);
  const [interestOther, setInterestOther] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (open) {
      setForm(lead ? { ...emptyForm, ...lead } : emptyForm);
      setErrors({});
      setInterestOther(false);
      userService.getUsers().then((users) => setTeamMembers(users || [])).catch(() => {});
      quotationService.getQuotations({ limit: 100 }).then((data) => {
        const list = data.quotations || [];
        setItineraries(list);
        // If editing and the interest doesn't match any itinerary, pre-select "Other"
        if (lead?.interest) {
          const found = list.find((q) => q.trip_name === lead.interest || q.tripName === lead.interest);
          if (!found) setInterestOther(true);
        }
      }).catch(() => {});
    }
  }, [open, lead]);

  const set = (key) => (e) => {
    let val = e.target.value;
    if (key === 'phone') val = val.replace(/[^0-9+\-\s()]/g, '');
    setForm({ ...form, [key]: val });
    if (errors[key]) setErrors({ ...errors, [key]: '' });
  };

  const validate = () => {
    const e = {};
    if (!form.customerName) e.customerName = 'Customer name is required.';
    if (!isValidPhone(form.phone)) e.phone = 'A valid phone number is required.';
    if (form.email && !isValidEmail(form.email)) e.email = 'Enter a valid email address.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) {
      toast.error('Please fix validation errors before saving.');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await leadService.updateLead(lead.leadId, form);
        toast.success('Lead updated.');
      } else {
        await leadService.createLead(form);
        toast.success('Lead created.');
      }
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save lead.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Lead' : 'Create New Lead'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormRow>
          <Input label="Customer Name" icon={User} required error={errors.customerName} placeholder="e.g. Rahul Kumar" value={form.customerName} onChange={set('customerName')} />
          <Input label="Email Address (Optional)" icon={Mail} type="email" error={errors.email} placeholder="e.g. rahul@gmail.com" value={form.email} onChange={set('email')} />
        </FormRow>
        <FormRow>
          <Input label="Contact Number" icon={Phone} required error={errors.phone} hint="Include country code for WhatsApp updates" placeholder="e.g. +919876543210" value={form.phone} onChange={set('phone')} />
          <div className="w-full space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Trip / Destination Interest</label>
            <select
              className="w-full text-sm bg-white border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500 font-medium text-slate-700 transition"
              value={interestOther ? '__other__' : (form.interest || '')}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '__other__') {
                  setInterestOther(true);
                  setForm({ ...form, interest: '' });
                } else {
                  setInterestOther(false);
                  setForm({ ...form, interest: val });
                  if (errors.interest) setErrors({ ...errors, interest: '' });
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
        </FormRow>
        <FormRow>
          <Select label="Lead Source" icon={Tag} value={form.source} onChange={set('source')} options={LEAD_SOURCES} />
          <Select
            label="Assigned Team Member"
            icon={UserCheck}
            value={form.assignedTo}
            onChange={set('assignedTo')}
            options={[{ value: '', label: '-- Not Assigned --' }, ...teamMembers.map((m) => ({ value: m.name, label: `${m.name} (${m.role})` }))]}
          />
        </FormRow>
        {isEdit && (
          <Select label="Pipeline Stage" value={form.stage} onChange={set('stage')} options={LEAD_STAGES} />
        )}
        <Textarea label="Notes" rows={2} placeholder="Traveler preferences, budget range, conversation notes..." value={form.notes} onChange={set('notes')} />

        <div className="flex justify-between items-center pt-5 border-t border-slate-200">
          <span className="text-xs text-slate-500 font-medium">Fields with * are mandatory</span>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Lead'}</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
