const leadSheetService = require('../services/leadSheetService');
const leadSheetRepository = require('../repositories/leadSheetRepository');
const auditService = require('../services/auditService');

async function list(req, res, next) {
  try {
    const [sheets, options] = await Promise.all([
      leadSheetService.listSheets(req.user.tenantId),
      leadSheetService.formOptions(req.user.tenantId),
    ]);
    res.json({ sheets, options, maxSheets: leadSheetService.MAX_SHEETS_PER_TENANT });
  } catch (err) {
    next(err);
  }
}

/** Reads the pasted sheet and answers with its columns and the mapping we would use. */
async function preview(req, res, next) {
  try {
    res.json(await leadSheetService.previewSheet(req.user.tenantId, req.body?.sheetUrl));
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const sheet = await leadSheetService.createSheet(req.user.tenantId, req.body, req.user.email);
    await auditService.logAction(req, 'CREATE_LEAD_SHEET', { id: sheet.id, name: sheet.name });
    res.status(201).json({ sheet });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const sheet = await leadSheetService.updateSheet(req.user.tenantId, req.params.id, req.body);
    if (!sheet) return res.status(404).json({ message: 'Sheet not found.' });
    await auditService.logAction(req, 'UPDATE_LEAD_SHEET', { id: sheet.id, name: sheet.name });
    res.json({ sheet });
  } catch (err) {
    next(err);
  }
}

async function setPaused(req, res, next) {
  try {
    const sheet = await leadSheetRepository.setPaused(req.user.tenantId, req.params.id, req.body?.paused);
    if (!sheet) return res.status(404).json({ message: 'Sheet not found.' });
    res.json({ sheet: leadSheetService.toPublic(sheet) });
  } catch (err) {
    next(err);
  }
}

async function syncNow(req, res, next) {
  try {
    // Checks the sheet belongs to this tenant before the sync touches it.
    const sheet = await leadSheetRepository.findById(req.user.tenantId, req.params.id);
    if (!sheet) return res.status(404).json({ message: 'Sheet not found.' });

    const result = await leadSheetService.syncSheet(sheet.id);
    if (result.status === 'busy') return res.status(409).json({ message: 'This sheet is already syncing. Try again in a moment.' });

    const fresh = await leadSheetRepository.findById(req.user.tenantId, sheet.id);
    res.json({ result, sheet: leadSheetService.toPublic(fresh) });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const removed = await leadSheetRepository.remove(req.user.tenantId, req.params.id);
    if (!removed) return res.status(404).json({ message: 'Sheet not found.' });
    await auditService.logAction(req, 'DELETE_LEAD_SHEET', { id: req.params.id });
    // Leads already captured stay: deleting the connection only stops new ones.
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, preview, create, update, setPaused, syncNow, remove };
