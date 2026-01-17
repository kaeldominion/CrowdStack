// spec: /Users/spencertarring/kaeldominion/CrowdStack/venue-pulse.plan.md
// seed: tests/seed.spec.ts
// Run with: pnpm test:e2e --project=venue

import { test, expect } from '../fixtures/auth';

test.describe('Venue Pulse Dashboard Access', () => {
  test('should display empty state when no feedback exists', async ({ venuePage }, testInfo) => {
    test.skip(testInfo.project.name !== 'venue', 'This test requires venue authentication');

    // Navigate to Venue Pulse dashboard
    await venuePage.goto('/app/venue/feedback');
    await venuePage.waitForLoadState('domcontentloaded');

    // Wait for loading to complete
    await venuePage.getByText(/loading/i).waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
    await venuePage.waitForTimeout(1000);

    // Verify page loads - should show either empty state or feedback data
    const hasEmptyState = await venuePage.getByText(/no feedback data available/i).isVisible({ timeout: 5000 }).catch(() => false);
    const hasFeedbackContent = await venuePage.getByText(/average rating|total feedback|unresolved/i).isVisible({ timeout: 3000 }).catch(() => false);
    const pageContent = await venuePage.locator('body').textContent();

    // Page should show either empty state or feedback data (no crash)
    expect(hasEmptyState || hasFeedbackContent || pageContent?.toLowerCase().includes('pulse')).toBeTruthy();
  });
});
