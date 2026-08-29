const { Pool } = require('pg');
const env = require('./env');
const logger = require('../utils/logger').child({ module: 'db' });

/**
 * A single shared connection pool, reused across the app.
 *
 * TENANT ISOLATION GUARANTEE
 * --------------------------------------------------
 * There is now one shared Postgres database for all tenants (agencies).
 * Isolation is enforced in code, not by separate files: every tenant-owned
 * table (bookings, settings) has a `tenant_id` column, and every query that
 * touches those tables is scoped with `WHERE tenant_id = $1` using the
 * tenant_id pulled from the verified JWT (see middleware/authMiddleware.js).
 * No controller or service accepts a tenant_id from the request body/query -
 * it always flows from req.user.tenantId, so one tenant can never read or
 * write another tenant's rows.
 */
const pool = new Pool({
  connectionString: env.db.connectionString,
  ssl: env.db.ssl,
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected error on idle Postgres client');
});

/** Thin wrapper around pool.query, kept as a single choke point for logging/metrics later. */
async function query(text, params) {
  return pool.query(text, params);
}

/**
 * Idempotent schema bootstrap - safe to run on every server start.
 * For a larger production app you'd swap this for a real migration tool
 * (Knex, Prisma Migrate, node-pg-migrate), but for this project's size a
 * single "CREATE TABLE IF NOT EXISTS" pass keeps setup to one step.
 */
