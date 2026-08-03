import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Drawer from '../common/Drawer.jsx';
import Textarea from '../ui/Textarea.jsx';
import Input from '../ui/Input.jsx';
import Button from '../ui/Button.jsx';
import { LeadStageBadge } from '../common/StatusBadge.jsx';
import * as leadService from '../../services/leadService';
import { Phone, MessageSquare, Mail, Calendar, FileText, User, Info, MapPin, Tag, UserCheck } from 'lucide-react';
import { useToast } from '../../hooks/useToast.jsx';

const activityOptions = [
  { value: 'note', label: 'Note', icon: <FileText size={12} /> },
  { value: 'call', label: 'Call', icon: <Phone size={12} /> },
  { value: 'whatsapp', label: 'WhatsApp', icon: <MessageSquare size={12} /> },
  { value: 'email', label: 'Email', icon: <Mail size={12} /> },
  { value: 'meeting', label: 'Meeting', icon: <Calendar size={12} /> },
];

function getActivityIcon(type) {
  switch (type) {
    case 'call': return <Phone size={11} className="text-blue-600" />;
    case 'whatsapp': return <MessageSquare size={11} className="text-emerald-600" />;
    case 'email': return <Mail size={11} className="text-violet-600" />;
    case 'meeting': return <Calendar size={11} className="text-amber-600" />;
    default: return <FileText size={11} className="text-slate-500" />;
  }
}

function getActivityBg(type) {
  switch (type) {
    case 'call': return 'bg-blue-50/70 border-blue-100 text-blue-700';
    case 'whatsapp': return 'bg-emerald-50/70 border-emerald-100 text-emerald-700';
    case 'email': return 'bg-violet-50/70 border-violet-100 text-violet-700';
    case 'meeting': return 'bg-amber-50/70 border-amber-100 text-amber-700';
    default: return 'bg-slate-50/70 border-slate-200/60 text-slate-700';
  }
}

export default function LeadViewDrawer({ open, onClose, lead, onRefresh }) {
  const toast = useToast();
  const [followUps, setFollowUps] = useState([]);
  const [note, setNote] = useState('');
  const [activityType, setActivityType] = useState('note');
  const [nextDate, setNextDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadLogs = useCallback(async () => {
    if (!lead?.leadId) return;
    try {
      const logs = await leadService.getLeadFollowUps(lead.leadId);
      setFollowUps(logs);
    } catch (err) {
      console.error('Failed to load logs:', err);
    }
  }, [lead?.leadId]);

  useEffect(() => {
    if (open && lead?.leadId) loadLogs();
  }, [open, lead, loadLogs]);

  if (!lead) return null;

  const handleAddLog = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    setSubmitting(true);
    try {
      await leadService.addLeadFollowUp(lead.leadId, { note: note.trim(), activityType, nextFollowUpDate: nextDate || null });
      setNote('');
      setNextDate('');
      setActivityType('note');
      toast.success('Activity logged successfully.');
      loadLogs();
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error('Failed to save follow-up activity.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title={`Lead Details · ${lead.leadId}`} size="xl">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-slate-700">
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center justify-between gap-2">
            <LeadStageBadge stage={lead.stage} />
            {lead.customerId && (
              <Link to={`/customers/${lead.customerId}`} className="text-xs font-semibold text-brand-600 hover:underline">
                View Customer &rarr;
              </Link>
            )}
          </div>

          <div className="space-y-4">
            <h5 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <User size={12} /><span>Customer Information</span>
            </h5>
            <div className="grid grid-cols-2 gap-y-3.5 text-xs">
              <div className="col-span-2">
                <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Full Name</span>
                <span className="font-bold text-slate-800 text-sm">{lead.customerName}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Email</span>
                <span className="font-medium text-slate-600 break-all">{lead.email || '-'}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Phone</span>
                <span className="font-semibold text-slate-600">{lead.phone}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h5 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <MapPin size={12} /><span>Lead Details</span>
            </h5>
            <div className="grid grid-cols-2 gap-y-3.5 text-xs">
              <div className="col-span-2">
                <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Trip Interest</span>
                <span className="font-semibold text-slate-700">{lead.interest || <span className="text-slate-400 italic">Not specified</span>}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-semibold mb-0.5 flex items-center gap-1"><Tag size={10} /> Source</span>
                <span className="font-medium text-slate-600">{lead.source}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-semibold mb-0.5 flex items-center gap-1"><UserCheck size={10} /> Assigned To</span>
                <span className="font-medium text-slate-600">{lead.assignedTo || <span className="text-slate-400 italic">Not assigned</span>}</span>
              </div>
              {lead.convertedBookingId && (
                <div className="col-span-2">
                  <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Converted Booking</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-[10px] font-bold">
                    ✓ {lead.convertedBookingId}
                  </span>
                </div>
              )}
            </div>
          </div>

          {lead.notes && (
            <div className="space-y-2">
              <h5 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <FileText size={12} /><span>Notes</span>
              </h5>
              <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200/60 rounded-xl p-3 leading-relaxed whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-7 flex flex-col space-y-5 border-l border-slate-100 pl-0 lg:pl-6">
          <div>
            <h4 className="font-extrabold text-slate-800 text-sm">Timeline & Activity Logs</h4>
            <p className="text-[10px] text-slate-400 mt-0.5">{followUps.length} follow-up interactions recorded</p>
          </div>

          <form onSubmit={handleAddLog} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-4">
            <div className="space-y-1">
              <label className="block text-[10px] text-slate-400 font-bold uppercase">Log Interaction Type</label>
              <div className="flex flex-wrap gap-1.5">
                {activityOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setActivityType(opt.value)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition ${
                      activityType === opt.value
                        ? 'bg-teal-50 border-teal-200 text-teal-700 shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-500'
                    }`}
                  >
                    {opt.icon}<span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <Textarea inputClassName="text-xs min-h-[60px]" placeholder="Type call summary, customer response, negotiation notes..." required value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Input label="Set next follow-up date" type="date" inputClassName="text-xs" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
              </div>
              <div className="col-span-2 sm:col-span-1 flex items-end justify-end">
                <Button type="submit" disabled={submitting} className="text-xs">
                  {submitting ? 'Saving Log...' : 'Add Log Entry'}
                </Button>
              </div>
            </div>
          </form>

          <div className="flex-1 overflow-y-auto max-h-[300px] pr-2 space-y-4 no-scrollbar">
            {followUps.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                <Info size={20} className="text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-semibold">No activity logs recorded yet</p>
              </div>
            ) : (
              <div className="relative border-l border-slate-200/80 ml-3.5 space-y-5">
                {followUps.map((log) => (
                  <div key={log.id} className="relative pl-6">
                    <div className={`absolute -left-3 top-0.5 w-6 h-6 rounded-full border flex items-center justify-center shadow-sm ${getActivityBg(log.activity_type)}`}>
                      {getActivityIcon(log.activity_type)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                        <span>Logged by <b className="text-slate-600 font-semibold">{log.created_by || 'Agent'}</b></span>
                        <span>{new Date(log.created_at).toLocaleDateString('en-IN')} &middot; {new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 text-xs text-slate-600 leading-relaxed shadow-sm">
                        <p className="whitespace-pre-wrap">{log.note}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
