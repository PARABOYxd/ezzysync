import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  UploadCloud, FileSpreadsheet, Download, ArrowRight, ArrowLeft, CheckCircle2,
  AlertTriangle, Loader2, Users, Copy, Ban, ChevronDown, Phone, Calendar,
} from 'lucide-react';
import Drawer from '../common/Drawer.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import * as leadService from '../../services/leadService';
import * as userService from '../../services/userService';
import { useToast } from '../../hooks/useToast.jsx';
import { useAuth } from '../../hooks/useAuth.jsx';

const LEAD_STAGES = ['New', 'Contacted', 'Negotiating', 'Won', 'Lost'];

const STEPS = [
  { key: 'upload', label: 'Upload file' },
  { key: 'map', label: 'Match columns' },
  { key: 'review', label: 'Review & import' },
  { key: 'done', label: 'Done' },
];

/**
 * Bringing an agency's old enquiry spreadsheet into the CRM.
 *
 * The wizard is deliberately four screens: an agency's sheet never has the
 * column names this CRM uses, so the user confirms the match and sees the
 * real counts before a single lead is written.
 */
export default function ImportLeadsDrawer({ open, onClose, onImported }) {
  const { user } = useAuth();
  const isTeamMember = user?.role === 'TEAM_MEMBER';
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState('upload');
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [mapping, setMapping] = useState({});
  const [defaults, setDefaults] = useState({ stage: 'New', assignedTo: '' });
  const [duplicateAction, setDuplicateAction] = useState('skip');
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [fields, setFields] = useState([]);

  useEffect(() => {
    if (!open) return;
    setStep('upload');
    setParsed(null);
    setMapping({});
    setAnalysis(null);
    setResult(null);
    setDuplicateAction('skip');
    setDefaults({ stage: 'New', assignedTo: isTeamMember ? user?.name || '' : '' });
    userService.getUsers().then((users) => setTeamMembers(users || [])).catch(() => {});
    leadService.getLeadImportFields().then((d) => setFields(d.fields || [])).catch(() => {});
  }, [open, isTeamMember, user?.name]);

  const requiredFields = (parsed?.fields || fields).filter((f) => f.required);
  const unmappedRequired = requiredFields.filter(
    (f) => mapping[f.key] === undefined || mapping[f.key] === '' || mapping[f.key] === null
  );

  const handleFile = async (file) => {
    if (!file) return;
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      toast.error('Please choose a .xlsx, .xls or .csv file.');
      return;
    }

    setParsing(true);
    try {
      const data = await leadService.previewLeadImport(file);
      setParsed(data);
      setMapping(data.mapping || {});
      setStep('map');
      if (data.truncated) {
        toast.info(`Only the first ${data.maxRows} of ${data.totalRows} rows will be imported.`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'That file could not be read.');
    } finally {
      setParsing(false);
    }
  };

  const runAnalysis = useCallback(async () => {
    setAnalyzing(true);
    try {
      const data = await leadService.analyzeLeadImport({ rows: parsed.rows, mapping, defaults });
      setAnalysis(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not check the file.');
      setAnalysis(null);
    } finally {
      setAnalyzing(false);
    }
  }, [parsed, mapping, defaults]);

  const goToReview = async () => {
    if (unmappedRequired.length > 0) {
      toast.error(`Choose a column for: ${unmappedRequired.map((f) => f.label).join(', ')}.`);
      return;
    }
    setStep('review');
    runAnalysis();
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const data = await leadService.runLeadImport({
        rows: parsed.rows,
        mapping,
        defaults,
        duplicateAction,
      });
      setResult(data);
      setStep('done');
      if (data.imported > 0) {
        toast.success(`${data.imported} lead${data.imported === 1 ? '' : 's'} imported.`);
        onImported?.();
      } else {
        toast.info('Nothing was imported — every row was a duplicate or unusable.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'The import could not be completed.');
    } finally {
      setImporting(false);
    }
  };

  const setColumn = (fieldKey, value) => {
    setMapping((prev) => {
      const next = { ...prev };
      if (value === '') delete next[fieldKey];
      else next[fieldKey] = Number(value);
      return next;
    });
    setAnalysis(null);
  };

  const columnOptions = [
    { value: '', label: '— Not in my file —' },
    ...(parsed?.columns || []).map((c, i) => ({ value: String(i), label: c })),
  ];

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <Drawer open={open} onClose={onClose} title="Import leads from Excel" size="xl">
      <div className="space-y-6">
        <StepBar current={stepIndex} />

        {step === 'upload' && (
          <UploadStep
            dragging={dragging}
            setDragging={setDragging}
            parsing={parsing}
            fileInputRef={fileInputRef}
            onFile={handleFile}
            fields={fields}
          />
        )}

        {step === 'map' && parsed && (
          <MapStep
            parsed={parsed}
            mapping={mapping}
            columnOptions={columnOptions}
            onSetColumn={setColumn}
            defaults={defaults}
            setDefaults={setDefaults}
            teamMembers={teamMembers}
            isTeamMember={isTeamMember}
          />
        )}

        {step === 'review' && parsed && (
          <ReviewStep
            parsed={parsed}
            analysis={analysis}
            analyzing={analyzing}
            duplicateAction={duplicateAction}
            setDuplicateAction={(v) => { setDuplicateAction(v); }}
            defaults={defaults}
          />
        )}

        {step === 'done' && result && <DoneStep result={result} />}

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800">
          {step === 'upload' && (
            <>
              <button
                type="button"
                onClick={() => leadService.downloadLeadImportTemplate().catch(() => toast.error('Could not download the template.'))}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1.5"
              >
                <Download size={14} /> Download sample template
              </button>
              <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
            </>
          )}

          {step === 'map' && (
            <>
              <Button variant="ghost" type="button" onClick={() => setStep('upload')}>
                <ArrowLeft size={15} /> Back
              </Button>
              <Button type="button" onClick={goToReview} disabled={unmappedRequired.length > 0}>
                Continue <ArrowRight size={15} />
              </Button>
            </>
          )}

          {step === 'review' && (
            <>
              <Button variant="ghost" type="button" onClick={() => setStep('map')} disabled={importing}>
                <ArrowLeft size={15} /> Back to columns
              </Button>
              <Button type="button" onClick={handleImport} disabled={importing || analyzing || analysis?.valid === 0}>
                {importing ? (
                  <><Loader2 size={15} className="animate-spin" /> Importing…</>
                ) : (
                  <>Import {analysis ? countToImport(analysis, duplicateAction) : ''} leads</>
                )}
              </Button>
            </>
          )}

          {step === 'done' && (
            <>
              <Button variant="ghost" type="button" onClick={() => setStep('upload')}>Import another file</Button>
              <Button type="button" onClick={onClose}>Done</Button>
            </>
          )}
        </div>
      </div>
    </Drawer>
  );
}

function countToImport(analysis, duplicateAction) {
  return duplicateAction === 'import' ? analysis.valid + analysis.duplicateExisting : analysis.valid;
}

/* ------------------------------------------------------------------ steps */

function StepBar({ current }) {
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.key} className="flex items-center gap-2 flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition ${
                  done
                    ? 'bg-emerald-500 text-white'
                    : active
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500'
                }`}
              >
                {done ? <CheckCircle2 size={14} /> : i + 1}
              </span>
              <span className={`text-xs font-semibold hidden sm:block ${active ? 'text-slate-800 dark:text-zinc-100' : 'text-slate-400 dark:text-zinc-500'}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-slate-200 dark:bg-zinc-800" />}
          </li>
        );
      })}
    </ol>
  );
}

