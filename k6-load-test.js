import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";

// Custom metrics
const errorRate = new Rate('errors');
const slowRequests = new Rate('slow_requests');
const homepageDuration = new Trend('homepage_duration');
const apiDuration = new Trend('api_duration');
const requestCounter = new Counter('total_requests');

// Test configuration - progressive load
export const options = {
  stages: [
    { duration: '30s', target: 50 },    // Ramp up to 50 users
    { duration: '1m', target: 100 },     // Ramp up to 100 users
    { duration: '2m', target: 200 },      // Ramp up to 200 users
    { duration: '2m', target: 200 },    // Stay at 200 users
    { duration: '1m', target: 100 },    // Ramp down to 100
    { duration: '30s', target: 0 },     // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'], // 95% below 2s, 99% below 5s
    http_req_failed: ['rate<0.05'],     // Error rate should be less than 5%
    errors: ['rate<0.05'],              // Custom error rate
    slow_requests: ['rate<0.10'],       // Less than 10% slow requests
    'http_req_duration{name:Homepage}': ['p(95)<3000'], // Homepage should be fast
    'http_req_duration{name:API}': ['p(95)<1500'],      // API should be very fast
    'http_req_duration{name:LoginPage}': ['p(95)<2000'], // Login page
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Cache for event slugs to reduce API calls
let eventSlugs = [];

// Test scenarios
export default function () {
  requestCounter.add(1);
  
  const scenarios = [
    // 1. Homepage - Most critical
    () => {
      const startTime = Date.now();
      const res = http.get(`${BASE_URL}/`, {
        tags: { name: 'Homepage' },
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate',
        },
      });
      const duration = Date.now() - startTime;
      homepageDuration.add(duration);
      
      const success = check(res, {
        'homepage status is 200': (r) => r.status === 200,
        'homepage has content': (r) => r.body.length > 1000,
        'homepage contains title': (r) => r.body.includes('CrowdStack') || r.body.includes('DISCOVER'),
        'homepage response time acceptable': (r) => r.timings.duration < 5000,
      });
      
      errorRate.add(!success);
      slowRequests.add(res.timings.duration > 3000);
      sleep(Math.random() * 2 + 1); // 1-3 seconds
    },

    // 2. Health check - Should be very fast
    () => {
      const startTime = Date.now();
      const res = http.get(`${BASE_URL}/api/health`, {
        tags: { name: 'API', endpoint: 'health' },
      });
      const duration = Date.now() - startTime;
      apiDuration.add(duration);
      
      check(res, {
        'health status is 200': (r) => r.status === 200,
        'health response is fast': (r) => r.timings.duration < 500,
      });
      sleep(0.5);
    },

    // 3. Public health endpoint
    () => {
      const res = http.get(`${BASE_URL}/health`, {
        tags: { name: 'API', endpoint: 'public-health' },
      });
      check(res, {
        'public health status is 200': (r) => r.status === 200,
      });
      sleep(0.5);
    },

    // 4. Login page
    () => {
      const res = http.get(`${BASE_URL}/login`, {
        tags: { name: 'LoginPage' },
      });
      const success = check(res, {
        'login page status is 200': (r) => r.status === 200,
        'login page has content': (r) => r.body.length > 500,
      });
      errorRate.add(!success);
      sleep(Math.random() * 2 + 1);
    },

    // 5. Browse events API
    () => {
      const startTime = Date.now();
      const res = http.get(`${BASE_URL}/api/browse/events?featured=true&limit=6`, {
        tags: { name: 'API', endpoint: 'browse-events' },
      });
      const duration = Date.now() - startTime;
      apiDuration.add(duration);
      
      const success = check(res, {
        'browse events API responds': (r) => r.status === 200,
        'browse events returns JSON': (r) => {
          try {
            const data = r.json();
            return data !== null;
          } catch {
            return false;
          }
        },
      });
      errorRate.add(!success);
      slowRequests.add(res.timings.duration > 2000);
      sleep(1);
    },

    // 6. Browse venues API
    () => {
      const startTime = Date.now();
      const res = http.get(`${BASE_URL}/api/browse/venues?limit=4`, {
        tags: { name: 'API', endpoint: 'browse-venues' },
      });
      const duration = Date.now() - startTime;
      apiDuration.add(duration);
      
      check(res, {
        'browse venues API responds': (r) => r.status === 200,
      });
      slowRequests.add(res.timings.duration > 2000);
      sleep(1);
    },

    // 7. Public event page
    () => {
      // Get a random event slug from cache or use default
      let eventSlug = 'test-event';
      if (eventSlugs.length > 0) {
        eventSlug = eventSlugs[Math.floor(Math.random() * eventSlugs.length)];
      }
      
      const res = http.get(`${BASE_URL}/e/${eventSlug}`, {
        tags: { name: 'PublicEventPage' },
      });
      check(res, {
        'event page responds': (r) => r.status === 200 || r.status === 404,
      });
      sleep(Math.random() * 2 + 1);
    },

    // 8. Contact page
    () => {
      const res = http.get(`${BASE_URL}/contact`, {
        tags: { name: 'ContactPage' },
      });
      check(res, {
        'contact page responds': (r) => r.status === 200 || r.status === 404,
      });
      sleep(1);
    },
  ];

  // Weighted random selection - homepage gets more traffic
  const weights = [30, 10, 5, 20, 15, 10, 5, 5]; // Sum = 100
  const random = Math.random() * 100;
  let cumulative = 0;
  let selectedIndex = 0;
  
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (random < cumulative) {
      selectedIndex = i;
      break;
    }
  }
  
  scenarios[selectedIndex]();
}

