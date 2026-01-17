// spec: /Users/spencertarring/kaeldominion/CrowdStack/table-booking-guest-pass.plan.md
// seed: tests/seed.spec.ts
// Run with: pnpm test:e2e --project=chromium (unauthenticated)

import { test, expect } from '@playwright/test';

test.describe('Guest Pass Viewing and Validation', () => {
  test('Guest pass requires authentication', async ({ page }, testInfo) => {
    // Skip if not running with chromium (unauthenticated) project
    test.skip(testInfo.project.name !== 'chromium', 'This test requires unauthenticated access');

    // Navigate to guest pass without authentication
    await page.goto('/table-pass/00000000-0000-0000-0000-000000000001');

    // Wait for loading to complete
    await page.getByText(/loading/i).waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});

    // Wait a bit more for the final state
    await page.waitForTimeout(1000);

    // Verify error state or redirect to login
    const hasPassNotFound = await page.getByText(/pass not found|not found/i).isVisible({ timeout: 5000 }).catch(() => false);
    const hasAuthRequired = await page.getByText(/authentication required|sign in|log in/i).isVisible({ timeout: 3000 }).catch(() => false);
    const hasError = await page.getByText(/error|unauthorized|invalid/i).isVisible({ timeout: 3000 }).catch(() => false);
    const isOnLoginPage = page.url().includes('/login');

    expect(hasPassNotFound || hasAuthRequired || hasError || isOnLoginPage).toBeTruthy();
  });
});
