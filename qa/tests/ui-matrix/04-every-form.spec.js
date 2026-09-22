/**
 * Every create form, every field, every bad value.
 *
 * The walk finds the "Add / New / Create" buttons on each page, opens each
 * form, lists every field in it, and for each field types one bad value -
 * blank, spaces, five thousand characters, a script tag, SQL, emoji, a
 * negative or absurd number - then presses the form's save button.
 *
 * What counts as passing is deliberately modest and universal: the app must
 * not throw, must not get a 500 back, must not go blank, and must not run the
 * script it was just handed. Whether it shows a validation message or saves
 * the record is the form's business; crashing is never acceptable.
 *
 * Afterwards the page's list is reloaded, because stored script injection
 * only fires when a saved value is rendered.
 */
import { test, expect, contextFor, VIEWPORTS } from './lib/world.js';
import { APP_ROUTES, resolveRoute, isDangerous, FORM_VALUES } from './lib/inventory.js';
import { attachMonitor, settle, closeOverlays, overlayOpen } from './lib/monitor.js';
import { useCases, assertHealthy } from './lib/uc.js';
import { API_URL } from '../support/fixtures.js';

test.describe.configure({ mode: 'parallel' });

const CREATE_BUTTON = /^\s*(\+\s*)?(add|new|create|log|record)\b/i;
const SUBMIT_BUTTON = /^(save|create|add|submit|update|log|record|confirm)\b/i;

/** The create buttons on this page, by name. */
async function createButtons(page) {
  const names = await page.locator('main button:visible').evaluateAll((els) =>
    els.map((el) => (el.getAttribute('aria-label') || el.getAttribute('title') || el.innerText || '').trim().replace(/\s+/g, ' ')));
  return [...new Set(names.filter((n) => n && n.length < 40))];
}

/** The newest open overlay: a role=dialog drawer, or the shared fixed Modal. */
function overlay(page) {
  return page.locator('[role="dialog"], div.fixed.inset-0.z-50').last();
}

/** Fields in the open form, as stable handles: the n-th visible field. */
async function formFields(form) {
  return form.locator('input:visible, textarea:visible, select:visible').evaluateAll((els) =>
    els.map((el, i) => {
      const id = el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      const label = (id?.innerText || el.closest('label')?.innerText || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.name || `field ${i}`).trim().replace(/\s+/g, ' ').slice(0, 40);
      return { i, label, tag: el.tagName.toLowerCase(), type: (el.getAttribute('type') || 'text').toLowerCase() };
    }));
}

async function openForm(page, target, buttonName) {
  await closeOverlays(page);
  if (new URL(page.url()).pathname !== new URL(target, page.url()).pathname) {
    await page.goto(target);
    await settle(page, 300);
  }
  const btn = page.locator('main button:visible').filter({ hasText: buttonName }).first();
  if (!(await btn.count())) return null;
  await btn.click({ timeout: 3000 });
  await settle(page, 300);
  if (!(await overlayOpen(page))) return null;
  return overlay(page);
}

async function submit(form) {
  const buttons = form.locator('button:visible');
  const names = await buttons.evaluateAll((els) => els.map((el) => ({ name: (el.innerText || '').trim(), type: el.getAttribute('type') })));
  let idx = names.findIndex((b) => b.type === 'submit' && !/cancel|close/i.test(b.name));
  if (idx < 0) idx = names.findIndex((b) => SUBMIT_BUTTON.test(b.name));
  if (idx < 0) return false;
  await buttons.nth(idx).click({ timeout: 3000 });
  return true;
}

/**
 * The bad values that make sense for each kind of field. A date input will
 * not accept "<script>", and typing five thousand characters into a number
 * box is the same case as typing letters - so each type gets its own list and
 * no case is a duplicate of another.
 */
function valuesFor(field) {
  if (field.tag === 'select') return [{ label: 'first option', value: null }, { label: 'last option', value: 'LAST' }];
  if (field.type === 'date') return [{ label: 'empty', value: '' }, { label: 'year 1900', value: '1900-01-01' }, { label: 'year 9999', value: '9999-12-31' }];
  if (field.type === 'datetime-local') return [{ label: 'empty', value: '' }, { label: 'year 1900', value: '1900-01-01T00:00' }, { label: 'year 9999', value: '9999-12-31T23:59' }];
  if (['time', 'month', 'week'].includes(field.type)) return [{ label: 'empty', value: '' }];
  if (field.type === 'number') {
    return [
      { label: 'empty', value: '' }, { label: 'zero', value: '0' }, { label: 'negative', value: '-5000' },
      { label: 'decimal', value: '12.75' }, { label: 'huge', value: '999999999999999999999' },
    ];
  }
  return FORM_VALUES;
}

const SKIP_FIELD_TYPES = new Set(['file', 'hidden', 'checkbox', 'radio', 'color', 'range', 'submit', 'button']);

for (const route of APP_ROUTES.filter((r) => !r.param)) {
  test(`every form · ${route.name}`, async ({ browser, world, baseURL }) => {
    test.setTimeout(30 * 60_000);
    const target = resolveRoute(route, world.data);
    const { uc, finish } = useCases();
    const context = await contextFor(browser, world, 'admin', VIEWPORTS.desktop, baseURL);
    const page = await context.newPage();
    const monitor = attachMonitor(page, API_URL);

    await page.goto(target);
    await settle(page, 600);

    const forms = (await createButtons(page)).filter((n) => CREATE_BUTTON.test(n) && !isDangerous(n));
    test.skip(forms.length === 0, `${route.name} has no create form`);

    for (const buttonName of forms) {
      const where = `${route.name} → "${buttonName}"`;
      const first = await openForm(page, target, buttonName);
      if (!first) continue;
      const fields = (await formFields(first)).filter((f) => !SKIP_FIELD_TYPES.has(f.type));

      await uc(`${where}: form opens without breaking`, () => assertHealthy(page, monitor));

      for (const field of fields) {
        const values = valuesFor(field);

        for (const v of values) {
          const form = await openForm(page, target, buttonName);
          if (!form) break;
          const input = form.locator('input:visible, textarea:visible, select:visible').nth(field.i);
          if (!(await input.count())) break;

          await uc(`${where}: "${field.label}" = ${v.label}, then save`, async () => {
            monitor.mark();
            if (field.tag === 'select') {
              const options = await input.locator('option').evaluateAll((os) => os.map((o) => o.value));
              if (options.length) await input.selectOption(v.value === 'LAST' ? options[options.length - 1] : options[0]);
            } else {
              await input.fill(v.value, { timeout: 2000 });
            }
            await submit(form);
            await settle(page, 400);
            await assertHealthy(page, monitor);
          });
        }
      }

      await closeOverlays(page);
    }

    // Anything saved above is now in a list. Rendering it is where stored
    // script injection would fire.
    await uc(`${route.name}: the list renders every value saved above without running it`, async () => {
      monitor.mark();
      await page.goto(target);
      await settle(page, 800);
      await assertHealthy(page, monitor);
    });

    await context.close();
    finish();
  });
}
