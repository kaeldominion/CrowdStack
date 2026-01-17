// spec: Unified API Loading & Performance

import { test, expect } from '@playwright/test';

test.describe('Unified API Loading & Performance', () => {
  test('should make single API request to unified endpoint', async ({ page }) => {
    // Track API calls to dashboard endpoints
    const apiCalls = {
      unified: 0,
      organizer: 0,
      venue: 0,
      promoter: 0,
      dj: 0,
    };

    // Intercept network requests to track API calls
    await page.route('**/api/dashboard/**', (route) => {
      const url = route.request().url();
      if (url.includes('/api/dashboard/unified')) {
        apiCalls.unified++;
      }
      route.continue();
    });

    await page.route('**/api/organizer/dashboard-stats', (route) => {
      apiCalls.organizer++;
      route.continue();
    });

    await page.route('**/api/venue/dashboard-stats', (route) => {
      apiCalls.venue++;
      route.continue();
    });

    await page.route('**/api/promoter/dashboard-stats', (route) => {
      apiCalls.promoter++;
      route.continue();
    });

    await page.route('**/api/dj/dashboard-stats', (route) => {
      apiCalls.dj++;
      route.continue();
    });

    // 1. Navigate to http://localhost:3000/login
    await page.goto('http://localhost:3000/login');

    // 2. Log in with test user credentials
    await page.getByRole('button', { name: 'Use password instead' }).click();
    await page.getByRole('textbox', { name: 'Email' }).fill('test@crowdstack.app');
    await page.getByRole('textbox', { name: 'Password' }).fill('test123');
    await page.locator('form').getByRole('button', { name: 'Sign In' }).click();

    // Wait for navigation after login (should redirect to dashboard)
    await page.waitForURL('**/app/**', { timeout: 10000 });

    // 4. Navigate to /app/organizer (if not already there)
    await page.goto('http://localhost:3000/app/organizer');

    // 5. Wait for dashboard to fully load (wait for loading skeletons to disappear)
    // Wait for the unified API call to complete
    await page.waitForResponse(
      (response) => response.url().includes('/api/dashboard/unified') && response.status() === 200,
      { timeout: 15000 }
    );

    // Wait for dashboard content to appear (not loading state)
    await expect(page.getByRole('main')).toBeVisible();

    // Expected Results:
    // - Network log shows exactly ONE request to /api/dashboard/unified
    expect(apiCalls.unified, 'Should make exactly one request to /api/dashboard/unified').toBe(1);

    // - No separate requests to old dashboard endpoints
    expect(apiCalls.organizer, 'Should not call /api/organizer/dashboard-stats').toBe(0);
    expect(apiCalls.venue, 'Should not call /api/venue/dashboard-stats').toBe(0);
    expect(apiCalls.promoter, 'Should not call /api/promoter/dashboard-stats').toBe(0);
    expect(apiCalls.dj, 'Should not call /api/dj/dashboard-stats').toBe(0);

    // - Dashboard displays content (not error state)
    // Verify no error messages are shown
    await expect(page.getByText(/error|failed|something went wrong/i)).not.toBeVisible();
  });
});
