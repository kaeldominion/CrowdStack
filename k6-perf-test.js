import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const homepageTime = new Trend('homepage_time', true);
const browseTime = new Trend('browse_time', true);
const loginPageTime = new Trend('login_page_time', true);
const apiHealthTime = new Trend('api_health_time', true);

// Configuration - set via environment variable
const BASE_URL = __ENV.BASE_URL || 'https://beta.crowdstack.app';

export const options = {
  stages: [
    { duration: '10s', target: 5 },   // Ramp up to 5 users
    { duration: '30s', target: 10 },  // Stay at 10 users
    { duration: '10s', target: 20 },  // Spike to 20 users
    { duration: '20s', target: 10 },  // Back to 10
    { duration: '10s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% of requests under 3s
    errors: ['rate<0.1'],              // Error rate under 10%
  },
};

export default function () {
  // Test 1: Homepage
  let homeRes = http.get(`${BASE_URL}/`, {
    tags: { name: 'homepage' },
  });
  homepageTime.add(homeRes.timings.duration);
  check(homeRes, {
    'homepage status 200': (r) => r.status === 200,
    'homepage under 3s': (r) => r.timings.duration < 3000,
  }) || errorRate.add(1);

  sleep(0.5);

  // Test 2: Browse page
  let browseRes = http.get(`${BASE_URL}/browse`, {
    tags: { name: 'browse' },
  });
  browseTime.add(browseRes.timings.duration);
  check(browseRes, {
    'browse status 200': (r) => r.status === 200,
    'browse under 3s': (r) => r.timings.duration < 3000,
  }) || errorRate.add(1);

  sleep(0.5);

  // Test 3: Login page (static, should be fast)
  let loginRes = http.get(`${BASE_URL}/login`, {
    tags: { name: 'login' },
  });
  loginPageTime.add(loginRes.timings.duration);
  check(loginRes, {
    'login status 200': (r) => r.status === 200,
    'login under 2s': (r) => r.timings.duration < 2000,
  }) || errorRate.add(1);

  sleep(0.5);

  // Test 4: FAQ page
  let faqRes = http.get(`${BASE_URL}/faq`, {
    tags: { name: 'faq' },
  });
  check(faqRes, {
    'faq status 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);
}

export function handleSummary(data) {
  const env = BASE_URL.includes('beta') ? 'BETA' : 'PROD';

  console.log(`\n${'='.repeat(60)}`);
  console.log(`PERFORMANCE TEST RESULTS - ${env}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`${'='.repeat(60)}\n`);

  return {
    stdout: JSON.stringify({
      environment: env,
      base_url: BASE_URL,
      metrics: {
        homepage_p95: data.metrics.homepage_time?.values['p(95)'],
        browse_p95: data.metrics.browse_time?.values['p(95)'],
        login_p95: data.metrics.login_page_time?.values['p(95)'],
        http_req_duration_p95: data.metrics.http_req_duration?.values['p(95)'],
        http_req_failed: data.metrics.http_req_failed?.values.rate,
        error_rate: data.metrics.errors?.values.rate,
        iterations: data.metrics.iterations?.values.count,
        vus_max: data.metrics.vus_max?.values.max,
      },
    }, null, 2),
  };
}
