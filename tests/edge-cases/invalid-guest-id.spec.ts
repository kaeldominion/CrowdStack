// spec: /Users/spencertarring/kaeldominion/CrowdStack/table-booking-guest-pass.plan.md
// seed: tests/seed.spec.ts
// Run with: pnpm test:e2e --project=chromium (unauthenticated)

import { test, expect } from '@playwright/test';

test.describe('Edge Cases and Error Handling', () => {
  test('Invalid guest ID in pass URL', async ({ page }, testInfo) => {
    // Skip if not running with chromium (unauthenticated) project
    test.skip(testInfo.project.name !== 'chromium', 'This test requires unauthenticated access');

    // 1. Navigate to /table-pass with null UUID
    await page.goto('/table-pass/00000000-0000-0000-0000-000000000000');

    // Wait for loading to complete
    await page.getByText(/loading/i).waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // 2. Verify error page displays or redirect to login
    const hasError1 = await page.getByText(/pass not found|error|not found|authentication|sign in/i).first().isVisible({ timeout: 5000 }).catch(() => false);
    const isOnLogin1 = page.url().includes('/login');
    expect(hasError1 || isOnLogin1).toBeTruthy();

    // 3. Navigate to /table-pass with invalid format
    await page.goto('/table-pass/invalid-uuid-format');

    // Wait for loading to complete
    await page.getByText(/loading/i).waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // 4. Verify error page displays or redirect to login
    const hasError2 = await page.getByText(/pass not found|error|not found|invalid|sign in/i).first().isVisible({ timeout: 5000 }).catch(() => false);
    const isOnLogin2 = page.url().includes('/login');
    expect(hasError2 || isOnLogin2).toBeTruthy();
  });
});
