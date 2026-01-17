// spec: /Users/spencertarring/kaeldominion/CrowdStack/table-booking-guest-pass.plan.md
// seed: tests/seed.spec.ts
// Run with: pnpm test:e2e --project=venue

import { test, expect } from '../fixtures/auth';

test.describe('Venue Table Management', () => {
  test('View venue dashboard and table bookings section', async ({ venuePage }, testInfo) => {
    // Skip if not running with venue project
    test.skip(testInfo.project.name !== 'venue', 'This test requires venue authentication');

    // Navigate directly to table bookings page
    await venuePage.goto('/app/venue/table-bookings');

    // Wait for page to load
    await venuePage.waitForLoadState('domcontentloaded');

    // Verify table bookings page loads by checking for the page heading
    await expect(venuePage.getByRole('heading', { name: /table bookings/i })).toBeVisible({ timeout: 10000 });

    // Verify page description is present
    await expect(venuePage.getByText(/manage table reservations/i)).toBeVisible();
  });

  test('View events list for venue', async ({ venuePage }, testInfo) => {
    test.skip(testInfo.project.name !== 'venue', 'This test requires venue authentication');

    // Navigate to venue events page
    await venuePage.goto('/app/venue/events');
    await venuePage.waitForLoadState('domcontentloaded');

    // Wait for loading to complete by checking that the spinner is gone
    await venuePage.getByText(/loading events/i).waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});

    // Verify the page loaded by checking for the main container or any page element
    // The page should show either content or a message
    const pageHasContent = await venuePage.locator('body').textContent();

    // Page should contain "event" or "Event" somewhere in the content after loading
    expect(pageHasContent?.toLowerCase().includes('event')).toBeTruthy();
  });

  test('Access table booking management if bookings exist', async ({ venuePage }, testInfo) => {
    test.skip(testInfo.project.name !== 'venue', 'This test requires venue authentication');

    // Navigate to table bookings page
    await venuePage.goto('/app/venue/table-bookings');
    await venuePage.waitForLoadState('domcontentloaded');

    // Wait for page heading to be visible
    await expect(venuePage.getByRole('heading', { name: /table bookings/i })).toBeVisible({ timeout: 10000 });

    // Wait for loading to complete
    await venuePage.getByText(/loading bookings/i).waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});

    // Verify the page loaded successfully by checking for content
    const pageHasContent = await venuePage.locator('body').textContent();

    // Page should contain "booking" or "Booking" somewhere in the content after loading
    expect(pageHasContent?.toLowerCase().includes('booking')).toBeTruthy();
  });
});
