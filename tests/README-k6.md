# k6 Load Testing

## Prerequisites

Install k6:
```bash
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
# Download from https://k6.io/docs/getting-started/installation/
```

## Running Tests

### Simple Test (Quick Check)
```bash
# Test with default settings
k6 run tests/load-test-profile-pages-simple.js

# Test with custom URL and slug
BASE_URL=https://crowdstack.app PROMOTER_SLUG=ayu-paige k6 run tests/load-test-profile-pages-simple.js
```

### Comprehensive Test (All Profile Pages)
```bash
# Test all profile pages
k6 run tests/load-test-profile-pages.js

# With custom test data
BASE_URL=https://crowdstack.app \
PROMOTER_SLUG=ayu-paige \
VENUE_SLUG=shishi \
DJ_HANDLE=test-dj \
EVENT_SLUG=test-event \
k6 run tests/load-test-profile-pages.js
```

## Test Scenarios

### Current Test (No Caching)
- Tests promoter, venue, DJ, event, and homepage
- Ramp up to 100 concurrent users
- Measures response times, error rates, and cache behavior

### Expected Results (Current Setup)
- **Promoter/Venue/DJ Profiles**: ~500-800ms average (no cache, DB query every time)
- **Event Pages**: ~50-200ms average (ISR cached)
- **Homepage**: ~50-200ms average (ISR cached)

## Interpreting Results

### Key Metrics
- **http_req_duration**: Response time (lower is better)
  - `avg`: Average response time
  - `p(95)`: 95th percentile (95% of requests faster than this)
  - `p(99)`: 99th percentile (worst 1% of requests)
- **http_req_failed**: Error rate (should be < 5%)
- **http_reqs**: Total requests and rate (req/s)

### What to Look For
1. **Response Times**: 
   - Promoter/Venue/DJ profiles should show higher times (no cache)
   - Event/Homepage should show lower times (cached)
2. **Error Rate**: Should be < 5%
3. **P95 Response Time**: Should be < 2-3 seconds for good UX

## After Implementing Caching

Once you add ISR caching to profile pages, you should see:
- **5-10x improvement** in response times for promoter/venue/DJ profiles
- **P95 times drop** from ~800ms to ~100-200ms
- **Higher throughput** (more requests/second)
