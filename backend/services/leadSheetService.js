const leadSheetRepository = require('../repositories/leadSheetRepository');
const leadRepository = require('../repositories/leadRepository');
const userRepository = require('../repositories/userRepository');
const leadImportService = require('./leadImportService');
const { LEAD_STAGES } = require('../models/leadSchema');
const logger = require('../utils/logger').child({ module: 'leadSheets' });

/**
 * Live Google Sheet lead sync.
 *
 * An agency's Meta lead ads write every enquiry into a Google Sheet. Each
 * connected sheet is read on a schedule; rows added since the last read become
 * leads, using the same column matching, phone de-duplication and insert path
 * as the one-off spreadsheet import.
 *
 * The sheet is read through its CSV export, so the agency only has to set the
 * sheet to "Anyone with the link can view". No Google login or API key is held.
 */

/** Sheets one agency can connect. Each is fetched every cycle, so this bounds the work. */
const MAX_SHEETS_PER_TENANT = 20;
/** Rows read per sync. A sheet with more waiting catches up over the next runs. */
const MAX_ROWS_PER_SYNC = 2000;
const FETCH_TIMEOUT_MS = 20_000;
const MAX_CSV_BYTES = 10 * 1024 * 1024;
const SOURCE_DEFAULT = 'Meta Ads';

/** Sheet columns that identify an ad rather than describe the customer; not worth putting in notes. */
const NOISE_HEADERS = new Set(['id', 'adid', 'adsetid', 'campaignid', 'formid', 'isorganic']);
const NOTE_VALUE_MAX = 200;
const NOTES_MAX = 1500;

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

/* ------------------------------------------------------------- the sheet */

/**
 * Pulls the sheet id and tab out of whatever the agent pasted: the address-bar
 * link, a share link, or the bare id. Only the id is ever used to build the
 * address that is fetched, so a pasted link cannot point the server elsewhere.
 */
function parseSheetRef(input) {
  const text = String(input || '').trim();
  if (!text) throw badRequest('Paste the Google Sheet link or its ID.');

  if (/\/spreadsheets\/d\/e\//.test(text)) {
    throw badRequest('That is a "Publish to web" link. Use the normal link from the address bar or the Share button.');
  }

  const fromUrl = text.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  const sheetId = fromUrl ? fromUrl[1] : (/^[a-zA-Z0-9_-]{20,}$/.test(text) ? text : '');
  if (!sheetId) throw badRequest('That does not look like a Google Sheet link. Copy it from the address bar of the sheet.');

  const gid = text.match(/[#&?]gid=(\d+)/);
  return { sheetId, gid: gid ? gid[1] : '0' };
}

/** Reads one tab of a shared sheet as parsed CSV rows (header row included). */
async function fetchSheetRows(sheetId, gid) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), redirect: 'follow' });
  } catch (err) {
    const timedOut = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    throw new Error(timedOut ? 'Google took too long to answer.' : 'Could not reach Google Sheets.');
  }

  const type = res.headers.get('content-type') || '';
  // A sheet that is not shared answers 200 with a sign-in page, not an error code.
  if (res.status === 401 || res.status === 403 || (res.ok && type.includes('text/html'))) {
    throw new Error('The sheet is private. Open it, click Share and set "Anyone with the link" to Viewer.');
  }
  if (res.status === 404) throw new Error('Sheet not found. Check the link, or whether the sheet was deleted.');
  if (!res.ok) throw new Error(`Google Sheets answered with an error (${res.status}).`);

  const declared = Number(res.headers.get('content-length'));
  if (declared > MAX_CSV_BYTES) throw new Error('The sheet is too large to read.');

  const text = await res.text();
  if (text.length > MAX_CSV_BYTES) throw new Error('The sheet is too large to read.');
  return leadImportService.parseCsv(text);
}

/* ------------------------------------------------------- column matching */

const lower = (v) => String(v ?? '').trim().toLowerCase();

