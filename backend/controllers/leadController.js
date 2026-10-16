const leadService = require('../services/leadService');
const { withoutProtectedFields } = require('../utils/protectedFields');
const { pageParams } = require('../utils/pagination');
const auditService = require('../services/auditService');
const broadcastService = require('../services/broadcastService');
const { shouldScopeToSelf } = require('../config/permissions');

async function list(req, res, next) {
  try {
    const { page, limit } = pageParams(req.query);
    const { stage, priority, search, sort, createdFrom, createdTo } = req.query;
    const assignedTo = shouldScopeToSelf(req.user, 'leads') ? req.user.name : req.query.assignedTo;

    const result = await leadService.listLeadsPaged(req.user.tenantId, {
      page, limit, stage, priority, assignedTo, search, sort, createdFrom, createdTo,
    });

    res.json({
      leads: result.leads,
      pagination: {
        totalCount: result.totalCount,
        totalPages: Math.ceil(result.totalCount / limit),
        currentPage: page,
        limit,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function pipeline(req, res, next) {
  try {
    const assignedTo = shouldScopeToSelf(req.user, 'leads') ? req.user.name : null;
    const leads = await leadService.listLeadsForPipeline(req.user.tenantId, assignedTo);
    res.json({ leads });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const lead = await leadService.getLeadById(req.user.tenantId, req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found.' });
    if (shouldScopeToSelf(req.user, 'leads') && lead.assignedTo !== req.user.name) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    res.json({ lead });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const lead = await leadService.createLead(req.user.tenantId, req.body, req.user.email);
    await auditService.logAction(req, 'CREATE_LEAD_ENTRY', { leadId: lead.leadId, customerName: lead.customerName });
    res.status(201).json({ lead });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const updates = withoutProtectedFields(req.body, ['leadId', 'lead_id', 'convertedBookingId', 'converted_booking_id', 'customerId', 'customer_id']);
    const lead = await leadService.updateLead(req.user.tenantId, req.params.id, updates, req.user.name || req.user.email);
    await auditService.logAction(req, 'UPDATE_LEAD_ENTRY', { leadId: req.params.id, updates: Object.keys(req.body) });
    res.json({ lead });
  } catch (err) {
    next(err);
  }
}

async function updateStage(req, res, next) {
  try {
    const { stage } = req.body;
    if (!stage) return res.status(400).json({ message: 'Stage is required.' });
    const lead = await leadService.updateStage(req.user.tenantId, req.params.id, stage, req.user.name || req.user.email);
    await auditService.logAction(req, 'UPDATE_LEAD_STAGE', { leadId: req.params.id, stage });
    res.json({ lead });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await leadService.softDeleteLead(req.user.tenantId, req.params.id, req.user.name || req.user.email);
    await auditService.logAction(req, 'DELETE_LEAD_ENTRY', { leadId: req.params.id });
    res.json({ message: 'Lead deleted.' });
  } catch (err) {
    next(err);
  }
}

async function convert(req, res, next) {
  try {
    const result = await leadService.convertToBooking(req.user.tenantId, req.params.id, req.body, req.user.name || req.user.email);
    await auditService.logAction(req, 'CONVERT_LEAD_TO_BOOKING', { leadId: req.params.id, bookingId: result.booking.bookingId });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function listFollowUps(req, res, next) {
  try {
    // A list for another tenant's (or a deleted) record used to come back as
    // an empty 200, indistinguishable from a real record with no history.
    const lead = await leadService.getLeadById(req.user.tenantId, req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found.' });
    const logs = await leadService.getFollowUps(req.user.tenantId, req.params.id);
    res.json({ followUps: logs });
  } catch (err) {
    next(err);
  }
}

async function createFollowUp(req, res, next) {
  try {
    const { note, activityType, nextFollowUpDate } = req.body;
    if (!note) return res.status(400).json({ message: 'Note content is required.' });
    const log = await leadService.addFollowUp(req.user.tenantId, req.params.id, {
      note, activityType: activityType || 'note', nextFollowUpDate, createdBy: req.user.name,
    });
    await auditService.logAction(req, 'CREATE_LEAD_FOLLOW_UP_LOG', { leadId: req.params.id, activityType });
    res.status(201).json({ followUp: log });
  } catch (err) {
    next(err);
  }
}

async function listPool(req, res, next) {
  try {
    const leads = await leadService.getLeadPool(req.user.tenantId);
    res.json({ leads });
  } catch (err) {
    next(err);
  }
}

async function claimLead(req, res, next) {
  try {
    const lead = await leadService.claimLead(req.user.tenantId, req.params.id, req.user.name || req.user.email);
    await auditService.logAction(req, 'CLAIM_LEAD', { leadId: req.params.id });

    const websocketService = require('../services/websocketService');
    const poolLeads = await leadService.getLeadPool(req.user.tenantId);
    websocketService.broadcastToTenant(req.user.tenantId, {
      type: 'LEAD_POOL_UPDATED',
      count: poolLeads.length
    });

    res.json({ lead });
  } catch (err) {
    next(err);
  }
}

async function bulkImport(req, res, next) {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: 'No rows to import.' });
    }
    if (rows.length > 500) {
      return res.status(400).json({ message: 'Import is capped at 500 rows at a time - split the file and try again.' });
    }
    const result = await leadService.bulkImportLeads(req.user.tenantId, rows, req.user.name || req.user.email);
    await auditService.logAction(req, 'BULK_IMPORT_LEADS', { created: result.created, skipped: result.skipped, failed: result.failed });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function broadcast(req, res, next) {
  try {
    const { leadIds, templateId } = req.body;
    const results = await broadcastService.broadcastToLeads(req.user.tenantId, {
      leadIds,
      templateId,
      userId: req.user.userId || req.user.id,
      sentBy: req.user.name || req.user.email,
    });
    const sentCount = results.filter((r) => r.sent).length;
    await auditService.logAction(req, 'BROADCAST_TO_LEADS', { requested: leadIds?.length || 0, sent: sentCount, templateId });
    res.json({ results, sentCount, totalCount: results.length, broadcastId: results.broadcastId || null });
  } catch (err) {
    next(err);
  }
}

async function listBroadcasts(req, res, next) {
  try {
    const broadcasts = await broadcastService.listBroadcasts(req.user.tenantId);
    res.json({ broadcasts });
  } catch (err) {
    next(err);
  }
}

async function getBroadcastQuota(req, res, next) {
  try {
    const quota = await broadcastService.getBroadcastQuota(req.user.tenantId);
    res.json(quota);
  } catch (err) {
    next(err);
  }
}

async function getBroadcastDetail(req, res, next) {
  try {
    const detail = await broadcastService.getBroadcastDetail(req.user.tenantId, req.params.broadcastId);
    if (!detail) return res.status(404).json({ message: 'Broadcast not found.' });
    res.json(detail);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list, pipeline, getOne, create, update, updateStage, remove, convert,
  listFollowUps, createFollowUp, listPool, claimLead, bulkImport, broadcast,
  listBroadcasts, getBroadcastDetail, getBroadcastQuota,
};
