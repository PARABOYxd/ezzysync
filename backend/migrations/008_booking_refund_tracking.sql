-- Cancelling a booking never recorded whether the money collected on it was
-- actually returned to the customer - travel_status flipped to 'Cancelled'
-- and the `paid` amount just sat there looking collected forever, with no
-- way to tell a genuinely refunded booking from one where the deposit was
-- kept. This column is the bookkeeping record of how much actually went
-- back; bookingService checks it never exceeds `paid`.
--
-- Aggregate dashboard/billing numbers already exclude Cancelled bookings
-- entirely (see getDashboardCounts, billingAnalytics), so this doesn't need
-- to change those - it's per-booking record-keeping for the "did we
-- actually pay this back" question an agent or auditor asks about one booking.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
