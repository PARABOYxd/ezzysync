import React, { useState } from 'react';
import { Upload, Download, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import Drawer from '../common/Drawer.jsx';
import Button from '../ui/Button.jsx';
import * as leadService from '../../services/leadService';
import { parseCsv } from '../../utils/csv';
import { useToast } from '../../hooks/useToast.jsx';

const TEMPLATE_CSV = 'Name,Phone,Email,Interest\nRahul Sharma,9876543210,rahul@example.com,Goa Beach Tour\n';

// Alternate header spellings a real export/spreadsheet is likely to use -
// matched so the file doesn't have to be reformatted to fit us exactly.
const FIELD_ALIASES = {
  customerName: ['name', 'customer name', 'customername', 'full name'],
  phone: ['phone', 'phone number', 'mobile', 'mobile number', 'contact'],
  email: ['email', 'email address'],
  interest: ['interest', 'trip', 'destination', 'package'],
};

function mapRow(rawRow) {
  const mapped = {};
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    const key = aliases.find((a) => rawRow[a] !== undefined);
    mapped[field] = key ? rawRow[key] : '';
  }
  return mapped;
}

export default function BulkImportLeadsDrawer({ open, onClose, onImported }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);

  const reset = () => {
    setRows([]);
    setFileName('');
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const { rows: parsed } = parseCsv(String(reader.result || ''));
      const mapped = parsed.map(mapRow).filter((r) => r.customerName || r.phone);
      if (mapped.length === 0) {
        toast.error('No usable rows found. Make sure the file has Name and Phone columns.');
      }
      setRows(mapped);
    };
    reader.onerror = () => toast.error('Could not read that file.');
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lead-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const result = await leadService.bulkImportLeads(rows);
      const parts = [`${result.created} imported`];
      if (result.skipped) parts.push(`${result.skipped} duplicate${result.skipped === 1 ? '' : 's'} skipped`);
      if (result.failed) parts.push(`${result.failed} failed`);
      toast.success(parts.join(', ') + '.');
      reset();
      onImported?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  const missingPhoneCount = rows.filter((r) => !r.phone).length;

  return (
    <Drawer open={open} onClose={() => { reset(); onClose(); }} title="Import Leads from CSV" size="lg">
      <div className="space-y-5">
        <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl p-4">
          <div>
            <p className="text-sm font-semibold text-slate-700">Need the right format?</p>
            <p className="text-xs text-slate-400 mt-0.5">Columns: Name, Phone, Email, Interest</p>
          </div>
          <Button type="button" variant="ghost" onClick={downloadTemplate} className="text-xs gap-1.5">
            <Download size={14} /> Download Template
          </Button>
        </div>

        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-2xl p-8 cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition">
          <Upload size={22} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-600">{fileName || 'Click to choose a CSV file'}</span>
          <span className="text-xs text-slate-400">Duplicate phone numbers are skipped automatically</span>
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
        </label>

        {rows.length > 0 && (
          <>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <FileSpreadsheet size={14} />
              <span>{rows.length} row{rows.length === 1 ? '' : 's'} ready to import</span>
              {missingPhoneCount > 0 && (
                <span className="flex items-center gap-1 text-amber-600 font-semibold">
                  <AlertTriangle size={12} /> {missingPhoneCount} row{missingPhoneCount === 1 ? '' : 's'} missing a phone number - these will be skipped
                </span>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-semibold text-slate-500">Name</th>
                    <th className="text-left p-2 font-semibold text-slate-500">Phone</th>
                    <th className="text-left p-2 font-semibold text-slate-500">Email</th>
                    <th className="text-left p-2 font-semibold text-slate-500">Interest</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.slice(0, 100).map((r, idx) => (
                    <tr key={idx} className={!r.phone ? 'bg-amber-50/50' : ''}>
                      <td className="p-2 text-slate-700">{r.customerName || '-'}</td>
                      <td className="p-2 text-slate-700">{r.phone || <span className="text-amber-600">missing</span>}</td>
                      <td className="p-2 text-slate-500">{r.email || '-'}</td>
                      <td className="p-2 text-slate-500">{r.interest || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 100 && (
                <p className="text-[11px] text-slate-400 text-center py-2 border-t border-slate-100">
                  + {rows.length - 100} more rows not shown in this preview
                </p>
              )}
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="ghost" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button type="button" disabled={rows.length === 0 || importing} onClick={handleImport} className="text-sm">
            {importing ? 'Importing...' : `Import ${rows.length || ''} Lead${rows.length === 1 ? '' : 's'}`}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
