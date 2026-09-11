/**
 * Tests run against a real Postgres, in one process, one file at a time.
 *
 * They share a database, so running files in parallel would have them stepping
 * on each other's rows. Correctness over speed: the suite is fast enough that
 * the trade is not worth arguing about.
 */
export default {
  test: {
    environment: 'node',
    globalSetup: './tests/globalSetup.js',
    include: ['tests/**/*.test.mjs'],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
    reporters: ['default'],
  },
};
