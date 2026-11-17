import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./tests/global-setup.ts'],
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 120_000,
    env: {
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb://placeholder-overridden-in-tests',
      JWT_ACCESS_SECRET: 'test-access-secret-that-is-long-enough-123456',
      JWT_REFRESH_SECRET: 'test-refresh-secret-that-is-long-enough-654321',
      CORS_ORIGINS: 'http://localhost:3000',
    },
  },
});
