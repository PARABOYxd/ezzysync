const ExcelJS = require('exceljs');
const { v4: uuidv4 } = require('uuid');
const leadRepository = require('../repositories/leadRepository');
const customerRepository = require('../repositories/customerRepository');
const { LEAD_STAGES, LEAD_SOURCES, rowToLead } = require('../models/leadSchema');
const logger = require('../utils/logger');

/**
 * Turning an agency's old enquiry spreadsheet into leads.
 *
 * Every agency's sheet has different column names, so the file is parsed
 * first and the user confirms the column mapping before anything is written.
 * That is why this is two calls (preview, then import) rather than one
 * upload that guesses.
 */

/** Above this a single request stops being a request. Larger files are split by the user. */
const MAX_ROWS = 2000;
/** Rows handed back for the on-screen preview. The rest are imported unseen. */
const PREVIEW_ROWS = 8;
/**
 * The parsed rows travel back to the browser and return with the mapping, so
 * the whole sheet has to fit the 2MB JSON body. A sheet wider than this is
 * carrying columns no lead field could use anyway.
 */
const MAX_COLUMNS = 40;

/**
 * The lead fields a sheet column can be pointed at.
 *
 * `aliases` drive the automatic match. `headings` and `example` are not used
 * for matching - they are what the screen shows the user, so the wording an
 * agency sees is the wording this file defines, in one place.
 */
const IMPORT_FIELDS = [
  {
    key: 'customerName', label: 'Customer Name', required: true,
    headings: ['Name', 'Client Name', 'Customer', 'Guest Name'],
    examples: ['Rohit Sharma', 'Sunita Rao'],
    hint: 'Rows with no name are still imported, as "Imported Lead".',
    aliases: ['name', 'customer', 'customername', 'client', 'clientname', 'guest', 'guestname', 'fullname', 'party', 'contactname'],
  },
  {
    key: 'phone', label: 'Phone', required: true,
    headings: ['Phone', 'Mobile No.', 'Contact Number', 'WhatsApp'],
    examples: ['9876543210', '+91 99887 76655'],
    hint: 'With or without +91 - both are read as the same number.',
    aliases: ['phone', 'mobile', 'mobileno', 'mobilenumber', 'contact', 'contactno', 'contactnumber', 'phoneno', 'phonenumber', 'whatsapp', 'whatsappno', 'cell', 'number'],
  },
  {
    key: 'email', label: 'Email', required: false,
    headings: ['Email', 'Email ID', 'Mail'],
    examples: ['rohit@gmail.com', ''],
    hint: 'Anything that is not a real email address is left blank.',
    aliases: ['email', 'emailid', 'emailaddress', 'mail', 'mailid'],
  },
  {
    key: 'interest', label: 'Trip / Interest', required: false,
    headings: ['Destination', 'Package', 'Trip', 'Enquiry For'],
    examples: ['Kashmir 5N/6D', 'Kerala Backwaters'],
    hint: 'What the customer asked about.',
    aliases: ['interest', 'trip', 'tripname', 'destination', 'package', 'packagename', 'tour', 'tourname', 'enquiry', 'enquiryfor', 'requirement', 'query'],
  },
  {
    key: 'source', label: 'Source', required: false,
    headings: ['Source', 'Channel', 'Reference'],
    examples: ['Referral', 'Instagram'],
    hint: 'Anything unrecognised becomes "Excel Import".',
    aliases: ['source', 'leadsource', 'channel', 'via', 'reference', 'camefrom'],
  },
  {
    key: 'stage', label: 'Stage', required: false,
    headings: ['Status', 'Stage', 'Lead Status'],
    examples: ['Contacted', 'Negotiating'],
    hint: 'New, Contacted, Negotiating, Won or Lost. Your spelling is matched loosely.',
    aliases: ['stage', 'status', 'leadstatus', 'leadstage', 'pipeline'],
  },
  {
    key: 'assignedTo', label: 'Assigned To', required: false,
    headings: ['Assigned To', 'Agent', 'Executive', 'Handled By'],
    examples: ['Priya', 'Amit'],
    hint: 'The team member handling the lead.',
    aliases: ['assignedto', 'assigned', 'owner', 'agent', 'salesperson', 'executive', 'handledby', 'teammember', 'staff'],
  },
  {
    key: 'departureDate', label: 'Departure Date', required: false,
    headings: ['Travel Date', 'Departure', 'Date of Travel'],
    examples: ['15/11/2026', '03/04/2027'],
    hint: 'Day first: 03/04/2026 is 3 April. 2026-04-03 also works.',
    aliases: ['departure', 'departuredate', 'traveldate', 'tripdate', 'startdate', 'journeydate', 'checkin', 'dateoftravel'],
  },
  {
    key: 'travelers', label: 'Travelers (Pax)', required: false,
    headings: ['Pax', 'No of Pax', 'Persons', 'Members'],
    examples: ['4', '2'],
    hint: 'How many people are travelling.',
    aliases: ['travelers', 'travellers', 'pax', 'persons', 'people', 'members', 'guests', 'noofpax', 'headcount', 'adults'],
  },
  {
    key: 'notes', label: 'Notes', required: false,
    headings: ['Remarks', 'Notes', 'Comments'],
    examples: ['Wants houseboat, budget 60k', 'Called twice, will confirm'],
    hint: 'Saved on the lead so nothing from the old sheet is lost.',
    aliases: ['notes', 'note', 'remark', 'remarks', 'comment', 'comments', 'description', 'details', 'message'],
  },
  {
    key: 'createdAt', label: 'Enquiry Date', required: false,
    headings: ['Date', 'Enquiry Date', 'Lead Date'],
    examples: ['20/01/2024', '05/02/2024'],
    hint: 'When the enquiry first came in. Without it, the lead is dated today.',
    aliases: ['date', 'createdat', 'created', 'enquirydate', 'inquirydate', 'leaddate', 'dateofenquiry', 'entrydate'],
  },
];

