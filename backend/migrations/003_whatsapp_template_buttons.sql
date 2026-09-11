-- Quick-reply buttons on a template.
--
-- Outside the 24-hour window a template is the only thing Meta will deliver,
-- and the window re-opens only when the customer sends something back. A
-- button tap counts as sending something, and far more people tap than type -
-- so buttons are what actually re-opens the conversation, not the wording.
--
-- Stored as a JSON array of label strings; Meta's QUICK_REPLY components are
-- built from it at submission time.

ALTER TABLE whatsapp_templates
  ADD COLUMN IF NOT EXISTS buttons JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Marks the ones shipped with the product, so a tenant's own templates are
-- never overwritten when the starter set changes.
ALTER TABLE whatsapp_templates
  ADD COLUMN IF NOT EXISTS is_starter BOOLEAN NOT NULL DEFAULT FALSE;

-- A tenant cannot hold two templates under one name; Meta treats the name as
-- the identifier, and seeding needs something to conflict on.
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_templates_tenant_name
  ON whatsapp_templates(tenant_id, name);
