import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: false,
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ||
        'postgresql://postgres:postgres@localhost:5432/ilms_test?schema=public',
      JWT_SECRET: 'test_jwt_secret',
      REFRESH_SECRET: 'test_refresh_secret',
      JWT_EXPIRES_IN: '1d',
      REFRESH_EXPIRES_IN: '7d',
      CORS_ORIGIN: 'http://localhost:5173',
      IOT_OFFLINE_THRESHOLD_MINUTES: '2'
    }
  }
});
