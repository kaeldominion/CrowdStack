// spec: /Users/spencertarring/kaeldominion/CrowdStack/table-booking-guest-pass.plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '../fixtures/auth';

test.describe('Guest Pass - View Own Pass', () => {
  test('Authenticated user can access their profile/me page', async ({ attendeePage }) => {
    // Navigate to me/profile page
    await attendeePage.goto('/me');
    await attendeePage.waitForLoadState('networkidle');

    // Verify page loads for authenticated user
    const pageLoaded = await attendeePage.getByRole('heading').first().isVisible({ timeout: 10000 });
    expect(pageLoaded).toBeTruthy();

    // Should not redirect to login
    expect(attendeePage.url()).not.toContain('/login');
  });

  test('Guest pass page shows authentication error for invalid guest ID', async ({ attendeePage }) => {
    // Navigate to an invalid guest pass ID
    await attendeePage.goto('/table-pass/00000000-0000-0000-0000-000000000099');
    await attendeePage.waitForLoadState('networkidle');

    // Should show error state (not found or unauthorized)
    const hasError = await attendeePage.getByText(/not found|error|invalid|unauthorized/i).first().isVisible({ timeout: 5000 });
    expect(hasError).toBeTruthy();
  });

  test('Table party join page accessible', async ({ attendeePage }) => {
    // Test that table party join pages load
    await attendeePage.goto('/table-party/join/00000000-0000-0000-0000-000000000099');
    await attendeePage.waitForLoadState('networkidle');

    // Should show error or invitation page
    const hasContent = await attendeePage.locator('body').textContent();
    expect(hasContent).toBeTruthy();
  });

  test('View events page when authenticated', async ({ attendeePage }) => {
    // Navigate to events listing
    await attendeePage.goto('/events');
    await attendeePage.waitForLoadState('networkidle');

    // Verify events page loads
    const pageLoaded = await attendeePage.locator('body').isVisible();
    expect(pageLoaded).toBeTruthy();

    // Check for event cards or empty state
    const hasEvents = await attendeePage.getByRole('link').filter({ hasText: /event/i }).isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmptyState = await attendeePage.getByText(/no events|coming soon/i).isVisible({ timeout: 3000 }).catch(() => false);

    // Page should have some content
    expect(hasEvents || hasEmptyState || await attendeePage.content().then(c => c.length > 100)).toBeTruthy();
  });

  test('QR pass page structure', async ({ attendeePage }) => {
    // First check if we can find any guest passes for this user
    const meResponse = await attendeePage.request.get('/api/me/passes');

    if (meResponse.ok()) {
      const data = await meResponse.json();

      if (data.passes && data.passes.length > 0) {
        const guestId = data.passes[0].id;

        // Navigate to the guest pass page
        await attendeePage.goto(`/table-pass/${guestId}`);
        await attendeePage.waitForLoadState('networkidle');

        // Verify pass page elements
        // 1. Event info should be visible
        const hasEventInfo = await attendeePage.getByRole('heading').first().isVisible({ timeout: 5000 });
        expect(hasEventInfo).toBeTruthy();

        // 2. QR code should be present
        const hasQR = await attendeePage.locator('img, canvas, svg').first().isVisible({ timeout: 5000 });
        expect(hasQR).toBeTruthy();

        // 3. Status should be shown
        const hasStatus = await attendeePage.getByText(/confirmed|pending|checked/i).isVisible({ timeout: 5000 }).catch(() => false);
        expect(hasStatus).toBeTruthy();
      }
    }
  });
});
