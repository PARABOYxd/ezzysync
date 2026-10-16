import React, { useEffect, useState } from 'react';
import { Send, CheckCircle2, XCircle, Users } from 'lucide-react';
import Drawer from '../common/Drawer.jsx';
import Button from '../ui/Button.jsx';
import * as leadService from '../../services/leadService';
import * as whatsappTemplateService from '../../services/whatsappTemplateService';
import { useToast } from '../../hooks/useToast.jsx';

export default function BroadcastLeadsDrawer({ open, onClose, leads, onSent }) {
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState('');
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState(null);
  const [quota, setQuota] = useState(null);

  useEffect(() => {
    if (!open) return;
    setResults(null);
    setTemplateId('');
    whatsappTemplateService.getTemplates()
      .then(setTemplates)
      .catch(() => toast.error('Could not load message templates.'));

    leadService.getBroadcastQuota()
      .then(setQuota)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selectedTemplate = templates.find((t) => String(t.id) === String(templateId));

  const handleSend = async () => {
    if (!templateId) {
      toast.error('Pick a template to send.');
      return;
    }
    setSending(true);
    try {
      const res = await leadService.broadcastToLeads(leads.map((l) => l.leadId), templateId);
      setResults(res);
      toast.success(`Sent to ${res.sentCount} of ${res.totalCount} lead${res.totalCount === 1 ? '' : 's'}.`);
      onSent?.();
      leadService.getBroadcastQuota().then(setQuota).catch(() => {});
    } catch (err) {
      toast.error(err.response?.data?.message || 'Broadcast failed.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Message Selected Leads" size="lg">
      <div className="space-y-4">
        {/* Meta Cloud API live quota bar - SHOWN ONLY IF META IS LINKED / CONNECTED */}
        {quota?.metaConnected ? (
          <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Meta Cloud API Daily Quota (Tier 1)
              </span>
              <span>{quota.sentToday} / {quota.metaLimit} sent today</span>
            </div>
            <div className="w-full bg-emerald-200/60 dark:bg-emerald-900/40 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round((quota.sentToday / quota.metaLimit) * 100))}%` }}
              />
            </div>
            <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400">
              Meta official tier allows 1,000 unique business-initiated recipients per 24 hours.
            </p>
          </div>
        ) : (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                WhatsApp Web Safe Pacing Active
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-semibold">5–10s Delay / Msg</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">
              To keep your WhatsApp account safe from automated spam flags, sends are paced with humanized 5–10s delays and name personalization. Recommended max: 100 leads/day.
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl p-3">
          <Users size={16} className="text-brand-600 shrink-0" />
          <p className="text-xs text-slate-600">
            Sending to <span className="font-bold text-slate-800">{leads.length}</span> lead{leads.length === 1 ? '' : 's'}.
          </p>
        </div>

        {!results ? (
          <>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Template to send</label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full text-sm bg-white border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500 font-medium text-slate-700 transition"
              >
                <option value="">Select a template</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.type === 'template' ? `(Meta · ${t.meta_status || 'APPROVED'})` : '(Quick Message)'}
                  </option>
                ))}
              </select>
              {templates.length === 0 && (
                <p className="text-xs text-slate-400 mt-1.5">No templates yet - add one in Settings &rarr; WhatsApp Configuration first.</p>
              )}
            </div>

            {selectedTemplate && (
              <div className="bg-[#dcf8c6] border border-emerald-200 rounded-2xl rounded-tl-none p-3 text-xs text-slate-800 whitespace-pre-wrap">
                {selectedTemplate.body}
              </div>
            )}

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              <ul className="divide-y divide-slate-100">
                {leads.map((l) => (
                  <li key={l.leadId} className="flex items-center justify-between p-2.5 text-xs">
                    <span className="font-medium text-slate-700">{l.customerName || 'New Inquiry'}</span>
                    <span className="text-slate-400">{l.phone || 'no phone'}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="button" disabled={!templateId || sending} onClick={handleSend} className="text-sm gap-1.5">
                <Send size={14} /> {sending ? 'Sending...' : `Send to ${leads.length}`}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
              <ul className="divide-y divide-slate-100">
                {results.results.map((r) => (
                  <li key={r.leadId} className="flex items-center justify-between p-2.5 text-xs">
                    <span className="font-medium text-slate-700">{r.customerName || r.leadId}</span>
                    {r.sent ? (
                      <span className="flex items-center gap-1 text-emerald-600 font-semibold"><CheckCircle2 size={13} /> Sent</span>
                    ) : (
                      <span className="flex items-center gap-1 text-rose-600 font-semibold" title={r.error}><XCircle size={13} /> Failed</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button type="button" onClick={onClose} className="text-sm">Done</Button>
            </div>
          </>
        )}
      </div>
    </Drawer>
  );
}
