# k6 Load Test Results - Current Setup (No Caching)

**Test Date**: 2026-01-12  
**Target**: Promoter Profile Page (`/promoter/ayu-paige`)  
**Base URL**: https://crowdstack.app  
**Test Duration**: 50 seconds  
**Max Concurrent Users**: 50

## Test Configuration

- **Ramp Up**: 10s to 20 users → 30s at 50 users → 10s ramp down
- **Total Requests**: 570
- **Request Rate**: ~11 requests/second

## Performance Results

### Response Times

| Metric | Value | Status |
|--------|-------|--------|
| **Average** | 1.54s (1540ms) | ⚠️ Slow |
| **Median** | 1.48s (1480ms) | ⚠️ Slow |
| **P90** | 1.58s (1580ms) | ⚠️ Slow |
| **P95** | 1.98s (1980ms) | ⚠️ Slow |
| **P99** | ~3.0s (estimated) | ⚠️ Very Slow |
| **Min** | 1.4s (1400ms) | ⚠️ Slow |
| **Max** | 3.61s (3610ms) | ❌ Very Slow |

### Success Metrics

- ✅ **Error Rate**: 0% (all requests succeeded)
- ✅ **Status 200**: 100% success rate
- ⚠️ **Response Time < 2s**: 96% (548/570 requests)
- ✅ **Response Time < 5s**: 100% (all requests)

### Key Observations

1. **Consistently Slow**: Every request takes 1.4-3.6 seconds
   - This indicates **no caching** - every request hits the database
   - No "fast" cached responses observed

2. **22 Slow Requests**: 4% of requests took 2-5 seconds
   - These are likely during database query spikes
   - Could be connection pooling issues or query complexity

3. **No Errors**: 0% error rate is good - the system is stable

4. **Throughput**: ~11 req/s is limited by response time
   - With caching, this could be 50-100+ req/s

## Comparison with Expected (After Caching)

| Metric | Current (No Cache) | Expected (ISR 15s) | Improvement |
|--------|-------------------|-------------------|-------------|
| Average | 1.54s | ~100-200ms | **7-15x faster** |
| P95 | 1.98s | ~150-250ms | **8-13x faster** |
| Throughput | ~11 req/s | ~50-100 req/s | **5-10x more** |
| Database Load | 1 query per request | 1 query per 15s | **95%+ reduction** |

## Analysis

### Current Performance Issues

1. **Every Request Hits Database**: No caching means every page view requires:
   - Database connection
   - Complex queries (promoter + events + stats)
   - Server-side rendering
   - Network latency

2. **Response Time Distribution**:
   - All requests are slow (1.4-3.6s)
   - No "fast" responses (would see <200ms if cached)
   - Consistent pattern = no cache hits

3. **Scalability Concerns**:
   - At 50 concurrent users: ~11 req/s
   - At 200 concurrent users: Would likely see 40-50 req/s
   - Each request = database query = potential bottleneck

### What This Means

- **User Experience**: 1.5-2 second page loads are noticeable and slow
- **Database Load**: Every page view = database query (expensive)
- **Cost**: Higher compute and database costs
- **Scalability**: Limited by database connection pool

## Recommendations

### Immediate (High Impact)

1. **Add ISR Caching** (`revalidate = 15-30`)
   - Expected: 5-10x performance improvement
   - P95 should drop from ~2s to ~200ms

2. **Add On-Demand Revalidation**
   - After profile updates, call `revalidatePath()`
   - Ensures updates appear quickly while maintaining cache benefits

### Expected Results After Optimization

- **Average Response Time**: 1.54s → ~150ms (10x faster)
- **P95 Response Time**: 1.98s → ~200ms (10x faster)
- **Throughput**: 11 req/s → 50-100 req/s (5-10x more)
- **Database Queries**: 570 queries → ~38 queries (95% reduction)

## Next Steps

1. Run this test again after implementing ISR caching
2. Compare results to measure actual improvement
3. Test other profile pages (venue, DJ) with same pattern
4. Monitor database query counts to verify cache effectiveness
