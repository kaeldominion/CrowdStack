import { test, expect } from '@playwright/test';

test.describe('API Endpoints', () => {
  test('health endpoint should respond', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.status()).toBeLessThan(500);
  });

  test('api health endpoint should respond', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBeLessThan(500);
  });

  test('should handle missing API routes gracefully', async ({ request }) => {
    const response = await request.get('/api/nonexistent-endpoint');
    
    // Should return 404, not 500
    expect([404, 405]).toContain(response.status());
  });

  test('public event API should be accessible', async ({ request }) => {
    // Try to access events API (may require auth, but shouldn't crash)
    const response = await request.get('/api/events/by-slug/test-event');
    
    // Should return some status, not crash
    expect(response.status()).toBeLessThan(500);
  });
});


