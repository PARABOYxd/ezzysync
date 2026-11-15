import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Facebook, Pause, Play, Settings2, Trash2, Unplug } from 'lucide-react';
import * as metaLeadService from '../../services/metaLeadService';
import { useToast } from '../../hooks/useToast.jsx';
import Modal from '../common/Modal.jsx';
import ConfirmDialog from '../common/ConfirmDialog.jsx';
import { timeAgo } from './LeadSheetsTab.jsx';

/** Connect a page, or change how an already connected one files its leads. */
function PageModal({ page, options, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    tripName: page.tripName || '',
    assignMode: page.assignMode,
    assignedTo: page.assignedTo || '',
    defaultStage: page.defaultStage,
    sourceLabel: page.sourceLabel,
  }));
  const [formTrips, setFormTrips] = useState(() => Object.entries(page.formTrips || {}).map(([formId, trip]) => ({ formId, trip })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setRow = (i, key) => (e) => setFormTrips((rows) => rows.map((r, j) => (j === i ? { ...r, [key]: e.target.value } : r)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const saved = await metaLeadService.connectMetaPage(page.id, {
        ...form,
        formTrips: Object.fromEntries(formTrips.filter((r) => r.formId.trim() && r.trip.trim()).map((r) => [r.formId.trim(), r.trip.trim()])),
      });
      onSaved(saved);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not connect this page.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={page.status === 'active' ? `Edit ${page.pageName}` : `Connect ${page.pageName}`} size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label" htmlFor="meta-trip">Trip / Package</label>
          <input id="meta-trip" className="input" list="meta-trip-options" value={form.tripName} onChange={set('tripName')}
            maxLength={200} placeholder="Leave empty to use each ad's own name" />
          <datalist id="meta-trip-options">{(options.trips || []).map((t) => <option key={t} value={t} />)}</datalist>
          <p className="text-xs text-slate-400 mt-1.5">Used for every form on this page unless you give a form its own trip below.</p>
        </div>

        <div>
          <p className="label">Trip for a specific form <span className="font-normal text-slate-400">(optional)</span></p>
          <div className="space-y-2">
            {formTrips.map((row, i) => (
              <div key={i} className="flex gap-2">
                <input className="input w-44 shrink-0" value={row.formId} onChange={setRow(i, 'formId')} placeholder="Form ID" inputMode="numeric" aria-label="Form ID" />
                <input className="input flex-1 min-w-0" value={row.trip} onChange={setRow(i, 'trip')} list="meta-trip-options" placeholder="Trip" aria-label="Trip for this form" />
                <button type="button" className="btn-secondary" aria-label="Remove this form" onClick={() => setFormTrips((rows) => rows.filter((_, j) => j !== i))}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="text-xs font-semibold text-brand-600 mt-2" onClick={() => setFormTrips((rows) => [...rows, { formId: '', trip: '' }])}>
            + Add a form
          </button>
          <p className="text-xs text-slate-400 mt-1">The form ID is in Meta Ads Manager / Instant Forms.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="meta-assign">Assign leads to</label>
            <select id="meta-assign" className="input" value={form.assignMode === 'agent' ? form.assignedTo : form.assignMode === 'unassigned' ? '__unassigned' : '__rr'}
              onChange={(e) => {
                if (e.target.value === '__rr') setForm((f) => ({ ...f, assignMode: 'round_robin', assignedTo: '' }));
                else if (e.target.value === '__unassigned') setForm((f) => ({ ...f, assignMode: 'unassigned', assignedTo: '' }));
                else setForm((f) => ({ ...f, assignMode: 'agent', assignedTo: e.target.value }));
              }}>
              <option value="__rr">Auto-distribute</option>
              <option value="__unassigned">Unassigned</option>
              {(options.team || []).map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="meta-stage">Default stage</label>
            <select id="meta-stage" className="input" value={form.defaultStage} onChange={set('defaultStage')}>
              {(options.stages || ['New']).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="meta-source">Lead source tag</label>
            <input id="meta-source" className="input" value={form.sourceLabel} onChange={set('sourceLabel')} maxLength={60} />
          </div>
        </div>

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : page.status === 'active' ? 'Save changes' : 'Start receiving leads'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * Meta lead ads straight into the CRM: no sheet in between. Sign in with
 * Facebook, pick the page, choose the trip and who gets the leads.
 */
export default function MetaLeadsCard() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toRemove, setToRemove] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      setData(await metaLeadService.getMetaLeads());
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const onMessage = (e) => {
      const status = e.data?.metaLeadsOAuth;
      if (!status) return;
      if (status === 'success') { toast.success('Facebook connected. Choose the pages below.'); load(); }
      else if (status === 'denied') toast.error('Facebook sign-in was cancelled.');
      else toast.error('Facebook sign-in failed. Please try again.');
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [toast, load]);

  const replace = (page) => setData((d) => ({ ...d, pages: d.pages.map((p) => (p.id === page.id ? page : p)) }));

  const run = async (page, action, onDone) => {
    setBusyId(page.id);
    try { onDone(await action()); } catch (err) { toast.error(err.response?.data?.message || 'Something went wrong.'); } finally { setBusyId(null); }
  };

  const pages = data?.pages || [];

  return (
    <div className="card space-y-5 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-800 dark:text-zinc-100">Meta Lead Ads (direct)</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Leads from your Facebook and Instagram lead forms arrive here the moment they are submitted, with no Google Sheet.
            Sign in with Facebook, then switch on the pages you run ads from.
          </p>
        </div>
        <button type="button" className="btn-primary gap-1.5 shrink-0" onClick={metaLeadService.openFacebookSignIn} disabled={!data?.configured}>
          <Facebook size={16} /> {pages.length ? 'Reconnect Facebook' : 'Connect with Facebook'}
        </button>
      </div>

      {!data && !loadFailed && <div className="skeleton h-24 rounded-xl" />}
      {loadFailed && !data && (
        <div className="text-sm text-red-600 flex items-center gap-3">
          Could not load Meta lead settings. <button type="button" className="btn-secondary text-xs" onClick={load}>Try again</button>
        </div>
      )}

      {data && !data.configured && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-3">
          Facebook sign-in is not set up on this server yet (FACEBOOK_APP_ID, FACEBOOK_APP_SECRET and TOKEN_ENCRYPTION_KEY). Until then use Google Sheets above.
        </p>
      )}

      {data?.configured && pages.length === 0 && (
        <p className="text-sm text-slate-500">No pages yet. Press &ldquo;Connect with Facebook&rdquo; and allow access to the pages you advertise from.</p>
      )}

      {pages.length > 0 && (
        <ul className="divide-y divide-slate-100 dark:divide-zinc-800">
          {pages.map((page) => {
            const active = page.status === 'active';
            const busy = busyId === page.id;
            return (
              <li key={page.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800 dark:text-zinc-100 truncate">{page.pageName}</span>
                    {!active && <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-zinc-800 rounded-full px-2 py-0.5">Not connected</span>}
                    {active && page.paused && <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-zinc-800 rounded-full px-2 py-0.5">Paused</span>}
                    {active && !page.paused && !page.lastError && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 rounded-full px-2 py-0.5"><CheckCircle2 size={12} /> Receiving leads</span>
                    )}
                    {page.lastError && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950/30 rounded-full px-2 py-0.5"><AlertCircle size={12} /> Needs attention</span>
                    )}
                  </div>
                  {active && (
                    <p className="text-xs text-slate-400 mt-1">
                      {page.totalLeads} lead{page.totalLeads === 1 ? '' : 's'} · {page.lastLeadAt ? `last ${timeAgo(page.lastLeadAt)}` : 'none yet'} ·{' '}
                      {page.tripName || 'trip from the ad'} · {page.assignMode === 'agent' ? page.assignedTo : page.assignMode === 'unassigned' ? 'Unassigned' : 'Auto-distribute'}
                    </p>
                  )}
                  {page.lastError && <p className="text-xs text-red-600 mt-1">{page.lastError}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!active ? (
                    <button type="button" className="btn-primary text-xs" onClick={() => setEditing(page)} disabled={busy}>Connect</button>
                  ) : (
                    <>
                      <button type="button" title={page.paused ? 'Resume' : 'Pause'} aria-label={`${page.paused ? 'Resume' : 'Pause'} ${page.pageName}`} disabled={busy}
                        onClick={() => run(page, () => metaLeadService.setMetaPagePaused(page.id, !page.paused), replace)}
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 min-h-[36px] min-w-[36px] flex items-center justify-center">
                        {page.paused ? <Play size={15} /> : <Pause size={15} />}
                      </button>
                      <button type="button" title="Settings" aria-label={`Settings for ${page.pageName}`} onClick={() => setEditing(page)}
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 min-h-[36px] min-w-[36px] flex items-center justify-center">
                        <Settings2 size={15} />
                      </button>
                      <button type="button" title="Stop receiving leads" aria-label={`Disconnect ${page.pageName}`} disabled={busy}
                        onClick={() => run(page, () => metaLeadService.disconnectMetaPage(page.id), (p) => { replace(p); toast.success('Page disconnected.'); })}
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 min-h-[36px] min-w-[36px] flex items-center justify-center">
                        <Unplug size={15} />
                      </button>
                    </>
                  )}
                  <button type="button" title="Remove from list" aria-label={`Remove ${page.pageName}`} onClick={() => setToRemove(page)}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 min-h-[36px] min-w-[36px] flex items-center justify-center">
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {data?.webhookUrl && (
        <details className="text-xs text-slate-500">
          <summary className="cursor-pointer font-semibold text-slate-600">Setting this up for the first time?</summary>
          <div className="mt-2 space-y-1.5">
            <p>In your Meta app (developers.facebook.com) &rarr; Webhooks &rarr; Page, subscribe to <strong>leadgen</strong> with this callback URL:</p>
            <code className="block bg-slate-50 dark:bg-zinc-800/50 rounded px-2 py-1.5 break-all">{data.webhookUrl}</code>
            <p>The verify token is the <code>META_LEADS_WEBHOOK_VERIFY_TOKEN</code> set on the server.</p>
          </div>
        </details>
      )}

      {editing && data && (
        <PageModal
          page={editing}
          options={data.options}
          onClose={() => setEditing(null)}
          onSaved={(page) => { replace(page); setEditing(null); toast.success('Saved. New leads from this page will arrive automatically.'); }}
        />
      )}

      <ConfirmDialog
        open={Boolean(toRemove)}
        onClose={() => setToRemove(null)}
        onConfirm={async () => {
          try {
            await metaLeadService.removeMetaPage(toRemove.id);
            setData((d) => ({ ...d, pages: d.pages.filter((p) => p.id !== toRemove.id) }));
            setToRemove(null);
            toast.success('Page removed. Leads already captured are kept.');
          } catch (err) {
            toast.error(err.response?.data?.message || 'Could not remove the page.');
          }
        }}
        title="Remove this page?"
        message={`"${toRemove?.pageName}" will stop sending leads. Leads already captured stay in your CRM. Sign in with Facebook again to bring it back.`}
      />
    </div>
  );
}
