-- Migration 012: Payment collection details (UPI + QR) on settings, so an
-- agency configures them once instead of typing/attaching them per chat.
ALTER TABLE settings ADD COLUMN IF NOT EXISTS payment_account_name TEXT DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS payment_upi_id TEXT DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS payment_qr_url TEXT DEFAULT '';