/** Header text for each column, blank headers named so they can still be pointed at. */
function headersOf(matrix) {
  return (matrix[0] || []).map((c, i) => String(c ?? '').trim() || `Column ${i + 1}`);
}

/**
 * field -> column index. A header the agent chose wins; every field they left
 * alone is detected from the header row, so a new Meta form field still works.
 */
function resolveMapping(columns, stored = {}) {
  const auto = leadImportService.suggestMapping(columns);
  const mapping = { ...auto };

  for (const [field, header] of Object.entries(stored || {})) {
    if (!header) continue;
    const index = columns.findIndex((c) => lower(c) === lower(header));
    if (index !== -1) mapping[field] = index;
    else delete mapping[field]; // the column was renamed or removed; don't fall back to a wrong guess
  }
  return mapping;
}

/** The same mapping as headers, for storing and showing. */
function mappingAsHeaders(columns, mapping) {
  return Object.fromEntries(Object.entries(mapping).map(([field, i]) => [field, columns[i]]));
}

/* ------------------------------------------------------------- the lead */

/**
 * Indian numbers come in as +91 98765 43210, 098765-43210, p:+919876543210
 * and so on. Those are stored as the bare 10 digits; anything else keeps its
 * country code.
 */
function cleanPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  const key = leadImportService.phoneKey(raw);
  const indian = digits.length === 10
    || (digits.length === 11 && digits.startsWith('0'))
    || (digits.length === 12 && digits.startsWith('91'));
  if (indian) return key;
  return digits.length > 10 ? `+${digits}` : digits;
}

function cellAt(row, index) {
  return index === undefined ? '' : String(row[index] ?? '').trim();
}

/** Everything the form asked that has no lead field of its own (budget, pax, dates...). */
function extraNotes(row, columns, usedIndexes) {
  const lines = [];
  columns.forEach((header, i) => {
    if (usedIndexes.has(i)) return;
    const value = cellAt(row, i);
    if (!value || NOISE_HEADERS.has(leadImportService.headerKey(header))) return;
    lines.push(`${header}: ${value.slice(0, NOTE_VALUE_MAX)}`);
  });
  return lines.join('\n').slice(0, NOTES_MAX);
}

/**
 * Turns the raw rows into the fixed-shape rows the import takes, dropping the
 * ones that would not become a lead so round-robin only counts real leads.
 */
function buildImportRows({ rows, columns, sheet, mapping, knownPhones }) {
  const tripIndex = sheet.tripMode === 'column' && sheet.tripColumn
    ? columns.findIndex((c) => lower(c) === lower(sheet.tripColumn))
    : -1;

  const used = new Set(Object.values(mapping));
  if (tripIndex !== -1) used.add(tripIndex);

  const kept = [];
  const seen = new Set();
  const skipped = { invalid: 0, duplicates: 0 };

  for (const row of rows) {
    const phone = cleanPhone(cellAt(row, mapping.phone));
    const key = leadImportService.phoneKey(phone);
    if (key.length < 7) { skipped.invalid += 1; continue; }
    if (seen.has(key) || knownPhones.has(key)) { skipped.duplicates += 1; continue; }
    seen.add(key);

    const fromColumn = tripIndex !== -1 ? cellAt(row, tripIndex) : '';
    const interest = (sheet.tripMode === 'column' ? fromColumn || sheet.tripName : sheet.tripName)
      || cellAt(row, mapping.interest);

    kept.push([
      cellAt(row, mapping.customerName),
      phone,
      cellAt(row, mapping.email),
      interest,
      extraNotes(row, columns, used),
      '', // assignee, filled in below
      cellAt(row, mapping.departureDate),
      cellAt(row, mapping.travelers),
      cellAt(row, mapping.createdAt),
    ]);
  }
  return { kept, skipped };
}

const IMPORT_SHAPE = {
  customerName: 0, phone: 1, email: 2, interest: 3, notes: 4,
  assignedTo: 5, departureDate: 6, travelers: 7, createdAt: 8,
};

