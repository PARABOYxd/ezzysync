const leadService = require('../services/leadService');
const auditService = require('../services/auditService');
const { shouldScopeToSelf } = require('../config/permissions');

async function list(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const { stage, search, sort } = req.query;
    const assignedTo = shouldScopeToSelf(req.user, 'leads') ? req.user.name : req.query.assignedTo;

    const result = await leadService.listLeadsPaged(req.user.tenantId, {
      page, limit, stage, assignedTo, search, sort,
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
    const lead = await leadService.updateLead(req.user.tenantId, req.params.id, req.body, req.user.name || req.user.email);
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

module.exports = { list, pipeline, getOne, create, update, updateStage, remove, convert, listFollowUps, createFollowUp, listPool, claimLead };
