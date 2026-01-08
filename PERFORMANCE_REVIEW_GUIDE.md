# Performance Review Guide - Launch Event
**Event Stats:** 500 guestlist, 250 check-ins

## Quick Access Links

### 1. Sentry Dashboard
- **URL:** https://sentry.io/organizations/[your-org]/issues/
- **What to Check:**
  - Error rate during event hours
  - Most common errors
  - Performance issues (slow transactions)
  - Check-in API errors specifically
  - Search API errors
  - Any 500 errors

**Key Metrics to Review:**
- Error count (should be low)
- P95/P99 response times for check-in endpoint
- Failed check-in attempts
- Search query failures

### 2. Vercel Dashboard
- **URL:** https://vercel.com/dashboard
- **Navigate to:** Your Project → Functions → Logs
- **What to Check:**
  - Function execution times
  - Error rates
  - Cold start issues
  - Timeout errors
  - Memory usage

**Key Endpoints to Review:**
- `/api/events/[eventId]/checkin` - Check-in endpoint (250 calls)
- `/api/events/[eventId]/search` - Search endpoint
- `/api/events/[eventId]/live-metrics` - Live metrics (frequently polled)
- `/door/[eventId]` - Door scanner page

### 3. Supabase Dashboard
- **URL:** https://supabase.com/dashboard
- **Navigate to:** Your Project → Database → Logs
- **What to Check:**
  - Query performance
  - Slow queries (>1s)
  - Connection pool exhaustion
  - Database errors

**Key Queries to Review:**
- Check-in inserts
- Registration lookups
- Search queries on attendees table
- Live metrics aggregations

## Performance Checklist

### ✅ Check-in Performance
- [ ] Average check-in response time < 500ms
- [ ] No timeout errors during peak
- [ ] No duplicate check-ins (should be handled by code)
- [ ] QR code scanning worked smoothly

### ✅ Search Performance  
- [ ] Search queries returned results quickly
- [ ] No "zero results" for valid searches
- [ ] Search worked for exact matches
- [ ] Search handled 500+ guestlist efficiently

### ✅ Real-time Updates
- [ ] Live metrics updated correctly
- [ ] Check-in counts accurate
- [ ] No lag in dashboard updates

### ✅ Database Performance
- [ ] No connection pool exhaustion
- [ ] Queries optimized (indexes used)
- [ ] No slow queries (>1s)

## Code Review Findings

### Potential Issues to Check:

1. **Check-in API** (`/api/events/[eventId]/checkin`)
   - Has performance tracking (startTime)
   - Multiple database queries per check-in
   - Could be optimized with batch operations

2. **Search API** (`/api/events/[eventId]/search`)
   - Recently fixed to query attendees table first
   - Should handle 500+ registrations efficiently
   - Uses proper indexing

3. **Live Metrics** (`/api/events/[eventId]/live-metrics`)
   - May be polled frequently
   - Complex aggregations
   - Could benefit from caching

## Recommended Actions

1. **Check Sentry for:**
   - Any errors during event hours
   - Slow transactions
   - Failed API calls

2. **Check Vercel Logs for:**
   - Function execution times
   - Any timeouts
   - Memory issues

3. **Check Supabase for:**
   - Slow queries
   - Connection issues
   - Index usage

4. **Review Specific Issues:**
   - If check-ins were slow: Review check-in API
   - If search failed: Review search API (recently fixed)
   - If dashboard lagged: Review live-metrics API

## Next Steps

1. Access Sentry dashboard and review errors
2. Check Vercel function logs for performance
3. Review Supabase query logs
4. Share findings for optimization recommendations
