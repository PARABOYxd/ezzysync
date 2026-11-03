-- Migration 023: tell the agent's own contacts apart from new enquiries.
--
-- The linked WhatsApp number is someone's real phone, full of family and
-- friends. Every number that writes in used to become a lead. WhatsApp tells
-- us which numbers are saved in the phone's address book (and under what
-- name), so those are remembered here, per agency, by their last 10 digits.
--
-- ignore_saved_contacts is opt-in. An agent often saves a customer's number
-- after the first call, so a saved name does not always mean "not a customer";
-- the screen explains that and the agency decides. It only ever applies to a
-- number the CRM has never seen: anyone with an existing lead or chat is
-- handled as before.

ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS ignore_saved_contacts BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS whatsapp_saved_contacts (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone_key TEXT NOT NULL,           -- last 10 digits
  name TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, phone_key)
);
