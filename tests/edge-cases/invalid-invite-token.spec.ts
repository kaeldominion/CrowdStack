// spec: /Users/spencertarring/kaeldominion/CrowdStack/table-booking-guest-pass.plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Edge Cases and Error Handling', () => {
  test('Invalid invite token', async ({ page }) => {
    // 1. Navigate to /table-party/join/00000000-0000-0000-0000-000000000000
    await page.goto('http://localhost:3000/table-party/join/00000000-0000-0000-0000-000000000000');

    // 2. Verify appropriate error page displays
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Page Not Found' })).toBeVisible();
    await expect(page.getByText('The page you\'re looking for doesn\'t exist or has been moved.')).toBeVisible();

    // 3. Navigate to /table-party/join/invalid-format
    await page.goto('http://localhost:3000/table-party/join/invalid-format');

    // 4. Verify appropriate error page displays
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Page Not Found' })).toBeVisible();
    await expect(page.getByText('The page you\'re looking for doesn\'t exist or has been moved.')).toBeVisible();
  });
});
