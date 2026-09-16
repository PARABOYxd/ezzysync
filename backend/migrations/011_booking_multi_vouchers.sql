-- Migration 011: Multi-Driver & Multi-Hotel Vouchers JSONB Support
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS transports JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS hotels_stay JSONB DEFAULT '[]'::jsonb;
