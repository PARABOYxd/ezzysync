import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Drawer from '../common/Drawer.jsx';
import Modal from '../common/Modal.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Textarea from '../ui/Textarea.jsx';
import FormRow from '../ui/FormRow.jsx';
import Button from '../ui/Button.jsx';
import { User, Mail, Phone, MapPin, Tag, UserCheck, AlertTriangle, Users } from 'lucide-react';
import { isValidEmail, isValidPhone } from '../../utils/validators';
import * as leadService from '../../services/leadService';
import * as userService from '../../services/userService';
import * as quotationService from '../../services/quotationService';
import * as batchService from '../../services/batchService';
import { useToast } from '../../hooks/useToast.jsx';

const LEAD_SOURCES = ['Manual', 'Landing Page', 'Referral', 'Website', 'WhatsApp'];
const LEAD_STAGES = ['New', 'Contacted', 'Qualified', 'Negotiating', 'Won', 'Lost'];

const emptyForm = {
  customerName: '', email: '', phone: '', interest: '', source: 'Manual',
  stage: 'New', assignedTo: '', notes: '', batchId: '',
};

export default function LeadFormDrawer({ open, onClose, onSaved, onConvert, lead }) {
  const isEdit = !!lead;
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [itineraries, setItineraries] = useState([]);
  const [interestOther, setInterestOther] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [batches, setBatches] = useState([]);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setForm(lead ? { ...emptyForm, ...lead } : emptyForm);
      setErrors({});
      setDuplicateWarning(null);
      setInterestOther(false);
      userService.getUsers().then((users) => setTeamMembers(users || [])).catch(() => {});
      quotationService.getQuotations({ limit: 100 }).then((data) => {
        const list = data.quotations || [];
        setItineraries(list);
        if (lead?.interest) {
          const found = list.find((q) => q.trip_name === lead.interest || q.tripName === lead.interest);
          if (!found) setInterestOther(true);
        }
      }).catch(() => {});
      batchService.getBatches().then((data) => setBatches(data || [])).catch(() => {});
    }
  }, [open, lead]);

  const set = (key) => (e) => {
    let val = e.target.value;
    if (key === 'phone') val = val.replace(/[^0-9+\-\s()]/g, '');
    setForm({ ...form, [key]: val });
    if (errors[key]) setErrors({ ...errors, [key]: '' });
  };

  const handleBatchChange = (e) => {
    const bId = e.target.value;
    if (!bId) {
      setForm((prev) => ({ ...prev, batchId: '' }));
      return;
    }
    const b = batches.find((x) => x.id === bId);
    if (!b) return;
    setInterestOther(false);
    setForm((prev) => ({ ...prev, batchId: bId, interest: b.tripName }));
    if (errors.interest) setErrors((prev) => ({ ...prev, interest: '' }));
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
        if (form.stage === 'Won' && lead.stage !== 'Won' && !lead.convertedBookingId) {
          const formWithoutWon = { ...form, stage: lead.stage };
          await leadService.updateLead(lead.leadId, formWithoutWon);
          toast.info('Please complete the booking conversion to mark this lead as Won.');
          onSaved?.();
          onClose();
          if (onConvert) {
            onConvert({ ...lead, ...formWithoutWon });
          }
          return;
        }
        await leadService.updateLead(lead.leadId, form);
        toast.success('Lead updated.');
      } else {
        await leadService.createLead(form);
        toast.success('Lead created.');
      }
      onSaved?.();
      onClose();
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.existingLead) {
        setDuplicateWarning(err.response.data.existingLead);
        toast.warning('An active enquiry already exists for this contact.');
      } else {
        toast.error(err.response?.data?.message || 'Could not save lead.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleBypassDuplicate = async () => {
    setSaving(true);
    try {
      await leadService.createLead({ ...form, bypassDuplicateCheck: true });
      toast.success('Lead created successfully.');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save lead.');
    } finally {
      setSaving(false);
    }
  };

  if (duplicateWarning) {
    return (
      <Modal open={open} onClose={onClose} title="Active Enquiry Found" size="md">
        <div className="space-y-5 py-2 text-[var(--text-main)]">
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-400 text-xs leading-relaxed">
            <p className="font-bold text-sm mb-1 flex items-center gap-1.5"><AlertTriangle size={15} /> Active Lead Already Exists</p>
            An active enquiry for <b>{duplicateWarning.customerName}</b> is already registered in the pipeline:
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Lead ID: <span className="font-mono">{duplicateWarning.leadId}</span></li>
              <li>Trip Interest: {duplicateWarning.interest || 'Not Specified'}</li>
              <li>Current Stage: <span className="font-semibold">{duplicateWarning.stage}</span></li>
            </ul>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            What would you like to do? You can view and update the existing active lead card, or bypass this check to create a new parallel enquiry.
          </p>
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800">
            <button
              onClick={() => {
                onClose();
                navigate(`/leads?search=${duplicateWarning.leadId}`);
              }}
              className="btn-secondary text-xs"
            >
              🔍 View & Update Existing
            </button>
            <button
              onClick={handleBypassDuplicate}
              disabled={saving}
              className="btn-primary text-xs"
            >
              {saving ? 'Creating...' : '➕ Create Parallel Enquiry'}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Drawer open={open} onClose={onClose} title={isEdit ? 'Edit Lead' : 'Create New Lead'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormRow>
          <Input label="Customer Name" icon={User} required error={errors.customerName} placeholder="e.g. Rahul Kumar" value={form.customerName} onChange={set('customerName')} />
          <Input label="Email Address (Optional)" icon={Mail} type="email" error={errors.email} placeholder="e.g. rahul@gmail.com" value={form.email} onChange={set('email')} />
        </FormRow>
        <FormRow>
          <Input label="Contact Number" icon={Phone} required error={errors.phone} hint="Include country code for WhatsApp updates" placeholder="e.g. +919876543210" value={form.phone} onChange={set('phone')} />
          <Select
            label="Tour Batch / Group (Optional)"
            icon={Users}
            hint="Linking a batch sets the trip interest automatically"
            value={form.batchId || ''}
            onChange={handleBatchChange}
            options={[
              { value: '', label: '-- No Batch Linked --' },
              ...batches.map((b) => ({ value: b.id, label: `${b.name} (${b.confirmedSeats}/${b.totalCapacity} filled)` }))
            ]}
          />
        </FormRow>
        <FormRow>
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
                disabled={!!form.batchId}
                placeholder="e.g. Bali Honeymoon Package"
                value={form.interest}
                onChange={set('interest')}
              />
            )}
            {!!form.batchId && (
              <p className="text-[10px] text-slate-400">Locked to the linked batch's itinerary.</p>
            )}
          </div>
          <Select label="Lead Source" icon={Tag} value={form.source} onChange={set('source')} options={LEAD_SOURCES} />
        </FormRow>
        <FormRow>
          <Select
            label="Assigned Team Member"
            icon={UserCheck}
            value={form.assignedTo}
            onChange={set('assignedTo')}
            options={[{ value: '', label: '-- Not Assigned --' }, ...teamMembers.map((m) => ({ value: m.name, label: `${m.name} (${m.role})` }))]}
          />
        </FormRow>
        {isEdit && (
          <Select label="Pipeline Stage" value={form.stage} onChange={(e) => {
            if (e.target.value === 'Won') {
              if (onConvert) {
                onConvert(lead);
                onClose();
                return;
              }
            }
            set('stage')(e);
          }} options={LEAD_STAGES} />
        )}
        <Textarea label="Notes" rows={2} placeholder="Traveler preferences, budget range, conversation notes..." value={form.notes} onChange={set('notes')} />

        <div className="flex justify-between items-center pt-5 border-t border-slate-200 dark:border-zinc-800">
          <span className="text-xs text-slate-500 font-medium">Fields with * are mandatory</span>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Lead'}</Button>
          </div>
        </div>
      </form>
    </Drawer>
  );
}
