const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:root@localhost:5432/whatsappBusinessCRM',
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  return res;
}

// Auto-migrate tables required for Access Requests and Super Admin
async function initDb() {
  try {
    // 1. Ensure walkthrough_requests table exists with all status fields
    await query(`
      CREATE TABLE IF NOT EXISTS walkthrough_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        agency_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending',
        verification_otp TEXT DEFAULT NULL,
        verification_otp_expires_at TIMESTAMPTZ DEFAULT NULL,
        admin_notes TEXT DEFAULT '',
        approved_at TIMESTAMPTZ DEFAULT NULL,
        created_tenant_id UUID DEFAULT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // Add columns if table already existed without them
    await query(`ALTER TABLE walkthrough_requests ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';`);
    await query(`ALTER TABLE walkthrough_requests ADD COLUMN IF NOT EXISTS verification_otp TEXT DEFAULT NULL;`);
    await query(`ALTER TABLE walkthrough_requests ADD COLUMN IF NOT EXISTS verification_otp_expires_at TIMESTAMPTZ DEFAULT NULL;`);
    await query(`ALTER TABLE walkthrough_requests ADD COLUMN IF NOT EXISTS admin_notes TEXT DEFAULT '';`);
    await query(`ALTER TABLE walkthrough_requests ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ DEFAULT NULL;`);
    await query(`ALTER TABLE walkthrough_requests ADD COLUMN IF NOT EXISTS created_tenant_id UUID DEFAULT NULL;`);
    await query(`ALTER TABLE walkthrough_requests ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '';`);
    await query(`ALTER TABLE walkthrough_requests ADD COLUMN IF NOT EXISTS state TEXT DEFAULT '';`);
    await query(`ALTER TABLE walkthrough_requests ADD COLUMN IF NOT EXISTS travel_speciality TEXT DEFAULT '';`);
    await query(`ALTER TABLE walkthrough_requests ADD COLUMN IF NOT EXISTS website_or_instagram TEXT DEFAULT '';`);
    await query(`ALTER TABLE walkthrough_requests ADD COLUMN IF NOT EXISTS instagram_link TEXT DEFAULT '';`);
    await query(`ALTER TABLE walkthrough_requests ADD COLUMN IF NOT EXISTS website_link TEXT DEFAULT '';`);
    await query(`ALTER TABLE walkthrough_requests ADD COLUMN IF NOT EXISTS gst_number TEXT DEFAULT '';`);
    await query(`ALTER TABLE walkthrough_requests ADD COLUMN IF NOT EXISTS visiting_card_url TEXT DEFAULT '';`);
    await query(`ALTER TABLE walkthrough_requests ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;`);
    await query(`ALTER TABLE walkthrough_requests ADD COLUMN IF NOT EXISTS whatsapp_verified BOOLEAN DEFAULT FALSE;`);
    await query(`ALTER TABLE walkthrough_requests ADD COLUMN IF NOT EXISTS social_verified BOOLEAN DEFAULT FALSE;`);
    await query(`ALTER TABLE walkthrough_requests ADD COLUMN IF NOT EXISTS visiting_card_verified BOOLEAN DEFAULT FALSE;`);

    // 2. Ensure super admin columns on users and tenants
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;`);
    await query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;`);
    await query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT FALSE;`);
    await query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_extended_days INT DEFAULT 0;`);
    await query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS admin_notes TEXT DEFAULT '';`);

    // Ensure admin@gmail.com is elevated
    await query(`UPDATE users SET is_super_admin = TRUE WHERE LOWER(email) = 'admin@gmail.com';`);

    console.log('✅ [AdminBE DB] PostgreSQL tables & migrations verified');
  } catch (err) {
    console.error('❌ [AdminBE DB] Migration error:', err);
  }
}

module.exports = {
  pool,
  query,
  initDb,
};
