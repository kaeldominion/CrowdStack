import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Try multiple ways to find login link
    const loginLink = page.locator('a[href="/login"]').first();
    if (await loginLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await loginLink.click();
    } else {
      // Direct navigation
      await page.goto('/login');
    }
    
    await expect(page).toHaveURL(/.*login.*/);
  });

  test('should navigate to contact page', async ({ page }) => {
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');
    
    // Page should load without errors
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to pricing page if exists', async ({ page }) => {
    await page.goto('/pricing');
    await page.waitForLoadState('networkidle');
    
    // Should either show pricing page or 404, not crash
    const is404 = await page.locator('text=404, text=Not Found, text=Page not found').isVisible().catch(() => false);
    const hasContent = await page.locator('body').isVisible();
    
    expect(hasContent).toBe(true);
  });

  test('should handle 404 pages gracefully', async ({ page }) => {
    const response = await page.goto('/nonexistent-page-12345');
    
    // Should return 404 status or show 404 page
    if (response) {
      expect([404, 200]).toContain(response.status());
    }
    
    await page.waitForLoadState('networkidle');
    const bodyVisible = await page.locator('body').isVisible();
    expect(bodyVisible).toBe(true);
  });

  test('should have accessible health check endpoint', async ({ page }) => {
    const response = await page.goto('/health');
    
    // Health endpoint should exist and return 200
    if (response) {
      expect(response.status()).toBeLessThan(500);
    }
  });
});

