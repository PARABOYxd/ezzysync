const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('./db');
const { requireSuperAdmin } = require('./auth');
const { sendCredentialsEmail } = require('./mailer');

const router = express.Router();
const MAIN_CRM_JWT_SECRET = process.env.MAIN_CRM_JWT_SECRET || 'replace_with_a_long_random_string';

// -------------------------------------------------------------
// 1. STATS OVERVIEW
// -------------------------------------------------------------
router.get('/stats', requireSuperAdmin, async (req, res) => {
  try {
    const [tenantsRes, bookingsRes, requestsRes] = await Promise.all([
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
        SELECT
          COUNT(*) AS total_requests,
          COUNT(*) FILTER (WHERE status = 'pending') AS pending_requests,
          COUNT(*) FILTER (WHERE status = 'verified') AS verified_requests,
          COUNT(*) FILTER (WHERE status = 'approved') AS approved_requests,
          COUNT(*) FILTER (WHERE status = 'rejected') AS rejected_requests
        FROM walkthrough_requests;
      `),
    ]);

    const t = tenantsRes.rows[0] || {};
    const b = bookingsRes.rows[0] || {};
    const r = requestsRes.rows[0] || {};

    return res.json({
      stats: {
        totalAgencies: Number(t.total_tenants || 0),
        activePaid: Number(t.active_paid || 0),
        onTrial: Number(t.trialing || 0),
        expired: Number(t.expired || 0),
        paused: Number(t.paused || 0),
        suspended: Number(t.suspended || 0),
        totalBookings: Number(b.total_bookings || 0),
        totalRevenue: Number(b.total_revenue || 0),
        totalRequests: Number(r.total_requests || 0),
        pendingRequests: Number(r.pending_requests || 0),
        verifiedRequests: Number(r.verified_requests || 0),
        approvedRequests: Number(r.approved_requests || 0),
        rejectedRequests: Number(r.rejected_requests || 0),
      },
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    return res.status(500).json({ error: 'Failed to fetch platform metrics' });
  }
});

// -------------------------------------------------------------
// 2. ACCESS REQUESTS (LEADS REQUIRING APPROVAL)
// -------------------------------------------------------------

// List access requests with search and status filters
router.get('/requests', requireSuperAdmin, async (req, res) => {
  try {
    const { status = 'all', search = '', limit = 50, page = 1 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const params = [];
    let idx = 1;
    let whereClauses = [];

    if (status !== 'all') {
      whereClauses.push(`status = $${idx++}`);
      params.push(status.toLowerCase());
    }

    if (search && search.trim()) {
      const s = `%${search.trim().toLowerCase()}%`;
      whereClauses.push(`(
        LOWER(name) LIKE $${idx}
        OR LOWER(agency_name) LIKE $${idx}
        OR LOWER(email) LIKE $${idx}
        OR LOWER(COALESCE(phone, '')) LIKE $${idx}
      )`);
      params.push(s);
      idx++;
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await query(`SELECT COUNT(*) FROM walkthrough_requests ${whereSQL}`, params);
    const total = Number(countRes.rows[0]?.count || 0);

    const listQuery = `
      SELECT
        wr.*,
        CASE 
          WHEN wr.status = 'approved' THEN FALSE
          ELSE EXISTS(
            SELECT 1 FROM tenants t 
            WHERE LOWER(t.email) = LOWER(wr.email) 
              AND (wr.created_tenant_id IS NULL OR t.id != wr.created_tenant_id)
          )
        END AS already_registered_email,
        CASE 
          WHEN wr.status = 'approved' THEN FALSE
          ELSE EXISTS(
            SELECT 1 FROM tenants t 
            WHERE wr.phone IS NOT NULL AND wr.phone != '' 
              AND t.phone = wr.phone 
              AND (wr.created_tenant_id IS NULL OR t.id != wr.created_tenant_id)
          )
        END AS already_registered_phone
      FROM walkthrough_requests wr
      ${whereSQL}
      ORDER BY wr.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1};
    `;
    params.push(Number(limit), offset);

    const { rows } = await query(listQuery, params);

    return res.json({
      requests: rows,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    console.error('Error listing requests:', err);
    return res.status(500).json({ error: 'Failed to fetch access requests' });
  }
});

// Trigger OTP to lead (Email or WhatsApp)
router.post('/requests/:id/send-otp', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const reqRes = await query('SELECT * FROM walkthrough_requests WHERE id = $1', [id]);
    const lead = reqRes.rows[0];
    if (!lead) return res.status(404).json({ error: 'Request not found' });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await query(`
      UPDATE walkthrough_requests
      SET verification_otp = $1, verification_otp_expires_at = $2
      WHERE id = $3
    `, [otp, expiresAt, id]);

    // In dev mode, log to terminal
    console.log(`\n========================================\n🔑 [SUPER ADMIN OTP] Verification Code for ${lead.email} (${lead.phone || 'No phone'}): ${otp}\n========================================\n`);

    return res.json({
      message: `Verification code generated and sent to ${lead.email}`,
      otp, // returned for admin convenience in local testing
      expiresAt,
    });
  } catch (err) {
    console.error('Error sending lead OTP:', err);
    return res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Verify OTP
router.post('/requests/:id/verify-otp', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ error: 'OTP is required' });

    const reqRes = await query('SELECT * FROM walkthrough_requests WHERE id = $1', [id]);
    const lead = reqRes.rows[0];
    if (!lead) return res.status(404).json({ error: 'Request not found' });

    if (!lead.verification_otp || lead.verification_otp !== otp.trim()) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    if (new Date(lead.verification_otp_expires_at) < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    await query(`
      UPDATE walkthrough_requests
      SET status = 'verified', email_verified = TRUE
      WHERE id = $1
    `, [id]);

    return res.json({ message: 'Email OTP verified successfully' });
  } catch (err) {
    console.error('Error verifying lead OTP:', err);
    return res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// Update Verification Checklist / Business Details
router.patch('/requests/:id/verification', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      agency_name,
      email,
      phone,
      instagram_link,
      website_link,
      gst_number,
      visiting_card_url,
      city,
      state,
      travel_speciality,
      website_or_instagram,
      email_verified,
      whatsapp_verified,
      social_verified,
      visiting_card_verified,
      status,
      admin_notes,
    } = req.body;

    const fields = [];
    const params = [id];
    let idx = 2;

    if (name !== undefined) {
      fields.push(`name = $${idx++}`);
      params.push((name || '').trim());
    }
    if (agency_name !== undefined) {
      fields.push(`agency_name = $${idx++}`);
      params.push((agency_name || '').trim());
    }
    if (email !== undefined) {
      const cleanEmail = (email || '').trim().toLowerCase();
      if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      }
      fields.push(`email = $${idx++}`);
      params.push(cleanEmail);
    }
    if (phone !== undefined) {
      fields.push(`phone = $${idx++}`);
      params.push((phone || '').trim());
    }
    if (instagram_link !== undefined) {
      fields.push(`instagram_link = $${idx++}`);
      params.push((instagram_link || '').trim());
    }
    if (website_link !== undefined) {
      fields.push(`website_link = $${idx++}`);
      params.push((website_link || '').trim());
    }
    if (gst_number !== undefined) {
      fields.push(`gst_number = $${idx++}`);
      params.push((gst_number || '').trim().toUpperCase());
    }
    if (visiting_card_url !== undefined) {
      fields.push(`visiting_card_url = $${idx++}`);
      params.push(visiting_card_url || '');
    }
    if (city !== undefined) {
      fields.push(`city = $${idx++}`);
      params.push((city || '').trim());
    }
    if (state !== undefined) {
      fields.push(`state = $${idx++}`);
      params.push((state || '').trim());
    }
    if (travel_speciality !== undefined) {
      fields.push(`travel_speciality = $${idx++}`);
      params.push((travel_speciality || '').trim());
    }
    if (website_or_instagram !== undefined) {
      fields.push(`website_or_instagram = $${idx++}`);
      params.push((website_or_instagram || '').trim());
    } else if (instagram_link !== undefined || website_link !== undefined) {
      const fallbackLink = (instagram_link || '').trim() || (website_link || '').trim();
      if (fallbackLink) {
        fields.push(`website_or_instagram = $${idx++}`);
        params.push(fallbackLink);
      }
    }
    if (email_verified !== undefined) {
      fields.push(`email_verified = $${idx++}`);
      params.push(Boolean(email_verified));
    }
    if (whatsapp_verified !== undefined) {
      fields.push(`whatsapp_verified = $${idx++}`);
      params.push(Boolean(whatsapp_verified));
    }
    if (social_verified !== undefined) {
      fields.push(`social_verified = $${idx++}`);
      params.push(Boolean(social_verified));
    }
    if (visiting_card_verified !== undefined) {
      fields.push(`visiting_card_verified = $${idx++}`);
      params.push(Boolean(visiting_card_verified));
    }
    if (status !== undefined) {
      fields.push(`status = $${idx++}`);
      params.push(status.trim().toLowerCase());
    }
    if (admin_notes !== undefined) {
      fields.push(`admin_notes = $${idx++}`);
      params.push((admin_notes || '').trim());
    }

    if (fields.length > 0) {
      await query(`UPDATE walkthrough_requests SET ${fields.join(', ')} WHERE id = $1`, params);
    }

    const updatedRes = await query('SELECT * FROM walkthrough_requests WHERE id = $1', [id]);
    return res.json({ message: 'Verification checklist updated', request: updatedRes.rows[0] });
  } catch (err) {
    console.error('Error updating verification checklist:', err);
    return res.status(500).json({ error: err.message || 'Failed to update verification' });
  }
});

// Approve Request & Provision Tenant Account in CRM (Strictly Guarded)
router.post('/requests/:id/approve', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { planId = 'FREE', trialDays = 30, customPassword, adminNotes, overrideVerification } = req.body;

    const reqRes = await query('SELECT * FROM walkthrough_requests WHERE id = $1', [id]);
    const lead = reqRes.rows[0];
    if (!lead) return res.status(404).json({ error: 'Request not found' });

    if (lead.status === 'approved') {
      return res.status(400).json({ error: 'This request is already approved' });
    }

    // STRICT VERIFICATION CHECK: Agency must have at least one verified signal unless admin explicitly overrides
    const hasVerification = Boolean(
      lead.email_verified ||
      lead.whatsapp_verified ||
      lead.social_verified ||
      lead.visiting_card_verified ||
      lead.status === 'verified'
    );

    if (!hasVerification && !overrideVerification) {
      return res.status(400).json({
        error: 'Verification Incomplete: Please complete at least one verification step (Email OTP, WhatsApp Chat, Instagram/Website, or Visiting Card) before approving this agency.',
        requiresVerification: true,
      });
    }

    // Check if tenant already exists with this email
    const existingTenant = await query('SELECT id FROM tenants WHERE LOWER(email) = LOWER($1)', [lead.email]);
    if (existingTenant.rows.length > 0) {
      return res.status(400).json({ error: 'An agency with this email is already registered in CRM' });
    }

    // Temporary password (auto or custom)
    const rawPassword = customPassword && customPassword.trim() ? customPassword.trim() : `Ezzy@${Math.floor(1000 + Math.random() * 9000)}`;
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const bonusTrialDays = Number(trialDays) > 30 ? Number(trialDays) - 30 : 0;
    const notes = adminNotes || lead.admin_notes || 'Approved via EzzySync Master Admin';

    // 1. Create Tenant
    const tenantRes = await query(`
      INSERT INTO tenants (
        name, email, password_hash, company_name, phone, plan_id,
        is_suspended, is_paused, trial_extended_days, admin_notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, FALSE, FALSE, $7, $8)
      RETURNING *
    `, [
      lead.name,
      lead.email.toLowerCase().trim(),
      passwordHash,
      lead.agency_name,
      lead.phone || '',
      planId === 'TRIAL' ? 'FREE' : planId,
      bonusTrialDays,
      notes,
    ]);
    const tenant = tenantRes.rows[0];

    // 2. Ensure default settings row
    await query(`
      INSERT INTO settings (tenant_id, company_name, whatsapp_number)
      VALUES ($1, $2, $3)
      ON CONFLICT (tenant_id) DO NOTHING
    `, [tenant.id, lead.agency_name, lead.phone || '']);

    // 3. Create primary ADMIN User
    await query(`
      INSERT INTO users (tenant_id, email, password_hash, name, role, is_super_admin)
      VALUES ($1, $2, $3, $4, 'ADMIN', FALSE)
      ON CONFLICT (email) DO UPDATE SET tenant_id = EXCLUDED.tenant_id, password_hash = EXCLUDED.password_hash
    `, [
      tenant.id,
      lead.email.toLowerCase().trim(),
      passwordHash,
      lead.name,
    ]);

    // 4. Mark request approved
    await query(`
      UPDATE walkthrough_requests
      SET status = 'approved', approved_at = NOW(), created_tenant_id = $1, admin_notes = $2
      WHERE id = $3
    `, [tenant.id, notes, id]);

    const loginUrl = `${process.env.MAIN_CRM_URL || 'http://localhost:5173'}/login`;
    let emailSent = false;
    let emailError = null;

    if (req.body.sendEmail !== false && lead.email) {
      try {
        await sendCredentialsEmail({
          to: lead.email,
          name: lead.name,
          agencyName: lead.agency_name,
          password: rawPassword,
          loginUrl,
          isReset: false,
        });
        emailSent = true;
      } catch (mErr) {
        console.error('Failed to send welcome email on approval:', mErr);
        emailError = mErr.message;
      }
    }

    return res.json({
      message: `Account created and approved for ${lead.agency_name}`,
      credentials: {
        email: lead.email,
        temporaryPassword: rawPassword,
        companyName: lead.agency_name,
        name: lead.name,
        phone: lead.phone,
        loginUrl,
      },
      tenant,
      emailSent,
      emailError,
    });
  } catch (err) {
    console.error('Error approving request:', err);
    return res.status(500).json({ error: err.message || 'Failed to approve request and create account' });
  }
});

// Reject Request
router.patch('/requests/:id/reject', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'Rejected by admin' } = req.body;

    await query(`
      UPDATE walkthrough_requests
      SET status = 'rejected', admin_notes = $1
      WHERE id = $2
    `, [reason, id]);

    return res.json({ message: 'Request marked as rejected' });
  } catch (err) {
    console.error('Error rejecting request:', err);
    return res.status(500).json({ error: 'Failed to reject request' });
  }
});

// Delete Spam Request
router.delete('/requests/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM walkthrough_requests WHERE id = $1', [id]);
    return res.json({ message: 'Request removed permanently' });
  } catch (err) {
    console.error('Error deleting request:', err);
    return res.status(500).json({ error: 'Failed to delete request' });
  }
});

// -------------------------------------------------------------
// 3. REGISTERED AGENCIES MANAGEMENT
// -------------------------------------------------------------

// List registered agencies with filters
router.get('/tenants', requireSuperAdmin, async (req, res) => {
  try {
    const { search = '', status = 'all', page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const params = [];
    let idx = 1;

    let whereClauses = [
      `LOWER(t.email) NOT IN ('admin@gmail.com', 'admin@ezzysync.com')`
    ];

    if (search && search.trim()) {
      const s = `%${search.trim().toLowerCase()}%`;
      params.push(s);
      whereClauses.push(`(
        LOWER(t.name) LIKE $${idx} 
        OR LOWER(t.email) LIKE $${idx} 
        OR LOWER(t.company_name) LIKE $${idx} 
        OR LOWER(COALESCE(t.phone, '')) LIKE $${idx}
        OR LOWER(COALESCE(s.whatsapp_number, '')) LIKE $${idx}
      )`);
      idx++;
    }

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

    const whereSQL = `WHERE ${whereClauses.join(' AND ')}`;

    const countRes = await query(`SELECT COUNT(*) FROM tenants t LEFT JOIN settings s ON s.tenant_id = t.id ${whereSQL}`, params);
    const total = Number(countRes.rows[0]?.count || 0);

    const listQuery = `
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
      LIMIT $${idx} OFFSET $${idx + 1};
    `;

    params.push(Number(limit), offset);
    const { rows } = await query(listQuery, params);

    // Compute days left & status
    const enriched = rows.map((r) => {
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
        daysLeft = 30;
      } else {
        // Fallback for trials without explicit plan_expires_at
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

    return res.json({
      tenants: enriched,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    console.error('Error listing tenants:', err);
    return res.status(500).json({ error: 'Failed to list agencies' });
  }
});

// Agency 360 Details
router.get('/tenants/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
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
    `, [id]);

    if (!tenantRes.rows[0]) return res.status(404).json({ error: 'Agency not found' });
    const tenant = tenantRes.rows[0];

    const [teamRes, paymentsRes, metricsRes] = await Promise.all([
      query(`SELECT id, name, email, role, created_at FROM users WHERE tenant_id = $1 ORDER BY created_at ASC`, [id]),
      query(`SELECT id, order_id, payment_id, plan_id, amount, currency, status, created_at FROM payments WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 20`, [id]),
      query(`
        SELECT
          (SELECT COUNT(*) FROM bookings WHERE tenant_id = $1 AND deleted = FALSE) AS total_bookings,
          (SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE tenant_id = $1 AND deleted = FALSE) AS total_revenue,
          (SELECT COUNT(*) FROM leads WHERE tenant_id = $1 AND deleted = FALSE) AS total_leads,
          (SELECT COUNT(*) FROM quotations WHERE tenant_id = $1) AS total_quotations
      `, [id]),
    ]);

    return res.json({
      tenant: {
        ...tenant,
        team: teamRes.rows,
        payments: paymentsRes.rows,
        metrics: metricsRes.rows[0] || {},
      },
    });
  } catch (err) {
    console.error('Error getting tenant 360 details:', err);
    return res.status(500).json({ error: 'Failed to fetch details' });
  }
});

