-- Migration 018: batchRepository.nextBatchSeq() reads tour_batches_seq to
-- number new batches (TB-<n>), but nothing ever created the sequence. Any
-- database that did not already have it by hand - every fresh deploy, every
-- test database - answered every "create tour batch" with a 500.
CREATE SEQUENCE IF NOT EXISTS tour_batches_seq START 1000;

-- Where batches already exist without the sequence having numbered them,
-- start past the highest TB- number in use so the next id cannot collide
-- with one already taken. Never moves an existing sequence backwards.
SELECT setval(
  'tour_batches_seq',
  GREATEST(
    (SELECT last_value FROM tour_batches_seq),
    COALESCE(
      (SELECT MAX(substring(batch_id FROM '^TB-([0-9]+)$')::bigint) FROM tour_batches),
      1000
    )
  )
);
