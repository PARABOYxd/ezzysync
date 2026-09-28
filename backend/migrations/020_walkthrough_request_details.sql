-- Migration 020: Columns the "Request Access" form writes.
--
-- The request form was extended (city, state, speciality, social links, GST,
-- visiting card) and walkthroughRepository.insertWalkthroughRequest started
-- inserting those columns, but nothing ever added them. Every submission
-- failed with 'column "city" of relation "walkthrough_requests" does not
-- exist' - a 500 on the only way a visitor can ask for an account while
-- self-signup is closed.
--
-- All optional on the form, so all default to '' like the insert does.

ALTER TABLE walkthrough_requests ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '';
ALTER TABLE walkthrough_requests ADD COLUMN IF NOT EXISTS state TEXT DEFAULT '';
ALTER TABLE walkthrough_requests ADD COLUMN IF NOT EXISTS travel_speciality TEXT DEFAULT '';
ALTER TABLE walkthrough_requests ADD COLUMN IF NOT EXISTS website_or_instagram TEXT DEFAULT '';
ALTER TABLE walkthrough_requests ADD COLUMN IF NOT EXISTS instagram_link TEXT DEFAULT '';
ALTER TABLE walkthrough_requests ADD COLUMN IF NOT EXISTS website_link TEXT DEFAULT '';
ALTER TABLE walkthrough_requests ADD COLUMN IF NOT EXISTS gst_number TEXT DEFAULT '';
ALTER TABLE walkthrough_requests ADD COLUMN IF NOT EXISTS visiting_card_url TEXT DEFAULT '';
