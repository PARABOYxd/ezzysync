import { test, expect, expectToast, drawer, unique, uniquePhone, apiJson } from '../support/fixtures.js';
import { createLead } from '../support/seed.js';

test.describe.configure({ mode: 'serial' });

const leadRow = (page, name) => page.locator('tbody tr', { hasText: name });

async function openLeadsFilteredTo(page, text) {
  await page.goto(`/leads?search=${encodeURIComponent(text)}`);
  await expect(leadRow(page, text)).toBeVisible();
}

test.describe('Leads workflow', () => {
  const name = unique('QA Lead');
  const phone = uniquePhone();
  let leadId;

  test('create form refuses a lead without a phone number, without calling the API', async ({ page }) => {
    let posts = 0;
    page.on('request', (r) => { if (r.method() === 'POST' && /\/api\/leads$/.test(r.url())) posts += 1; });

    await page.goto('/leads');
    await page.getByRole('button', { name: 'Add Lead' }).click();
    const form = drawer(page, 'Create New Lead');
    await form.getByLabel('Customer Name').fill('No Phone Person');
    await form.getByRole('button', { name: 'Create Lead' }).click();

    await expect(form.getByText('A valid phone number is required.')).toBeVisible();
    await expectToast(page, 'Please fix validation errors before saving.');
    expect(posts).toBe(0);
  });

  test('creates a lead through the form and it is stored exactly as typed', async ({ page, api }) => {
    await page.goto('/leads');
    await page.getByRole('button', { name: 'Add Lead' }).click();
    const form = drawer(page, 'Create New Lead');
    await form.getByLabel('Customer Name').fill(name);
    await form.getByLabel('Contact Number').fill(phone);
    await form.getByLabel('General Notes').fill('Wants a beach trip in December');

    const created = page.waitForResponse((r) => r.request().method() === 'POST' && /\/api\/leads$/.test(r.url()));
    await form.getByRole('button', { name: 'Create Lead' }).click();
    const body = await apiJson(await created, 201);
    leadId = body.lead.leadId;

    await expectToast(page, 'Lead created.');
    await expect(form).toBeHidden();
    await openLeadsFilteredTo(page, name);

    const { lead } = await apiJson(await api.get(`leads/${leadId}`), 200);
    expect(lead.customerName).toBe(name);
    expect(lead.phone).toContain(phone);
    expect(lead.stage).toBe('New');
    expect(lead.notes).toBe('Wants a beach trip in December');
  });

  test('a second lead for the same phone is flagged as a duplicate enquiry', async ({ page, api }) => {
    await page.goto('/leads');
    await page.getByRole('button', { name: 'Add Lead' }).click();
    const form = drawer(page, 'Create New Lead');
    await form.getByLabel('Customer Name').fill(`${name} again`);
    await form.getByLabel('Contact Number').fill(phone);

    const res = page.waitForResponse((r) => r.request().method() === 'POST' && /\/api\/leads$/.test(r.url()));
    await form.getByRole('button', { name: 'Create Lead' }).click();
    expect((await res).status()).toBe(409);
    await expectToast(page, 'An active enquiry already exists for this contact.');
    await expect(page.getByRole('dialog', { name: 'Active Enquiry Found' }).or(page.getByText('Active Enquiry Found'))).toBeVisible();

    const { leads } = await apiJson(await api.get('leads', { params: { search: phone } }), 200);
    expect(leads).toHaveLength(1);
  });

  test('editing the lead updates its details and pipeline stage', async ({ page, api }) => {
    await openLeadsFilteredTo(page, name);
    await leadRow(page, name).getByTitle('Edit Lead').click();
    const form = drawer(page, 'Edit Lead');
    await expect(form.getByLabel('Customer Name')).toHaveValue(name);

    await form.getByLabel('No. of Travelers').fill('4');
    await form.getByLabel('Pipeline Stage').selectOption('Contacted');
    const saved = page.waitForResponse((r) => r.request().method() === 'PUT' && r.url().includes(`/leads/${leadId}`));
    await form.getByRole('button', { name: 'Save Changes' }).click();
    await apiJson(await saved, 200);
    await expectToast(page, 'Lead updated.');

    const { lead } = await apiJson(await api.get(`leads/${leadId}`), 200);
    expect(lead.stage).toBe('Contacted');
    expect(Number(lead.travelers)).toBe(4);
    await expect(leadRow(page, name)).toContainText('Contacted');
  });

  test('a timeline entry is logged, shown in the drawer, and persisted', async ({ page, api }) => {
    const note = `Called customer - prefers Goa ${Date.now()}`;
    await openLeadsFilteredTo(page, name);
    await leadRow(page, name).getByTitle('View Lead').click();
    const view = page.getByRole('dialog').filter({ hasText: 'Timeline & Activity Logs' });
    await expect(view).toBeVisible();

    await view.getByRole('button', { name: 'Call', exact: true }).click();
    await view.getByPlaceholder('Type call summary').fill(note);
    const logged = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes(`/leads/${leadId}/follow-ups`));
    await view.getByRole('button', { name: 'Add Log Entry' }).click();
    await apiJson(await logged, 201);

    await expectToast(page, 'Activity logged successfully.');
    await expect(view.getByText(note)).toBeVisible();

    const { followUps } = await apiJson(await api.get(`leads/${leadId}/follow-ups`), 200);
    const entry = followUps.find((f) => f.note === note);
    expect(entry).toBeTruthy();
    expect(entry.activity_type || entry.activityType).toBe('call');
  });

  test('an empty timeline note cannot be submitted', async ({ page }) => {
    await openLeadsFilteredTo(page, name);
    await leadRow(page, name).getByTitle('View Lead').click();
    const view = page.getByRole('dialog').filter({ hasText: 'Timeline & Activity Logs' });
    let posts = 0;
    page.on('request', (r) => { if (r.method() === 'POST' && r.url().includes('/follow-ups')) posts += 1; });
    await expect(view.getByPlaceholder('Type call summary')).toHaveAttribute('aria-required', 'true');
    await view.getByPlaceholder('Type call summary').fill('   ');
    await view.getByRole('button', { name: 'Add Log Entry' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Activity logged successfully.' })).toHaveCount(0);
    expect(posts).toBe(0);
  });

  test('search finds the lead by phone and hides unrelated ones', async ({ page, api }) => {
    const other = await createLead(api, { customerName: unique('QA Other') });
    await page.goto(`/leads?search=${phone}`);
    await expect(leadRow(page, name)).toBeVisible();
    await expect(leadRow(page, other.customerName)).toHaveCount(0);
  });
});
