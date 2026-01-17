// spec: /Users/spencertarring/kaeldominion/CrowdStack/venue-pulse.plan.md
// seed: tests/seed.spec.ts
// Run with: pnpm test:e2e --project=venue

import { test, expect } from '../fixtures/auth';

test.describe('Venue Pulse Dashboard Access', () => {
  test('should display Venue Pulse in sidebar navigation', async ({ venuePage }, testInfo) => {
    test.skip(testInfo.project.name !== 'venue', 'This test requires venue authentication');

    // Navigate to venue dashboard
    await venuePage.goto('/app/venue/events');
    await venuePage.waitForLoadState('domcontentloaded');

    // Verify Venue Pulse link is visible in sidebar
    const venuePulseLink = venuePage.getByRole('link', { name: 'Venue Pulse' });
    await expect(venuePulseLink).toBeVisible({ timeout: 10000 });

    // Verify the link points to the correct URL
    await expect(venuePulseLink).toHaveAttribute('href', '/app/venue/feedback');
  });
});
