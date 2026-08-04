const {
  MODULES,
  TEAM_MEMBER_DEFAULTS,
  normalizePermissions,
  adminPermissions,
  sanitizePermissions,
  shouldScopeToSelf,
} = require('../config/permissions');

describe('adminPermissions', () => {
  it('grants every action of every module', () => {
    const perms = adminPermissions();
    for (const [moduleKey, actions] of Object.entries(MODULES)) {
      for (const action of actions) {
        expect(perms[moduleKey][action]).toBe(true);
      }
    }
  });
});

describe('normalizePermissions', () => {
  it('ADMIN role always gets full access regardless of stored permissions', () => {
    const perms = normalizePermissions({ leads: { create: false } }, 'ADMIN');
    expect(perms.leads.create).toBe(true);
    expect(perms.bookings.delete).toBe(true);
  });

  it('ADMIN role gets full access even with null/undefined stored permissions', () => {
    expect(normalizePermissions(null, 'ADMIN')).toEqual(adminPermissions());
    expect(normalizePermissions(undefined, 'ADMIN')).toEqual(adminPermissions());
  });

  it('TEAM_MEMBER with no stored permissions falls back to TEAM_MEMBER_DEFAULTS', () => {
    expect(normalizePermissions(null, 'TEAM_MEMBER')).toEqual(TEAM_MEMBER_DEFAULTS);
    expect(normalizePermissions(undefined, 'TEAM_MEMBER')).toEqual(TEAM_MEMBER_DEFAULTS);
    expect(normalizePermissions({}, 'TEAM_MEMBER')).toEqual(TEAM_MEMBER_DEFAULTS);
  });

  it('TEAM_MEMBER explicit module.action overrides win over defaults', () => {
    const perms = normalizePermissions({ leads: { delete: true }, hotels: { create: false } }, 'TEAM_MEMBER');
    expect(perms.leads.delete).toBe(true);
    expect(perms.hotels.create).toBe(false);
    // Untouched actions/modules keep their default values
    expect(perms.leads.create).toBe(true);
    expect(perms.hotels.read).toBe(true);
  });

  it('coerces truthy/falsy non-boolean values to real booleans', () => {
    const perms = normalizePermissions({ leads: { delete: 1, create: 0 } }, 'TEAM_MEMBER');
    expect(perms.leads.delete).toBe(true);
    expect(perms.leads.create).toBe(false);
  });

  it('ignores unknown modules and unknown actions on known modules', () => {
    const perms = normalizePermissions(
      { notAModule: { create: true }, leads: { notAnAction: true, create: false } },
      'TEAM_MEMBER'
    );
    expect(perms.notAModule).toBeUndefined();
    expect(perms.leads.notAnAction).toBeUndefined();
    expect(perms.leads.create).toBe(false);
  });

  describe('legacy flat-key migration', () => {
    it('maps canCreateLeads / canEditLeads / canDeleteLeads onto leads.*', () => {
      const perms = normalizePermissions(
        { canCreateLeads: false, canEditLeads: false, canDeleteLeads: true },
        'TEAM_MEMBER'
      );
      expect(perms.leads.create).toBe(false);
      expect(perms.leads.update).toBe(false);
      expect(perms.leads.delete).toBe(true);
    });

    it('maps canDownloadInvoice onto BOTH invoices.download and invoices.email', () => {
      const perms = normalizePermissions({ canDownloadInvoice: false }, 'TEAM_MEMBER');
      expect(perms.invoices.download).toBe(false);
      expect(perms.invoices.email).toBe(false);
    });

    it('maps canEditMobileNumber onto bookings.editPhone', () => {
      const perms = normalizePermissions({ canEditMobileNumber: true }, 'TEAM_MEMBER');
      expect(perms.bookings.editPhone).toBe(true);
    });

    it('new-shape keys take precedence over legacy keys when both are present', () => {
      // Simulates a user saved under the old system, then edited once via the new matrix.
      const perms = normalizePermissions(
        { canEditLeads: false, leads: { update: true } },
        'TEAM_MEMBER'
      );
      expect(perms.leads.update).toBe(true);
    });

    it('an old flat-key-only user retains their original effective access (no silent lockout)', () => {
      // A pre-migration team member who could create/edit leads and download invoices,
      // but not delete leads or edit phone numbers.
      const legacyStored = {
        canCreateLeads: true,
        canEditLeads: true,
        canDeleteLeads: false,
        canDownloadInvoice: true,
        canEditMobileNumber: false,
      };
      const perms = normalizePermissions(legacyStored, 'TEAM_MEMBER');
      expect(perms.leads.create).toBe(true);
      expect(perms.leads.update).toBe(true);
      expect(perms.leads.delete).toBe(false);
      expect(perms.invoices.download).toBe(true);
      expect(perms.invoices.email).toBe(true);
      expect(perms.bookings.editPhone).toBe(false);
    });
  });

  it('every module in TEAM_MEMBER_DEFAULTS has a boolean for every declared action', () => {
    for (const [moduleKey, actions] of Object.entries(MODULES)) {
      for (const action of actions) {
        expect(typeof TEAM_MEMBER_DEFAULTS[moduleKey][action]).toBe('boolean');
      }
    }
  });
});