/** Team in a stable order, so round-robin walks the same loop every time. */
async function teamNames(tenantId) {
  const users = await userRepository.listUsersByTenant(tenantId);
  return users
    .slice()
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map((u) => u.name)
    .filter(Boolean);
}

/* ------------------------------------------------------------------ sync */

/**
 * Turns rows from any lead source (a Google Sheet, a Meta lead form) into
 * leads: column matching, trip, phone de-duplication against leads and
 * bookings, assignment, and the insert with its timeline note.
 *
 * `source` carries the settings the agent chose: tripMode, tripName,
 * tripColumn, columnMapping, assignMode, assignedTo, defaultStage, sourceLabel
 * and the round-robin position (rrCursor).
 *
 * @returns {Promise<{imported: number, skippedDuplicates: number, skippedInvalid: number, rrCursor: number}>}
 */
async function importRows(source, columns, rows, { timelineNote, actor }) {
  const mapping = resolveMapping(columns, source.columnMapping);
  if (mapping.phone === undefined) {
    const err = new Error('No phone column found. Open Edit and choose which column holds the phone number.');
    err.unread = true;
    throw err;
  }

  const tenantId = source.tenantId;
  const [leadPhones, bookingPhones, team] = await Promise.all([
    leadRepository.listPhoneKeys(tenantId),
    leadRepository.listBookingPhoneKeys(tenantId),
    teamNames(tenantId),
  ]);

  const { kept, skipped } = buildImportRows({
    rows, columns, sheet: source, mapping,
    knownPhones: new Set([...leadPhones, ...bookingPhones]),
  });
  const out = { imported: 0, skippedInvalid: skipped.invalid, skippedDuplicates: skipped.duplicates, rrCursor: source.rrCursor || 0 };

  // A named agent who has since left the team would own leads nobody sees.
  const fixedAgent = source.assignMode === 'agent' && team.includes(source.assignedTo) ? source.assignedTo : '';
  kept.forEach((cells, i) => {
    if (source.assignMode === 'agent') cells[IMPORT_SHAPE.assignedTo] = fixedAgent;
    else if (team.length > 0) cells[IMPORT_SHAPE.assignedTo] = team[(out.rrCursor + i) % team.length];
  });
  if (source.assignMode === 'round_robin' && team.length > 0) out.rrCursor = (out.rrCursor + kept.length) % team.length;

  if (kept.length > 0) {
    const imported = await leadImportService.importLeads(tenantId, {
      rows: kept,
      mapping: IMPORT_SHAPE,
      defaults: { source: source.sourceLabel || SOURCE_DEFAULT, stage: source.defaultStage },
      duplicateAction: 'skip',
      timelineNote,
    }, actor);
    out.imported = imported.imported;
    out.skippedDuplicates += imported.skippedDuplicates;
    out.skippedInvalid += imported.skippedInvalid;

    await announceNewLeads(tenantId, kept.some((c) => !c[IMPORT_SHAPE.assignedTo]));
  }
  return out;
}

/**
 * Reads the new rows of one sheet and turns them into leads.
 *
 * Never throws for a problem with the sheet itself (private, deleted, empty):
 * that is recorded on the sheet and shown on the Settings screen, which is
 * where the agent can fix it. `fetchRows` is a parameter so tests can run
 * without Google.
 *
 * @returns {Promise<{status: 'ok'|'error'|'busy', imported: number, skippedDuplicates: number, skippedInvalid: number, error?: string}>}
 */
