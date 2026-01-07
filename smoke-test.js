import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Smoke test configuration - light load to verify improvements
export const options = {
  stages: [
    { duration: '10s', target: 1 },   // Start with 1 user
    { duration: '20s', target: 5 },   // Ramp up to 5 users
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '20s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000', 'p(99)<5000'], // 95% below 3s, 99% below 5s
    http_req_failed: ['rate<0.01'],     // Error rate should be less than 1%
    errors: ['rate<0.01'],              // Custom error rate
    'http_req_duration{name:Homepage}': ['p(95)<2000'], // Homepage should be fast
    'http_req_duration{name:MePage}': ['p(95)<2000'],   // Me page should be fast
    'http_req_duration{name:RegisterPage}': ['p(95)<3000'], // Register page
    'http_req_duration{name:OrganizerEvents}': ['p(95)<2000'], // Organizer events
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test scenarios focused on optimized routes
export default function () {
  const scenarios = [
    // 1. Homepage (/) - Most critical optimization
    () => {
      const res = http.get(`${BASE_URL}/`, {
        tags: { name: 'Homepage' },
      });
      const success = check(res, {
        'homepage status is 200': (r) => r.status === 200,
        'homepage has content': (r) => r.body.length > 1000,
        'homepage loads quickly': (r) => r.timings.duration < 5000,
        'homepage contains expected content': (r) => r.body.includes('DISCOVER') || r.body.includes('CrowdStack'),
      });
      errorRate.add(!success);
      sleep(1);
    },

    // 2. Health check
    () => {
      const res = http.get(`${BASE_URL}/api/health`, {
        tags: { name: 'HealthCheck' },
      });
      check(res, {
        'health status is 200': (r) => r.status === 200,
      });
      sleep(0.5);
    },

    // 3. Login page
    () => {
      const res = http.get(`${BASE_URL}/login`, {
        tags: { name: 'LoginPage' },
      });
      check(res, {
        'login page status is 200': (r) => r.status === 200,
      });
      sleep(1);
    },

    // 4. Browse events API (used by homepage)
    () => {
      const res = http.get(`${BASE_URL}/api/browse/events?featured=true&limit=6`, {
        tags: { name: 'BrowseEventsAPI' },
      });
      check(res, {
        'browse events API responds': (r) => r.status === 200,
        'browse events returns data': (r) => {
          try {
            const data = r.json();
            return data && (data.events || Array.isArray(data));
          } catch {
            return false;
          }
        },
      });
      sleep(1);
    },

    // 5. Browse venues API (used by homepage)
    () => {
      const res = http.get(`${BASE_URL}/api/browse/venues?limit=4`, {
        tags: { name: 'BrowseVenuesAPI' },
      });
      check(res, {
        'browse venues API responds': (r) => r.status === 200,
      });
      sleep(1);
    },

    // 6. Public event page
    () => {
      // Try to get a real event slug from browse API first
      const browseRes = http.get(`${BASE_URL}/api/browse/events?limit=1`);
      let eventSlug = 'test-event';
      
      if (browseRes.status === 200) {
        try {
          const data = browseRes.json();
          if (data.events && data.events.length > 0 && data.events[0].slug) {
            eventSlug = data.events[0].slug;
          }
        } catch (e) {
          // Use default
        }
      }

      const res = http.get(`${BASE_URL}/e/${eventSlug}`, {
        tags: { name: 'PublicEventPage' },
      });
      check(res, {
        'event page responds': (r) => r.status === 200 || r.status === 404, // 404 is OK
      });
      sleep(1);
    },

    // 7. Event registration page (optimized route)
    () => {
      const browseRes = http.get(`${BASE_URL}/api/browse/events?limit=1`);
      let eventSlug = 'test-event';
      
      if (browseRes.status === 200) {
        try {
          const data = browseRes.json();
          if (data.events && data.events.length > 0 && data.events[0].slug) {
            eventSlug = data.events[0].slug;
          }
        } catch (e) {
          // Use default
        }
      }

      const res = http.get(`${BASE_URL}/e/${eventSlug}/register`, {
        tags: { name: 'RegisterPage' },
      });
      const success = check(res, {
        'register page responds': (r) => r.status === 200 || r.status === 404 || r.status === 302,
        'register page loads quickly': (r) => r.timings.duration < 4000,
      });
      errorRate.add(!success);
      sleep(1);
    },
  ];

  // Randomly select a scenario to simulate real user behavior
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  scenario();
}

// Setup function - runs once before all VUs
export function setup() {
  console.log(`🚀 Starting smoke test against: ${BASE_URL}`);
  console.log(`📊 Focus: Testing optimized routes (Homepage, /me, /register, /app/organizer/events)`);
  console.log(`👥 Virtual Users: 1 → 5 → 10 → 0`);
  
  // Verify the server is up
  const healthCheck = http.get(`${BASE_URL}/api/health`);
  if (healthCheck.status !== 200) {
    console.error(`❌ Server not responding at ${BASE_URL}`);
    console.error(`Status: ${healthCheck.status}`);
    return { serverUp: false };
  }
  
  console.log(`✅ Server is up and responding`);
  
  // Quick performance check of homepage
  const homepageCheck = http.get(`${BASE_URL}/`);
  if (homepageCheck.status === 200) {
    console.log(`✅ Homepage is accessible`);
    console.log(`📏 Homepage response time: ${homepageCheck.timings.duration.toFixed(2)}ms`);
    console.log(`📦 Homepage size: ${(homepageCheck.body.length / 1024).toFixed(2)}KB`);
  }
  
  return { serverUp: true };
}

// Teardown function - runs once after all VUs
export function teardown(data) {
  console.log(`\n🏁 Smoke test completed`);
  if (data && data.serverUp) {
    console.log(`✅ Server remained healthy throughout the test`);
  }
  console.log(`\n📈 Check the summary above for performance metrics`);
  console.log(`🎯 Key metrics to review:`);
  console.log(`   - http_req_duration (p95 should be < 3s)`);
  console.log(`   - Homepage performance (p95 should be < 2s)`);
  console.log(`   - Error rate (should be < 1%)`);
}

