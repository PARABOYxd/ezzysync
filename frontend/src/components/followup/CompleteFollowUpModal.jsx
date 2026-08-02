import React, { useEffect, useState } from 'react';
import Modal from '../common/Modal.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Textarea from '../ui/Textarea.jsx';
import FormRow from '../ui/FormRow.jsx';
import Button from '../ui/Button.jsx';
import { Calendar, MessageSquare, Phone, Mail, FileText, CheckCircle, ChevronDown } from 'lucide-react';
import * as leadService from '../../services/leadService';
import * as bookingService from '../../services/bookingService';
import * as followUpService from '../../services/followUpService';
import * as userService from '../../services/userService';
import { useToast } from '../../hooks/useToast.jsx';

const ACTIVITY_TYPES = [
  { value: 'call', label: '📞 Phone Call' },
  { value: 'whatsapp', label: '💬 WhatsApp Message' },
  { value: 'email', label: '✉️ Email' },
  { value: 'meeting', label: '📅 Meeting' },
];

export default function CompleteFollowUpModal({ open, onClose, followUp, onCompleted }) {
  const [outcomeNote, setOutcomeNote] = useState('');
  const [scheduleNext, setScheduleNext] = useState(false);
  const [nextTask, setNextTask] = useState({
    activityType: 'call',
    nextFollowUpDate: '',
    note: '',
    assignedTo: ''
  });
  const [teamMembers, setTeamMembers] = useState([]);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (open) {
      setOutcomeNote('');
      setScheduleNext(false);
      setNextTask({
        activityType: 'call',
        nextFollowUpDate: '',
        note: '',
        assignedTo: followUp?.assigned_to || ''
      });
      userService.getUsers().then((users) => setTeamMembers(users || [])).catch(() => {});
    }
  }, [open, followUp]);

  if (!followUp) return null;

  const setNext = (key) => (e) => setNextTask({ ...nextTask, [key]: e.target.value });

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    
    if (scheduleNext) {
      if (!nextTask.nextFollowUpDate) {
        toast.error('Please specify a date for the next follow-up.');
        return;
      }
      const today = new Date().toISOString().split('T')[0];
      if (nextTask.nextFollowUpDate < today) {
        toast.error('Next follow-up date must be today or in the future.');
        return;
      }
      if (!nextTask.note.trim()) {
        toast.error('Please add a note describing the next follow-up action.');
        return;
      }
    }

    setSaving(true);
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      if (followUp.id) {
        // 1. Mark current follow-up done with outcome notes
        await followUpService.markFollowUpDone(followUp.id, { outcomeNote: outcomeNote.trim() });
        
        // 2. Schedule next follow-up
        // If not explicitly scheduled, auto-set to tomorrow so it returns to their calling queue.
        const payload = {
          note: scheduleNext ? nextTask.note.trim() : `Auto-reminder: ${outcomeNote.trim() || 'Follow-up check-in'}`,
          activityType: scheduleNext ? nextTask.activityType : 'call',
          nextFollowUpDate: scheduleNext ? nextTask.nextFollowUpDate : tomorrowStr,
          assignedTo: scheduleNext ? nextTask.assignedTo : (followUp.assigned_to || '')
        };

        if (followUp.source_type === 'booking') {
          await bookingService.addFollowUp(followUp.source_id, payload);
        } else {
          await leadService.addLeadFollowUp(followUp.source_id, payload);
        }
      } else {
        // Nurturing lead: Log outcome directly.
        // If not explicitly scheduled, auto-set next follow-up to tomorrow to remind the user.
        const payload = {
          note: scheduleNext ? nextTask.note.trim() : `Auto-reminder: ${outcomeNote.trim() || 'Nurturing check-in'}`,
          activityType: scheduleNext ? nextTask.activityType : 'call',
          nextFollowUpDate: scheduleNext ? nextTask.nextFollowUpDate : tomorrowStr,
          assignedTo: scheduleNext ? nextTask.assignedTo : (followUp.assigned_to || '')
        };

        if (followUp.source_type === 'booking') {
          await bookingService.addFollowUp(followUp.source_id, payload);
        } else {
          await leadService.addLeadFollowUp(followUp.source_id, payload);
        }
      }

      toast.success('Follow-up updated successfully.');
      onCompleted?.(followUp.id);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not complete follow-up.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Complete Follow-up Task" size="md">
      <form onSubmit={handleSubmit} className="space-y-5 text-[var(--text-main)]">
        
        {/* Task Details Info Card */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800/80 text-xs space-y-1">
          <p className="font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wide">Pending Task</p>
          <p className="font-bold text-slate-800 dark:text-zinc-200 text-sm">{followUp.customer_name}</p>
          <p className="text-slate-600 dark:text-zinc-400 italic">"{followUp.note}"</p>
        </div>

        {/* Section 1: Outcome summary */}
        <Textarea 
          label="Outcome Summary (Optional)" 
          rows={2} 
          placeholder="What was the result of this action? (e.g. Call connected, discussed itinerary options...)" 
          value={outcomeNote} 
          onChange={(e) => setOutcomeNote(e.target.value)} 
        />

        {/* Section 2: Schedule Next Follow-up Trigger */}
        <div className="flex items-center gap-2 pt-2">
          <input 
            type="checkbox" 
            id="scheduleNext" 
            checked={scheduleNext} 
            onChange={(e) => setScheduleNext(e.target.checked)} 
            className="w-4 h-4 text-brand-600 border-slate-300 dark:border-zinc-700 rounded focus:ring-brand-500 bg-white dark:bg-zinc-800"
          />
          <label htmlFor="scheduleNext" className="text-sm font-semibold text-slate-700 dark:text-zinc-300 cursor-pointer select-none">
            🗓️ Schedule a future follow-up task
          </label>
        </div>

        {/* Schedule next form fields */}
        {scheduleNext && (
          <div className="space-y-4 p-4 rounded-xl border border-slate-100 dark:border-zinc-800/80 bg-slate-50/30 dark:bg-zinc-900/10">
            <FormRow>
              <Select 
                label="Next Activity Type" 
                value={nextTask.activityType} 
                onChange={setNext('activityType')} 
                options={ACTIVITY_TYPES}
              />
              <Input 
                label="Next Date" 
                icon={Calendar} 
                required 
                type="date" 
                value={nextTask.nextFollowUpDate} 
                onChange={setNext('nextFollowUpDate')} 
              />
            </FormRow>

            <Select
              label="Assigned Team Member"
              value={nextTask.assignedTo}
              onChange={setNext('assignedTo')}
              options={[{ value: '', label: '-- Not Assigned --' }, ...teamMembers.map((m) => ({ value: m.name, label: `${m.name} (${m.role})` }))]}
            />

            <Input 
              label="Action Notes" 
              icon={FileText} 
              required 
              placeholder="e.g. Send finalized itinerary quotes on Bali trip" 
              value={nextTask.note} 
              onChange={setNext('note')} 
            />
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex justify-end gap-3 pt-5 border-t border-slate-200 dark:border-zinc-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Processing...' : scheduleNext ? 'Complete & Schedule Next' : 'Mark as Completed'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
