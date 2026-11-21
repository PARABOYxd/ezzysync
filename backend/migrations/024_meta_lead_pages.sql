-- Migration 024: Meta Lead Ads straight into the CRM, no Google Sheet in between.
--
-- An agent signs in with Facebook once. Every Facebook Page they manage is
-- listed here as 'available'; connecting one subscribes it to Meta's `leadgen`
-- webhook and makes it 'active'. When someone submits a lead form on an active
-- page, Meta calls our webhook with a lead id, and the lead is fetched with the
-- page's own token and turned into a CRM lead.
--
--   page_id       Meta's id for the page. Unique across the platform: one
--                 page's leads can only ever go to one agency, and the webhook
--                 tells us the page, not the agency.
--   page_token    the page access token, encrypted (utils/encryption). It never
--                 reaches the browser.
--   form_trips    { formId: tripName }. A page often runs one form per trip.
--   trip_name     the trip for a form that is not listed; blank falls back to
--                 the ad's own name.
--   rr_cursor     position in the team for round-robin assignment.

CREATE TABLE IF NOT EXISTS meta_lead_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  page_id TEXT NOT NULL UNIQUE,
  page_name TEXT NOT NULL DEFAULT '',
  page_token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',        -- 'available' | 'active'
  trip_name TEXT NOT NULL DEFAULT '',
  form_trips JSONB NOT NULL DEFAULT '{}'::jsonb,
  assign_mode TEXT NOT NULL DEFAULT 'round_robin', -- 'agent' | 'round_robin'
  assigned_to TEXT NOT NULL DEFAULT '',
  default_stage TEXT NOT NULL DEFAULT 'New',
  source_label TEXT NOT NULL DEFAULT 'Meta Ads',
  paused BOOLEAN NOT NULL DEFAULT FALSE,
  total_leads INTEGER NOT NULL DEFAULT 0,
  rr_cursor INTEGER NOT NULL DEFAULT 0,
  last_lead_at TIMESTAMPTZ,
  last_error TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meta_lead_pages_tenant ON meta_lead_pages(tenant_id);

-- One row per lead Meta told us about. Meta retries a webhook it thinks failed,
-- and a lead can only be fetched once we know about it, so this is both the
-- duplicate guard and the retry queue for a fetch that failed.
CREATE TABLE IF NOT EXISTS meta_lead_events (
  leadgen_id TEXT PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  page_id TEXT NOT NULL,
  form_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',          -- 'pending' | 'done' | 'failed'
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meta_lead_events_pending ON meta_lead_events(updated_at) WHERE status = 'pending';
