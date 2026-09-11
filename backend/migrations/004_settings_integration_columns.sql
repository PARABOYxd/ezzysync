-- Settings columns the application reads and writes but never created.
--
-- Nine of the twenty-four columns in settingsSchema's COLUMN_MAP did not
-- exist on a database built from scratch. They are present on the machines
-- this app has been running on because they were added there at some point
-- and the creating statement was later edited away - so every existing
-- environment looks fine and a brand-new one is broken.
--
-- The effect on a fresh deployment: connecting WhatsApp Business or Instagram
-- fails outright, because updateSettings writes to columns that are not there,
-- and the Meta webhook can never resolve a tenant because the phone number id
-- it looks up has nowhere to live.
--
-- Found by running the WhatsApp webhook audit against an empty database, which
-- is the whole reason CI builds one.

ALTER TABLE settings ADD COLUMN IF NOT EXISTS auto_send_invoice BOOLEAN DEFAULT FALSE;

-- Meta WhatsApp Business, per tenant.
ALTER TABLE settings ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id TEXT DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS whatsapp_access_token TEXT DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS whatsapp_waba_id TEXT DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS whatsapp_business_id TEXT DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS whatsapp_app_secret TEXT DEFAULT '';

-- Instagram, per tenant.
ALTER TABLE settings ADD COLUMN IF NOT EXISTS instagram_username TEXT DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS instagram_account_id TEXT DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS instagram_access_token TEXT DEFAULT '';

-- The webhook resolves a tenant by this, on every inbound message.
CREATE INDEX IF NOT EXISTS idx_settings_whatsapp_phone_number_id
  ON settings(whatsapp_phone_number_id)
  WHERE whatsapp_phone_number_id <> '';