function UploadStep({ dragging, setDragging, parsing, fileInputRef, onFile, fields }) {
  const [showFields, setShowFields] = useState(false);

  return (
    <div className="space-y-5">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => !parsing && fileInputRef.current?.click()}
        className={`rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition ${
          dragging
            ? 'border-brand-400 bg-brand-50/60 dark:bg-brand-950/20'
            : 'border-slate-200 dark:border-zinc-700 hover:border-brand-300 hover:bg-slate-50/60 dark:hover:bg-zinc-800/40'
        }`}
      >
        {parsing ? (
          <>
            <Loader2 className="w-9 h-9 mx-auto text-brand-600 animate-spin" />
            <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-zinc-200">Reading your file…</p>
          </>
        ) : (
          <>
            <UploadCloud className="w-9 h-9 mx-auto text-brand-500" />
            <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-zinc-200">
              Drop your Excel file here, or click to choose
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-zinc-500">
              .xlsx, .xls or .csv · up to 5MB · up to 2000 leads per file
            </p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }}
        />
      </div>

      {/* A picture of a correct sheet answers "what should my file look like?"
          faster than any amount of instruction text. */}
      {fields.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-slate-700 dark:text-zinc-200">A file that works looks like this</p>
            <span className="text-[11px] text-slate-400 dark:text-zinc-500">Only the two starred columns are required</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800">
            <table className="min-w-full text-[11px]">
              <thead>
                <tr className="bg-slate-100 dark:bg-zinc-800">
                  <th className="px-2 py-1.5 w-8 text-slate-400 dark:text-zinc-500 font-normal border-r border-slate-200 dark:border-zinc-700" />
                  {fields.map((f) => (
                    <th key={f.key} className="px-3 py-1.5 text-left font-bold text-slate-600 dark:text-zinc-300 whitespace-nowrap">
                      {f.headings[0]}
                      {f.required && <span className="text-red-500">*</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[0, 1].map((r) => (
                  <tr key={r} className="border-t border-slate-100 dark:border-zinc-800">
                    <td className="px-2 py-1.5 text-center text-slate-300 dark:text-zinc-600 bg-slate-50 dark:bg-zinc-800/50 border-r border-slate-200 dark:border-zinc-700">
                      {r + 2}
                    </td>
                    {fields.map((f) => (
                      <td key={f.key} className="px-3 py-1.5 text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                        {f.examples[r] || <span className="text-slate-300 dark:text-zinc-600">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-2">
            Your headings do not have to match these — you point each column at a field on the next screen.
          </p>
        </div>
      )}

      {/* The full field reference, folded away so the screen stays readable. */}
      {fields.length > 0 && (
        <div className="rounded-xl border border-slate-100 dark:border-zinc-800 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowFields((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition"
          >
            <span>What can each column hold?</span>
            <ChevronDown size={15} className={`text-slate-400 transition-transform ${showFields ? 'rotate-180' : ''}`} />
          </button>

          {showFields && (
            <div className="px-4 pb-4 space-y-3 border-t border-slate-100 dark:border-zinc-800 pt-3">
              {fields.map((f) => (
                <div key={f.key} className="grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-1 sm:gap-4">
                  <p className="text-xs font-bold text-slate-700 dark:text-zinc-200">
                    {f.label}
                    {f.required ? <span className="text-red-500">*</span> : <span className="font-normal text-slate-400 dark:text-zinc-500"> (optional)</span>}
                  </p>
                  <div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">{f.hint}</p>
                    <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
                      Example: <span className="font-mono text-slate-600 dark:text-zinc-300">{f.examples[0] || '—'}</span>
                      {' · '}
                      Headings we recognise: {f.headings.join(', ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 p-4">
        <p className="text-xs font-bold text-slate-700 dark:text-zinc-200 mb-2">Good to know</p>
        <ul className="space-y-1.5 text-xs text-slate-500 dark:text-zinc-400">
          <li className="flex gap-2"><span className="text-brand-500">•</span> The first row of the sheet must be the column headings.</li>
          <li className="flex gap-2"><span className="text-brand-500">•</span> Nothing is saved until you have seen the numbers and pressed Import.</li>
          <li className="flex gap-2"><span className="text-brand-500">•</span> A customer already in your CRM is skipped, so importing the same file twice is safe.</li>
          <li className="flex gap-2"><span className="text-brand-500">•</span> Extra columns you do not need are simply ignored.</li>
        </ul>
      </div>
    </div>
  );
}

function MapStep({ parsed, mapping, columnOptions, onSetColumn, defaults, setDefaults, teamMembers, isTeamMember }) {
  const sample = (fieldKey) => {
    const index = mapping[fieldKey];
    if (index === undefined) return null;
    const value = parsed.preview.map((r) => r[index]).find((v) => v);
    return value || null;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-800/50 rounded-xl p-3 border border-slate-100 dark:border-zinc-800">
        <FileSpreadsheet size={15} className="text-emerald-600 shrink-0" />
        <span>
          <strong className="text-slate-700 dark:text-zinc-200">{parsed.fileName}</strong> — {parsed.totalRows} rows,{' '}
          {parsed.columns.length} columns. We have matched what we could; check the rest.
        </span>
      </div>

      <div className="space-y-3">
        {parsed.fields.map((field) => {
          const value = mapping[field.key];
          const isSet = value !== undefined && value !== '';
          const example = sample(field.key);
          return (
            <div
              key={field.key}
              className={`grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-2 sm:gap-4 p-3 rounded-xl border transition ${
                field.required && !isSet
                  ? 'border-amber-200 bg-amber-50/60 dark:border-amber-800/60 dark:bg-amber-950/20'
                  : 'border-slate-100 dark:border-zinc-800'
              }`}
            >
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-zinc-200">
                  {field.label}
                  {field.required
                    ? <span className="text-red-500 ml-0.5">*</span>
                    : <span className="font-normal text-slate-400 dark:text-zinc-500"> (optional)</span>}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">{field.hint}</p>
              </div>

              <div>
                <Select
                  options={columnOptions}
                  value={isSet ? String(value) : ''}
                  onChange={(e) => onSetColumn(field.key, e.target.value)}
                  className="w-full"
                />
                {isSet ? (
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 truncate" title={example || ''}>
                    ✓ Your file says: <span className="font-mono">{example || '(blank in the first rows)'}</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
                    Nothing chosen{field.required ? ' — required' : `, so this stays empty. Looks like: ${field.examples[0]}`}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-100 dark:border-zinc-800 p-4 space-y-4">
        <p className="text-xs font-bold text-slate-700 dark:text-zinc-200">Defaults for rows that do not say</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Stage"
            options={LEAD_STAGES}
            value={defaults.stage}
            onChange={(e) => setDefaults({ ...defaults, stage: e.target.value })}
            hint="Used when a row has no stage of its own."
          />
          <Select
            label="Assign to"
            icon={Users}
            options={[
              { value: '', label: isTeamMember ? 'Me' : 'Nobody — send to the Lead Pool' },
              ...teamMembers.filter((m) => m.name).map((m) => ({ value: m.name, label: m.name })),
            ]}
            value={defaults.assignedTo}
            onChange={(e) => setDefaults({ ...defaults, assignedTo: e.target.value })}
            disabled={isTeamMember}
            hint={isTeamMember ? 'Imported leads are assigned to you.' : 'Unassigned leads show up in the Lead Pool for anyone to claim.'}
          />
        </div>
      </div>

      <PreviewTable parsed={parsed} />
    </div>
  );
}

function PreviewTable({ parsed }) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-700 dark:text-zinc-200 mb-2">First rows of your file</p>
      <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-zinc-800">
        <table className="min-w-full text-[11px]">
          <thead className="bg-slate-50 dark:bg-zinc-800/60">
            <tr>
              {parsed.columns.map((c, i) => (
                <th key={i} className="px-3 py-2 text-left font-bold text-slate-600 dark:text-zinc-300 whitespace-nowrap">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {parsed.preview.map((row, r) => (
              <tr key={r} className="border-t border-slate-100 dark:border-zinc-800">
                {parsed.columns.map((_, c) => (
                  <td key={c} className="px-3 py-2 text-slate-500 dark:text-zinc-400 whitespace-nowrap max-w-[180px] truncate" title={row[c]}>
                    {row[c]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReviewStep({ parsed, analysis, analyzing, duplicateAction, setDuplicateAction, defaults }) {
  if (analyzing || !analysis) {
    return (
      <div className="py-16 text-center">
        <Loader2 className="w-7 h-7 mx-auto text-brand-600 animate-spin" />
        <p className="mt-3 text-sm text-slate-500 dark:text-zinc-400">Checking {parsed.rows.length} rows…</p>
      </div>
    );
  }

  const willImport = duplicateAction === 'import' ? analysis.valid + analysis.duplicateExisting : analysis.valid;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat icon={CheckCircle2} tone="emerald" value={willImport} label="Will be imported" />
        <Stat icon={Copy} tone="amber" value={analysis.duplicateExisting} label="Already in CRM" />
        <Stat icon={Copy} tone="slate" value={analysis.duplicateInFile} label="Repeated in file" />
        <Stat icon={Ban} tone="red" value={analysis.invalid} label="Unusable rows" />
      </div>

      {/* The counts say how many; this says what one of them will look like. */}
      {analysis.sample && <SampleLeadCard sample={analysis.sample} />}

      {analysis.duplicateExisting > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/20 p-4 space-y-3">
          <p className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
            <AlertTriangle size={14} />
            {analysis.duplicateExisting} phone number{analysis.duplicateExisting === 1 ? ' is' : 's are'} already on a lead
          </p>
          <div className="space-y-2">
            <RadioRow
              checked={duplicateAction === 'skip'}
              onChange={() => setDuplicateAction('skip')}
              title="Skip them (recommended)"
              detail="Your existing leads and their history stay untouched."
            />
            <RadioRow
              checked={duplicateAction === 'import'}
              onChange={() => setDuplicateAction('import')}
              title="Import them anyway"
              detail="Creates a second lead for the same phone number. Useful when an old sheet holds a separate, older enquiry."
            />
          </div>
        </div>
      )}

      {analysis.issues.length > 0 && (
        <div className="rounded-xl border border-slate-100 dark:border-zinc-800 p-4">
          <p className="text-xs font-bold text-slate-700 dark:text-zinc-200 mb-2">Rows that cannot be imported</p>
          <ul className="space-y-1 max-h-40 overflow-y-auto">
            {analysis.issues.map((issue, i) => (
              <li key={i} className="text-[11px] text-slate-500 dark:text-zinc-400 flex gap-2">
                <span className="font-semibold text-slate-600 dark:text-zinc-300 shrink-0">Row {issue.row}</span>
                <span>{issue.reason}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-2">
            Fix these in your sheet and import the file again — already-imported leads will be skipped.
          </p>
        </div>
      )}

      <p className="text-xs text-slate-500 dark:text-zinc-400">
        Imported leads are tagged with the source <strong>Excel Import</strong>
        {defaults.assignedTo ? <> and assigned to <strong>{defaults.assignedTo}</strong></> : <> and land in the <strong>Lead Pool</strong></>}.
      </p>
    </div>
  );
}

/** The first row of the file, drawn as the lead it will become. */
function SampleLeadCard({ sample }) {
  const facts = [
    { label: 'Phone', value: sample.phone, icon: Phone },
    { label: 'Email', value: sample.email },
    { label: 'Trip', value: sample.interest },
    { label: 'Departure', value: sample.departureDate, icon: Calendar },
    { label: 'Travelers', value: sample.travelers ? `${sample.travelers} pax` : '' },
    { label: 'Assigned to', value: sample.assignedTo || 'Lead Pool' },
    { label: 'Enquiry date', value: sample.createdAt ? sample.createdAt.slice(0, 10) : 'Today' },
  ].filter((f) => f.value);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
      <p className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-zinc-300 bg-slate-50 dark:bg-zinc-800/60 border-b border-slate-100 dark:border-zinc-800">
        Row {sample.row} of your file will become this lead
      </p>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-bold text-sm text-slate-800 dark:text-zinc-100">{sample.customerName}</p>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{sample.interest || 'General inquiry'}</p>
          </div>
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400 shrink-0">
            {sample.stage}
          </span>
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 mt-3">
          {facts.map((f) => (
            <div key={f.label}>
              <dt className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-zinc-500 font-semibold flex items-center gap-1">
                {f.icon && <f.icon size={10} />} {f.label}
              </dt>
              <dd className="text-xs text-slate-700 dark:text-zinc-200 truncate" title={String(f.value)}>{f.value}</dd>
            </div>
          ))}
        </dl>

        {sample.notes && (
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 italic mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800 line-clamp-2">
            "{sample.notes}"
          </p>
        )}
      </div>
      <p className="px-4 py-2 text-[11px] text-slate-400 dark:text-zinc-500 bg-slate-50/60 dark:bg-zinc-800/40 border-t border-slate-100 dark:border-zinc-800">
        Wrong? Go back and point the columns at different fields.
      </p>
    </div>
  );
}

function RadioRow({ checked, onChange, title, detail }) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer">
      <input type="radio" checked={checked} onChange={onChange} className="mt-0.5 text-amber-600 focus:ring-amber-500/20 border-amber-300" />
      <span>
        <span className="block text-xs font-semibold text-amber-900 dark:text-amber-200">{title}</span>
        <span className="block text-[11px] text-amber-800/80 dark:text-amber-300/70">{detail}</span>
      </span>
    </label>
  );
}

const TONES = {
  emerald: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/60',
  amber: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/60',
  red: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-100 dark:border-red-900/60',
  slate: 'bg-slate-50 dark:bg-zinc-800/60 text-slate-600 dark:text-zinc-300 border-slate-100 dark:border-zinc-800',
};

function Stat({ icon: Icon, tone, value, label }) {
  return (
    <div className={`rounded-xl border p-3 ${TONES[tone]}`}>
      <div className="flex items-center gap-1.5">
        <Icon size={14} />
        <span className="text-lg font-bold leading-none">{value}</span>
      </div>
      <p className="text-[11px] font-medium mt-1 opacity-80">{label}</p>
    </div>
  );
}

function DoneStep({ result }) {
  return (
    <div className="py-6 text-center space-y-4">
      <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center mx-auto">
        <CheckCircle2 className="w-7 h-7 text-emerald-600" />
      </div>
      <div>
        <p className="text-lg font-bold text-slate-800 dark:text-zinc-100">
          {result.imported} lead{result.imported === 1 ? '' : 's'} imported
        </p>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
          {result.skippedDuplicates} skipped as duplicates · {result.skippedInvalid} rows could not be read
        </p>
        {result.imported > 0 && (
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-3 max-w-md mx-auto">
            They are in your leads list now. Each one kept the enquiry date from your sheet, so an old lead sits
            where it belongs by date rather than at the top — search by name or phone to pull one up.
          </p>
        )}
      </div>

      {result.issues?.length > 0 && (
        <div className="text-left rounded-xl border border-slate-100 dark:border-zinc-800 p-4 max-h-48 overflow-y-auto">
          <p className="text-xs font-bold text-slate-700 dark:text-zinc-200 mb-2">Skipped rows</p>
          <ul className="space-y-1">
            {result.issues.map((issue, i) => (
              <li key={i} className="text-[11px] text-slate-500 dark:text-zinc-400 flex gap-2">
                <span className="font-semibold text-slate-600 dark:text-zinc-300 shrink-0">Row {issue.row}</span>
                <span>{issue.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
