-- Migration 017: Broadcasts previously vanished the moment the drawer that
-- sent them was closed - the only trace was an audit log entry with no
-- delivery/reply detail. This persists each run and its per-recipient
-- outcome, with enough to join back to whatsapp_messages for real delivery
-- and reply status instead of just the initial send attempt.
CREATE TABLE IF NOT EXISTS broadcast_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id UUID,
  template_name TEXT DEFAULT '',
  sent_by TEXT DEFAULT '',
  requested_count INT NOT NULL DEFAULT 0,
  sent_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_broadcast_logs_tenant ON broadcast_logs(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS broadcast_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES broadcast_logs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  customer_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  chat_id UUID REFERENCES whatsapp_chats(id) ON DELETE SET NULL,
  message_id TEXT DEFAULT NULL,
  sent BOOLEAN NOT NULL DEFAULT FALSE,
  error TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_broadcast ON broadcast_recipients(broadcast_id);