// Setup function - runs once before all VUs
export function setup() {
  console.log(`🚀 Starting k6 load test against: ${BASE_URL}`);
  console.log(`📊 Test configuration:`);
  console.log(`   - Stages: 50 → 100 → 200 → 200 → 100 → 0 users`);
  console.log(`   - Total duration: ~7 minutes`);
  console.log(`   - Max concurrent users: 200`);
  
  // Verify the server is up
  const healthCheck = http.get(`${BASE_URL}/api/health`);
  if (healthCheck.status !== 200) {
    console.error(`❌ Server not responding at ${BASE_URL}`);
    console.error(`Status: ${healthCheck.status}`);
    return { serverUp: false };
  }
  
  console.log(`✅ Server is up and responding`);
  
  // Pre-fetch some event slugs for more realistic testing
  try {
    const browseRes = http.get(`${BASE_URL}/api/browse/events?limit=10`);
    if (browseRes.status === 200) {
      const data = browseRes.json();
      if (data.events && Array.isArray(data.events)) {
        eventSlugs = data.events
          .filter(e => e.slug)
          .map(e => e.slug)
          .slice(0, 5); // Cache up to 5 slugs
        console.log(`✅ Cached ${eventSlugs.length} event slugs for testing`);
      }
    }
  } catch (e) {
    console.log(`⚠️  Could not pre-fetch event slugs, using defaults`);
  }
  
  return { serverUp: true, eventSlugs };
}

// Teardown function - runs once after all VUs
export function teardown(data) {
  console.log(`\n🏁 Load test completed`);
  if (data && data.serverUp) {
    console.log(`✅ Server remained healthy throughout the test`);
  }
  console.log(`\n📈 Review the metrics above for performance insights`);
}

// Generate HTML report
export function handleSummary(data) {
  return {
    'k6-results.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;
  
  let output = '\n';
  output += `${indent}╔══════════════════════════════════════════════════════════╗\n`;
  output += `${indent}║                    K6 LOAD TEST RESULTS                  ║\n`;
  output += `${indent}╚══════════════════════════════════════════════════════════╝\n\n`;
  
  // HTTP Request Duration
  if (data.metrics.http_req_duration) {
    const duration = data.metrics.http_req_duration;
    output += `${indent}📊 HTTP Request Duration:\n`;
    output += `${indent}   Average: ${(duration.values.avg / 1000).toFixed(2)}s\n`;
    output += `${indent}   P95: ${(duration.values['p(95)'] / 1000).toFixed(2)}s\n`;
    output += `${indent}   P99: ${(duration.values['p(99)'] / 1000).toFixed(2)}s\n`;
    output += `${indent}   Max: ${(duration.values.max / 1000).toFixed(2)}s\n\n`;
  }
  
  // Error Rate
  if (data.metrics.http_req_failed) {
    const failed = data.metrics.http_req_failed;
    const rate = (failed.values.rate * 100).toFixed(2);
    output += `${indent}❌ Error Rate: ${rate}%\n`;
    output += `${indent}   Total requests: ${data.metrics.http_reqs.values.count}\n`;
    output += `${indent}   Failed requests: ${Math.round(failed.values.rate * data.metrics.http_reqs.values.count)}\n\n`;
  }
  
  // Requests per second
  if (data.metrics.http_reqs) {
    const rps = data.metrics.http_reqs.values.rate.toFixed(2);
    output += `${indent}⚡ Requests per second: ${rps}\n\n`;
  }
  
  // Custom metrics
  if (data.metrics.homepage_duration) {
    const homepage = data.metrics.homepage_duration;
    output += `${indent}🏠 Homepage Performance:\n`;
    output += `${indent}   Average: ${(homepage.values.avg / 1000).toFixed(2)}s\n`;
    output += `${indent}   P95: ${(homepage.values['p(95)'] / 1000).toFixed(2)}s\n\n`;
  }
  
  if (data.metrics.api_duration) {
    const api = data.metrics.api_duration;
    output += `${indent}🔌 API Performance:\n`;
    output += `${indent}   Average: ${(api.values.avg / 1000).toFixed(2)}s\n`;
    output += `${indent}   P95: ${(api.values['p(95)'] / 1000).toFixed(2)}s\n\n`;
  }
  
  return output;
}