async function syncSheet(sheetId, { fetchRows = fetchSheetRows } = {}) {
  const sheet = await leadSheetRepository.claim(sheetId);
  if (!sheet) return { status: 'busy', imported: 0, skippedDuplicates: 0, skippedInvalid: 0 };

  const result = { status: 'ok', imported: 0, skippedDuplicates: 0, skippedInvalid: 0 };
  let lastRowCount = sheet.lastRowCount;
  let rrCursor = sheet.rrCursor;

  try {
    const matrix = await fetchRows(sheet.sheetId, sheet.gid);
    if (matrix.length === 0) throw new Error('The sheet is empty. Add a header row and the form columns.');

    const columns = headersOf(matrix);
    const body = matrix.slice(1);

    // Connected with "only new leads": everything already in the sheet is history.
    if (!sheet.lastSyncedAt && sheet.skipExisting) {
      lastRowCount = body.length;
    } else {
      // Rows were deleted from the sheet; start counting from what is there now.
      if (body.length < lastRowCount) lastRowCount = body.length;

      const fresh = body.slice(lastRowCount, lastRowCount + MAX_ROWS_PER_SYNC);
      lastRowCount += fresh.length;

      if (fresh.length > 0) {
        try {
          const done = await importRows(sheet, columns, fresh, {
            timelineNote: `Lead automatically captured from Google Sheet: ${sheet.name}`,
            actor: 'Google Sheet',
          });
          Object.assign(result, done);
          rrCursor = done.rrCursor;
        } catch (err) {
          // Rows are left unread so they import once the agent fixes the mapping.
          if (err.unread) lastRowCount = sheet.lastRowCount;
          throw err;
        }
      }
    }

    await leadSheetRepository.finish(sheet.id, {
      lastRowCount, rrCursor, imported: result.imported, status: 'ok',
    });
  } catch (err) {
    result.status = 'error';
    result.error = err.message;
    logger.warn({ sheet: sheet.id, tenantId: sheet.tenantId, err: err.message }, 'Lead sheet sync failed');
    await leadSheetRepository.finish(sheet.id, { lastRowCount, rrCursor, status: 'error', error: err.message });
  }

  return result;
}

/** Tells open browsers the unassigned-lead badge changed. A failure here must not undo the import. */
async function announceNewLeads(tenantId, anyUnassigned) {
  if (!anyUnassigned) return;
  try {
    const leadService = require('./leadService');
    const websocketService = require('./websocketService');
    const pool = await leadService.getLeadPool(tenantId);
    websocketService.broadcastToTenant(tenantId, { type: 'LEAD_POOL_UPDATED', count: pool.length });
  } catch (err) {
    logger.debug({ err }, 'Could not announce new sheet leads');
  }
}

/** Runs every active sheet that is due. Sheets go one after another to keep the load on Google and the database flat. */
async function syncDueSheets(minutes = 10) {
  const due = await leadSheetRepository.listDue(minutes);
  const totals = { sheets: due.length, imported: 0, failed: 0 };

  for (const { id } of due) {
    try {
      const r = await syncSheet(id);
      totals.imported += r.imported;
      if (r.status === 'error') totals.failed += 1;
    } catch (err) {
      totals.failed += 1;
      logger.error({ err, sheet: id }, 'Lead sheet sync crashed');
    }
  }
  return totals;
}

/* ----------------------------------------------------------- management */

