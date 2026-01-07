import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
  });

  test('should load login page', async ({ page }) => {
    await expect(page).toHaveURL(/.*login.*/);
    
    // Check for email input
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    await expect(emailInput).toBeVisible({ timeout: 10000 });
  });

  test('should show email input field', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await expect(emailInput).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await emailInput.fill('invalid-email');
    
    // Try to submit
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Send")').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      
      // Should show validation error or prevent submission
      await page.waitForTimeout(500);
      
      // Check for error message or HTML5 validation
      const hasError = await emailInput.evaluate((el: HTMLInputElement) => {
        return !el.validity.valid || el.getAttribute('aria-invalid') === 'true';
      }).catch(() => false);
      
      // If HTML5 validation didn't catch it, check for error message
      if (!hasError) {
        const errorMessage = page.locator('text=/invalid|error|required/i').first();
        const errorVisible = await errorMessage.isVisible({ timeout: 1000 }).catch(() => false);
        // At least one validation should work
        expect(hasError || errorVisible).toBe(true);
      }
    }
  });

  test('should allow switching to password login', async ({ page }) => {
    // Look for password toggle or link
    const passwordToggle = page.locator('text=/password|sign in/i').first();
    const usePasswordLink = page.locator('button:has-text("password"), a:has-text("password")').first();
    
    if (await usePasswordLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await usePasswordLink.click();
      await page.waitForTimeout(500);
      
      // Should show password input
      const passwordInput = page.locator('input[type="password"]').first();
      await expect(passwordInput).toBeVisible({ timeout: 5000 });
    }
  });

  test('should handle empty form submission', async ({ page }) => {
    const submitButton = page.locator('button[type="submit"]').first();
    
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(500);
      
      // Should show validation error or prevent submission
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid).catch(() => true);
      
      // Either HTML5 validation or error message should appear
      if (isValid) {
        const errorVisible = await page.locator('text=/required|error/i').isVisible({ timeout: 1000 }).catch(() => false);
        expect(errorVisible).toBe(true);
      }
    }
  });

  test('should not have console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Filter out known non-critical errors
    const criticalErrors = errors.filter(
      err => !err.includes('favicon') && 
             !err.includes('analytics') &&
             !err.includes('speed-insights') &&
             !err.includes('sourcemap')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
});