// Update Plan & Trial
router.patch('/tenants/:id/plan', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { planId, planExpiresAt, trialExtendedDays, isPaused } = req.body;
    const fields = [];
    const params = [id];
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

    if (fields.length > 0) {
      await query(`UPDATE tenants SET ${fields.join(', ')} WHERE id = $1`, params);
    }

    return res.json({ message: 'Agency plan updated successfully' });
  } catch (err) {
    console.error('Error updating plan:', err);
    return res.status(500).json({ error: 'Failed to update plan' });
  }
});

// Update Profile & Admin Notes
router.patch('/tenants/:id/profile', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, companyName, email, phone, adminNotes } = req.body;
    const fields = [];
    const params = [id];
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

    if (fields.length > 0) {
      await query(`UPDATE tenants SET ${fields.join(', ')} WHERE id = $1`, params);
    }

    return res.json({ message: 'Agency profile updated' });
  } catch (err) {
    console.error('Error updating profile:', err);
    return res.status(500).json({ error: 'Failed to update agency profile' });
  }
});

// Suspend / Reactivate Agency
router.patch('/tenants/:id/status', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isSuspended } = req.body;
    await query('UPDATE tenants SET is_suspended = $1 WHERE id = $2', [Boolean(isSuspended), id]);
    return res.json({ message: isSuspended ? 'Agency suspended' : 'Agency reactivated' });
  } catch (err) {
    console.error('Error updating suspension:', err);
    return res.status(500).json({ error: 'Failed to update status' });
  }
});

