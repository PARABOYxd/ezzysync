import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink, FileSpreadsheet, Pause, Pencil, Play, Plus, RefreshCw, Trash2 } from 'lucide-react';
import * as leadSheetService from '../../services/leadSheetService';
import { useToast } from '../../hooks/useToast.jsx';
import Button from '../ui/Button.jsx';
import ConfirmDialog from '../common/ConfirmDialog.jsx';
import LeadSheetModal from './LeadSheetModal.jsx';

/** "2 mins ago" for the Last Synced column. */
export function timeAgo(value, now = Date.now()) {
  if (!value) return 'Never';
  const seconds = Math.max(0, Math.round((now - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function StatusPill({ sheet }) {
  if (sheet.paused) return <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-zinc-800 rounded-full px-2 py-0.5">Paused</span>;
  if (sheet.lastStatus === 'error') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950/30 rounded-full px-2 py-0.5">
        <AlertCircle size={12} /> Needs attention
      </span>
    );
  }
  if (sheet.lastStatus === 'pending') return <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-full px-2 py-0.5">Waiting for first sync</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 rounded-full px-2 py-0.5">
      <CheckCircle2 size={12} /> Active
    </span>
  );
}

/** Which team member or round-robin a sheet's leads go to. */
const assigneeLabel = (sheet) => (sheet.assignMode === 'agent' ? sheet.assignedTo : 'Round-Robin');
const tripLabel = (sheet) => (sheet.tripMode === 'column' ? `From column "${sheet.tripColumn}"` : (sheet.tripName || 'Not set'));

export default function LeadSheetsTab() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [modalSheet, setModalSheet] = useState(undefined); // undefined = closed, null = new, object = editing
  const [busyId, setBusyId] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  // Re-renders "2 mins ago" without refetching.
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    try {
      setData(await leadSheetService.getLeadSheets());
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => {
    load();
    const refresh = setInterval(load, 60_000);
    const tick = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => { clearInterval(refresh); clearInterval(tick); };
  }, [load]);

  const replaceSheet = (sheet) => setData((d) => ({ ...d, sheets: d.sheets.map((s) => (s.id === sheet.id ? sheet : s)) }));

  const handleSync = async (sheet) => {
    setBusyId(sheet.id);
    try {
      const { result, sheet: fresh } = await leadSheetService.syncLeadSheet(sheet.id);
      replaceSheet(fresh);
      if (result.status === 'error') toast.error(result.error || 'Could not read the sheet.');
      else if (result.imported > 0) toast.success(`${result.imported} new lead${result.imported === 1 ? '' : 's'} added from "${sheet.name}".`);
      else toast.success('Sheet is up to date. No new leads.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not sync the sheet.');
    } finally {
      setBusyId(null);
    }
  };

  const handleTogglePause = async (sheet) => {
    setBusyId(sheet.id);
    try {
      replaceSheet(await leadSheetService.setLeadSheetPaused(sheet.id, !sheet.paused));
      toast.success(sheet.paused ? 'Sync resumed.' : 'Sync paused. No new leads will be pulled in.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not change the sheet.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await leadSheetService.deleteLeadSheet(toDelete.id);
      setData((d) => ({ ...d, sheets: d.sheets.filter((s) => s.id !== toDelete.id) }));
      toast.success('Sheet disconnected. Leads already captured are kept.');
      setToDelete(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete the sheet.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSaved = (sheet, wasNew) => {
    setModalSheet(undefined);
    setData((d) => ({
      ...d,
      sheets: wasNew ? [sheet, ...d.sheets] : d.sheets.map((s) => (s.id === sheet.id ? sheet : s)),
    }));
    toast.success(wasNew ? 'Sheet connected. The first sync runs within 10 minutes, or press Sync Now.' : 'Sheet updated.');
  };

  const sheets = data?.sheets || [];
  const atLimit = data && sheets.length >= data.maxSheets;

  return (
    <div className="card space-y-5 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-800 dark:text-zinc-100">Google Sheets / Meta Leads</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Connect the sheets your Meta lead ads write into. New rows become leads automatically, on the trip and team member you choose.
            Checked every 10 minutes. Leads whose phone number is already a lead or a booking are skipped.
          </p>
        </div>
        <Button type="button" onClick={() => setModalSheet(null)} disabled={!data || atLimit} className="gap-1.5 shrink-0">
          <Plus size={16} /> Add Google Sheet
        </Button>
      </div>

      {!data && !loadFailed && <div className="skeleton h-32 rounded-xl" />}

      {loadFailed && !data && (
        <div className="text-sm text-red-600 flex items-center gap-3">
          Could not load your sheets.
          <button type="button" className="btn-secondary text-xs" onClick={load}>Try again</button>
        </div>
      )}

      {data && sheets.length === 0 && (
        <div className="text-center py-10 border border-dashed border-slate-200 dark:border-zinc-700 rounded-xl">
          <FileSpreadsheet size={32} className="mx-auto text-slate-300" />
          <p className="text-sm font-semibold text-slate-700 dark:text-zinc-200 mt-3">No sheets connected yet</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Paste the link of the Google Sheet your Meta form fills, pick the trip, and leads start arriving by themselves.
          </p>
        </div>
      )}

      {sheets.length > 0 && (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-zinc-800">
                <th className="py-2 pl-4 sm:pl-0 pr-3 font-semibold">Sheet</th>
                <th className="py-2 pr-3 font-semibold">Trip / Package</th>
                <th className="py-2 pr-3 font-semibold">Assigned To</th>
                <th className="py-2 pr-3 font-semibold">Last Synced</th>
                <th className="py-2 pr-3 font-semibold text-right">Leads</th>
                <th className="py-2 pr-4 sm:pr-0 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sheets.map((sheet) => {
                const busy = busyId === sheet.id || sheet.syncing;
                return (
                  <tr key={sheet.id} className="border-b border-slate-50 dark:border-zinc-800/60 align-top">
                    <td className="py-3 pl-4 sm:pl-0 pr-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-800 dark:text-zinc-100">{sheet.name}</span>
                        <a href={sheet.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${sheet.name} in Google Sheets`} className="text-slate-300 hover:text-brand-600">
                          <ExternalLink size={13} />
                        </a>
                      </div>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <StatusPill sheet={sheet} />
                        <span className="text-[11px] text-slate-400">Source: {sheet.sourceLabel} · Stage: {sheet.defaultStage}</span>
                      </div>
                      {sheet.lastStatus === 'error' && sheet.lastError && (
                        <p className="text-xs text-red-600 mt-1.5 max-w-sm">{sheet.lastError}</p>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-slate-600 dark:text-zinc-300">{tripLabel(sheet)}</td>
                    <td className="py-3 pr-3 text-slate-600 dark:text-zinc-300">{assigneeLabel(sheet)}</td>
                    <td className="py-3 pr-3 text-slate-600 dark:text-zinc-300 whitespace-nowrap">{timeAgo(sheet.lastSyncedAt)}</td>
                    <td className="py-3 pr-3 text-right font-semibold text-slate-800 dark:text-zinc-100">{sheet.totalSynced}</td>
                    <td className="py-3 pr-4 sm:pr-0">
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" onClick={() => handleSync(sheet)} disabled={busy} title="Sync Now" aria-label={`Sync ${sheet.name} now`}
                          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-40 min-h-[36px] min-w-[36px] flex items-center justify-center">
                          <RefreshCw size={15} className={busy ? 'animate-spin' : ''} />
                        </button>
                        <button type="button" onClick={() => handleTogglePause(sheet)} disabled={busy} title={sheet.paused ? 'Resume' : 'Pause'} aria-label={`${sheet.paused ? 'Resume' : 'Pause'} ${sheet.name}`}
                          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-40 min-h-[36px] min-w-[36px] flex items-center justify-center">
                          {sheet.paused ? <Play size={15} /> : <Pause size={15} />}
                        </button>
                        <button type="button" onClick={() => setModalSheet(sheet)} title="Edit" aria-label={`Edit ${sheet.name}`}
                          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 min-h-[36px] min-w-[36px] flex items-center justify-center">
                          <Pencil size={15} />
                        </button>
                        <button type="button" onClick={() => setToDelete(sheet)} title="Delete" aria-label={`Delete ${sheet.name}`}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 min-h-[36px] min-w-[36px] flex items-center justify-center">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {atLimit && <p className="text-xs text-amber-600">You have connected the maximum of {data.maxSheets} sheets.</p>}

      {modalSheet !== undefined && data && (
        <LeadSheetModal
          sheet={modalSheet}
          options={data.options}
          onClose={() => setModalSheet(undefined)}
          onSaved={handleSaved}
        />
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Disconnect this sheet?"
        message={`"${toDelete?.name}" will stop adding leads. Leads it already captured stay in your CRM.`}
      />
    </div>
  );
}
