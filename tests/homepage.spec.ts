import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/CrowdStack/i);
  });

  test('should display navigation elements', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check for logo or main branding
    const logo = page.locator('a[href="/"], img[alt*="logo" i], [class*="logo" i]').first();
    await expect(logo).toBeVisible({ timeout: 10000 });
  });

  test('should have working links', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Test login link
    const loginLink = page.locator('a[href="/login"], a[href*="login"]').first();
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL(/.*login.*/);
    }
  });

  test('should not have console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Filter out known non-critical errors
    const criticalErrors = errors.filter(
      err => !err.includes('favicon') && 
             !err.includes('analytics') &&
             !err.includes('speed-insights')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that page loads without horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()?.width || 375;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20); // Allow small margin
  });
});