// 1-Click Impersonation: generates auth tokens for the CRM
router.post('/tenants/:id/impersonate', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const userRes = await query(`
      SELECT u.*, t.company_name, t.plan_id 
      FROM users u 
      JOIN tenants t ON t.id = u.tenant_id 
      WHERE u.tenant_id = $1 
      ORDER BY (u.role = 'ADMIN') DESC, u.created_at ASC 
      LIMIT 1;
    `, [id]);

    const targetUser = userRes.rows[0];
    if (!targetUser) return res.status(404).json({ error: 'No admin user found for this agency' });

    // Mint access token for Main CRM
    const token = jwt.sign(
      {
        userId: targetUser.id,
        tenantId: targetUser.tenant_id,
        email: targetUser.email,
        role: targetUser.role,
        impersonatedBy: req.user.email,
      },
      MAIN_CRM_JWT_SECRET,
      { expiresIn: '2h' }
    );

    const refreshToken = jwt.sign(
      {
        userId: targetUser.id,
        tenantId: targetUser.tenant_id,
      },
      MAIN_CRM_JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.json({
      token,
      refreshToken,
      user: {
        userId: targetUser.id,
        tenantId: targetUser.tenant_id,
        email: targetUser.email,
        name: targetUser.name,
        role: targetUser.role,
        companyName: targetUser.company_name,
        planId: targetUser.plan_id || 'FREE',
      },
    });
  } catch (err) {
    console.error('Error impersonating agency:', err);
    return res.status(500).json({ error: 'Failed to log in as agency' });
  }
});

