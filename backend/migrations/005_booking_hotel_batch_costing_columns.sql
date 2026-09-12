-- Booking columns bookingRepository writes on every create/update but that
-- were never part of the schema.
--
-- insertBooking/updateBooking have unconditionally written hotel_id,
-- room_category, hotel_booking_status, hotel_confirmation_no, batch_id,
-- cost_template_id and sharing_type for a while. None of the seven exist on
-- a database built from config/db.js - only ever masked by a database that
-- already had them from before this file's history, same as 004.
--
-- The effect on a fresh deployment: creating or updating ANY booking fails
-- outright with "column does not exist", because the INSERT/UPDATE names
-- all seven regardless of whether the caller sent hotel/batch/costing data.
--
-- Found by writing the first integration test bookingService ever had,
-- against the fresh database CI builds.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS hotel_id UUID REFERENCES hotels(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS room_category TEXT DEFAULT '';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS hotel_booking_status TEXT DEFAULT 'Pending';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS hotel_confirmation_no TEXT DEFAULT '';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES tour_batches(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cost_template_id UUID REFERENCES trip_cost_templates(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS sharing_type TEXT DEFAULT 'Double';
