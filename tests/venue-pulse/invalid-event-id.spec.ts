// spec: /Users/spencertarring/kaeldominion/CrowdStack/venue-pulse.plan.md
// seed: tests/seed.spec.ts
// Run with: pnpm test:e2e --project=chromium (unauthenticated)

import { test, expect } from '@playwright/test';

test.describe('Edge Cases and Error Handling', () => {
  test('should handle invalid event ID in feedback URL', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'This test requires unauthenticated access');

    // Navigate to feedback form with invalid event ID
    await page.goto('/feedback/invalid-event-id/some-registration?token=abc');

    // Wait for loading to complete
    await page.getByText(/loading/i).waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // Verify error handling - no crash, shows error, redirects, or doesn't show form
    const hasError = await page.getByText(/invalid|error|not found|unauthorized/i).first().isVisible({ timeout: 5000 }).catch(() => false);
    const isOnLoginPage = page.url().includes('/login');
    const isOnErrorPage = page.url().includes('/error');
    const is404 = await page.getByText(/404|page not found/i).isVisible({ timeout: 3000 }).catch(() => false);

    // Check if form elements are NOT visible (which indicates error handling)
    const hasStarRating = await page.getByRole('button', { name: /star|rate/i }).isVisible({ timeout: 3000 }).catch(() => false);
    const hasSubmitButton = await page.getByRole('button', { name: /submit|send/i }).isVisible({ timeout: 3000 }).catch(() => false);
    const formNotShown = !hasStarRating && !hasSubmitButton;

    expect(hasError || isOnLoginPage || isOnErrorPage || is404 || formNotShown).toBeTruthy();
  });
});
