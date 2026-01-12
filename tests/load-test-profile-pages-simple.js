import http from 'k6/http';
import { check, sleep } from 'k6';

// Simple test configuration - quick performance check
export const options = {
  stages: [
    { duration: '10s', target: 20 },   // Ramp up to 20 users
    { duration: '30s', target: 50 },   // Stay at 50 users
    { duration: '10s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% should be under 3s
    http_req_failed: ['rate<0.1'],      // Less than 10% errors
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://crowdstack.app';
const PROMOTER_SLUG = __ENV.PROMOTER_SLUG || 'ayu-paige';

export default function () {
  // Test promoter profile page (currently no cache)
  const response = http.get(`${BASE_URL}/promoter/${PROMOTER_SLUG}`, {
    headers: {
      'User-Agent': 'k6-load-test',
    },
  });

  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 2s': (r) => r.timings.duration < 2000,
    'response time < 5s': (r) => r.timings.duration < 5000,
    'has HTML content': (r) => r.body && r.body.includes('<!DOCTYPE') || r.body.includes('<html'),
  });

  if (!success) {
    console.log(`Failed request: ${response.status} - ${response.timings.duration}ms`);
  }

  sleep(1);
}