/**
 * What the browser is told about each field: everything except the alias
 * list, which is only ever used on this side.
 */
const PUBLIC_FIELDS = IMPORT_FIELDS.map(({ key, label, required, headings, examples, hint }) => (
  { key, label, required, headings, examples, hint }
));

/** Header text reduced to letters and digits, so "Mobile No." and "mobile_no" match. */
function headerKey(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

/* ---------------------------------------------------------------- parsing */

/**
 * A CSV reader that understands quoted fields, escaped quotes and newlines
 * inside a cell - the three things a naive `split(',')` gets wrong on a real
 * export from Excel or Google Sheets.
 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  // A BOM from Excel's "CSV UTF-8" would otherwise become part of the first header.
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];

    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i += 1; } else { quoted = false; }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') { quoted = true; }
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\r') { /* handled by the \n that follows */ }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else { field += ch; }
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }

  return rows.filter((r) => r.some((c) => String(c).trim() !== ''));
}

/**
 * ExcelJS hands back a string for a plain cell but an object for a formula,
 * a hyperlink or rich text. Flattening here keeps that shape out of the rest
 * of the import.
 */
function cellText(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value;
  if (typeof value === 'object') {
    if (value.text !== undefined) return String(value.text);
    if (value.result !== undefined) return String(value.result);
    if (Array.isArray(value.richText)) return value.richText.map((t) => t.text).join('');
    if (value.hyperlink) return String(value.hyperlink);
    return '';
  }
  return String(value);
}

async function readSheet(buffer, filename) {
  const isCsv = /\.csv$/i.test(filename || '');

  if (isCsv) return parseCsv(buffer.toString('utf8'));

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    throw badRequest('That file could not be read as an Excel workbook. Save it as .xlsx or .csv and try again.');
  }

  const sheet = workbook.worksheets.find((ws) => ws.rowCount > 0);
  if (!sheet) throw badRequest('The workbook has no sheet with any rows in it.');

  const rows = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values = [];
    // `row.values` is 1-based with a hole at index 0, so the loop runs over
    // the column count instead of using the array directly.
    for (let c = 1; c <= sheet.columnCount; c += 1) {
      values.push(cellText(row.getCell(c).value));
    }
    if (values.some((v) => v instanceof Date || String(v).trim() !== '')) rows.push(values);
  });

  return rows;
}

