const { query } = require('../config/db');

async function getStats() {
  const [tenantsRes, bookingsRes, leadsRes] = await Promise.all([
    query(`
      SELECT
        COUNT(*) AS total_tenants,
        COUNT(*) FILTER (
          WHERE is_suspended = FALSE 
            AND is_paused = FALSE 
            AND plan_id IN ('SOLO', 'PRO', 'PRO_ACTIVE') 
            AND (plan_expires_at IS NULL OR plan_expires_at > NOW())
        ) AS active_paid,
        COUNT(*) FILTER (
          WHERE is_suspended = FALSE 
            AND is_paused = FALSE 
            AND (plan_id IS NULL OR plan_id IN ('FREE', 'TRIAL')) 
            AND (
              (plan_expires_at IS NOT NULL AND plan_expires_at > NOW())
              OR (plan_expires_at IS NULL AND (NOW() - created_at) < ((30 + COALESCE(trial_extended_days, 0)) * INTERVAL '1 day'))
            )
        ) AS trialing,
        COUNT(*) FILTER (
          WHERE is_suspended = FALSE 
            AND is_paused = FALSE
            AND (
              (plan_expires_at IS NOT NULL AND plan_expires_at <= NOW())
              OR (plan_expires_at IS NULL AND (
                (plan_id IN ('SOLO', 'PRO', 'PRO_ACTIVE') AND plan_expires_at <= NOW())
                OR ((plan_id IS NULL OR plan_id IN ('FREE', 'TRIAL')) AND (NOW() - created_at) >= ((30 + COALESCE(trial_extended_days, 0)) * INTERVAL '1 day'))
              ))
            )
        ) AS expired,
        COUNT(*) FILTER (WHERE is_suspended = TRUE) AS suspended,
        COUNT(*) FILTER (WHERE is_paused = TRUE) AS paused
      FROM tenants
      WHERE LOWER(email) NOT IN ('admin@gmail.com', 'admin@ezzysync.com');
    `),
    query(`
      SELECT 
        COUNT(*) AS total_bookings,
        COALESCE(SUM(total_amount), 0) AS total_revenue
      FROM bookings 
      WHERE deleted = FALSE;
    `),
    query(`
      SELECT COUNT(*) AS total_leads 
      FROM leads 
      WHERE deleted = FALSE;
    `),
  ]);

  const t = tenantsRes.rows[0] || {};
  const b = bookingsRes.rows[0] || {};
  const l = leadsRes.rows[0] || {};

  return {
    totalTenants: Number(t.total_tenants || 0),
    activePaidTenants: Number(t.active_paid || 0),
    trialTenants: Number(t.trialing || 0),
    expiredTenants: Number(t.expired || 0),
    suspendedTenants: Number(t.suspended || 0),
    pausedTenants: Number(t.paused || 0),
    totalBookings: Number(b.total_bookings || 0),
    totalRevenue: Number(b.total_revenue || 0),
    totalLeads: Number(l.total_leads || 0),
  };
}

