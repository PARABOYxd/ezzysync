-- 012_booking_reminders.sql
-- Adds reminders_sent tracking array to bookings table

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS reminders_sent JSONB DEFAULT '[]'::jsonb;