/**
 * Reads the uploaded file and proposes a column mapping.
 *
 * @returns {Promise<{columns: string[], rows: Array<Array<string>>, preview: Array<Array<string>>, totalRows: number, mapping: Object, truncated: boolean}>}
 */
async function parseUpload(buffer, filename) {
  if (!buffer || !buffer.length) throw badRequest('The uploaded file is empty.');

  const matrix = await readSheet(buffer, filename);
  if (matrix.length < 2) {
    throw badRequest('The sheet needs a header row and at least one lead below it.');
  }

  const columns = matrix[0].slice(0, MAX_COLUMNS).map((c, i) => {
    const text = String(c instanceof Date ? '' : c).trim();
    return text || `Column ${i + 1}`;
  });

  const body = matrix.slice(1).map((r) => {
    const padded = [];
    for (let i = 0; i < columns.length; i += 1) {
      const cell = r[i];
      padded.push(cell instanceof Date ? cell.toISOString() : String(cell ?? '').trim());
    }
    return padded;
  });

  const truncated = body.length > MAX_ROWS;
  const rows = truncated ? body.slice(0, MAX_ROWS) : body;

  return {
    columns,
    rows,
    preview: rows.slice(0, PREVIEW_ROWS),
    totalRows: body.length,
    mapping: suggestMapping(columns),
    truncated,
    maxRows: MAX_ROWS,
  };
}

/**
 * Guesses which column holds which lead field, by header name and - when the
 * header is unhelpful - by what the column's own values look like.
 */
function suggestMapping(columns) {
  const mapping = {};
  const taken = new Set();

  for (const field of IMPORT_FIELDS) {
    const index = columns.findIndex((col, i) => !taken.has(i) && field.aliases.includes(headerKey(col)));
    if (index !== -1) {
      mapping[field.key] = index;
      taken.add(index);
    }
  }

  // A header like "Details" says nothing; a partial match is a better guess
  // than leaving the field unmapped for the user to hunt down.
  for (const field of IMPORT_FIELDS) {
    if (mapping[field.key] !== undefined) continue;
    const index = columns.findIndex((col, i) => {
      if (taken.has(i)) return false;
      const key = headerKey(col);
      return key.length >= 3 && field.aliases.some((a) => a.length >= 4 && (key.includes(a) || a.includes(key)));
    });
    if (index !== -1) {
      mapping[field.key] = index;
      taken.add(index);
    }
  }

  return mapping;
}

/* ------------------------------------------------------------ normalising */

/** Digits only, last 10 - so 0 98765 43210, +91 98765 43210 and 9876543210 are one person. */
function phoneKey(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/** Excel dates arrive as ISO strings, typed ones as anything. Only a real date survives. */
function normalizeDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // Indian sheets are overwhelmingly day-first, so 03/04/2026 is 3 April.
  const dmy = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    let year = Number(dmy[3]);
    if (year < 100) year += 2000;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return '';
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
}

/** Matches loosely so "won", "WON " and "Closed Won" all land on the real stage. */
function normalizeChoice(value, allowed, fallback) {
  const key = headerKey(value);
  if (!key) return fallback;
  const exact = allowed.find((a) => headerKey(a) === key);
  if (exact) return exact;
  const partial = allowed.find((a) => key.includes(headerKey(a)));
  return partial || fallback;
}

function pick(row, mapping, key) {
  const index = mapping[key];
  if (index === undefined || index === null || index === '') return '';
  return String(row[Number(index)] ?? '').trim();
}

/**
 * Validates and shapes one sheet row into lead fields.
 *
 * @returns {{ok: true, lead: Object}|{ok: false, error: string}}
 */
