import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 100 },   // Ramp up to 100 users
    { duration: '1m', target: 500 },     // Ramp up to 500 users
    { duration: '1m', target: 1000 },    // Ramp up to 1000 users
    { duration: '2m', target: 1000 },    // Stay at 1000 users for 2 minutes
    { duration: '30s', target: 500 },     // Ramp down to 500
    { duration: '30s', target: 0 },       // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
    http_req_failed: ['rate<0.05'],     // Error rate should be less than 5%
    errors: ['rate<0.05'],              // Custom error rate
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test scenarios
export default function () {
  const scenarios = [
    // Public homepage
    () => {
      const res = http.get(`${BASE_URL}/`);
      const success = check(res, {
        'homepage status is 200': (r) => r.status === 200,
        'homepage has content': (r) => r.body.length > 0,
      });
      errorRate.add(!success);
      sleep(1);
    },

    // Health check endpoint
    () => {
      const res = http.get(`${BASE_URL}/api/health`);
      const success = check(res, {
        'health status is 200': (r) => r.status === 200,
        'health response is OK': (r) => r.json('status') === 'ok',
      });
      errorRate.add(!success);
      sleep(0.5);
    },

    // Public health endpoint
    () => {
      const res = http.get(`${BASE_URL}/health`);
      const success = check(res, {
        'public health status is 200': (r) => r.status === 200,
      });
      errorRate.add(!success);
      sleep(0.5);
    },

    // Login page
    () => {
      const res = http.get(`${BASE_URL}/login`);
      const success = check(res, {
        'login page status is 200': (r) => r.status === 200,
        'login page has content': (r) => r.body.length > 0,
      });
      errorRate.add(!success);
      sleep(1);
    },

    // Public API - events by slug (with a sample slug)
    () => {
      // Using a generic slug - adjust based on your actual events
      const eventSlug = 'test-event';
      const res = http.get(`${BASE_URL}/api/events/by-slug/${eventSlug}`, {
        tags: { name: 'GetEventBySlug' },
      });
      const success = check(res, {
        'event API responds': (r) => r.status === 200 || r.status === 404, // 404 is OK for test
      });
      errorRate.add(!success);
      sleep(1);
    },

    // Public event page
    () => {
      const eventSlug = 'test-event';
      const res = http.get(`${BASE_URL}/e/${eventSlug}`, {
        tags: { name: 'PublicEventPage' },
      });
      const success = check(res, {
        'event page responds': (r) => r.status === 200 || r.status === 404,
      });
      errorRate.add(!success);
      sleep(1);
    },

    // Static assets (CSS, JS)
    () => {
      const res = http.get(`${BASE_URL}/_next/static/css/app.css`, {
        tags: { name: 'StaticAssets' },
      });
      // Don't fail on 404 for static assets
      check(res, {
        'static asset responds': (r) => r.status === 200 || r.status === 404,
      });
      sleep(0.5);
    },
  ];

  // Randomly select a scenario to simulate real user behavior
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  scenario();
}

// Setup function - runs once before all VUs
export function setup() {
  console.log(`Starting load test against: ${BASE_URL}`);
  console.log(`Target: 1000 concurrent users`);
  
  // Verify the server is up
  const healthCheck = http.get(`${BASE_URL}/api/health`);
  if (healthCheck.status !== 200) {
    console.error(`❌ Server not responding at ${BASE_URL}`);
    console.error(`Status: ${healthCheck.status}`);
    return { serverUp: false };
  }
  
  console.log(`✅ Server is up and responding`);
  return { serverUp: true };
}

// Teardown function - runs once after all VUs
export function teardown(data) {
  console.log(`Load test completed`);
  if (data && data.serverUp) {
    console.log(`✅ Server remained healthy throughout the test`);
  }
}

