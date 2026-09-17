-- Migration 014: Hot/Warm/Cold lead priority, recomputed periodically by a
-- cron job (see jobs/cronJobs.js) rather than on every read - there is no
-- caching layer in this codebase, so storing the computed value is cheaper
-- than deriving it on every leads-list request.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Cold';
CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
