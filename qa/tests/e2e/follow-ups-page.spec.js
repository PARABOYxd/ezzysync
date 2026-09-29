import { test, expect, unique, uniquePhone, apiJson } from '../support/fixtures.js';
import { createLead } from '../support/seed.js';

/**
 * The Follow-ups page is the agent's to-do list, so the due label has to be
 * right: it used to say "Today" for every task that was not overdue, however
 * far away. And on a phone the Done button used to sit off-screen at the end
 * of a wide table.
 */
test.describe.configure({ mode: 'serial' });

const localDay = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

test.describe('Follow-ups page', () => {
  const cases = [
    { offset: -2, label: 'Overdue 2 days' },
    { offset: 0, label: 'Today' },
    { offset: 1, label: 'Tomorrow' },
    { offset: 5, label: 'In 5 days' },
  ].map((c) => ({ ...c, name: unique(`QA Due ${c.offset}`), note: unique(`QA task ${c.offset}`) }));

  test.beforeAll(async ({ api }) => {
    for (const c of cases) {
      const lead = await createLead(api, { customerName: c.name, phone: uniquePhone(), interest: 'QA trip' });
      await apiJson(await api.post(`leads/${lead.leadId}/follow-ups`, {
        data: { note: c.note, activityType: 'call', nextFollowUpDate: localDay(c.offset) },
      }), 201);
    }
  });

  test('each task is labelled by how far away it really is', async ({ page }) => {
    await page.goto('/follow-ups');
    for (const c of cases) {
      const row = page.locator('tbody tr', { hasText: c.note });
      await expect(row, c.name).toBeVisible();
      await expect(row.getByText(new RegExp(`^${c.label} ·`))).toBeVisible();
    }
    // Only the task due today is called "Today".
    await expect(page.locator('tbody tr', { hasText: cases[3].note })).not.toContainText('Today');
  });

  test('on a phone every task is a card with Done on screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/follow-ups');
    const card = page.locator('div.p-4', { hasText: cases[1].note });
    await expect(card).toBeVisible();
    const done = card.getByRole('button', { name: 'Done' });
    await expect(done).toBeInViewport();
    const box = await done.boundingBox();
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});
