-- Two more columns batchRepository writes/reads unconditionally that were
-- never part of the schema - same class of bug as 004 and 005.
--
-- tour_batches.source_quotation_id: written by insertBatch/updateBatch and
-- read by countBySourceQuotation (which guards deleting a Quotation that a
-- batch was generated from). Stores the human-readable quotation code
-- (quote.quotationId), a TEXT value - same type as bookings.source_quotation_id,
-- which already exists for the equivalent booking-from-quotation flow.
--
-- leads.batch_id: written/read by listLeadsForBatch, assignLeadToBatch and
-- unassignLeadFromBatch. Without it, assigning a lead to a Group Tour batch
-- fails outright with "column does not exist" on any fresh database.
--
-- Found the same way as 005: the first integration test this repository ran
-- against a fresh database.

ALTER TABLE tour_batches ADD COLUMN IF NOT EXISTS source_quotation_id TEXT DEFAULT NULL;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES tour_batches(id) ON DELETE SET NULL;
