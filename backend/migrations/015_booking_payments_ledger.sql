-- Migration 015: A minimal per-installment payment ledger for bookings.
-- bookings.paid stays the authoritative running total (unchanged behaviour
-- for booking creation/edit); this table is the audit trail behind it - each
-- row is one payment event with date/method/reference, so logging another
-- installment no longer means re-computing and retyping a new total by hand.
CREATE TABLE IF NOT EXISTS booking_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  method TEXT NOT NULL DEFAULT 'Cash',
  reference TEXT DEFAULT '',
  paid_on TEXT NOT NULL,
  notes TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_booking_payments_booking ON booking_payments(tenant_id, booking_id);
