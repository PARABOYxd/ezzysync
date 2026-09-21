import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// Provisions through the backend's own service layer, the same code path a
// real signup ends in. The UI signup needs an emailed OTP, so it can't be
// driven headlessly - everything after account creation goes through the
// real UI.
const here = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(here, '../../../backend');
const requireBackend = createRequire(path.join(backendDir, 'package.json'));

let services;
function backend() {
  if (!services) {
    services = {
      userService: requireBackend('./services/userService.js'),
      db: requireBackend('./config/db.js'),
    };
  }
  return services;
}

export async function provisionTenant(label = 'qa') {
  const { userService, db } = backend();
  const id = `${Date.now()}${crypto.randomInt(1000, 9999)}`;
  const account = {
    email: `qa-${label}-${id}@ezzysync.test`,
    password: `Qa!${crypto.randomBytes(9).toString('base64url')}`,
    name: `QA ${label}`,
    companyName: `QA Agency ${id}`,
  };
  const user = await userService.createUser(account);
  // Paid plan with time left, so usage caps and the trial paywall never
  // decide a test's outcome.
  await db.query(
    `UPDATE tenants SET plan_id = 'PRO', plan_expires_at = now() + interval '30 days' WHERE id = $1`,
    [user.tenantId]
  );
  return { ...account, tenantId: user.tenantId, userId: user.userId || user.id };
}

export async function destroyTenant(tenantId) {
  if (!tenantId || process.env.KEEP_QA_DATA === 'true') return;
  const { db } = backend();
  // Every table referencing tenants cascades, so this removes all QA data.
  await db.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
}

export async function closeBackend() {
  if (services) await services.db.pool.end().catch(() => {});
}

export async function sql(text, params) {
  return backend().db.query(text, params);
}
