const leadImportService = require('../services/leadImportService');
const auditService = require('../services/auditService');
const websocketService = require('../services/websocketService');
const leadService = require('../services/leadService');
const { shouldScopeToSelf } = require('../config/permissions');

/** Reads the uploaded sheet and answers with its columns, a suggested mapping and a preview. */
async function preview(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: 'Choose a .xlsx or .csv file to import.' });

    const parsed = await leadImportService.parseUpload(req.file.buffer, req.file.originalname);

    res.json({
      fileName: req.file.originalname,
      columns: parsed.columns,
      rows: parsed.rows,
      preview: parsed.preview,
      totalRows: parsed.totalRows,
      mapping: parsed.mapping,
      truncated: parsed.truncated,
      maxRows: parsed.maxRows,
      fields: leadImportService.PUBLIC_FIELDS,
    });
  } catch (err) {
    next(err);
  }
}

/** The field list on its own, so the upload screen can show examples before any file exists. */
function fields(req, res) {
  res.json({ fields: leadImportService.PUBLIC_FIELDS, maxRows: leadImportService.MAX_ROWS });
}

/** Dry run: the counts the user sees before committing to a mapping. */
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * The shape the import service assumes, checked before it gets there.
 *
 * The service reads `mapping[field]` as a column index and `row[index]` as a
 * cell, so a missing mapping, a row that is not an array or a default that is
 * not an object threw deep inside it - a 500 for what is a malformed upload.
 */
function importPayloadProblem(body = {}) {
  const { rows, mapping, defaults } = body;
  if (!Array.isArray(rows)) return 'No parsed rows were sent.';
  if (!rows.every(Array.isArray)) return 'Each row must be a list of cells.';
  if (!isPlainObject(mapping)) return 'Choose which column holds each field before importing.';
  const badColumn = Object.values(mapping).some((v) => v !== null && v !== '' && !(Number.isInteger(Number(v)) && Number(v) >= 0));
  if (badColumn) return 'The column mapping is not valid.';
  if (defaults !== undefined && defaults !== null && !isPlainObject(defaults)) return 'Import defaults are not valid.';
  return null;
}

async function analyze(req, res, next) {
  try {
    const { rows, mapping, defaults } = req.body;
    const problem = importPayloadProblem(req.body);
    if (problem) return res.status(400).json({ message: problem });

    const result = await leadImportService.analyze(req.user.tenantId, { rows, mapping, defaults: defaults || {} });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function run(req, res, next) {
  try {
    const problem = importPayloadProblem(req.body);
    if (problem) return res.status(400).json({ message: problem });
    const { rows, mapping, duplicateAction } = req.body;
    const defaults = req.body.defaults || {};

    // A team member who only sees their own leads would otherwise import a
    // pile of leads they cannot then open.
    const scoped = shouldScopeToSelf(req.user, 'leads');
    const effectiveDefaults = scoped ? { ...defaults, assignedTo: req.user.name } : defaults;

    const result = await leadImportService.importLeads(
      req.user.tenantId,
      { rows, mapping, defaults: effectiveDefaults, duplicateAction },
      req.user.email
    );

    await auditService.logAction(req, 'IMPORT_LEADS', {
      imported: result.imported,
      skippedDuplicates: result.skippedDuplicates,
      skippedInvalid: result.skippedInvalid,
    });

    // Unassigned imports land in the shared pool, and the pool badge is live.
    if (result.imported > 0 && !effectiveDefaults.assignedTo) {
      leadService.getLeadPool(req.user.tenantId)
        .then((pool) => websocketService.broadcastToTenant(req.user.tenantId, {
          type: 'LEAD_POOL_UPDATED',
          count: pool.length,
        }))
        .catch(() => {});
    }

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

/** The blank workbook, so a user with no file of their own still has a starting point. */
async function template(req, res, next) {
  try {
    const buffer = await leadImportService.buildTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="ezzysync-leads-template.xlsx"');
    res.send(Buffer.from(buffer));
  } catch (err) {
    next(err);
  }
}

module.exports = { fields, preview, analyze, run, template };
