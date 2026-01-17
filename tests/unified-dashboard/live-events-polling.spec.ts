import { test, expect } from '@playwright/test';

test.describe('Live Events Section & Conditional Polling', () => {
  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto('/login');

    // Click on password login tab if visible
    const passwordTab = page.getByRole('tab', { name: /password/i });
    if (await passwordTab.isVisible()) {
      await passwordTab.click();
    }

    // Fill login form
    await page.getByLabel(/email/i).fill('test@crowdstack.app');
    await page.getByLabel(/password/i).fill('test123');
    await page.getByRole('button', { name: /sign in|log in/i }).click();

    // Wait for redirect after login
    await page.waitForURL(/\/(app|dashboard)/);
  });

  test('should show Live Now section only when live events exist', async ({ page }) => {
    await page.goto('/app/organizer');

    // Wait for dashboard to load
    await page.waitForLoadState('networkidle');

    // Check if Live Now section exists
    const liveNowSection = page.getByText('Live Now');
    const isLiveNowVisible = await liveNowSection.isVisible().catch(() => false);

    if (isLiveNowVisible) {
      // If live events exist, verify the section has proper indicators
      await expect(page.locator('.animate-pulse')).toBeVisible();
      // Should show event count
      await expect(page.getByText(/event.*happening now/i)).toBeVisible();
    } else {
      // If no live events, section should not appear at all
      await expect(liveNowSection).not.toBeVisible();
    }
  });

  test('should NOT poll when no live events exist', async ({ page }) => {
    // Track API calls
    const apiCalls: string[] = [];

    await page.route('**/api/**', async (route) => {
      apiCalls.push(route.request().url());
      await route.continue();
    });

    await page.goto('/app/organizer');

    // Wait for initial load
    await page.waitForLoadState('networkidle');

    // Check if live events exist
    const liveNowSection = page.getByText('Live Now');
    const hasLiveEvents = await liveNowSection.isVisible().catch(() => false);

    if (!hasLiveEvents) {
      // Clear API call tracking after initial load
      const initialCallCount = apiCalls.length;

      // Wait 35 seconds to see if polling occurs
      await page.waitForTimeout(35000);

      // Count new API calls
      const newCalls = apiCalls.slice(initialCallCount);
      const pollingCalls = newCalls.filter(url =>
        url.includes('/events/live') || url.includes('/dashboard/unified')
      );

      // Should have NO polling calls when no live events
      expect(pollingCalls.length).toBe(0);
    } else {
      // Skip this test if live events exist
      test.skip();
    }
  });

  test('should poll every ~30 seconds when live events exist', async ({ page }) => {
    // Track API calls with timestamps
    const apiCalls: { url: string; time: number }[] = [];

    await page.route('**/api/**', async (route) => {
      apiCalls.push({
        url: route.request().url(),
        time: Date.now()
      });
      await route.continue();
    });

    await page.goto('/app/organizer');

    // Wait for initial load
    await page.waitForLoadState('networkidle');

    // Check if live events exist
    const liveNowSection = page.getByText('Live Now');
    const hasLiveEvents = await liveNowSection.isVisible().catch(() => false);

    if (hasLiveEvents) {
      const initialTime = Date.now();
      const initialCallCount = apiCalls.length;

      // Wait 35 seconds to capture a polling cycle
      await page.waitForTimeout(35000);

      // Look for polling calls after initial load
      const newCalls = apiCalls.slice(initialCallCount);
      const pollingCalls = newCalls.filter(call =>
        call.url.includes('/events/live') ||
        (call.url.includes('/dashboard') && call.time > initialTime + 25000)
      );

      // Should have at least one polling call after ~30 seconds
      expect(pollingCalls.length).toBeGreaterThanOrEqual(1);
    } else {
      // Skip this test if no live events exist
      test.skip();
    }
  });

  test('should display live event card with correct information', async ({ page }) => {
    await page.goto('/app/organizer');

    // Wait for dashboard to load
    await page.waitForLoadState('networkidle');

    // Check if live events exist
    const liveNowSection = page.getByText('Live Now');
    const hasLiveEvents = await liveNowSection.isVisible().catch(() => false);

    if (hasLiveEvents) {
      // Find a live event card (has red left border)
      const liveEventCard = page.locator('[class*="border-l-red"]').first();
      await expect(liveEventCard).toBeVisible();

      // Should show registration count
      await expect(liveEventCard.getByText(/registered/i)).toBeVisible();

      // Should show check-in count
      await expect(liveEventCard.getByText(/\d+\s*in/i)).toBeVisible();

      // Should have Live Control link for organizers/venues
      const liveControlLink = liveEventCard.getByText(/live control/i);
      const scannerLink = liveEventCard.getByText(/scanner/i);
      const hasControls = await liveControlLink.isVisible().catch(() => false) ||
                          await scannerLink.isVisible().catch(() => false);

      expect(hasControls).toBeTruthy();
    } else {
      // Skip this test if no live events exist
      test.skip();
    }
  });
});
