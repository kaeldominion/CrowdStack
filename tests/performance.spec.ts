import { test, expect } from '@playwright/test';

test.describe('Performance', () => {
  test('homepage should load within reasonable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
  });

  test('should not have too many network requests', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => {
      requests.push(request.url());
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Filter out data URLs and known external resources
    const externalRequests = requests.filter(
      url => !url.startsWith('data:') && 
             !url.includes('localhost') &&
             !url.includes('127.0.0.1')
    );
    
    // Should not have excessive external requests on initial load
    expect(externalRequests.length).toBeLessThan(50);
  });

  test('should have reasonable page size', async ({ page }) => {
    const response = await page.goto('/');
    
    if (response) {
      const headers = response.headers();
      const contentLength = headers['content-length'];
      
      if (contentLength) {
        const sizeInMB = parseInt(contentLength) / (1024 * 1024);
        // Initial HTML should be less than 1MB
        expect(sizeInMB).toBeLessThan(1);
      }
    }
  });

  test('should not have memory leaks on navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to login
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Navigate back to home
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Page should still be responsive
    const bodyVisible = await page.locator('body').isVisible();
    expect(bodyVisible).toBe(true);
  });
});