function clampText(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

/** Validates what the form sent and shapes it for storage. */
async function normalizeConfig(tenantId, body = {}) {
  const name = clampText(body.name, 120);
  if (!name) throw badRequest('Give the sheet a name, e.g. "Chopta Trek October Leads".');

  const ref = parseSheetRef(body.sheetUrl);

  const tripMode = body.tripMode === 'column' ? 'column' : 'fixed';
  const tripName = clampText(body.tripName, 200);
  const tripColumn = clampText(body.tripColumn, 200);
  if (tripMode === 'column' && !tripColumn) throw badRequest('Choose the sheet column that holds the destination.');

  const assignMode = body.assignMode === 'agent' ? 'agent' : 'round_robin';
  const assignedTo = assignMode === 'agent' ? clampText(body.assignedTo, 120) : '';
  if (assignMode === 'agent') {
    if (!assignedTo) throw badRequest('Choose which team member gets these leads, or pick Round-Robin.');
    if (!(await teamNames(tenantId)).includes(assignedTo)) throw badRequest(`${assignedTo} is not on your team.`);
  }

  const defaultStage = LEAD_STAGES.includes(body.defaultStage) ? body.defaultStage : 'New';

  const columnMapping = {};
  const knownFields = new Set(leadImportService.IMPORT_FIELDS.map((f) => f.key));
  for (const [field, header] of Object.entries(body.columnMapping || {})) {
    if (knownFields.has(field) && header) columnMapping[field] = clampText(header, 200);
  }

  return {
    name,
    sheetId: ref.sheetId,
    gid: ref.gid,
    tripMode,
    tripName,
    tripColumn: tripMode === 'column' ? tripColumn : '',
    assignMode,
    assignedTo,
    defaultStage,
    sourceLabel: clampText(body.sourceLabel, 60) || SOURCE_DEFAULT,
    columnMapping,
    skipExisting: Boolean(body.skipExisting),
  };
}

/** A sheet as the screen shows it: a link back to the real sheet, nothing internal. */
function toPublic(sheet) {
  return {
    ...sheet,
    tenantId: undefined,
    rrCursor: undefined,
    url: `https://docs.google.com/spreadsheets/d/${sheet.sheetId}/edit#gid=${sheet.gid}`,
  };
}

async function createSheet(tenantId, body, actor) {
  if (await leadSheetRepository.countByTenant(tenantId) >= MAX_SHEETS_PER_TENANT) {
    throw badRequest(`You can connect up to ${MAX_SHEETS_PER_TENANT} sheets. Delete one you no longer use first.`);
  }
  const config = await normalizeConfig(tenantId, body);
  return toPublic(await leadSheetRepository.insert(tenantId, config, actor));
}

async function updateSheet(tenantId, id, body) {
  const config = await normalizeConfig(tenantId, body);
  const sheet = await leadSheetRepository.update(tenantId, id, config);
  if (!sheet) return null;
  return toPublic(sheet);
}

/**
 * What the Add Sheet form shows after the link is pasted: the sheet's columns,
 * the mapping we would use and a few rows, so a wrong guess is visible before
 * anything is saved.
 */
async function previewSheet(tenantId, sheetUrl, { fetchRows = fetchSheetRows } = {}) {
  const ref = parseSheetRef(sheetUrl);
  let matrix;
  try {
    matrix = await fetchRows(ref.sheetId, ref.gid);
  } catch (err) {
    throw badRequest(err.message);
  }
  if (matrix.length === 0) throw badRequest('The sheet is empty. Add a header row and the form columns.');

  const columns = headersOf(matrix);
  const mapping = leadImportService.suggestMapping(columns);
  return {
    columns,
    mapping: mappingAsHeaders(columns, mapping),
    sample: matrix.slice(1, 4).map((r) => columns.map((_, i) => String(r[i] ?? '').trim())),
    totalRows: Math.max(0, matrix.length - 1),
    fields: leadImportService.PUBLIC_FIELDS.filter((f) => ['customerName', 'phone', 'email', 'interest', 'departureDate', 'travelers', 'notes'].includes(f.key)),
  };
}

async function listSheets(tenantId) {
  const sheets = await leadSheetRepository.listByTenant(tenantId);
  return sheets.map(toPublic);
}

/** What the Add Sheet form offers in its dropdowns. */
async function formOptions(tenantId) {
  const [trips, team] = await Promise.all([leadSheetRepository.listTripNames(tenantId), teamNames(tenantId)]);
  return { trips, team, stages: LEAD_STAGES, defaultSource: SOURCE_DEFAULT };
}

module.exports = {
  MAX_SHEETS_PER_TENANT,
  parseSheetRef,
  syncSheet,
  syncDueSheets,
  importRows,
  teamNames,
  SOURCE_DEFAULT,
  createSheet,
  updateSheet,
  previewSheet,
  listSheets,
  formOptions,
  toPublic,
  // exported for tests
  cleanPhone,
  resolveMapping,
};
