-- Migration 021: Plan limits as sold, and a monthly AI allowance.
--
-- The plans table had drifted from the pricing page:
--   * Solo capped *bookings* at 200 - a limit that punished winning business
--     and that the pricing page never described.
--   * Agency Growth allowed unlimited team members; it is sold as up to 5.
-- Both plans now carry every feature, AI included. What separates them is
-- the team: Solo is one login (the owner), Growth up to five.
--
-- AI is the one per-use cost, so each plan gets a monthly allowance of AI
-- actions (one generated reply, draft, itinerary, extraction or auto-fill).
-- -1 means unlimited. Usage is counted per tenant per calendar month.

ALTER TABLE plans ADD COLUMN IF NOT EXISTS ai_actions_per_month INTEGER NOT NULL DEFAULT 0;

UPDATE plans SET max_bookings = -1, max_team_members = 1, can_use_ai = TRUE, ai_actions_per_month = 500
 WHERE id = 'SOLO';
UPDATE plans SET max_bookings = -1, max_team_members = 5, can_use_ai = TRUE, ai_actions_per_month = 2000
 WHERE id = 'PRO';
-- FREE only applies once the trial has ended, and then everything is locked.
UPDATE plans SET can_use_ai = FALSE, ai_actions_per_month = 0
 WHERE id = 'FREE';

CREATE TABLE IF NOT EXISTS ai_usage_monthly (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  period TEXT NOT NULL,              -- 'YYYY-MM', India time
  used INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, period)
);
