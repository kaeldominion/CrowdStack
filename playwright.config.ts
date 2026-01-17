import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '.env.test.local') });

/**
 * Playwright configuration for CrowdStack E2E tests
 * Tests run against localhost:3000
 *
 * Auth Setup:
 * - The 'setup' project runs first and authenticates as each test user
 * - Auth state is saved to .auth/*.json files
 * - Role-specific projects use pre-authenticated state for faster tests
 *
 * Running tests:
 * - `pnpm test:e2e` - Run all tests with chromium (default)
 * - `pnpm test:e2e --project=attendee` - Run only as attendee
 * - `pnpm test:e2e --project=venue` - Run only as venue admin
 */

// Auth state file paths
const STORAGE_STATE = {
  attendee1: '.auth/attendee-1.json',
  attendee2: '.auth/attendee-2.json',
  attendee3: '.auth/attendee-3.json',
  promoter: '.auth/promoter.json',
  dj: '.auth/dj.json',
  organizer: '.auth/organizer.json',
  venue: '.auth/venue.json',
  superadmin: '.auth/superadmin.json',
};

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Setup project - authenticates and saves state for all test users
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },

    // Default project - no authentication (for public pages)
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /auth\.setup\.ts/,
    },

    // Role-specific authenticated projects
    {
      name: 'attendee',
      use: {
        ...devices['Desktop Chrome'],
        storageState: STORAGE_STATE.attendee1,
      },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
    },
    {
      name: 'attendee-2',
      use: {
        ...devices['Desktop Chrome'],
        storageState: STORAGE_STATE.attendee2,
      },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
    },
    {
      name: 'attendee-3',
      use: {
        ...devices['Desktop Chrome'],
        storageState: STORAGE_STATE.attendee3,
      },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
    },
    {
      name: 'promoter',
      use: {
        ...devices['Desktop Chrome'],
        storageState: STORAGE_STATE.promoter,
      },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
    },
    {
      name: 'dj',
      use: {
        ...devices['Desktop Chrome'],
        storageState: STORAGE_STATE.dj,
      },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
    },
    {
      name: 'organizer',
      use: {
        ...devices['Desktop Chrome'],
        storageState: STORAGE_STATE.organizer,
      },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
    },
    {
      name: 'venue',
      use: {
        ...devices['Desktop Chrome'],
        storageState: STORAGE_STATE.venue,
      },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
    },
    {
      name: 'superadmin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: STORAGE_STATE.superadmin,
      },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

// Export storage state paths for use in tests
export { STORAGE_STATE };
