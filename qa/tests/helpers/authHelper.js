import crypto from 'crypto';

export function createTestToken() {
  const secret = process.env.JWT_SECRET || 'replace_with_a_long_random_string';
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = {
    userId: '5e202d94-feea-4c18-ad3e-b2fad79d6c13',
    tenantId: '5c651a32-cc66-4222-a60c-f7ff6fecc7c8',
    email: process.env.TEST_USERNAME || 'qa_tester@test.local',
    name: 'QA Autonomous Agent',
    role: 'ADMIN',
    exp: Math.floor(Date.now() / 1000) + 86400 * 7,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export async function setupAuthenticatedSession(page) {
  const token = createTestToken();
  const user = {
    userId: '5e202d94-feea-4c18-ad3e-b2fad79d6c13',
    tenantId: '5c651a32-cc66-4222-a60c-f7ff6fecc7c8',
    email: process.env.TEST_USERNAME || 'qa_tester@test.local',
    name: 'QA Autonomous Agent',
    role: 'ADMIN',
    companyName: 'RishabCompany',
    planId: 'PRO',
  };

  await page.addInitScript(({ t, u }) => {
    localStorage.setItem('hf_token', t);
    localStorage.setItem('hf_user', JSON.stringify(u));
    localStorage.setItem('journeyflow_tour_status', 'completed');
    localStorage.setItem('journeyflow_tour_done', 'true');
  }, { t: token, u: user });
}
