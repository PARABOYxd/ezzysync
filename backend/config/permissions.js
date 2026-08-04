// Single source of truth for the module x action permission matrix.
const MODULES = {
  leads: ['create', 'read', 'update', 'delete', 'viewAll'],
  bookings: ['create', 'read', 'update', 'delete', 'editPhone', 'viewAll'],
  quotations: ['create', 'read', 'update', 'delete'],
  invoices: ['read', 'download', 'email'],
  hotels: ['create', 'read', 'update', 'delete'],
  tourBatches: ['create', 'read', 'update', 'delete'],
  followUps: ['create', 'read', 'update', 'viewAll'],
  customers: ['read'],
  aiTools: ['use'],
  billing: ['read'],
};

// Defaults chosen to match current real-world behavior, so this ships as a no-op
// for existing tenants until an admin deliberately tightens something.
const TEAM_MEMBER_DEFAULTS = {
  leads: { create: true, read: true, update: true, delete: false, viewAll: true },
  bookings: { create: true, read: true, update: true, delete: false, editPhone: false, viewAll: true },
  quotations: { create: true, read: true, update: true, delete: true },
  invoices: { read: true, download: true, email: true },
  hotels: { create: true, read: true, update: true, delete: true },
  tourBatches: { create: true, read: true, update: true, delete: true },
  followUps: { create: true, read: true, update: true, viewAll: true },
  customers: { read: true },
  aiTools: { use: true },
  billing: { read: false },
};

// Legacy flat keys (pre module x action matrix) mapped to their new home.
// canDownloadInvoice used to gate both downloading and emailing invoices.
const LEGACY_KEY_MAP = {
  canCreateLeads: [['leads', 'create']],
  canEditLeads: [['leads', 'update']],
  canDeleteLeads: [['leads', 'delete']],
  canDownloadInvoice: [['invoices', 'download'], ['invoices', 'email']],
  canEditMobileNumber: [['bookings', 'editPhone']],
};

function cloneDefaults() {
  return JSON.parse(JSON.stringify(TEAM_MEMBER_DEFAULTS));
}

function adminPermissions() {
  const perms = {};
  for (const [moduleKey, actions] of Object.entries(MODULES)) {
    perms[moduleKey] = {};
    for (const action of actions) perms[moduleKey][action] = true;
  }
  return perms;
}

function normalizePermissions(raw, role) {
  if (role === 'ADMIN') return adminPermissions();

  const result = cloneDefaults();
  if (!raw || typeof raw !== 'object') return result;

  // Migrate legacy flat boolean keys, if present.
  for (const [legacyKey, targets] of Object.entries(LEGACY_KEY_MAP)) {
    if (Object.prototype.hasOwnProperty.call(raw, legacyKey)) {
      const value = !!raw[legacyKey];
      for (const [moduleKey, action] of targets) {
        result[moduleKey][action] = value;
      }
    }
  }

  // Merge already-normalized module.action keys on top.
  for (const [moduleKey, actions] of Object.entries(MODULES)) {
    const rawModule = raw[moduleKey];
    if (!rawModule || typeof rawModule !== 'object') continue;
    for (const action of actions) {
      if (Object.prototype.hasOwnProperty.call(rawModule, action)) {
        result[moduleKey][action] = !!rawModule[action];
      }
    }
  }

  return result;
}

// Strips anything that isn't a recognized module/action before it reaches the DB.
function sanitizePermissions(input) {
  const result = {};
  if (!input || typeof input !== 'object') return result;
  for (const [moduleKey, actions] of Object.entries(MODULES)) {
    const rawModule = input[moduleKey];
    if (!rawModule || typeof rawModule !== 'object') continue;
    result[moduleKey] = {};
    for (const action of actions) {
      if (Object.prototype.hasOwnProperty.call(rawModule, action)) {
        result[moduleKey][action] = !!rawModule[action];
      }
    }
  }
  return result;
}

// True when a TEAM_MEMBER's list/read access to a module should be forced
// to their own records (req.user.name) instead of the whole tenant.
// Admins are never scoped.
function shouldScopeToSelf(user, moduleKey) {
  return user.role === 'TEAM_MEMBER' && !user.permissions?.[moduleKey]?.viewAll;
}

module.exports = {
  MODULES,
  TEAM_MEMBER_DEFAULTS,
  normalizePermissions,
  adminPermissions,
  sanitizePermissions,
  shouldScopeToSelf,
};
