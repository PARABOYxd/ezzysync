-- Columns quotationRepository has written/read unconditionally for a while
-- that were never part of the schema - same bug class as 004/005/006:
-- creating ANY quotation crashed outright with "column does not exist" on a
-- database built from config/db.js, since insertQuotation names all of these
-- regardless of whether the caller sent itinerary/costing data.
--
-- Found the same way as the others: the first integration test this
-- repository ever ran against a fresh database.

ALTER TABLE quotations ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS inclusions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS exclusions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS highlights JSONB DEFAULT '[]'::jsonb;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS pickup_options JSONB DEFAULT '[]'::jsonb;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS banner_url TEXT DEFAULT '';
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS related_quotations JSONB DEFAULT '[]'::jsonb;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS hotel_cost_per_pax NUMERIC(12,2) DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS flight_cost_per_pax NUMERIC(12,2) DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS transport_cost_per_pax NUMERIC(12,2) DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS other_cost_per_pax NUMERIC(12,2) DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS cost_template_id UUID REFERENCES trip_cost_templates(id) ON DELETE SET NULL;
