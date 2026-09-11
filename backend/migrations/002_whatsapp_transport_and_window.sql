-- Which WhatsApp connection a chat arrived on.
--
-- The QR-linked path and the Meta Cloud API path both write to
-- whatsapp_chats, and nothing recorded which one a chat belongs to. They are
-- not interchangeable: Cloud API only permits free-form replies inside the
-- 24-hour customer service window and needs an approved template outside it,
-- while a QR-linked number has no such rule. Without this column the inbox
-- cannot tell an agent which rules apply to the chat in front of them.
--
-- Everything that exists today came in over the QR path, so that is the
-- backfill. New Cloud API chats set it explicitly.

ALTER TABLE whatsapp_chats
  ADD COLUMN IF NOT EXISTS transport TEXT NOT NULL DEFAULT 'web';

-- 'web'       - QR-linked companion device (no window rule)
-- 'cloud_api' - Meta Cloud API (24-hour window, templates outside it)
ALTER TABLE whatsapp_chats
  DROP CONSTRAINT IF EXISTS whatsapp_chats_transport_check;

ALTER TABLE whatsapp_chats
  ADD CONSTRAINT whatsapp_chats_transport_check
  CHECK (transport IN ('web', 'cloud_api'));

-- When the customer last wrote. The window is measured from this, and reading
-- it off the messages table on every chat-list render would mean a subquery
-- per row; the inbox polls every few seconds.
ALTER TABLE whatsapp_chats
  ADD COLUMN IF NOT EXISTS last_inbound_at TIMESTAMPTZ;

-- Backfill from what is already stored, so existing chats show a correct
-- window immediately rather than all looking expired.
UPDATE whatsapp_chats c
   SET last_inbound_at = latest.ts
  FROM (
    SELECT chat_id, MAX(message_timestamp) AS ts
      FROM whatsapp_messages
     WHERE direction = 'inbound'
     GROUP BY chat_id
  ) AS latest
 WHERE latest.chat_id = c.id
   AND c.last_inbound_at IS NULL;
