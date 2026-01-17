// spec: Unified API Loading & Performance - should load instantly from cache on re-navigation
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Unified API Loading & Performance', () => {
  test('should load instantly from cache on re-navigation', async ({ page }) => {
    // Track API calls to /api/dashboard/unified
    const apiCalls: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/dashboard/unified')) {
        apiCalls.push(url);
      }
    });

    // 1. Navigate to http://localhost:3000/login
    await page.goto('http://localhost:3000/login');

    // 2. Log in with test user credentials (email: test@crowdstack.app, password: test123)
    const emailInput = page.getByRole('textbox', { name: /email/i });
    await emailInput.fill('test@crowdstack.app');
    
    const passwordInput = page.getByRole('textbox', { name: /password/i }).or(page.getByLabel(/password/i));
    await passwordInput.fill('test123');
    
    const loginButton = page.getByRole('button', { name: /log in|sign in/i });
    await loginButton.click();

    // 3. Navigate to /app/organizer
    await page.goto('http://localhost:3000/app/organizer');

    // 4. Wait for dashboard to fully load
    // Wait for the dashboard header to be visible
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    
    // Wait for at least one stats card to be visible (indicating data has loaded)
    await expect(page.getByText(/events|registrations|check-ins|promoters/i).first()).toBeVisible();
    
    // Wait for any loading skeletons to disappear
    await expect(page.locator('[data-testid="loading-skeleton"]')).toHaveCount(0, { timeout: 10000 });
    
    // Give the page a moment to settle
    await page.waitForLoadState('networkidle');

    // 5. Track API calls from this point
    const apiCallsBeforeNavigation = apiCalls.length;
    apiCalls.length = 0; // Clear the array to track only new calls

    // 6. Navigate away to /app/organizer/events
    await page.goto('http://localhost:3000/app/organizer/events');
    await expect(page.getByRole('heading', { name: /events/i })).toBeVisible();

    // 7. Navigate back to /app/organizer within 60 seconds (staleTime window)
    await page.goto('http://localhost:3000/app/organizer');

    // Expected Results:
    // - NO new request to /api/dashboard/unified is made when returning to dashboard
    expect(apiCalls.filter(url => url.includes('/api/dashboard/unified'))).toHaveLength(0);

    // - Dashboard data appears instantly (no loading skeletons)
    await expect(page.locator('[data-testid="loading-skeleton"]')).toHaveCount(0);

    // - All sections show previously loaded data
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByText(/events|registrations|check-ins|promoters/i).first()).toBeVisible();
  });
});
