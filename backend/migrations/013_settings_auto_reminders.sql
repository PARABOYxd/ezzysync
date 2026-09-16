-- Automated trip and payment reminders become something a tenant opts into.
--
-- The daily job used to message every tenant's customers without anyone
-- having asked for it - including tenants on an expired plan, and over a
-- QR-linked number where unsolicited automated sends raise the ban risk.
-- Off by default; the manual "send" buttons are unaffected.

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS auto_reminders_enabled BOOLEAN NOT NULL DEFAULT FALSE;
