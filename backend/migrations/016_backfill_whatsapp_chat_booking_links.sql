-- Migration 016: whatsapp_chats.booking_id has existed since an earlier
-- migration but nothing ever wrote to it - every "Active Booking" card in
-- the chat panel has been permanently empty. This backfills the exact-phone
-- matches that already exist; going forward, bookingService links it at
-- creation time (see services/bookingService.js).
UPDATE whatsapp_chats c
SET booking_id = latest.id, updated_at = now()
FROM (
  SELECT DISTINCT ON (tenant_id, phone) id, tenant_id, phone
  FROM bookings
  WHERE deleted = FALSE
  ORDER BY tenant_id, phone, booking_timestamp DESC
) latest
WHERE c.tenant_id = latest.tenant_id
  AND c.phone = latest.phone
  AND c.booking_id IS NULL;
