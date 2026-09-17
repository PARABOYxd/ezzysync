-- Migration 013: Split the single "auto-send invoice" toggle into independent
-- Email / WhatsApp channels, so an agency can turn one on without the other.
-- Existing autoSendInvoice=true tenants are backfilled to both channels on,
-- matching what the old combined toggle's label ("via Email/WhatsApp") implied.
ALTER TABLE settings ADD COLUMN IF NOT EXISTS auto_send_invoice_email BOOLEAN DEFAULT FALSE;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS auto_send_invoice_whatsapp BOOLEAN DEFAULT FALSE;

UPDATE settings
   SET auto_send_invoice_email = TRUE,
       auto_send_invoice_whatsapp = TRUE
 WHERE auto_send_invoice = TRUE;
