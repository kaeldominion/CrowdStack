// spec: /Users/spencertarring/kaeldominion/CrowdStack/venue-pulse.plan.md
// seed: tests/seed.spec.ts
// Run with: pnpm test:e2e --project=chromium (unauthenticated)

import { test, expect } from '@playwright/test';

test.describe('Feedback Submission Form', () => {
  test('should handle invalid token', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'This test requires unauthenticated access');

    // Navigate to feedback form with invalid token
    await page.goto('/feedback/00000000-0000-0000-0000-000000000001/00000000-0000-0000-0000-000000000002?token=invalid-token');

    // Wait for loading to complete
    await page.getByText(/loading/i).waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // Verify error handling - should show error, redirect, or show minimal page without form
    const hasError = await page.getByText(/invalid|error|not found|expired|unauthorized/i).first().isVisible({ timeout: 5000 }).catch(() => false);
    const isOnLoginPage = page.url().includes('/login');
    const isOnErrorPage = page.url().includes('/error');

    // Check if form elements are NOT visible (which indicates error handling)
    const hasStarRating = await page.getByRole('button', { name: /star|rate/i }).isVisible({ timeout: 3000 }).catch(() => false);
    const hasSubmitButton = await page.getByRole('button', { name: /submit|send/i }).isVisible({ timeout: 3000 }).catch(() => false);
    const formNotShown = !hasStarRating && !hasSubmitButton;

    expect(hasError || isOnLoginPage || isOnErrorPage || formNotShown).toBeTruthy();
  });
});
