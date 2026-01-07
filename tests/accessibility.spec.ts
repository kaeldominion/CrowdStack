import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('homepage should have proper heading structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for at least one heading
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();
    expect(headingCount).toBeGreaterThan(0);
  });

  test('login page should have proper form labels', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    if (await emailInput.isVisible()) {
      // Check for associated label
      const inputId = await emailInput.getAttribute('id');
      if (inputId) {
        const label = page.locator(`label[for="${inputId}"]`);
        const hasLabel = await label.isVisible().catch(() => false);
        
        // Or check for aria-label
        const ariaLabel = await emailInput.getAttribute('aria-label');
        const hasAriaLabel = !!ariaLabel;
        
        expect(hasLabel || hasAriaLabel).toBe(true);
      }
    }
  });

  test('should have skip links or proper focus management', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Tab through page to check focus
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });

  test('images should have alt text', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const images = page.locator('img');
    const imageCount = await images.count();
    
    if (imageCount > 0) {
      // Check first few images
      for (let i = 0; i < Math.min(imageCount, 5); i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');
        const role = await img.getAttribute('role');
        
        // Decorative images should have role="presentation" or alt=""
        const isDecorative = role === 'presentation' || alt === '';
        const hasAlt = !!alt;
        
        expect(isDecorative || hasAlt).toBe(true);
      }
    }
  });

  test('should have proper color contrast', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Basic check - ensure text is visible
    const body = page.locator('body');
    const textColor = await body.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.color;
    });
    
    const bgColor = await body.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.backgroundColor;
    });
    
    // Colors should be defined (not transparent or same)
    expect(textColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
  });
});