describe('sanitizePermissions', () => {
  it('returns an empty object for null/undefined/non-object input', () => {
    expect(sanitizePermissions(null)).toEqual({});
    expect(sanitizePermissions(undefined)).toEqual({});
    expect(sanitizePermissions('not-an-object')).toEqual({});
  });

  it('keeps only recognized module/action keys, coerced to booleans', () => {
    const dirty = {
      leads: { create: true, update: 'yes', notAnAction: true },
      notAModule: { create: true },
      hotels: { delete: 0 },
    };
    const clean = sanitizePermissions(dirty);
    expect(clean).toEqual({
      leads: { create: true, update: true },
      hotels: { delete: false },
    });
    expect(clean.notAModule).toBeUndefined();
    expect(clean.leads.notAnAction).toBeUndefined();
  });

  it('is safe against prototype-pollution style payloads', () => {
    const malicious = JSON.parse('{"__proto__": {"polluted": true}, "leads": {"create": true}}');
    const clean = sanitizePermissions(malicious);
    expect(clean.leads.create).toBe(true);
    expect({}.polluted).toBeUndefined();
  });
});

describe('shouldScopeToSelf', () => {
  it('never scopes an ADMIN, regardless of their permissions object', () => {
    expect(shouldScopeToSelf({ role: 'ADMIN', permissions: {} }, 'leads')).toBe(false);
    expect(shouldScopeToSelf({ role: 'ADMIN', permissions: { leads: { viewAll: false } } }, 'leads')).toBe(false);
  });

  it('scopes a TEAM_MEMBER to self when viewAll is false or missing', () => {
    expect(shouldScopeToSelf({ role: 'TEAM_MEMBER', permissions: { leads: { viewAll: false } } }, 'leads')).toBe(true);
    expect(shouldScopeToSelf({ role: 'TEAM_MEMBER', permissions: {} }, 'leads')).toBe(true);
    expect(shouldScopeToSelf({ role: 'TEAM_MEMBER', permissions: { leads: {} } }, 'leads')).toBe(true);
  });

  it('does not scope a TEAM_MEMBER once viewAll is granted', () => {
    expect(shouldScopeToSelf({ role: 'TEAM_MEMBER', permissions: { leads: { viewAll: true } } }, 'leads')).toBe(false);
  });

  it('checks viewAll per-module independently', () => {
    const user = { role: 'TEAM_MEMBER', permissions: { leads: { viewAll: true }, bookings: { viewAll: false } } };
    expect(shouldScopeToSelf(user, 'leads')).toBe(false);
    expect(shouldScopeToSelf(user, 'bookings')).toBe(true);
  });
});
