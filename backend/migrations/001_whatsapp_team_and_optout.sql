-- Who sent a message, and who asked us to stop.
--
-- 1. whatsapp_messages knew a message came from an "agent" but not which one,
--    so an inbox shared by a team was unattributable: the app labelled every
--    outbound message "Agent (You)" regardless of who actually typed it, and an
--    owner could not see which of their staff had replied to a customer.
--
-- 2. A customer who replies "STOP" has to be honoured. Ignoring it is what
--    earns blocks and reports, and a high block rate is the single most
--    reliable way to get a WhatsApp number banned.

ALTER TABLE whatsapp_messages
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Owner-facing reports group by sender, so the lookup is by chat and author.
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user
  ON whatsapp_messages(tenant_id, user_id)
  WHERE user_id IS NOT NULL;

ALTER TABLE whatsapp_chats
  ADD COLUMN IF NOT EXISTS opted_out BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE whatsapp_chats
  ADD COLUMN IF NOT EXISTS opted_out_at TIMESTAMPTZ;
