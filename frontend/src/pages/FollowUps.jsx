import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Check, Phone, MessageSquare, Mail, Calendar, FileText } from 'lucide-react';
import Input from '../components/ui/Input.jsx';
import * as followUpService from '../services/followUpService';
import { SkeletonTableRows } from '../components/common/Skeleton.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { useToast } from '../hooks/useToast.jsx';

function getActivityIcon(type) {
  switch (type) {
    case 'call': return <Phone size={13} className="text-blue-600" />;
    case 'whatsapp': return <MessageSquare size={13} className="text-emerald-600" />;
    case 'email': return <Mail size={13} className="text-violet-600" />;
    case 'meeting': return <Calendar size={13} className="text-amber-600" />;
    default: return <FileText size={13} className="text-slate-500" />;
  }
}

export default function FollowUps() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignedTo, setAssignedTo] = useState('');
  const [completingId, setCompletingId] = useState(null);
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    followUpService.getDueFollowUps({ overdue: true, dueToday: true, assignedTo })
      .then(setItems)
      .catch(() => toast.error('Could not load follow-ups.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignedTo]);

  useEffect(load, [load]);

  const handleMarkDone = async (id) => {
    setCompletingId(id);
    try {
      await followUpService.markFollowUpDone(id);
      toast.success('Marked as done.');
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      toast.error('Could not update follow-up.');
    } finally {
      setCompletingId(null);
    }
  };

  const isOverdue = (dateStr) => new Date(dateStr) < new Date(new Date().toDateString());

  return (
    <div className="space-y-5">
      <div className="w-full max-w-xs">
        <Input placeholder="Filter by assigned team member…" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50/60">
                <th className="py-3 px-4 font-medium">Customer</th>
                <th className="py-3 px-4 font-medium">Reference</th>
                <th className="py-3 px-4 font-medium">Note</th>
                <th className="py-3 px-4 font-medium">Assigned To</th>
                <th className="py-3 px-4 font-medium">Due Date</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <SkeletonTableRows rows={6} cols={6} />}
              {!loading && items.map((item) => {
                const overdue = isOverdue(item.next_follow_up_date);
                const linkTo = item.source_type === 'booking' ? `/bookings?search=${item.source_id}` : `/leads?search=${item.source_id}`;
                return (
                  <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-medium text-slate-700">{item.customer_name}</td>
                    <td className="py-3 px-4">
                      <Link to={linkTo} className="text-brand-600 hover:underline text-xs font-mono">
                        {item.source_type === 'booking' ? 'BK' : 'Lead'} · {item.source_id}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      <span className="flex items-center gap-1.5">{getActivityIcon(item.activity_type)} {item.note}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{item.assigned_to || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`font-semibold text-xs ${overdue ? 'text-red-500 font-bold' : 'text-slate-500'}`}>
                        {new Date(item.next_follow_up_date).toLocaleDateString('en-IN')}{overdue ? ' (Overdue)' : ' (Today)'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end items-center gap-2">
                        {item.customer_phone && (
                          <a
                            href={`tel:${item.customer_phone}`}
                            title={`Call ${item.customer_name} (${item.customer_phone})`}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition shrink-0"
                          >
                            <Phone size={13} />
                          </a>
                        )}
                        {item.customer_phone && (
                          <a
                            href={`https://wa.me/${item.customer_phone.replace(/[^\d]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            title={`WhatsApp Chat with ${item.customer_name}`}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition shrink-0"
                          >
                            <MessageSquare size={13} />
                          </a>
                        )}
                        {item.customer_email && (
                          <a
                            href={`mailto:${item.customer_email}`}
                            title={`Send Email to ${item.customer_email}`}
                            className="p-1.5 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 transition shrink-0"
                          >
                            <Mail size={13} />
                          </a>
                        )}
                        <button
                          title="Mark follow-up as done"
                          disabled={completingId === item.id}
                          onClick={() => handleMarkDone(item.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 ml-1 shrink-0"
                        >
                          <Check size={13} /> Done
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && items.length === 0 && (
          <EmptyState title="All caught up!" message="No follow-ups are due today or overdue." />
        )}
      </div>
    </div>
  );
}
