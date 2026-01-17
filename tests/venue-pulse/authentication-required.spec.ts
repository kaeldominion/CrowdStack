// spec: /Users/spencertarring/kaeldominion/CrowdStack/venue-pulse.plan.md
// seed: tests/seed.spec.ts
// Run with: pnpm test:e2e --project=chromium (unauthenticated)

import { test, expect } from '@playwright/test';

test.describe('Venue Pulse Dashboard Access', () => {
  test('should require venue admin authentication', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'This test requires unauthenticated access');

    // Navigate to Venue Pulse dashboard without authentication
    await page.goto('/app/venue/feedback');

    // Wait for loading to complete
    await page.getByText(/loading/i).waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // Verify redirect to login or access denied
    const isOnLoginPage = page.url().includes('/login');
    const hasAccessDenied = await page.getByText(/sign in|log in|access denied|unauthorized|authentication/i).isVisible({ timeout: 5000 }).catch(() => false);

    expect(isOnLoginPage || hasAccessDenied).toBeTruthy();
  });
});
