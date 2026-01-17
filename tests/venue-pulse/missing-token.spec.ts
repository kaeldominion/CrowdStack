// spec: /Users/spencertarring/kaeldominion/CrowdStack/venue-pulse.plan.md
// seed: tests/seed.spec.ts
// Run with: pnpm test:e2e --project=chromium (unauthenticated)

import { test, expect } from '@playwright/test';

test.describe('Edge Cases and Error Handling', () => {
  test('should handle missing token parameter', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'This test requires unauthenticated access');

    // Navigate to feedback form without token
    await page.goto('/feedback/00000000-0000-0000-0000-000000000001/00000000-0000-0000-0000-000000000002');

    // Wait for loading to complete
    await page.getByText(/loading/i).waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // Verify error handling
    const hasError = await page.getByText(/invalid|error|not found|token|unauthorized|required/i).first().isVisible({ timeout: 5000 }).catch(() => false);
    const isOnLoginPage = page.url().includes('/login');
    const isOnErrorPage = page.url().includes('/error');

    expect(hasError || isOnLoginPage || isOnErrorPage).toBeTruthy();
  });
});
