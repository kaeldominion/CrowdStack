/**
 * Auth Fixtures for Playwright Tests
 *
 * This module provides authenticated test fixtures for each user role.
 * Use these when you need to write tests that require a specific role.
 *
 * Usage:
 *
 * 1. For tests that need a specific role, use the project in playwright.config.ts:
 *    npx playwright test --project=venue
 *
 * 2. For tests that need to switch between users or test multiple roles:
 *    import { test, expect } from '../fixtures/auth';
 *    test('my test', async ({ attendeePage, venuePage }) => { ... });
 *
 * 3. For simple unauthenticated tests:
 *    import { test, expect } from '@playwright/test';
 */

import { test as base, expect, Page, Browser, BrowserContext } from '@playwright/test';
import * as path from 'path';

// Storage state paths (must match playwright.config.ts)
const AUTH_DIR = path.join(__dirname, '..', '..', '.auth');

const STORAGE_STATES = {
  attendee1: path.join(AUTH_DIR, 'attendee-1.json'),
  attendee2: path.join(AUTH_DIR, 'attendee-2.json'),
  attendee3: path.join(AUTH_DIR, 'attendee-3.json'),
  promoter: path.join(AUTH_DIR, 'promoter.json'),
  dj: path.join(AUTH_DIR, 'dj.json'),
  organizer: path.join(AUTH_DIR, 'organizer.json'),
  venue: path.join(AUTH_DIR, 'venue.json'),
  superadmin: path.join(AUTH_DIR, 'superadmin.json'),
};

// Test user emails (for reference in tests)
export const TEST_USERS = {
  attendee1: {
    email: process.env.TEST_ATTENDEE_1_EMAIL || 'test-attendee-1@crowdstack.app',
    role: 'attendee',
  },
  attendee2: {
    email: process.env.TEST_ATTENDEE_2_EMAIL || 'test-attendee-2@crowdstack.app',
    role: 'attendee',
  },
  attendee3: {
    email: process.env.TEST_ATTENDEE_3_EMAIL || 'test-attendee-3@crowdstack.app',
    role: 'attendee',
  },
  promoter: {
    email: process.env.TEST_PROMOTER_EMAIL || 'test-promoter@crowdstack.app',
    role: 'promoter',
  },
  dj: {
    email: process.env.TEST_DJ_EMAIL || 'test-dj@crowdstack.app',
    role: 'dj',
  },
  organizer: {
    email: process.env.TEST_ORGANIZER_EMAIL || 'test-organizer@crowdstack.app',
    role: 'event_organizer',
  },
  venue: {
    email: process.env.TEST_VENUE_EMAIL || 'test-venue@crowdstack.app',
    role: 'venue_admin',
  },
  superadmin: {
    email: process.env.TEST_SUPERADMIN_EMAIL || 'test-superadmin@crowdstack.app',
    role: 'superadmin',
  },
} as const;

// Fixture type definitions
type AuthFixtures = {
  // Individual authenticated pages (for multi-user tests)
  attendeePage: Page;
  attendee2Page: Page;
  attendee3Page: Page;
  promoterPage: Page;
  djPage: Page;
  organizerPage: Page;
  venuePage: Page;
  superadminPage: Page;

  // Contexts (for advanced scenarios)
  attendeeContext: BrowserContext;
  venueContext: BrowserContext;
  organizerContext: BrowserContext;
};

/**
 * Helper to create an authenticated context and page
 */
async function createAuthenticatedPage(
  browser: Browser,
  storageStatePath: string
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ storageState: storageStatePath });
  const page = await context.newPage();
  return { context, page };
}

/**
 * Extended test with authenticated fixtures
 *
 * Use this when you need multiple authenticated users in the same test,
 * or when you want to explicitly control which user you're testing as.
 */
export const test = base.extend<AuthFixtures>({
  // Attendee pages
  attendeePage: async ({ browser }, use) => {
    const { context, page } = await createAuthenticatedPage(browser, STORAGE_STATES.attendee1);
    await use(page);
    await context.close();
  },
  attendee2Page: async ({ browser }, use) => {
    const { context, page } = await createAuthenticatedPage(browser, STORAGE_STATES.attendee2);
    await use(page);
    await context.close();
  },
  attendee3Page: async ({ browser }, use) => {
    const { context, page } = await createAuthenticatedPage(browser, STORAGE_STATES.attendee3);
    await use(page);
    await context.close();
  },

  // Other role pages
  promoterPage: async ({ browser }, use) => {
    const { context, page } = await createAuthenticatedPage(browser, STORAGE_STATES.promoter);
    await use(page);
    await context.close();
  },
  djPage: async ({ browser }, use) => {
    const { context, page } = await createAuthenticatedPage(browser, STORAGE_STATES.dj);
    await use(page);
    await context.close();
  },
  organizerPage: async ({ browser }, use) => {
    const { context, page } = await createAuthenticatedPage(browser, STORAGE_STATES.organizer);
    await use(page);
    await context.close();
  },
  venuePage: async ({ browser }, use) => {
    const { context, page } = await createAuthenticatedPage(browser, STORAGE_STATES.venue);
    await use(page);
    await context.close();
  },
  superadminPage: async ({ browser }, use) => {
    const { context, page } = await createAuthenticatedPage(browser, STORAGE_STATES.superadmin);
    await use(page);
    await context.close();
  },

  // Contexts (for tests that need to manage multiple pages per user)
  attendeeContext: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: STORAGE_STATES.attendee1 });
    await use(context);
    await context.close();
  },
  venueContext: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: STORAGE_STATES.venue });
    await use(context);
    await context.close();
  },
  organizerContext: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: STORAGE_STATES.organizer });
    await use(context);
    await context.close();
  },
});

export { expect };
