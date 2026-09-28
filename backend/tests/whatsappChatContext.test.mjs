import { describe, it, expect, beforeEach } from 'vitest';
import { db, appRequire, helpers } from './app.mjs';

const { query } = db;
const repo = appRequire('../repositories/whatsappWebRepository');
const followUpRepository = appRequire('../repositories/followUpRepository');
const { createTenant } = helpers;

/**
 * The inbox's "Due" queue and overdue badges read the chat's next follow-up.
 * It has to be the next *open* task: leads.next_follow_up_date is not cleared
 * when a task is marked done, so reading it kept a finished call "overdue".
 */
describe('chat list: next follow-up', () => {
  let tenant;
  let chat;
  let leadUuid;

  beforeEach(async () => {
    tenant = await createTenant();
    const { rows } = await query(
      `INSERT INTO leads (tenant_id, lead_id, customer_name, phone, next_follow_up_date)
       VALUES ($1, $2, 'Due Person', '9876500041', now() - interval '1 day') RETURNING id`,
      [tenant.tenantId, `LD-TEST-${Date.now()}`]
    );
    leadUuid = rows[0].id;
    chat = await repo.createChat(tenant.tenantId, {
      phone: '9876500041', jid: 'due@s.whatsapp.net', customerName: 'Due Person',
      leadId: leadUuid, lastMessage: 'hi', aiEnabled: false,
    });
  });

  async function addTask(when, status = 'pending', note = 'Call back') {
    const { rows } = await query(
      `INSERT INTO follow_up_logs (tenant_id, lead_id, note, activity_type, next_follow_up_date, status)
       VALUES ($1, $2, $3, 'call', $4, $5) RETURNING id`,
      [tenant.tenantId, leadUuid, note, when, status]
    );
    return rows[0].id;
  }

  const listed = async () => (await repo.listChats(tenant.tenantId)).find((c) => c.id === chat.id);

  it('shows the earliest open follow-up', async () => {
    await addTask(new Date(Date.now() + 3 * 86400000));
    const soonest = new Date(Date.now() + 86400000);
    await addTask(soonest, 'pending', 'Send Goa quote');

    expect(new Date((await listed()).lead_next_follow_up_date).getTime()).toBe(soonest.getTime());
    const context = await repo.getChatWithContext(tenant.tenantId, chat.id);
    expect(context.next_follow_up_note).toBe('Send Goa quote');
  });

  it('clears once the task is marked done, even though the lead row still has a date', async () => {
    const id = await addTask(new Date(Date.now() - 86400000));
    expect((await listed()).lead_next_follow_up_date).not.toBeNull();

    await followUpRepository.markDone(tenant.tenantId, id);

    expect((await listed()).lead_next_follow_up_date).toBeNull();
  });

  it('ignores notes and finished tasks', async () => {
    await addTask(null, 'pending', 'Just a note');
    await addTask(new Date(), 'done');
    expect((await listed()).lead_next_follow_up_date).toBeNull();
  });
});