function normalizeRow(row, mapping, defaults) {
  const phone = pick(row, mapping, 'phone');
  const key = phoneKey(phone);
  if (!key) return { ok: false, error: 'No phone number' };
  if (key.length < 7) return { ok: false, error: `Phone "${phone}" is too short` };

  const name = pick(row, mapping, 'customerName') || 'Imported Lead';
  const email = pick(row, mapping, 'email');
  const travelers = pick(row, mapping, 'travelers').replace(/\D/g, '');
  const createdAt = normalizeDate(pick(row, mapping, 'createdAt'));

  return {
    ok: true,
    phoneKey: key,
    lead: {
      customerName: name.slice(0, 200),
      phone: phone.trim(),
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '',
      interest: pick(row, mapping, 'interest').slice(0, 500),
      source: normalizeChoice(pick(row, mapping, 'source'), LEAD_SOURCES, defaults.source || 'Excel Import'),
      stage: normalizeChoice(pick(row, mapping, 'stage'), LEAD_STAGES, defaults.stage || 'New'),
      assignedTo: pick(row, mapping, 'assignedTo') || defaults.assignedTo || '',
      notes: pick(row, mapping, 'notes').slice(0, 2000),
      departureDate: normalizeDate(pick(row, mapping, 'departureDate')),
      travelers: travelers ? Number(travelers) : null,
      // An old enquiry keeps its own date, so the pipeline's age stays honest.
      createdAt: createdAt ? new Date(`${createdAt}T00:00:00Z`).toISOString() : null,
    },
  };
}

/**
 * Dry-runs the mapping over every row so the user sees the real counts -
 * how many import, how many are duplicates, how many are unusable - before
 * committing to it.
 */
async function analyze(tenantId, { rows, mapping, defaults = {} }) {
  const existing = new Set(await leadRepository.listPhoneKeys(tenantId));
  const seen = new Set();

  // `sample` is the first row as it would actually be saved, so the user can
  // see the mapping's result rather than take the counts on trust.
  const result = { valid: 0, duplicateInFile: 0, duplicateExisting: 0, invalid: 0, issues: [], sample: null };

  rows.forEach((row, i) => {
    const outcome = normalizeRow(row, mapping, defaults);
    if (!outcome.ok) {
      result.invalid += 1;
      if (result.issues.length < 20) result.issues.push({ row: i + 2, reason: outcome.error });
      return;
    }
    if (seen.has(outcome.phoneKey)) { result.duplicateInFile += 1; return; }
    seen.add(outcome.phoneKey);
    if (!result.sample) result.sample = { ...outcome.lead, row: i + 2 };
    if (existing.has(outcome.phoneKey)) { result.duplicateExisting += 1; return; }
    result.valid += 1;
  });

  return result;
}

/* -------------------------------------------------------------- importing */

/**
 * A lead id that is unique within the batch by construction.
 *
 * The interactive form's `LD-<now>-<4 random>` is fine one lead at a time,
 * but a whole file is generated inside the same millisecond, and four random
 * characters collide long before 2000 rows - the losing row was dropped by
 * the insert's ON CONFLICT and never reached the CRM. The position in the
 * batch makes that impossible; the random tail keeps two imports running at
 * the same moment apart.
 */
function importLeadId(index) {
  return `LD-${Date.now()}-${index.toString(36).toUpperCase()}${uuidv4().slice(0, 4).toUpperCase()}`;
}


/**
 * Writes the mapped rows as leads.
 *
 * Duplicates are decided on the phone number: against leads already in the
 * CRM and against earlier rows of the same file, because a spreadsheet that
 * has been appended to for years repeats the same customer.
 *
 * @param {'skip'|'import'} opts.duplicateAction what to do with a phone already on file
 * @returns {Promise<{imported: number, skippedDuplicates: number, skippedInvalid: number, issues: Array, leads: Array}>}
 */