async function listTenants({ search = '', status = 'all', page = 1, limit = 50 }) {
  const offset = (Number(page) - 1) * Number(limit);
  const params = [];
  let paramIdx = 1;

  let whereClauses = [
    `LOWER(t.email) NOT IN ('admin@gmail.com', 'admin@ezzysync.com')`
  ];

  if (search && search.trim()) {
    const s = `%${search.trim().toLowerCase()}%`;
    params.push(s);
    whereClauses.push(`(
      LOWER(t.name) LIKE $${paramIdx} 
      OR LOWER(t.email) LIKE $${paramIdx} 
      OR LOWER(t.company_name) LIKE $${paramIdx} 
      OR LOWER(COALESCE(t.phone, '')) LIKE $${paramIdx}
      OR LOWER(COALESCE(s.whatsapp_number, '')) LIKE $${paramIdx}
    )`);
    paramIdx++;
  }

  // Filter conditions
  if (status === 'paid') {
    whereClauses.push(`t.is_suspended = FALSE AND t.is_paused = FALSE AND t.plan_id IN ('SOLO', 'PRO', 'PRO_ACTIVE') AND (t.plan_expires_at IS NULL OR t.plan_expires_at > NOW())`);
  } else if (status === 'trial') {
    whereClauses.push(`t.is_suspended = FALSE AND t.is_paused = FALSE AND (t.plan_id IS NULL OR t.plan_id IN ('FREE', 'TRIAL')) AND ( (t.plan_expires_at IS NOT NULL AND t.plan_expires_at > NOW()) OR (t.plan_expires_at IS NULL AND (NOW() - t.created_at) < ((30 + COALESCE(t.trial_extended_days, 0)) * INTERVAL '1 day')) )`);
  } else if (status === 'expired') {
    whereClauses.push(`t.is_suspended = FALSE AND t.is_paused = FALSE AND ( (t.plan_expires_at IS NOT NULL AND t.plan_expires_at <= NOW()) OR (t.plan_expires_at IS NULL AND ( (t.plan_id IN ('SOLO', 'PRO', 'PRO_ACTIVE') AND t.plan_expires_at <= NOW()) OR ((t.plan_id IS NULL OR t.plan_id IN ('FREE', 'TRIAL')) AND (NOW() - t.created_at) >= ((30 + COALESCE(t.trial_extended_days, 0)) * INTERVAL '1 day')) )) )`);
  } else if (status === 'suspended') {
    whereClauses.push(`t.is_suspended = TRUE`);
  } else if (status === 'paused') {
    whereClauses.push(`t.is_paused = TRUE`);
  }

  const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(*) FROM tenants t LEFT JOIN settings s ON s.tenant_id = t.id ${whereSQL}`;
  const totalCountRes = await query(countQuery, params);
  const total = Number(totalCountRes.rows[0]?.count || 0);

  const dataQuery = `
    SELECT
      t.id,
      t.name,
      t.email,
      t.company_name,
      COALESCE(NULLIF(t.phone, ''), s.whatsapp_number, '') AS phone,
      t.plan_id,
      COALESCE(p.name, 'Free Trial') AS plan_name,
      t.plan_expires_at,
      t.created_at,
      COALESCE(t.is_suspended, FALSE) AS is_suspended,
      COALESCE(t.is_paused, FALSE) AS is_paused,
      COALESCE(t.trial_extended_days, 0) AS trial_extended_days,
      COALESCE(t.admin_notes, '') AS admin_notes,
      s.gst_number,
      s.address,
      ws.status AS whatsapp_status,
      ws.phone_number AS whatsapp_phone,
      gc.connected AS gmail_connected,
      (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) AS team_count,
      (SELECT COUNT(*) FROM bookings b WHERE b.tenant_id = t.id AND b.deleted = FALSE) AS bookings_count,
      (SELECT COUNT(*) FROM leads l WHERE l.tenant_id = t.id AND l.deleted = FALSE) AS leads_count,
      (SELECT COALESCE(SUM(b.total_amount), 0) FROM bookings b WHERE b.tenant_id = t.id AND b.deleted = FALSE) AS total_revenue
    FROM tenants t
    LEFT JOIN plans p ON p.id = t.plan_id
    LEFT JOIN settings s ON s.tenant_id = t.id
    LEFT JOIN whatsapp_sessions ws ON ws.tenant_id = t.id
    LEFT JOIN gmail_connections gc ON gc.tenant_id = t.id
    ${whereSQL}
    ORDER BY t.created_at DESC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1};
  `;

  params.push(limit, offset);
  const { rows } = await query(dataQuery, params);

  // Compute calculated days_left and computed_status for each tenant
  const enrichedRows = rows.map((r) => {
    const isSuspended = r.is_suspended;
    const isPaused = r.is_paused;
    const isPaid = ['SOLO', 'PRO', 'PRO_ACTIVE'].includes(r.plan_id);

    let status = 'TRIAL';
    let daysLeft = 0;

    if (isSuspended) {
      status = 'SUSPENDED';
    } else if (isPaused) {
      status = 'PAUSED';
    } else if (r.plan_expires_at) {
      // If an explicit expiration date is set (by admin or billing), respect it for all plans
      const diffMs = new Date(r.plan_expires_at).getTime() - Date.now();
      daysLeft = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
      if (daysLeft > 0) {
        status = isPaid ? 'ACTIVE_PAID' : 'TRIAL';
      } else {
        status = 'EXPIRED';
      }
    } else if (isPaid) {
      status = 'ACTIVE_PAID';
      daysLeft = 30; // Lifetime/active without set expiry
    } else {
      // Fallback for default trials with no explicit expiration date
      const totalTrialDays = 30 + (Number(r.trial_extended_days) || 0);
      const createdMs = new Date(r.created_at).getTime();
      const trialEndMs = createdMs + totalTrialDays * 24 * 60 * 60 * 1000;
      const diffMs = trialEndMs - Date.now();
      daysLeft = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
      status = daysLeft > 0 ? 'TRIAL' : 'EXPIRED';
    }

    return {
      ...r,
      team_count: Number(r.team_count || 1),
      bookings_count: Number(r.bookings_count || 0),
      leads_count: Number(r.leads_count || 0),
      total_revenue: Number(r.total_revenue || 0),
      status,
      days_left: daysLeft,
    };
  });

  return {
    tenants: enrichedRows,
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / Number(limit)),
  };
}

async function getTenantDetails(tenantId) {
  const tenantRes = await query(`
    SELECT
      t.*,
      p.name AS plan_name,
      s.company_logo_url,
      s.gst_number,
      s.address,
      s.whatsapp_number,
      ws.status AS whatsapp_status,
      ws.phone_number AS whatsapp_phone,
      gc.connected AS gmail_connected,
      gc.google_email AS gmail_email
    FROM tenants t
    LEFT JOIN plans p ON p.id = t.plan_id
    LEFT JOIN settings s ON s.tenant_id = t.id
    LEFT JOIN whatsapp_sessions ws ON ws.tenant_id = t.id
    LEFT JOIN gmail_connections gc ON gc.tenant_id = t.id
    WHERE t.id = $1
  `, [tenantId]);

  if (!tenantRes.rows[0]) return null;
  const tenant = tenantRes.rows[0];

  const [teamRes, paymentsRes, metricsRes] = await Promise.all([
    query(`
      SELECT id, name, email, role, created_at 
      FROM users 
      WHERE tenant_id = $1 
      ORDER BY created_at ASC
    `, [tenantId]),
    query(`
      SELECT id, order_id, payment_id, plan_id, amount, currency, status, created_at 
      FROM payments 
      WHERE tenant_id = $1 
      ORDER BY created_at DESC 
      LIMIT 20
    `, [tenantId]),
    query(`
      SELECT
        (SELECT COUNT(*) FROM bookings WHERE tenant_id = $1 AND deleted = FALSE) AS total_bookings,
        (SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE tenant_id = $1 AND deleted = FALSE) AS total_revenue,
        (SELECT COUNT(*) FROM leads WHERE tenant_id = $1 AND deleted = FALSE) AS total_leads,
        (SELECT COUNT(*) FROM quotations WHERE tenant_id = $1) AS total_quotations
    `, [tenantId]),
  ]);

  return {
    ...tenant,
    team: teamRes.rows,
    payments: paymentsRes.rows,
    metrics: metricsRes.rows[0] || {},
  };
}

async function updateTenantPlan(tenantId, { planId, planExpiresAt, trialExtendedDays, isPaused }) {
  const fields = [];
  const params = [tenantId];
  let idx = 2;

  if (planId !== undefined) {
    fields.push(`plan_id = $${idx++}`);
    params.push(planId);
  }
  if (planExpiresAt !== undefined) {
    fields.push(`plan_expires_at = $${idx++}`);
    params.push(planExpiresAt);
  }
  if (trialExtendedDays !== undefined) {
    fields.push(`trial_extended_days = $${idx++}`);
    params.push(Number(trialExtendedDays));
  }
  if (isPaused !== undefined) {
    fields.push(`is_paused = $${idx++}`);
    params.push(Boolean(isPaused));
  }

  if (fields.length === 0) return null;

  const sql = `UPDATE tenants SET ${fields.join(', ')} WHERE id = $1 RETURNING *`;
  const { rows } = await query(sql, params);
  return rows[0];
}

async function updateTenantProfile(tenantId, { name, companyName, email, phone, adminNotes }) {
  const fields = [];
  const params = [tenantId];
  let idx = 2;

  if (name !== undefined) {
    fields.push(`name = $${idx++}`);
    params.push(name.trim());
  }
  if (companyName !== undefined) {
    fields.push(`company_name = $${idx++}`);
    params.push(companyName.trim());
  }
  if (email !== undefined) {
    fields.push(`email = $${idx++}`);
    params.push(email.trim().toLowerCase());
  }
  if (phone !== undefined) {
    fields.push(`phone = $${idx++}`);
    params.push(phone.trim());
  }
  if (adminNotes !== undefined) {
    fields.push(`admin_notes = $${idx++}`);
    params.push(adminNotes);
  }

  if (fields.length === 0) return null;

  const sql = `UPDATE tenants SET ${fields.join(', ')} WHERE id = $1 RETURNING *`;
  const { rows } = await query(sql, params);

  // Sync users table if name or email changed
  if (name !== undefined || email !== undefined) {
    await query(
      `UPDATE users SET name = COALESCE($2, name), email = COALESCE($3, email) WHERE tenant_id = $1 AND role = 'ADMIN'`,
      [tenantId, name || null, email ? email.toLowerCase() : null]
    );
  }

  return rows[0];
}

async function setTenantSuspended(tenantId, isSuspended) {
  const { rows } = await query(
    `UPDATE tenants SET is_suspended = $2 WHERE id = $1 RETURNING *`,
    [tenantId, Boolean(isSuspended)]
  );
  return rows[0];
}

async function getPrimaryAdminUser(tenantId) {
  const { rows } = await query(
    `SELECT u.*, t.company_name, t.plan_id 
     FROM users u 
     JOIN tenants t ON t.id = u.tenant_id 
     WHERE u.tenant_id = $1 AND u.role = 'ADMIN' 
     ORDER BY u.created_at ASC 
     LIMIT 1`,
    [tenantId]
  );
  return rows[0];
}

async function deleteTenant(tenantId) {
  const { rows } = await query(
    `DELETE FROM tenants WHERE id = $1 RETURNING id, name, company_name`,
    [tenantId]
  );
  return rows[0];
}

module.exports = {
  getStats,
  listTenants,
  getTenantDetails,
  updateTenantPlan,
  updateTenantProfile,
  setTenantSuspended,
  getPrimaryAdminUser,
  deleteTenant,
};
