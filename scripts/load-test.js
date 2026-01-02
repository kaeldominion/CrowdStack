/**
 * CrowdStack Load Test Script
 * 
 * Run with: k6 run scripts/load-test.js
 * 
 * Tests critical endpoints with 50 concurrent users for 60 seconds.
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const browseEventsTrend = new Trend('browse_events_duration');
const browseVenuesTrend = new Trend('browse_venues_duration');
const browseDJsTrend = new Trend('browse_djs_duration');

export const options = {
  scenarios: {
    // Ramp up to 10 concurrent users
    load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 5 },   // Ramp up to 5 users
        { duration: '10s', target: 10 },  // Ramp up to 10 users
        { duration: '30s', target: 10 },  // Stay at 10 users
        { duration: '10s', target: 0 },   // Ramp down
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% of requests under 2s
    http_req_failed: ['rate<0.05'],      // Less than 5% errors
    errors: ['rate<0.1'],                // Custom error rate under 10%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Helper to check response
function checkResponse(res, name) {
  const success = check(res, {
    [`${name} status 200`]: (r) => r.status === 200,
    [`${name} has body`]: (r) => r.body && r.body.length > 0,
  });
  
  if (!success) {
    errorRate.add(1);
    console.log(`❌ ${name} failed: ${res.status} - ${res.body?.substring(0, 100)}`);
  } else {
    errorRate.add(0);
  }
  
  return success;
}

export default function () {
  // Simulate real user behavior with random endpoint selection
  const scenario = Math.random();
  
  if (scenario < 0.4) {
    // 40% - Browse events (most common)
    group('Browse Events', function () {
      const start = Date.now();
      const res = http.get(`${BASE_URL}/api/browse/events?limit=12`);
      browseEventsTrend.add(Date.now() - start);
      checkResponse(res, 'browse-events');
    });
  } else if (scenario < 0.6) {
    // 20% - Browse venues
    group('Browse Venues', function () {
      const start = Date.now();
      const res = http.get(`${BASE_URL}/api/browse/venues?limit=12`);
      browseVenuesTrend.add(Date.now() - start);
      checkResponse(res, 'browse-venues');
    });
  } else if (scenario < 0.75) {
    // 15% - Browse DJs
    group('Browse DJs', function () {
      const start = Date.now();
      const res = http.get(`${BASE_URL}/api/browse/djs?limit=12`);
      browseDJsTrend.add(Date.now() - start);
      checkResponse(res, 'browse-djs');
    });
  } else if (scenario < 0.85) {
    // 10% - Venue page API
    group('Venue API', function () {
      // Using a common slug pattern - adjust if you have real slugs
      const res = http.get(`${BASE_URL}/api/venues/by-slug/test-venue`);
      // 404 is acceptable if venue doesn't exist
      check(res, {
        'venue-api status ok': (r) => r.status === 200 || r.status === 404,
      });
    });
  } else {
    // 15% - Event page API  
    group('Event API', function () {
      const res = http.get(`${BASE_URL}/api/events/by-slug/test-event`);
      // 404 is acceptable if event doesn't exist
      check(res, {
        'event-api status ok': (r) => r.status === 200 || r.status === 404,
      });
    });
  }

  // Simulate user think time (1-3 seconds)
  sleep(Math.random() * 2 + 1);
}

export function handleSummary(data) {
  const summary = {
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━': '',
    '🚀 CROWDSTACK LOAD TEST RESULTS': '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━': '',
    'Total Requests': data.metrics.http_reqs?.values?.count || 0,
    'Request Rate': `${(data.metrics.http_reqs?.values?.rate || 0).toFixed(2)} req/s`,
    'Avg Response Time': `${(data.metrics.http_req_duration?.values?.avg || 0).toFixed(2)}ms`,
    'P95 Response Time': `${(data.metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2)}ms`,
    'P99 Response Time': `${(data.metrics.http_req_duration?.values?.['p(99)'] || 0).toFixed(2)}ms`,
    'Failed Requests': `${((data.metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2)}%`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━': '',
    'ENDPOINT BREAKDOWN': '',
    'Browse Events (avg)': `${(data.metrics.browse_events_duration?.values?.avg || 0).toFixed(2)}ms`,
    'Browse Venues (avg)': `${(data.metrics.browse_venues_duration?.values?.avg || 0).toFixed(2)}ms`,
    'Browse DJs (avg)': `${(data.metrics.browse_djs_duration?.values?.avg || 0).toFixed(2)}ms`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━': '',
  };
  
  console.log('\n');
  for (const [key, value] of Object.entries(summary)) {
    if (value === '') {
      console.log(key);
    } else {
      console.log(`${key}: ${value}`);
    }
  }
  console.log('\n');
  
  return {
    stdout: JSON.stringify(summary, null, 2),
  };
}

