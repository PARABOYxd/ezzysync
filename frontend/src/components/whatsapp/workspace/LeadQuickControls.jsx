import React, { useState } from 'react';
import { Loader2, Flame } from 'lucide-react';
import * as leadService from '../../../services/leadService';
import { useToast } from '../../../hooks/useToast.jsx';
import { LEAD_STAGES, STAGE_STYLES } from './helpers';

/**
 * Stage and owner for the chat's lead, changeable in place. Shown in the chat
 * header on wide screens and at the top of the Lead tab everywhere else.
 *
 * `users` is null when this agent may not list the team (team members get a
 * 403 from /users) - the owner then shows as text instead of a picker.
 */
export default function LeadQuickControls({ chat, users, onChanged, layout = 'row' }) {
  const toast = useToast();
  const [saving, setSaving] = useState(null); // 'stage' | 'owner'
  const leadId = chat?.formatted_lead_id;
  if (!leadId) return null;

  const stage = chat.lead_stage || 'New';
  const owner = chat.lead_assigned_to || '';

  const save = async (field, value) => {
    setSaving(field);
    try {
      if (field === 'stage') await leadService.updateLeadStage(leadId, value);
      else await leadService.updateLead(leadId, { assignedTo: value });
      toast.success(field === 'stage' ? `Moved to ${value}.` : value ? `Assigned to ${value}.` : 'Unassigned.');
      await onChanged?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update the lead.');
    } finally {
      setSaving(null);
    }
  };

  const selectCls =
    'appearance-none cursor-pointer rounded-lg border pl-2 pr-6 py-1 text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-60 bg-[length:12px] bg-no-repeat bg-[right_6px_center]';
  const chevron = {
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
  };

  return (
    <div className={layout === 'row' ? 'flex items-center gap-1.5' : 'grid grid-cols-2 gap-2'}>
      <label className="relative">
        <span className="sr-only">Lead stage</span>
        <select
          value={stage}
          disabled={saving !== null}
          onChange={(e) => save('stage', e.target.value)}
          className={`${selectCls} w-full ${STAGE_STYLES[stage] || STAGE_STYLES.New}`}
          style={chevron}
          title="Lead stage"
        >
          {LEAD_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>

      {users ? (
        <label className="relative">
          <span className="sr-only">Lead owner</span>
          <select
            value={owner}
            disabled={saving !== null}
            onChange={(e) => save('owner', e.target.value)}
            className={`${selectCls} w-full max-w-[140px] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700`}
            style={chevron}
            title="Who owns this lead"
          >
            <option value="">Unassigned</option>
            {owner && !users.some((u) => u.name === owner) && <option value={owner}>{owner}</option>}
            {users.map((u) => <option key={u.userId || u.name} value={u.name}>{u.name}</option>)}
          </select>
        </label>
      ) : (
        <span className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate">
          {owner || 'Unassigned'}
        </span>
      )}

      {layout === 'row' && chat.lead_priority === 'Hot' && (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 text-[11px] font-bold" title="Hot lead">
          <Flame className="w-3 h-3" /> Hot
        </span>
      )}
      {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" aria-label="Saving" />}
    </div>
  );
}