// Reset Agent Password
router.post('/tenants/:id/reset-password', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { customPassword, sendEmail = true } = req.body;

    // 1. Fetch tenant details
    const tenantRes = await query(`
      SELECT t.id, t.name, t.email, t.company_name, t.phone, s.whatsapp_number
      FROM tenants t
      LEFT JOIN settings s ON s.tenant_id = t.id
      WHERE t.id = $1
    `, [id]);

    if (!tenantRes.rows[0]) {
      return res.status(404).json({ error: 'Agency not found' });
    }
    const tenant = tenantRes.rows[0];

    // 2. Fetch primary admin user
    const userRes = await query(`
      SELECT id, email, name, role
      FROM users
      WHERE tenant_id = $1
      ORDER BY (role = 'ADMIN') DESC, created_at ASC
      LIMIT 1;
    `, [id]);

    const targetUser = userRes.rows[0];
    const targetEmail = targetUser?.email || tenant.email;
    const targetName = targetUser?.name || tenant.name;
    const targetPhone = tenant.phone || tenant.whatsapp_number || '';

    // 3. New password validation and hashing
    const rawPassword = customPassword && customPassword.trim()
      ? customPassword.trim()
      : `Ezzy@${Math.floor(1000 + Math.random() * 9000)}`;

    if (rawPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const passwordHash = await bcrypt.hash(rawPassword, 10);

    // 4. Update password on tenants table
    await query(`UPDATE tenants SET password_hash = $1 WHERE id = $2`, [passwordHash, id]);

    // 5. Update password on users table
    if (targetUser) {
      await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [passwordHash, targetUser.id]);
    } else {
      await query(`
        INSERT INTO users (tenant_id, email, password_hash, name, role, is_super_admin)
        VALUES ($1, $2, $3, $4, 'ADMIN', FALSE)
        ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
      `, [id, targetEmail.toLowerCase().trim(), passwordHash, targetName]);
    }

    const loginUrl = `${process.env.MAIN_CRM_URL || 'http://localhost:5173'}/login`;
    let emailSent = false;
    let emailError = null;

    // 6. Send email if requested
    if (sendEmail && targetEmail) {
      try {
        await sendCredentialsEmail({
          to: targetEmail,
          name: targetName,
          agencyName: tenant.company_name || targetName,
          password: rawPassword,
          loginUrl,
          isReset: true,
        });
        emailSent = true;
      } catch (mErr) {
        console.error('Failed to send reset password email:', mErr);
        emailError = mErr.message;
      }
    }

    return res.json({
      message: `Password reset successfully for ${tenant.company_name || targetName}`,
      credentials: {
        agencyId: tenant.id,
        companyName: tenant.company_name || targetName,
        name: targetName,
        email: targetEmail,
        phone: targetPhone,
        temporaryPassword: rawPassword,
        loginUrl,
      },
      emailSent,
      emailError,
    });
  } catch (err) {
    console.error('Error resetting agent password:', err);
    return res.status(500).json({ error: err.message || 'Failed to reset password' });
  }
});

// Delete Agency
router.delete('/tenants/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM tenants WHERE id = $1', [id]);
    return res.json({ message: 'Agency deleted permanently' });
  } catch (err) {
    console.error('Error deleting agency:', err);
    return res.status(500).json({ error: 'Failed to delete agency' });
  }
});

module.exports = router;
