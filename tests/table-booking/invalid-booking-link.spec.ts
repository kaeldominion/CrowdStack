// spec: /Users/spencertarring/kaeldominion/CrowdStack/table-booking-guest-pass.plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Table Booking Flow', () => {
  test('Invalid or expired booking link', async ({ page }) => {
    // 1. Navigate to /book/INVALID_CODE where INVALID_CODE is a non-existent code
    await page.goto('http://localhost:3000/book/INVALID_CODE');

    // 2. Verify error state is displayed - wait for error title to appear
    await page.getByText("Booking Link Invalid").first().waitFor({ state: 'visible' });

    // 3. Verify error title displays 'Booking Link Invalid'
    await expect(page.getByRole('heading', { name: 'Booking Link Invalid' })).toBeVisible();

    // 4. Verify error message displays 'Booking link not found. Please check the link and try again.'
    await expect(page.getByText('Booking link not found. Please check the link and try again.')).toBeVisible();

    // 5. Verify 'Go Home' button is present
    await expect(page.getByRole('button', { name: 'Go Home' })).toBeVisible();
  });
});
