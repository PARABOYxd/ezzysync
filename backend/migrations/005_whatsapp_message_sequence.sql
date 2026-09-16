-- A stable order for messages that share a timestamp.
--
-- Threads are sorted by message_timestamp, and WhatsApp timestamps have
-- one-second resolution: someone sending three lines in a burst produces three
-- messages with the same value. `ORDER BY message_timestamp` alone leaves
-- their relative order undefined, so Postgres is free to return them
-- differently between two identical queries - and the inbox re-fetches every
-- three seconds, so a conversation can visibly reshuffle while it is being
-- read.
--
-- A sequence gives each row a monotonically increasing number, so ties fall
-- back to the order the messages actually arrived in. Backfilled by timestamp
-- so existing threads keep the order they already appeared to have.

ALTER TABLE whatsapp_messages
  ADD COLUMN IF NOT EXISTS seq BIGSERIAL;

-- The index the thread query uses, in the order it reads them.
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_chat_seq
  ON whatsapp_messages(chat_id, message_timestamp ASC, seq ASC);
