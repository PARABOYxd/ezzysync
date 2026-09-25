-- Migration 019: Repair chats stuck on the wrong WhatsApp connection.
--
-- `jid` is only ever written by the QR/Baileys path (the Cloud API side has
-- no such concept), so a chat carrying a jid is one the customer is really
-- talking to over the QR socket. Those rows could still say
-- transport = 'cloud_api' - set when the chat was first opened at a moment
-- when only Cloud API credentials existed - and nothing ever corrected it,
-- so every reply was posted to Meta and came back as "WhatsApp is not
-- connected or permissions expired" while the inbox header showed the QR
-- number connected.
--
-- Going forward each inbound message fixes this itself (see
-- whatsappWebRepository.recordInboundOnChat and whatsappRepository.saveMessage).
UPDATE whatsapp_chats
SET transport = 'web', updated_at = now()
WHERE transport = 'cloud_api'
  AND jid IS NOT NULL
  AND jid <> '';