async function ensureSchema() {
  await query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

  await query(`
    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      max_bookings INT DEFAULT -1,
      max_team_members INT DEFAULT -1,
      can_download_invoice BOOLEAN DEFAULT TRUE,
      can_send_whatsapp BOOLEAN DEFAULT TRUE,
      can_connect_gmail BOOLEAN DEFAULT TRUE,
      can_view_audit_logs BOOLEAN DEFAULT TRUE,
      can_export_reports BOOLEAN DEFAULT TRUE,
      can_use_ai BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  await query(`
    INSERT INTO plans (id, name, max_bookings, max_team_members, can_download_invoice, can_send_whatsapp, can_connect_gmail, can_view_audit_logs, can_export_reports, can_use_ai)
    VALUES 
      ('FREE', 'Free Plan', -1, -1, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE),
      ('PRO', 'Pro Plan', -1, -1, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE)
    ON CONFLICT (id) DO NOTHING;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      name TEXT NOT NULL,
      company_name TEXT NOT NULL,
      reset_otp TEXT,
      reset_otp_expiry TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'ADMIN',
      permissions JSONB DEFAULT NULL,
      reset_otp TEXT,
      reset_otp_expiry TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);`);

  // Long-lived refresh tokens so a client can silently mint a new access
  // token instead of forcing re-login once the (short-lived) JWT expires.
  // Only a hash of the token is stored - the raw value is never persisted,
  // same reasoning as password hashing. Rotated (old row revoked, new row
  // inserted) on every use so a leaked-and-replayed token stops working
  // after one refresh instead of staying valid for its whole 30-day life.
  await query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);`);

  // Backfill existing tenants into users table as ADMINs if users table is empty
  const { rows } = await query(`SELECT id FROM users LIMIT 1`);
  if (rows.length === 0) {
    logger.info('Backfilling existing tenants into users table...');
    await query(`
      INSERT INTO users (tenant_id, email, password_hash, name, role)
      SELECT id, email, password_hash, name, 'ADMIN'
      FROM tenants
      ON CONFLICT (email) DO NOTHING
    `);
  }

  await query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      booking_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      emergency_contact TEXT DEFAULT '',
      trip TEXT NOT NULL,
      departure TEXT NOT NULL,
      pickup TEXT DEFAULT '',
      members INTEGER NOT NULL DEFAULT 1,
      price_per_person NUMERIC(12,2) NOT NULL DEFAULT 0,
      total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      paid NUMERIC(12,2) NOT NULL DEFAULT 0,
      remaining NUMERIC(12,2) NOT NULL DEFAULT 0,
      team_member TEXT DEFAULT '',
      travel_status TEXT NOT NULL DEFAULT 'Booked',
      payment_status TEXT NOT NULL DEFAULT 'Pending',
      booking_timestamp TEXT NOT NULL,
      notes TEXT DEFAULT '',
      created_by TEXT DEFAULT '',
      updated_at TEXT NOT NULL,
      deleted BOOLEAN NOT NULL DEFAULT FALSE,
      source_quotation_id TEXT DEFAULT NULL,
      UNIQUE (tenant_id, booking_id)
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_bookings_tenant ON bookings(tenant_id);`);

  await query(`
    CREATE TABLE IF NOT EXISTS settings (
      tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
      company_name TEXT DEFAULT '',
      company_logo_url TEXT DEFAULT '',
      invoice_footer TEXT DEFAULT '',
      email_sender_name TEXT DEFAULT '',
      whatsapp_number TEXT DEFAULT '',
      gst_number TEXT DEFAULT '',
      address TEXT DEFAULT '',
      invoice_accent_color TEXT DEFAULT '#0f766e',
      invoice_layout TEXT DEFAULT 'minimal',
      invoice_title TEXT DEFAULT 'INVOICE',
      invoice_show_gst BOOLEAN DEFAULT TRUE,
      invoice_show_payment_status BOOLEAN DEFAULT TRUE,
      invoice_terms TEXT DEFAULT 'Amounts once paid are subject to cancellation & refund policy shared at the time of booking. Please carry a valid photo ID on the day of departure. For any queries, contact us.'
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS gmail_connections (
      tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
      google_email TEXT NOT NULL,
      refresh_token_encrypted TEXT NOT NULL,
      connected BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_sync_at TIMESTAMPTZ
      );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      details JSONB DEFAULT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);`);

  // System/application logs (warn+error from the app logger - see utils/logger.js).
  // Separate from audit_logs, which is the business "who did what" trail, not
  // request/error diagnostics. tenant_id/user_id are nullable since plenty of
  // warnings/errors happen before a request is authenticated (login failures,
  // OAuth callback errors, etc).
  await query(`
    CREATE TABLE IF NOT EXISTS app_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      context JSONB DEFAULT NULL,
      req_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_app_logs_tenant ON app_logs(tenant_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_app_logs_created ON app_logs(created_at);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_app_logs_level ON app_logs(level);`);

  // Schema migrations for existing databases
  try {
    await query(`ALTER TABLE tenants ALTER COLUMN password_hash DROP NOT NULL;`);
    await query(`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;`);
  } catch (err) {
    logger.warn({ err }, 'Note altering password_hash constraints');
  }

  try {
    await query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_id TEXT DEFAULT 'FREE' REFERENCES plans(id);`);
  } catch (err) {
    logger.warn({ err }, 'Note adding plan_id column');
  }

  try {
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;`);
  } catch (err) {
    logger.warn({ err }, 'Note adding google_id column');
  }

  try {
    await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_quotation_id TEXT DEFAULT NULL;`);
  } catch (err) {
    logger.warn({ err }, 'Note adding source_quotation_id column');
  }

  // Settings table enhancements for invoice customizer
  try {
    await query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS invoice_accent_color TEXT DEFAULT '#0f766e';`);
    await query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS invoice_layout TEXT DEFAULT 'minimal';`);
    await query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS invoice_title TEXT DEFAULT 'INVOICE';`);
    await query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS invoice_show_gst BOOLEAN DEFAULT TRUE;`);
    await query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS invoice_show_payment_status BOOLEAN DEFAULT TRUE;`);
    await query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS invoice_terms TEXT DEFAULT 'Amounts once paid are subject to cancellation & refund policy shared at the time of booking. Please carry a valid photo ID on the day of departure. For any queries, contact us.';`);
  } catch (err) {
    logger.warn({ err }, 'Note updating settings invoice customization columns');
  }

  // Quotations schema creation
  await query(`
    CREATE TABLE IF NOT EXISTS quotations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      quotation_id TEXT NOT NULL UNIQUE,
      customer_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      trip_name TEXT NOT NULL,
      price_quote NUMERIC(12,2) NOT NULL DEFAULT 0,
      valid_until TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Draft',
      itinerary_days JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_quotations_tenant ON quotations(tenant_id);`);

  // Walkthrough requests schema creation
  await query(`
    CREATE TABLE IF NOT EXISTS walkthrough_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      agency_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Create hotels table if it does not exist
  await query(`
    CREATE TABLE IF NOT EXISTS hotels (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      rating TEXT DEFAULT '3 Star',
      address TEXT DEFAULT '',
      contact_person TEXT DEFAULT '',
      contact_phone TEXT DEFAULT '',
      rooms_and_rates JSONB DEFAULT '[]'::jsonb,
      contacts JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_hotels_tenant ON hotels(tenant_id);`);

  // Add missing hotel columns to bookings table
  try {
    await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS hotel_id UUID REFERENCES hotels(id) ON DELETE SET NULL;`);
    await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS room_category TEXT DEFAULT '';`);
    await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS hotel_booking_status TEXT DEFAULT 'Pending';`);
    await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS hotel_confirmation_no TEXT DEFAULT '';`);
  } catch (err) {
    logger.warn({ err }, 'Note adding hotel column details to bookings');
  }

  // Bookings costing parameters for net profit ledger
  try {
    await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS vendor_hotel_cost NUMERIC(12,2) DEFAULT 0;`);
    await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS vendor_flight_cost NUMERIC(12,2) DEFAULT 0;`);
    await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS vendor_transport_cost NUMERIC(12,2) DEFAULT 0;`);
    await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS vendor_other_cost NUMERIC(12,2) DEFAULT 0;`);
    await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS net_profit NUMERIC(12,2) DEFAULT 0;`);
  } catch (err) {
    logger.warn({ err }, 'Note updating bookings costing columns');
  }

  // Follow-up Logs & Booking enhancements
  try {
    await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS next_follow_up_date TIMESTAMPTZ DEFAULT NULL;`);
  } catch (err) {
    logger.warn({ err }, 'Note adding next_follow_up_date column');
  }

  try {
    await query(`
      CREATE TABLE IF NOT EXISTS follow_up_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        note TEXT NOT NULL,
        activity_type TEXT DEFAULT 'note', -- 'call', 'whatsapp', 'email', 'meeting', 'note'
        next_follow_up_date TIMESTAMPTZ DEFAULT NULL,
        created_by TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_follow_up_logs_booking ON follow_up_logs(booking_id);`);
  } catch (err) {
    logger.error({ err }, 'Error creating follow_up_logs table');
  }

  // Forgot-password OTP columns for existing databases
  try {
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp TEXT DEFAULT NULL;`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp_expiry TIMESTAMPTZ DEFAULT NULL;`);
  } catch (err) {
    logger.warn({ err }, 'Note adding reset_otp columns to users');
  }

  // B2B Supplier Cost column for bookings
  try {
    await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS b2b_cost NUMERIC(12,2) DEFAULT 0;`);
  } catch (err) {
    logger.warn({ err }, 'Error adding b2b_cost column to bookings');
  }

  // Lightweight, auto-populated customer rollup - natural key is (tenant_id, phone).
  // Populated by customerService.upsertFromContact(), called from booking/quotation/lead
  // creation - NOT something the existing booking/quotation forms need to know about.
  await query(`
    CREATE TABLE IF NOT EXISTS customers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT DEFAULT '',
      email TEXT DEFAULT '',
      phone TEXT NOT NULL,
      first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (tenant_id, phone)
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);`);

  // Pre-booking pipeline entity - mirrors bookings' shape/conventions closely
  // on purpose (booking_id -> lead_id pattern, soft delete, team_member ->
  // assigned_to) so it behaves familiarly and reuses the same UI patterns.
  await query(`
    CREATE TABLE IF NOT EXISTS leads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
      lead_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      email TEXT DEFAULT '',
      phone TEXT NOT NULL,
      interest TEXT DEFAULT '',
      source TEXT NOT NULL DEFAULT 'Manual',
      stage TEXT NOT NULL DEFAULT 'New',
      assigned_to TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      next_follow_up_date TIMESTAMPTZ,
      converted_booking_id TEXT,
      created_by TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted BOOLEAN NOT NULL DEFAULT FALSE,
      UNIQUE (tenant_id, lead_id)
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_leads_tenant ON leads(tenant_id);`);

  await query(`CREATE SEQUENCE IF NOT EXISTS leads_seq START 1000;`);

  try {
    await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS lead_id UUID UNIQUE REFERENCES leads(id) ON DELETE SET NULL;`);
  } catch (err) {
    logger.warn({ err }, 'Note adding lead_id to bookings');
  }

  // Link leads to tour batches
  try {
    await query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES tour_batches(id) ON DELETE SET NULL;`);
  } catch (err) {
    logger.warn({ err }, 'Note adding batch_id to leads');
  }

  // Link bookings/quotations to the customer rollup (additive, nullable -
  // existing rows and existing create/update flows keep working unchanged).
  try {
    await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;`);
    await query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;`);
  } catch (err) {
    logger.warn({ err }, 'Note adding customer_id columns to bookings/quotations');
  }

  // follow_up_logs becomes a real task system: usable for leads too, gets a status.
  try {
    await query(`ALTER TABLE follow_up_logs ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE CASCADE;`);
    await query(`ALTER TABLE follow_up_logs ALTER COLUMN booking_id DROP NOT NULL;`);
    await query(`ALTER TABLE follow_up_logs ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';`);
  } catch (err) {
    logger.warn({ err }, 'Note updating follow_up_logs for lead/task support');
  }
  await query(`CREATE INDEX IF NOT EXISTS idx_follow_up_logs_lead ON follow_up_logs(lead_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_follow_up_logs_next_date ON follow_up_logs(next_follow_up_date) WHERE status = 'pending';`);

  // Public, rotatable identifier for the landing-page lead capture widget -
  // deliberately NOT the internal tenant UUID, so it can be rotated if leaked.
  try {
    await query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS public_lead_key TEXT UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex');`);
  } catch (err) {
    logger.warn({ err }, 'Note adding public_lead_key column to tenants');
  }

  // Group Tour Batching - lets many individual bookings (Rahul, Priya, Amit...)
  // be linked under one fixed-departure tour with a shared itinerary, price
  // and seat capacity, instead of every booking being tracked standalone.
  await query(`
    CREATE TABLE IF NOT EXISTS tour_batches (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      batch_id TEXT NOT NULL,
      name TEXT NOT NULL,
      trip_name TEXT NOT NULL,
      departure_date TEXT NOT NULL,
      total_capacity INTEGER NOT NULL DEFAULT 0,
      price_per_person NUMERIC(12,2) NOT NULL DEFAULT 0,
      itinerary_days JSONB DEFAULT '[]'::jsonb,
      status TEXT NOT NULL DEFAULT 'Planning',
      notes TEXT DEFAULT '',
      created_by TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted BOOLEAN NOT NULL DEFAULT FALSE,
      UNIQUE (tenant_id, batch_id)
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_tour_batches_tenant ON tour_batches(tenant_id);`);
  await query(`CREATE SEQUENCE IF NOT EXISTS tour_batches_seq START 1000;`);

  try {
    await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES tour_batches(id) ON DELETE SET NULL;`);
  } catch (err) {
    logger.warn({ err }, 'Note adding batch_id to bookings');
  }

  // Tracks which saved Itinerary/Quotation a batch's master itinerary was
  // imported from, so the Quotations page can show "used in this batch" -
  // same loose text-reference convention as bookings.source_quotation_id.
  try {
    await query(`ALTER TABLE tour_batches ADD COLUMN IF NOT EXISTS source_quotation_id TEXT DEFAULT NULL;`);
  } catch (err) {
    logger.warn({ err }, 'Note adding source_quotation_id to tour_batches');
  }

  // What's included/excluded in the package price - shown on the public
  // itinerary preview page alongside the day-by-day schedule.
  try {
    await query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS inclusions JSONB DEFAULT '[]'::jsonb;`);
    await query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS exclusions JSONB DEFAULT '[]'::jsonb;`);
  } catch (err) {
    logger.warn({ err }, 'Note adding inclusions/exclusions to quotations');
  }

  try {
    await query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS auto_send_invoice BOOLEAN DEFAULT FALSE;`);
  } catch (err) {
    logger.warn({ err }, 'Note adding auto_send_invoice to settings');
  }

  // WhatsApp & Instagram API credentials in settings
  try {
    await query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id TEXT DEFAULT '';`);
    await query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS whatsapp_access_token TEXT DEFAULT '';`);
    await query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS whatsapp_waba_id TEXT DEFAULT '';`);
    await query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS whatsapp_business_id TEXT DEFAULT '';`);
    await query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS whatsapp_app_secret TEXT DEFAULT '';`);
    await query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS instagram_username TEXT DEFAULT '';`);
    await query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS instagram_account_id TEXT DEFAULT '';`);
    await query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS instagram_access_token TEXT DEFAULT '';`);
  } catch (err) {
    logger.warn({ err }, 'Note adding WhatsApp/Instagram columns to settings');
  }

  // Instagram sender ID on leads for DM-sourced lead deduplication
  try {
    await query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS instagram_sender_id TEXT DEFAULT NULL;`);
  } catch (err) {
    logger.warn({ err }, 'Note adding instagram_sender_id to leads');
  }

  // Optional trip highlights (short bullet list) and per-pickup-point
  // pricing (each entry is its own absolute total price, not an add-on).
  try {
    await query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS highlights JSONB DEFAULT '[]'::jsonb;`);
    await query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS pickup_options JSONB DEFAULT '[]'::jsonb;`);
  } catch (err) {
    logger.warn({ err }, 'Note adding highlights/pickup_options to quotations');
  }

  // Create expenses schema table for central tracking linked to bookings or batches
  await query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      category TEXT NOT NULL DEFAULT 'Other',
      link_type TEXT NOT NULL,
      booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
      batch_id UUID REFERENCES tour_batches(id) ON DELETE SET NULL,
      vendor_name TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Pending',
      created_by TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_expenses_tenant ON expenses(tenant_id);`);

  // Create trip cost templates table for automation (supporting multiple versions per trip)
  await query(`
    CREATE TABLE IF NOT EXISTS trip_cost_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      trip_name TEXT NOT NULL,
      template_name TEXT NOT NULL DEFAULT 'Default',
      hotel_cost_per_pax NUMERIC(12,2) NOT NULL DEFAULT 0,
      flight_cost_per_pax NUMERIC(12,2) NOT NULL DEFAULT 0,
      transport_cost_per_pax NUMERIC(12,2) NOT NULL DEFAULT 0,
      other_cost_per_pax NUMERIC(12,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (tenant_id, trip_name, template_name)
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_trip_cost_templates_tenant ON trip_cost_templates(tenant_id);`);

  // Migration: Alter existing trip_cost_templates to add template_name and drop single-unique constraint
  try {
    await query(`ALTER TABLE trip_cost_templates ADD COLUMN IF NOT EXISTS template_name TEXT NOT NULL DEFAULT 'Default';`);
    await query(`ALTER TABLE trip_cost_templates DROP CONSTRAINT IF EXISTS trip_cost_templates_tenant_id_trip_name_key;`);
    await query(`ALTER TABLE trip_cost_templates DROP CONSTRAINT IF EXISTS trip_cost_templates_tenant_trip_version_key;`);
    await query(`ALTER TABLE trip_cost_templates ADD CONSTRAINT trip_cost_templates_tenant_trip_version_key UNIQUE (tenant_id, trip_name, template_name);`);
  } catch (err) {
    logger.warn({ err }, 'Note altering trip_cost_templates constraint');
  }

  // Migration: Add costing fields and sharing_type to bookings and quotations
  try {
    await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cost_template_id UUID REFERENCES trip_cost_templates(id) ON DELETE SET NULL;`);
    await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS sharing_type TEXT DEFAULT 'Double';`);
  } catch (err) {
    logger.warn({ err }, 'Note adding cost_template_id/sharing_type to bookings');
  }

  try {
    await query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS hotel_cost_per_pax NUMERIC(12,2) NOT NULL DEFAULT 0;`);
    await query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS flight_cost_per_pax NUMERIC(12,2) NOT NULL DEFAULT 0;`);
    await query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS transport_cost_per_pax NUMERIC(12,2) NOT NULL DEFAULT 0;`);
    await query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS other_cost_per_pax NUMERIC(12,2) NOT NULL DEFAULT 0;`);
    await query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS cost_template_id UUID REFERENCES trip_cost_templates(id) ON DELETE SET NULL;`);
  } catch (err) {
    logger.warn({ err }, 'Note adding costing columns to quotations');
  }

  try {
    await query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS banner_url TEXT DEFAULT '';`);
  } catch (err) {
    logger.warn({ err }, 'Note adding banner_url to quotations');
  }

  try {
    await query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS related_quotations JSONB DEFAULT '[]'::jsonb;`);
  } catch (err) {
    logger.warn({ err }, 'Note adding related_quotations to quotations');
  }

  // WhatsApp own number setup requests from agencies
  await query(`
    CREATE TABLE IF NOT EXISTS whatsapp_setup_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      phone TEXT NOT NULL,
      company_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_wa_requests_tenant ON whatsapp_setup_requests(tenant_id);`);

  // WhatsApp Chats table
  await query(`
    CREATE TABLE IF NOT EXISTS whatsapp_chats (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      phone TEXT NOT NULL,
      customer_name TEXT DEFAULT '',
      last_message TEXT DEFAULT '',
      last_message_timestamp TIMESTAMPTZ DEFAULT now(),
      unread_count INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE (tenant_id, phone)
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_wa_chats_tenant ON whatsapp_chats(tenant_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_wa_chats_phone ON whatsapp_chats(phone);`);

  // WhatsApp Messages table
  await query(`
    CREATE TABLE IF NOT EXISTS whatsapp_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      chat_id UUID NOT NULL REFERENCES whatsapp_chats(id) ON DELETE CASCADE,
      direction TEXT NOT NULL,
      message_text TEXT NOT NULL,
      message_type TEXT NOT NULL DEFAULT 'text',
      media_url TEXT DEFAULT NULL,
      message_id TEXT UNIQUE,
      status TEXT DEFAULT 'sent',
      message_timestamp TIMESTAMPTZ DEFAULT now()
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_wa_messages_chat ON whatsapp_messages(chat_id);`);

  try {
    await query(`ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text';`);
    await query(`ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS media_url TEXT DEFAULT NULL;`);
    await query(`ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS message_id TEXT UNIQUE;`);
    await query(`ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';`);
  } catch (err) {
    logger.warn({ err }, 'Note adding status/message_id/media columns to whatsapp_messages');
  }

  // Payments & Subscription Ledger table
  await query(`
    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      order_id TEXT UNIQUE NOT NULL,
      payment_id TEXT,
      signature TEXT,
      plan_id TEXT NOT NULL,
      amount INT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      status TEXT NOT NULL DEFAULT 'created',
      raw_response JSONB DEFAULT NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_payments_payment ON payments(payment_id);`);

  // Normalize existing 10-digit phone numbers to 12-digit Indian numbers with 91 prefix in whatsapp_chats
  try {
    await query(`
      UPDATE whatsapp_chats 
      SET phone = '91' || phone 
      WHERE LENGTH(phone) = 10 
        AND ('91' || phone) NOT IN (SELECT phone FROM whatsapp_chats);
    `);
  } catch (err) {
    logger.warn({ err }, 'Failed to normalize existing whatsapp_chats phone numbers');
  }

  logger.info('Schema check complete.');
}

module.exports = { pool, query, ensureSchema };
