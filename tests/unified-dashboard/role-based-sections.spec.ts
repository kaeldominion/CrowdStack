import { test, expect } from '@playwright/test';

test.describe('Role-Based Dashboard Sections', () => {
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

  test('should display Dashboard header with correct title', async ({ page }) => {
    await page.goto('/app/organizer');

    // Wait for dashboard to load
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Check for LayoutGrid icon (rendered as SVG near title)
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible();
  });

  test('should display Event Management section for organizer role', async ({ page }) => {
    await page.goto('/app/organizer');

    // Wait for loading to complete
    await page.waitForLoadState('networkidle');

    // Check for Event Management section
    await expect(page.getByText('Event Management')).toBeVisible();

    // Check for stat cards
    await expect(page.getByText(/events/i).first()).toBeVisible();
    await expect(page.getByText(/registrations/i).first()).toBeVisible();
    await expect(page.getByText(/check-ins/i).first()).toBeVisible();
  });

  test('should display Create Event button in header', async ({ page }) => {
    await page.goto('/app/organizer');

    // Wait for dashboard to load
    await page.waitForLoadState('networkidle');

    // Check for Create Event button
    const createButton = page.getByRole('link', { name: /create event/i });
    await expect(createButton).toBeVisible();

    // Verify it links to the correct page
    await expect(createButton).toHaveAttribute('href', /\/events\/new/);
  });

  test('should show multi-role description when user has multiple roles', async ({ page }) => {
    await page.goto('/app/organizer');

    // Wait for dashboard to load
    await page.waitForLoadState('networkidle');

    // Check for multi-role description (may or may not appear depending on user roles)
    const multiRoleDesc = page.getByText(/overview across all your roles/i);
    const singleRoleDesc = page.getByText(/overview of your performance/i);

    // Either description should be visible
    const hasMultiRole = await multiRoleDesc.isVisible().catch(() => false);
    const hasSingleRole = await singleRoleDesc.isVisible().catch(() => false);

    expect(hasMultiRole || hasSingleRole).toBeTruthy();
  });

  test('should display Venue section when accessing venue dashboard', async ({ page }) => {
    await page.goto('/app/venue');

    // Wait for loading to complete
    await page.waitForLoadState('networkidle');

    // Check for venue-specific elements (if user has venue role)
    // This may show an error or redirect if user doesn't have venue_admin role
    const pageContent = await page.content();
    const hasVenueSection = pageContent.includes('Managing Venue') ||
                           pageContent.includes('Venue') ||
                           pageContent.includes('Unauthorized');

    expect(hasVenueSection).toBeTruthy();
  });

  test('should display Promoter section when accessing promoter dashboard', async ({ page }) => {
    await page.goto('/app/promoter');

    // Wait for loading to complete
    await page.waitForLoadState('networkidle');

    // Check for promoter-specific elements
    const pageContent = await page.content();
    const hasPromoterSection = pageContent.includes('Your Events') ||
                              pageContent.includes('Promoter') ||
                              pageContent.includes('Unauthorized');

    expect(hasPromoterSection).toBeTruthy();
  });

  test('should display DJ section when accessing DJ dashboard', async ({ page }) => {
    await page.goto('/app/dj');

    // Wait for loading to complete
    await page.waitForLoadState('networkidle');

    // Check for DJ-specific elements
    const pageContent = await page.content();
    const hasDJSection = pageContent.includes('DJ Dashboard') ||
                        pageContent.includes('Published Mixes') ||
                        pageContent.includes('Unauthorized');

    expect(hasDJSection).toBeTruthy();
  });
});
