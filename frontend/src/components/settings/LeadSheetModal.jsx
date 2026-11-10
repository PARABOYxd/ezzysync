import React, { useEffect, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import * as leadSheetService from '../../services/leadSheetService';
import Modal from '../common/Modal.jsx';

/** Fields worth showing in the column check; the rest are detected without asking. */
const MAPPING_FIELDS = [
  { key: 'customerName', label: 'Customer name' },
  { key: 'phone', label: 'Phone number' },
  { key: 'email', label: 'Email' },
];

const emptyForm = (options) => ({
  name: '',
  sheetUrl: '',
  tripMode: 'fixed',
  tripName: '',
  tripColumn: '',
  assignMode: 'round_robin',
  assignedTo: options.team?.[0] || '',
  defaultStage: 'New',
  sourceLabel: options.defaultSource || 'Meta Ads',
  skipExisting: false,
});

const formFromSheet = (sheet) => ({
  name: sheet.name,
  sheetUrl: sheet.url,
  tripMode: sheet.tripMode,
  tripName: sheet.tripName,
  tripColumn: sheet.tripColumn,
  assignMode: sheet.assignMode,
  assignedTo: sheet.assignedTo,
  defaultStage: sheet.defaultStage,
  sourceLabel: sheet.sourceLabel,
  skipExisting: false,
});

/**
 * Add or edit a connected Google Sheet.
 *
 * `sheet` is null when adding. After the link is pasted, "Check sheet" reads
 * the header row so the agent sees which column we took for the name and phone
 * before saving, instead of finding out from a lead with no phone number.
 */
export default function LeadSheetModal({ sheet, options, onClose, onSaved }) {
  const editing = Boolean(sheet);
  const [form, setForm] = useState(() => (editing ? formFromSheet(sheet) : emptyForm(options)));
  const [chosen, setChosen] = useState(() => (editing ? { ...sheet.columnMapping } : {}));
  const [preview, setPreview] = useState(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const checkSheet = async (url = form.sheetUrl) => {
    setChecking(true);
    setCheckError('');
    try {
      setPreview(await leadSheetService.previewLeadSheet(url));
    } catch (err) {
      setPreview(null);
      setCheckError(err.response?.data?.message || 'Could not read the sheet.');
    } finally {
      setChecking(false);
    }
  };

  // Editing opens with the columns already loaded, so the dropdowns are real.
  useEffect(() => {
    if (editing) checkSheet(sheet.url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = preview?.columns || [];
  const shownFor = (field) => chosen[field] ?? preview?.mapping?.[field] ?? '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        columnMapping: Object.fromEntries(Object.entries(chosen).filter(([, header]) => header)),
      };
      const saved = editing
        ? await leadSheetService.updateLeadSheet(sheet.id, payload)
        : await leadSheetService.createLeadSheet(payload);
      onSaved(saved, !editing);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the sheet.');
    } finally {
      setSaving(false);
    }
  };

  const canSave = form.name.trim() && form.sheetUrl.trim();

  return (
    <Modal open onClose={onClose} title={editing ? 'Edit Google Sheet' : 'Add Google Sheet'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label" htmlFor="sheet-name">Sheet name</label>
          <input id="sheet-name" className="input" value={form.name} onChange={set('name')} maxLength={120}
            placeholder="Chopta Trek October Leads" autoFocus />
        </div>

        <div>
          <label className="label" htmlFor="sheet-url">Google Sheet link or ID</label>
          <div className="flex gap-2">
            <input id="sheet-url" className="input flex-1 min-w-0" value={form.sheetUrl} onChange={(e) => { set('sheetUrl')(e); setPreview(null); }}
              placeholder="https://docs.google.com/spreadsheets/d/..." inputMode="url" />
            <button type="button" className="btn-secondary gap-1.5 shrink-0" onClick={() => checkSheet()} disabled={checking || !form.sheetUrl.trim()}>
              {checking ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Check sheet
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1.5">
            In Google Sheets click <strong>Share</strong>, and set <strong>Anyone with the link</strong> to <strong>Viewer</strong>. We only read it.
          </p>
          {checkError && <p role="alert" className="text-xs text-red-600 mt-1.5">{checkError}</p>}
        </div>

        {preview && (
          <div className="rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/40 p-4 space-y-3">
            <p className="text-xs text-slate-500">
              Found <strong>{preview.totalRows}</strong> row{preview.totalRows === 1 ? '' : 's'}. We matched the columns below. Change any that look wrong.
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              {MAPPING_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="label" htmlFor={`map-${field.key}`}>{field.label}</label>
                  <select id={`map-${field.key}`} className="input" value={shownFor(field.key)}
                    onChange={(e) => setChosen((c) => ({ ...c, [field.key]: e.target.value }))}>
                    <option value="">Not found</option>
                    {columns.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              ))}
            </div>
            {!shownFor('phone') && <p role="alert" className="text-xs text-red-600">Choose the phone column. Without it no lead can be created.</p>}
            <p className="text-xs text-slate-400">Every other column (budget, travel date, questions) is saved in the lead's notes.</p>
          </div>
        )}

        <fieldset className="space-y-3">
          <legend className="label">Trip / Package</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="tripMode" checked={form.tripMode === 'fixed'} onChange={() => setForm((f) => ({ ...f, tripMode: 'fixed' }))} />
              Fixed trip
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="tripMode" checked={form.tripMode === 'column'} onChange={() => setForm((f) => ({ ...f, tripMode: 'column' }))} />
              Read from a sheet column
            </label>
          </div>

          {form.tripMode === 'column' && (
            <div>
              <label className="label" htmlFor="trip-column">Destination column</label>
              {columns.length > 0 ? (
                <select id="trip-column" className="input" value={form.tripColumn} onChange={set('tripColumn')}>
                  <option value="">Choose a column</option>
                  {columns.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              ) : (
                <input id="trip-column" className="input" value={form.tripColumn} onChange={set('tripColumn')}
                  placeholder="Column header, or press Check sheet" />
              )}
            </div>
          )}

          <div>
            <label className="label" htmlFor="trip-name">
              {form.tripMode === 'column' ? 'Trip when that column is empty' : 'Trip'}
            </label>
            <input id="trip-name" className="input" list="sheet-trip-options" value={form.tripName} onChange={set('tripName')}
              maxLength={200} placeholder="Chopta Tungnath" />
            <datalist id="sheet-trip-options">
              {(options.trips || []).map((t) => <option key={t} value={t} />)}
            </datalist>
          </div>
        </fieldset>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="sheet-assign">Assign leads to</label>
            <select id="sheet-assign" className="input"
              value={form.assignMode === 'agent' ? form.assignedTo : '__rr'}
              onChange={(e) => (e.target.value === '__rr'
                ? setForm((f) => ({ ...f, assignMode: 'round_robin', assignedTo: '' }))
                : setForm((f) => ({ ...f, assignMode: 'agent', assignedTo: e.target.value })))}>
              <option value="__rr">Auto-distribute (Round-Robin)</option>
              {(options.team || []).map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="sheet-stage">Default stage</label>
            <select id="sheet-stage" className="input" value={form.defaultStage} onChange={set('defaultStage')}>
              {(options.stages || ['New']).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="sheet-source">Lead source tag</label>
            <input id="sheet-source" className="input" value={form.sourceLabel} onChange={set('sourceLabel')} maxLength={60} placeholder="Meta Ads" />
          </div>
        </div>

        {!editing && (
          <label className="flex items-start gap-2 text-sm text-slate-600 dark:text-zinc-300 cursor-pointer">
            <input type="checkbox" className="mt-0.5" checked={form.skipExisting}
              onChange={(e) => setForm((f) => ({ ...f, skipExisting: e.target.checked }))} />
            <span>
              Only bring in leads added <strong>from now on</strong>
              <span className="block text-xs text-slate-400">Leave off to also import the rows already in the sheet.</span>
            </span>
          </label>
        )}

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving || !canSave}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Connect sheet'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
