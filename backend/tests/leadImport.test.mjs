import { describe, it, expect, beforeEach } from 'vitest';
import { appRequire, helpers } from './app.mjs';

const leadImportService = appRequire('../services/leadImportService');
const leadService = appRequire('../services/leadService');
const leadRepository = appRequire('../repositories/leadRepository');
const { query } = appRequire('../config/db');
const { createTenant, resetTenantData } = helpers;

/** A sheet as the import receives it after parsing: a header row plus body rows. */
const SHEET_COLUMNS = ['Client Name', 'Mobile No.', 'Email ID', 'Destination', 'Travel Date', 'Pax', 'Remarks'];

function sheetRow({ name = 'Rohit Sharma', phone = '9876543210', email = 'rohit@example.com', trip = 'Kashmir', date = '15/11/2026', pax = '4', notes = 'Wants houseboat' } = {}) {
  return [name, phone, email, trip, date, pax, notes];
}

const MAPPING = {
  customerName: 0, phone: 1, email: 2, interest: 3, departureDate: 4, travelers: 5, notes: 6,
};

describe('Importing leads from a spreadsheet', () => {
  let tenant;

  beforeEach(async () => {
    await resetTenantData();
    tenant = await createTenant();
  });

  describe('reading the file', () => {
    it('reads a CSV with quoted fields, embedded commas and newlines', () => {
      const csv = 'Name,Phone,Notes\r\n"Sharma, Rohit",9876543210,"Line one\nLine two"\r\n';
      const rows = leadImportService.parseCsv(csv);

      expect(rows[0]).toEqual(['Name', 'Phone', 'Notes']);
      expect(rows[1]).toEqual(['Sharma, Rohit', '9876543210', 'Line one\nLine two']);
    });

    it('keeps an escaped quote inside a field', () => {
      const rows = leadImportService.parseCsv('Name\n"He said ""yes"""');
      expect(rows[1][0]).toBe('He said "yes"');
    });

    it('parses a real .xlsx and suggests a mapping from its headers', async () => {
      const buffer = await leadImportService.buildTemplate();
      const parsed = await leadImportService.parseUpload(Buffer.from(buffer), 'template.xlsx');

      expect(parsed.totalRows).toBe(2); // the template carries two example leads
      expect(parsed.mapping.customerName).toBe(0);
      expect(parsed.mapping.phone).toBe(1);
      expect(parsed.rows[0][0]).toBe('Rohit Sharma');
    });

    it('rejects a file with nothing under the header', async () => {
      await expect(leadImportService.parseUpload(Buffer.from('Name,Phone\n'), 'x.csv'))
        .rejects.toThrow(/header row and at least one lead/);
    });
  });

  describe('what the screen is told about each field', () => {
    it('gives every field a hint, two examples and the headings it recognises', () => {
      for (const field of leadImportService.PUBLIC_FIELDS) {
        expect(field.hint, field.key).toBeTruthy();
        expect(field.headings.length, field.key).toBeGreaterThan(0);
        expect(field.examples, field.key).toHaveLength(2);
      }
    });

    it('never leaks the alias list the matching uses internally', () => {
      expect(leadImportService.PUBLIC_FIELDS[0].aliases).toBeUndefined();
    });

    it('offers headings that its own matching actually recognises', () => {
      const headings = leadImportService.IMPORT_FIELDS.map((f) => f.headings[0]);
      const mapping = leadImportService.suggestMapping(headings);

      leadImportService.IMPORT_FIELDS.forEach((field, i) => {
        expect(mapping[field.key], `${field.key} via "${headings[i]}"`).toBe(i);
      });
    });
  });

  describe('matching columns to fields', () => {
    it('recognises the names an agency actually uses', () => {
      const mapping = leadImportService.suggestMapping(SHEET_COLUMNS);

      expect(mapping.customerName).toBe(0);
      expect(mapping.phone).toBe(1);
      expect(mapping.email).toBe(2);
      expect(mapping.interest).toBe(3);
      expect(mapping.departureDate).toBe(4);
      expect(mapping.travelers).toBe(5);
      expect(mapping.notes).toBe(6);
    });

    it('never points two fields at the same column', () => {
      const mapping = leadImportService.suggestMapping(['Contact Name', 'Contact Number']);
      expect(mapping.customerName).not.toBe(mapping.phone);
    });
  });

  describe('reading dates the way an Indian sheet writes them', () => {
    it('reads a slashed date as day-first', () => {
      expect(leadImportService.normalizeDate('03/04/2026')).toBe('2026-04-03');
    });

    it('keeps an ISO date as it is', () => {
      expect(leadImportService.normalizeDate('2026-04-03')).toBe('2026-04-03');
    });

    it('drops something that is not a date instead of inventing one', () => {
      expect(leadImportService.normalizeDate('next month')).toBe('');
    });
  });

  describe('importing', () => {
    it('creates leads with the mapped fields, a customer and a timeline entry', async () => {
      const result = await leadImportService.importLeads(tenant.tenantId, {
        rows: [sheetRow()],
        mapping: MAPPING,
      }, 'agent@test.com');

      expect(result.imported).toBe(1);

      const [lead] = result.leads;
      expect(lead.customerName).toBe('Rohit Sharma');
      expect(lead.phone).toBe('9876543210');
      expect(lead.email).toBe('rohit@example.com');
      expect(lead.interest).toBe('Kashmir');
      expect(lead.departureDate).toBe('2026-11-15');
      expect(lead.travelers).toBe(4);
      expect(lead.source).toBe('Excel Import');
      expect(lead.stage).toBe('New');
      expect(lead.customerId).toBeTruthy();

      const timeline = await leadService.getFollowUps(tenant.tenantId, lead.leadId);
      expect(timeline).toHaveLength(1);
      expect(timeline[0].note).toMatch(/imported from a spreadsheet/i);
    });

    it('skips a row with no usable phone number and says which row', async () => {
      const result = await leadImportService.importLeads(tenant.tenantId, {
        rows: [sheetRow(), sheetRow({ phone: '' }), sheetRow({ name: 'Short', phone: '12345' })],
        mapping: MAPPING,
      }, 'agent@test.com');

      expect(result.imported).toBe(1);
      expect(result.skippedInvalid).toBe(2);
      expect(result.issues.map((i) => i.row)).toEqual([3, 4]);
    });

    it('treats the same number written differently as one customer', async () => {
      const result = await leadImportService.importLeads(tenant.tenantId, {
        rows: [
          sheetRow({ phone: '9876543210' }),
          sheetRow({ phone: '+91 98765 43210', name: 'Rohit S' }),
          sheetRow({ phone: '098765-43210', name: 'R Sharma' }),
        ],
        mapping: MAPPING,
      }, 'agent@test.com');

      expect(result.imported).toBe(1);
      expect(result.skippedDuplicates).toBe(2);
    });

    it('skips a phone that is already a lead in the CRM', async () => {
      await leadService.createLead(tenant.tenantId, { customerName: 'Existing', phone: '9876543210' }, 'agent@test.com');

      const result = await leadImportService.importLeads(tenant.tenantId, {
        rows: [sheetRow()],
        mapping: MAPPING,
      }, 'agent@test.com');

      expect(result.imported).toBe(0);
      expect(result.skippedDuplicates).toBe(1);
      expect(result.issues[0].reason).toMatch(/already exists/i);
    });

    it('recognises an existing lead whose phone is stored with country code and spaces', async () => {
      await leadService.createLead(tenant.tenantId, { customerName: 'Existing', phone: '+91 98765 43210' }, 'agent@test.com');

      const result = await leadImportService.importLeads(tenant.tenantId, {
        rows: [sheetRow({ phone: '9876543210' })],
        mapping: MAPPING,
      }, 'agent@test.com');

      expect(result.imported).toBe(0);
      expect(result.skippedDuplicates).toBe(1);
    });

    it('imports an existing phone anyway when the user chooses to', async () => {
      await leadService.createLead(tenant.tenantId, { customerName: 'Existing', phone: '9876543210' }, 'agent@test.com');

      const result = await leadImportService.importLeads(tenant.tenantId, {
        rows: [sheetRow()],
        mapping: MAPPING,
        duplicateAction: 'import',
      }, 'agent@test.com');

      expect(result.imported).toBe(1);
    });

    it('keeps the enquiry date from the sheet so an old lead does not look new', async () => {
      const result = await leadImportService.importLeads(tenant.tenantId, {
        rows: [[...sheetRow(), '10/02/2024']],
        mapping: { ...MAPPING, createdAt: 7 },
      }, 'agent@test.com');

      expect(new Date(result.leads[0].createdAt).toISOString().slice(0, 10)).toBe('2024-02-10');
    });

    it('applies the chosen stage and assignee to rows that do not carry their own', async () => {
      const result = await leadImportService.importLeads(tenant.tenantId, {
        rows: [sheetRow()],
        mapping: MAPPING,
        defaults: { stage: 'Contacted', assignedTo: 'Priya' },
      }, 'agent@test.com');

      expect(result.leads[0].stage).toBe('Contacted');
      expect(result.leads[0].assignedTo).toBe('Priya');
    });

    it('reads a stage the sheet spells its own way', async () => {
      const result = await leadImportService.importLeads(tenant.tenantId, {
        rows: [[...sheetRow(), 'WON ']],
        mapping: { ...MAPPING, stage: 7 },
      }, 'agent@test.com');

      expect(result.leads[0].stage).toBe('Won');
    });

    it('refuses to import without a phone column mapped', async () => {
      await expect(leadImportService.importLeads(tenant.tenantId, {
        rows: [sheetRow()],
        mapping: { customerName: 0 },
      }, 'agent@test.com')).rejects.toThrow(/Phone/);
    });

    it('writes a large file in chunks without losing rows', async () => {
      const rows = Array.from({ length: 450 }, (_, i) =>
        sheetRow({ name: `Traveler ${i}`, phone: String(9000000000 + i) }));

      const result = await leadImportService.importLeads(tenant.tenantId, { rows, mapping: MAPPING }, 'agent@test.com');

      expect(result.imported).toBe(450);
      const { rows: counted } = await query(
        `SELECT COUNT(*)::int AS c FROM leads WHERE tenant_id = $1`,
        [tenant.tenantId]
      );
      expect(counted[0].c).toBe(450);
    });

    it('does not import another tenant\'s leads into this one', async () => {
      const other = await createTenant();
      await leadImportService.importLeads(other.tenantId, { rows: [sheetRow()], mapping: MAPPING }, 'other@test.com');

      const keys = await leadRepository.listPhoneKeys(tenant.tenantId);
      expect(keys).toHaveLength(0);
    });
  });

  describe('the dry run the user sees before importing', () => {
    it('counts what would happen without writing anything', async () => {
      await leadService.createLead(tenant.tenantId, { customerName: 'Existing', phone: '9876543210' }, 'agent@test.com');

      const rows = [
        sheetRow({ phone: '9876543210' }),          // already in the CRM
        sheetRow({ phone: '9000000001' }),          // new
        sheetRow({ phone: '9000000001' }),          // repeat of the row above
        sheetRow({ phone: '' }),                    // unusable
      ];

      const analysis = await leadImportService.analyze(tenant.tenantId, { rows, mapping: MAPPING });

      expect(analysis).toMatchObject({
        valid: 1, duplicateExisting: 1, duplicateInFile: 1, invalid: 1,
      });

      const { rows: counted } = await query(
        `SELECT COUNT(*)::int AS c FROM leads WHERE tenant_id = $1`,
        [tenant.tenantId]
      );
      expect(counted[0].c).toBe(1); // only the lead created above
    });
  });
});
