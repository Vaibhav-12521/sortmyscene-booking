export default {
  testEnvironment: 'node',
  // We run native ESM (type: module) — no Babel transform needed.
  transform: {},
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 30000,
};
