-- Migration 022: Live Google Sheet lead sync.
--
-- An agency runs Meta lead ads that drop every enquiry into a Google Sheet,
-- often one sheet per trip. Each connected sheet is read on a schedule and
-- its new rows become leads. This table is the list of connected sheets and
-- how far into each one we have read.
--
--   last_row_count  data rows (header excluded) already handled. The next
--                   sync starts after this row, so only new rows are read.
--   column_mapping  { leadField: 'Header text' }. Headers, not positions, so
--                   a column inserted into the sheet does not shift the mapping.
--                   Empty means "detect from the header row" on every sync.
--   rr_cursor       position in the team for round-robin assignment.
--   syncing_at      set while a sync runs; stops the schedule and a manual
--                   "Sync Now" from importing the same rows twice.

CREATE TABLE IF NOT EXISTS lead_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sheet_id TEXT NOT NULL,
  gid TEXT NOT NULL DEFAULT '0',
  trip_mode TEXT NOT NULL DEFAULT 'fixed',          -- 'fixed' | 'column'
  trip_name TEXT NOT NULL DEFAULT '',
  trip_column TEXT NOT NULL DEFAULT '',
  assign_mode TEXT NOT NULL DEFAULT 'round_robin',  -- 'agent' | 'round_robin'
  assigned_to TEXT NOT NULL DEFAULT '',
  default_stage TEXT NOT NULL DEFAULT 'New',
  source_label TEXT NOT NULL DEFAULT 'Meta Ads',
  column_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  skip_existing BOOLEAN NOT NULL DEFAULT FALSE,
  paused BOOLEAN NOT NULL DEFAULT FALSE,
  last_row_count INTEGER NOT NULL DEFAULT 0,
  total_synced INTEGER NOT NULL DEFAULT 0,
  rr_cursor INTEGER NOT NULL DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  last_status TEXT NOT NULL DEFAULT 'pending',      -- 'pending' | 'ok' | 'error'
  last_error TEXT NOT NULL DEFAULT '',
  syncing_at TIMESTAMPTZ,
  created_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_sheets_tenant ON lead_sheets(tenant_id);
-- The scheduler scans every tenant for sheets that are due.
CREATE INDEX IF NOT EXISTS idx_lead_sheets_due ON lead_sheets(last_synced_at) WHERE paused = FALSE;
