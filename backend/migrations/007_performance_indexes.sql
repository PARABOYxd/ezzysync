-- Columns that are filtered/joined on in hot paths but have never had an
-- index beyond the implicit one on tenant_id.
--
-- bookings.batch_id: batchRepository's CAPACITY_SUBQUERY scans bookings by
-- batch_id twice per row returned from listBatches - which dashboardStats
-- calls on every dashboard load. Without this index each subquery is a scan
-- of every booking row across every tenant.
--
-- bookings.phone / leads.phone: whatsappController's webhook handler looks
-- up both tables by phone on every single inbound WhatsApp message, not on
-- an occasional page load - this is the hottest read path in the app.
--
-- bookings.customer_id / bookings.source_quotation_id: read on customer
-- profile pages and when converting/re-syncing a Quotation into a booking.
--
-- leads.batch_id / leads.assigned_to / leads.stage: batch-assignment lookups
-- and the leads pipeline/Kanban and pool queries filter on these.
--
-- expenses.booking_id / expenses.batch_id: joined in listExpenses and used
-- directly by listExpensesByBookingId.
--
-- None of this changes behaviour - these are pure lookup-speed additions.

CREATE INDEX IF NOT EXISTS idx_bookings_batch_id ON bookings(batch_id);
CREATE INDEX IF NOT EXISTS idx_bookings_phone ON bookings(phone);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_source_quotation_id ON bookings(source_quotation_id);

CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_batch_id ON leads(batch_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);

CREATE INDEX IF NOT EXISTS idx_expenses_booking_id ON expenses(booking_id);
CREATE INDEX IF NOT EXISTS idx_expenses_batch_id ON expenses(batch_id);