async function importLeads(tenantId, { rows, mapping, defaults = {}, duplicateAction = 'skip' }, actor) {
  if (!Array.isArray(rows) || rows.length === 0) throw badRequest('There are no rows to import.');
  if (rows.length > MAX_ROWS) throw badRequest(`Only ${MAX_ROWS} rows can be imported at a time. Please split the file.`);

  for (const field of IMPORT_FIELDS) {
    if (field.required && (mapping?.[field.key] === undefined || mapping?.[field.key] === null || mapping?.[field.key] === '')) {
      throw badRequest(`Map a column to "${field.label}" before importing.`);
    }
  }

  const existing = new Set(await leadRepository.listPhoneKeys(tenantId));
  const seen = new Set();

  const pending = [];
  const summary = { imported: 0, skippedDuplicates: 0, skippedInvalid: 0, issues: [] };

  rows.forEach((row, i) => {
    const outcome = normalizeRow(row, mapping, defaults);
    const sheetRow = i + 2; // +1 for the header, +1 because sheets count from 1

    if (!outcome.ok) {
      summary.skippedInvalid += 1;
      if (summary.issues.length < 50) summary.issues.push({ row: sheetRow, reason: outcome.error });
      return;
    }

    // A repeat inside the file is always skipped: importing it twice would
    // create two leads for one customer no matter what the user chose.
    if (seen.has(outcome.phoneKey)) {
      summary.skippedDuplicates += 1;
      if (summary.issues.length < 50) summary.issues.push({ row: sheetRow, reason: 'Repeated earlier in this file' });
      return;
    }
    seen.add(outcome.phoneKey);

    if (existing.has(outcome.phoneKey) && duplicateAction !== 'import') {
      summary.skippedDuplicates += 1;
      if (summary.issues.length < 50) summary.issues.push({ row: sheetRow, reason: 'A lead with this phone already exists' });
      return;
    }

    pending.push({ ...outcome.lead, leadId: importLeadId(pending.length) });
  });

  if (pending.length === 0) return { ...summary, leads: [] };

  // Chunked rather than one giant statement: a 2000-row INSERT would push
  // past Postgres' parameter limit, and a failure would lose the whole file.
  const CHUNK = 200;
  const inserted = [];

  for (let i = 0; i < pending.length; i += CHUNK) {
    const chunk = pending.slice(i, i + CHUNK);

    // Customers first: the leads carry customer_id, and the rollup is what
    // the customer profile page reads.
    let customerIds = {};
    try {
      customerIds = await customerRepository.bulkUpsertByPhone(tenantId, chunk);
    } catch (err) {
      logger.warn({ err, tenantId }, 'Lead import: customer rollup failed for a chunk');
    }

    const rowsInserted = await leadRepository.bulkInsertLeads(
      tenantId,
      chunk.map((lead) => ({ ...lead, customerId: customerIds[lead.phone] || null })),
      actor || ''
    );
    inserted.push(...rowsInserted);

    await leadRepository.bulkInsertFollowUps(
      tenantId,
      rowsInserted.map((row) => ({
        leadUuid: row.id,
        note: `Lead imported from a spreadsheet.${row.notes ? `\nNote: ${row.notes}` : ''}`,
        createdBy: actor || 'System',
      }))
    );
  }

  summary.imported = inserted.length;
  return { ...summary, leads: inserted.map(rowToLead) };
}

/* --------------------------------------------------------------- template */

/** A starter workbook with the expected headers and one example row. */
async function buildTemplate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'EzzySync CRM';
  const sheet = workbook.addWorksheet('Leads');

  sheet.columns = IMPORT_FIELDS.map((f) => ({
    header: f.required ? `${f.label} *` : f.label,
    key: f.key,
    width: Math.max(16, f.label.length + 6),
  }));

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };

  // The same example rows the upload screen shows, so the template and the
  // on-screen guidance can never drift apart.
  [0, 1].forEach((i) => {
    sheet.addRow(Object.fromEntries(IMPORT_FIELDS.map((f) => [f.key, f.examples[i]])));
  });

  return workbook.xlsx.writeBuffer();
}

module.exports = {
  IMPORT_FIELDS,
  PUBLIC_FIELDS,
  MAX_ROWS,
  parseUpload,
  suggestMapping,
  analyze,
  importLeads,
  buildTemplate,
  // exported for tests
  parseCsv,
  normalizeDate,
  phoneKey,
};
