import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const cacheHitRate = new Rate('cache_hits');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users
    { duration: '1m', target: 50 },    // Ramp up to 50 users
    { duration: '2m', target: 100 },   // Stay at 100 users
    { duration: '1m', target: 50 },    // Ramp down to 50 users
    { duration: '30s', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
    http_req_failed: ['rate<0.05'],     // Error rate should be less than 5%
    errors: ['rate<0.05'],
  },
};

// Base URL - change this to your production/staging URL
const BASE_URL = __ENV.BASE_URL || 'https://crowdstack.app';

// Test data - you may need to update these with real slugs
const TEST_PROMOTER_SLUG = __ENV.PROMOTER_SLUG || 'ayu-paige';
const TEST_VENUE_SLUG = __ENV.VENUE_SLUG || 'shishi'; // Update with real venue slug
const TEST_DJ_HANDLE = __ENV.DJ_HANDLE || 'test-dj'; // Update with real DJ handle
const TEST_EVENT_SLUG = __ENV.EVENT_SLUG || 'test-event'; // Update with real event slug

export default function () {
  const testCases = [
    {
      name: 'Promoter Profile',
      url: `${BASE_URL}/promoter/${TEST_PROMOTER_SLUG}`,
      expectedStatus: 200,
    },
    {
      name: 'Venue Profile',
      url: `${BASE_URL}/v/${TEST_VENUE_SLUG}`,
      expectedStatus: 200,
    },
    {
      name: 'DJ Profile',
      url: `${BASE_URL}/dj/${TEST_DJ_HANDLE}`,
      expectedStatus: 200,
    },
    {
      name: 'Event Page',
      url: `${BASE_URL}/e/${TEST_EVENT_SLUG}`,
      expectedStatus: 200,
    },
    {
      name: 'Homepage',
      url: `${BASE_URL}/`,
      expectedStatus: 200,
    },
  ];

  // Randomly select a test case
  const testCase = testCases[Math.floor(Math.random() * testCases.length)];

  // Make request
  const response = http.get(testCase.url, {
    headers: {
      'User-Agent': 'k6-load-test',
    },
    tags: { name: testCase.name },
  });

  // Check response
  const success = check(response, {
    'status is 200': (r) => r.status === testCase.expectedStatus,
    'response time < 2s': (r) => r.timings.duration < 2000,
    'response time < 5s': (r) => r.timings.duration < 5000,
    'has content': (r) => r.body && r.body.length > 0,
  });

  // Track errors
  errorRate.add(!success);

  // Check for cache headers
  const cacheControl = response.headers['Cache-Control'] || '';
  const isCached = cacheControl.includes('no-store') || cacheControl.includes('no-cache') 
    ? false 
    : cacheControl.includes('max-age') || cacheControl.includes('s-maxage');
  cacheHitRate.add(isCached);

  // Log slow requests
  if (response.timings.duration > 2000) {
    console.log(`Slow request: ${testCase.name} - ${response.timings.duration}ms`);
  }

  sleep(1); // Wait 1 second between requests
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'tests/load-test-results.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;
  
  let summary = '\n';
  summary += `${indent}Load Test Summary\n`;
  summary += `${indent}==================\n\n`;
  
  // HTTP metrics
  const httpMetrics = data.metrics.http_req_duration;
  if (httpMetrics) {
    summary += `${indent}Response Times:\n`;
    summary += `${indent}  Average: ${httpMetrics.values.avg.toFixed(2)}ms\n`;
    summary += `${indent}  Median: ${httpMetrics.values.med.toFixed(2)}ms\n`;
    summary += `${indent}  P95: ${httpMetrics.values['p(95)'].toFixed(2)}ms\n`;
    summary += `${indent}  P99: ${httpMetrics.values['p(99)'].toFixed(2)}ms\n`;
    summary += `${indent}  Min: ${httpMetrics.values.min.toFixed(2)}ms\n`;
    summary += `${indent}  Max: ${httpMetrics.values.max.toFixed(2)}ms\n\n`;
  }
  
  // Request rate
  const reqRate = data.metrics.http_reqs;
  if (reqRate) {
    summary += `${indent}Request Rate: ${reqRate.values.rate.toFixed(2)} req/s\n\n`;
  }
  
  // Error rate
  const errors = data.metrics.errors;
  if (errors) {
    summary += `${indent}Error Rate: ${(errors.values.rate * 100).toFixed(2)}%\n\n`;
  }
  
  // Cache hit rate (if available)
  const cacheHits = data.metrics.cache_hits;
  if (cacheHits) {
    summary += `${indent}Cache Hit Rate: ${(cacheHits.values.rate * 100).toFixed(2)}%\n\n`;
  }
  
  return summary;
}
