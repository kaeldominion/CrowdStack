/**
 * Auth Setup - Authenticates all test users and saves their session state
 *
 * This runs before all authenticated test projects.
 * Each user's auth state is saved to .auth/*.json for reuse.
 *
 * Test users must be created first: npx tsx scripts/seed-test-users.ts
 */

import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Ensure .auth directory exists
const authDir = path.join(__dirname, '..', '.auth');
if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true });
}

// Test user credentials from environment
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

const testUsers = [
  {
    name: 'attendee-1',
    email: process.env.TEST_ATTENDEE_1_EMAIL || 'test-attendee-1@crowdstack.app',
    storageState: '.auth/attendee-1.json',
  },
  {
    name: 'attendee-2',
    email: process.env.TEST_ATTENDEE_2_EMAIL || 'test-attendee-2@crowdstack.app',
    storageState: '.auth/attendee-2.json',
  },
  {
    name: 'attendee-3',
    email: process.env.TEST_ATTENDEE_3_EMAIL || 'test-attendee-3@crowdstack.app',
    storageState: '.auth/attendee-3.json',
  },
  {
    name: 'promoter',
    email: process.env.TEST_PROMOTER_EMAIL || 'test-promoter@crowdstack.app',
    storageState: '.auth/promoter.json',
  },
  {
    name: 'dj',
    email: process.env.TEST_DJ_EMAIL || 'test-dj@crowdstack.app',
    storageState: '.auth/dj.json',
  },
  {
    name: 'organizer',
    email: process.env.TEST_ORGANIZER_EMAIL || 'test-organizer@crowdstack.app',
    storageState: '.auth/organizer.json',
  },
  {
    name: 'venue',
    email: process.env.TEST_VENUE_EMAIL || 'test-venue@crowdstack.app',
    storageState: '.auth/venue.json',
  },
  {
    name: 'superadmin',
    email: process.env.TEST_SUPERADMIN_EMAIL || 'test-superadmin@crowdstack.app',
    storageState: '.auth/superadmin.json',
  },
];

/**
 * Helper to authenticate a user and save their session state
 */
async function authenticateUser(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
  storageStatePath: string
) {
  // Navigate to login page
  await page.goto('/login');

  // Fill in email
  const emailInput = page.getByRole('textbox', { name: /email/i });
  await emailInput.fill(email);

  // Click "Use password instead" to switch from magic link to password mode
  const usePasswordButton = page.getByRole('button', { name: /use password instead/i });
  await usePasswordButton.click();

  // Wait for password field to appear and fill it
  const passwordInput = page.getByLabel(/password/i);
  await passwordInput.waitFor({ state: 'visible' });
  await passwordInput.fill(password);

  // Submit login (use form submit button, not the tab switcher)
  const loginButton = page.locator('form').getByRole('button', { name: /sign in/i });
  await loginButton.click();

  // Wait for either: redirect away from login, OR onboarding page appears
  const onboardingHeading = page.getByRole('heading', { name: /one more step/i });
  const dashboardIndicator = page.getByRole('heading', { name: /dashboard/i });

  // Wait for something to happen after login
  await Promise.race([
    expect(page).not.toHaveURL(/\/login/, { timeout: 20000 }),
    onboardingHeading.waitFor({ state: 'visible', timeout: 20000 }),
    dashboardIndicator.waitFor({ state: 'visible', timeout: 20000 }),
  ]).catch(() => {});

  // Handle onboarding if shown (new users need to complete profile)
  // The onboarding page can appear at /login URL
  if (await onboardingHeading.isVisible().catch(() => false)) {
    // Fill in required onboarding fields
    const lastNameInput = page.getByRole('textbox', { name: /smith/i });
    await lastNameInput.fill('Tester');

    // Fill date of birth (HTML5 date input requires YYYY-MM-DD format)
    const dobInput = page.locator('input[type="date"]');
    await dobInput.fill('1990-01-01');

    // Select gender
    const maleButton = page.getByRole('button', { name: /^male$/i });
    await maleButton.click();

    // Submit onboarding
    const continueButton = page.getByRole('button', { name: /continue/i });
    await continueButton.click();

    // Wait for onboarding to complete and redirect
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
  }

  // Wait for page to stabilize
  await page.waitForLoadState('networkidle');

  // Save storage state (cookies + localStorage)
  await page.context().storageState({ path: storageStatePath });
}

// Generate a setup test for each user
for (const user of testUsers) {
  setup(`authenticate as ${user.name}`, async ({ page }) => {
    await authenticateUser(page, user.email, TEST_PASSWORD, user.storageState);
  });
}
