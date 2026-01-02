# QA and Optimization Process Documentation

This document outlines the comprehensive quality assurance, performance testing, security auditing, and release processes for CrowdStack. Follow these checklists before each deployment to ensure production stability and performance.

---

## 1. Performance Testing Runbook

### Pre-Release Load Testing Checklist

#### Single Endpoint Testing
Before running full load tests, verify individual endpoints respond quickly:

```bash
# Test each endpoint with timing
curl -w "\nTime: %{time_total}s\n" -o /dev/null "https://crowdstack.app/api/browse/events?limit=12"
curl -w "\nTime: %{time_total}s\n" -o /dev/null "https://crowdstack.app/api/browse/venues?limit=12"
curl -w "\nTime: %{time_total}s\n" -o /dev/null "https://crowdstack.app/api/browse/djs?limit=12"
```

**Acceptance Criteria:**
- Single request: < 500ms (cold start acceptable up to 1s)
- Warm requests: < 200ms

#### k6 Load Testing

Run load tests at multiple concurrency levels to identify bottlenecks:

```bash
# 50 users (baseline)
BASE_URL=https://crowdstack.app k6 run scripts/load-test.js

# 100 users
# Edit scripts/load-test.js to set target: 100

# 500 users
# Edit scripts/load-test.js to set target: 500

# 1000 users (stress test)
# Edit scripts/load-test.js to set target: 1000
```

**Threshold Criteria:**
- **P95 Response Time:** < 500ms
- **Failed Requests:** 0%
- **Request Rate:** > 20 req/s (for 50 users)
- **All endpoints:** < 200ms average

**Baseline Metrics (from production):**
- 50 users: Avg 68ms, P95 85ms, 0% failures
- 1000 users: Avg 64ms, P95 75ms, 0% failures, 392 req/s

#### Production vs Staging Comparison

If staging environment exists, compare metrics:
- Response times should be within 20% of production
- Failure rates should match (ideally 0%)

### Database Query Optimization

#### Check for N+1 Queries

1. **Review API route files** for multiple sequential queries:
   ```typescript
   // BAD: Multiple queries
   const { data: events } = await supabase.from("events").select("*");
   for (const event of events) {
     const { data: tags } = await supabase.from("event_tags").select("*").eq("event_id", event.id);
   }
   
   // GOOD: Single query with JOIN
   const { data: events } = await supabase
     .from("events")
     .select("*, event_tags(*)");
   ```

2. **Check Supabase logs** in dashboard for:
   - Multiple queries per request
   - Slow query warnings (> 1s)
   - High query counts

#### Verify Database Indexes

Check that indexes exist for JOIN columns:

```sql
-- Check existing indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('venue_tags', 'event_tags', 'registrations', 'event_lineups');

-- Common indexes that should exist:
-- idx_venue_tags_venue_id ON venue_tags(venue_id)
-- idx_event_tags_event_id ON event_tags(event_id)
-- idx_registrations_event_id ON registrations(event_id)
-- idx_event_lineups_event_id ON event_lineups(event_id)
```

#### Review Query Plans

For slow endpoints (> 500ms), check query execution:
- Use Supabase dashboard query analyzer
- Look for full table scans
- Verify indexes are being used

### Response Payload Audit

#### Check Response Sizes

```bash
# Check response size
curl -s "https://crowdstack.app/api/browse/venues?limit=12" | wc -c
```

**Acceptance Criteria:**
- Single record: < 5KB
- 12 records: < 50KB
- Flag anything > 50KB for investigation

#### Verify No Base64 Data URIs

**Critical:** Base64 images in API responses bloat payloads (200KB+ per record).

```bash
# Check for data URIs
curl -s "https://crowdstack.app/api/browse/venues?limit=1" | grep -o "data:image[^\"']*" | head -1
```

**Fix:** Remove image columns from browse queries, fetch on detail pages only.

#### Ensure Pagination Works

- Verify `limit` and `offset` parameters work
- Check that `count` field matches actual results
- Test edge cases (limit=0, offset > total)

---

## 2. Caching Strategy Checklist

### Cache Tiers

Reference: [`apps/unified/src/lib/cache.ts`](../apps/unified/src/lib/cache.ts)

| Tier | Use Case | TTL | Example Endpoints |
|------|----------|-----|-------------------|
| `public-long` | Venue/DJ pages | 5 min | `/api/venues/by-slug/[slug]` |
| `public-short` | Browse listings | 1 min | `/api/browse/events` |
| `private` | Dashboard stats | 1 min | `/api/organizer/dashboard-stats` |
| `realtime` | Check-in, payouts | No cache | `/api/events/[id]/closeout` |

### Verification Steps

#### Test Cache-Control Headers

```bash
# Check headers
curl -I "https://crowdstack.app/api/browse/events?limit=12" | grep -i cache

# Expected output:
# cache-control: public, s-maxage=60, stale-while-revalidate=300
```

#### Verify Vercel Edge Caching

```bash
# First request (should be MISS)
curl -I "https://crowdstack.app/api/browse/events?limit=12" | grep x-vercel-cache
# x-vercel-cache: MISS

# Second request (should be HIT)
curl -I "https://crowdstack.app/api/browse/events?limit=12" | grep x-vercel-cache
# x-vercel-cache: HIT
```

#### Check Edge Runtime

Verify API routes have edge runtime enabled:

```typescript
// Should be present in route files
export const runtime = 'edge';
export const revalidate = 60; // for public-short
```

**Files to check:**
- `apps/unified/src/app/api/browse/events/route.ts`
- `apps/unified/src/app/api/browse/venues/route.ts`
- `apps/unified/src/app/api/browse/djs/route.ts`

#### Confirm Revalidate Exports

For static pages, verify ISR is configured:

```typescript
// Page files should have:
export const revalidate = 300; // 5 minutes for public pages
```

---

## 3. Security Audit Checklist

### Authentication and Authorization

#### Protected Routes
- [ ] All `/app/*` routes check for authenticated session
- [ ] Role-based access control verified (organizer, venue, promoter, DJ)
- [ ] Unauthorized users redirected to login

#### Service Role Key Security
- [ ] `SUPABASE_SERVICE_ROLE_KEY` never exposed to client
- [ ] Only used in server-side API routes
- [ ] Not included in `NEXT_PUBLIC_*` env vars

#### RLS (Row Level Security) Testing

Test with different user roles:

```sql
-- As organizer user
SELECT * FROM events WHERE created_by = current_user_id();

-- As attendee user (should only see published events)
SELECT * FROM events WHERE status = 'published';

-- As venue user (should only see their events)
SELECT * FROM events WHERE venue_id IN (
  SELECT id FROM venues WHERE created_by = current_user_id()
);
```

**Checklist:**
- [ ] RLS enabled on all tables with user data
- [ ] Policies tested with each role type
- [ ] No data leakage between users/organizations

### OWASP Top 10 Checks

#### A01:2021 – Broken Access Control
- [ ] Test horizontal privilege escalation (user A accessing user B's data)
- [ ] Test vertical privilege escalation (attendee accessing organizer features)
- [ ] Verify UUIDs in URLs can't be guessed to access other resources
- [ ] Check that event organizers can only manage their own events

#### A02:2021 – Cryptographic Failures
- [ ] All passwords hashed (Supabase handles this)
- [ ] Sensitive data encrypted in transit (HTTPS)
- [ ] No sensitive data in logs or error messages

#### A03:2021 – Injection
- [ ] **SQL Injection:** All queries use Supabase client (parameterized)
- [ ] **NoSQL Injection:** N/A (using PostgreSQL)
- [ ] **Command Injection:** No `exec()` or `system()` calls
- [ ] **Template Injection:** No user input in template strings

#### A04:2021 – Insecure Design
- [ ] Rate limiting on public endpoints (consider Vercel Edge Config)
- [ ] Input validation on all user inputs
- [ ] Business logic validation (e.g., can't register for past events)

#### A05:2021 – Security Misconfiguration
- [ ] Debug mode disabled in production
- [ ] No exposed `.env` files or secrets in git
- [ ] Error messages don't reveal stack traces in production
- [ ] CORS properly configured

#### A06:2021 – Vulnerable and Outdated Components
- [ ] Run `pnpm audit` before each release
- [ ] Check for critical vulnerabilities
- [ ] Update dependencies regularly

#### A07:2021 – Identification and Authentication Failures
- [ ] Session timeout configured
- [ ] Password requirements enforced (Supabase handles)
- [ ] Multi-factor authentication available (if implemented)
- [ ] Account lockout after failed attempts (Supabase handles)

#### A08:2021 – Software and Data Integrity Failures
- [ ] Dependencies from trusted sources only
- [ ] No `--ignore-scripts` bypasses
- [ ] Package integrity verified (pnpm lockfile)

#### A09:2021 – Security Logging and Monitoring Failures
- [ ] Failed login attempts logged
- [ ] Unauthorized access attempts logged
- [ ] Error monitoring configured (Sentry, Vercel Analytics)

#### A10:2021 – Server-Side Request Forgery (SSRF)
- [ ] No user-controlled URLs in fetch requests
- [ ] URL validation for external API calls
- [ ] Internal network access restricted

### Dependency Security

#### Before Each Release

```bash
# Check for vulnerabilities
pnpm audit

# Review critical and high severity issues
pnpm audit --audit-level=high

# Update vulnerable packages
pnpm update <package-name>
```

**Acceptance Criteria:**
- No critical vulnerabilities
- High severity vulnerabilities reviewed and patched
- Medium/low vulnerabilities tracked for next update cycle

#### Third-Party Package Review

- [ ] Review package permissions in `package.json`
- [ ] Check package maintainer reputation
- [ ] Verify packages are actively maintained
- [ ] Review package source code for suspicious activity

### Supabase-Specific Security

#### RLS Policies
- [ ] All tables with user data have RLS enabled
- [ ] Policies tested with each user role
- [ ] No `SECURITY DEFINER` functions that bypass RLS (unless intentional)

#### Storage Bucket Policies
- [ ] Upload restrictions by file type
- [ ] File size limits enforced
- [ ] Public read access only for specific buckets
- [ ] Authenticated uploads only for user content

#### API Key Management
- [ ] `anon` key has minimal permissions
- [ ] `service_role` key only used server-side
- [ ] Keys rotated if exposed
- [ ] No keys committed to git

---

## 4. Bug Tracking Process

### Bug Report Template

When reporting bugs, use this template:

```markdown
## Bug Report

**Environment:** Production / Staging / Local
**User Role:** Attendee / Organizer / Venue / Promoter / DJ
**Browser/Device:** Chrome 120 / Safari 17 / Mobile iOS 17
**Date/Time:** 2026-01-02 15:30 UTC

### Steps to Reproduce
1. Navigate to [URL]
2. Click [button/link]
3. Fill in [form field]
4. Submit

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happens]

### Screenshots/Logs
[Attach screenshots or error logs]

### Additional Context
[Any other relevant information]
```

### Severity Levels

| Level | Definition | Response Time | Example |
|-------|------------|--------------|---------|
| **P0** | Site down, data loss, security breach | Immediate | Database corruption, XSS vulnerability |
| **P1** | Feature broken, no workaround | Same day | Registration flow broken, payment processing fails |
| **P2** | Feature broken, has workaround | 48 hours | Dashboard stats not loading (can use API directly) |
| **P3** | Minor issue, cosmetic | Next sprint | Button alignment off, typo in text |

### Bug Fix Workflow

1. **Reproduce Locally**
   - Reproduce the bug in development environment
   - Document exact steps
   - Capture error logs/screenshots

2. **Write Failing Test** (if applicable)
   - Add test case that reproduces the bug
   - Verify test fails
   - Useful for regression prevention

3. **Fix and Verify**
   - Implement fix
   - Verify bug is resolved locally
   - Run affected test suite

4. **Load Test Affected Endpoints**
   - If API change, run k6 test
   - Verify no performance regression
   - Check response times still meet thresholds

5. **Deploy to Staging**
   - Deploy fix to staging environment
   - Verify fix works in staging
   - Test related functionality for regressions

6. **Deploy to Production**
   - Deploy during low-traffic window (if P0/P1)
   - Monitor error logs after deployment
   - Verify fix in production
   - Close bug report

---

## 5. Regression Testing Checklist

### Pre-Deployment Checklist

Before merging to `main` or deploying:

- [ ] **TypeScript:** `pnpm typecheck` passes with 0 errors
- [ ] **Lint:** `pnpm lint` passes (or only acceptable warnings)
- [ ] **Build:** `pnpm build` succeeds without errors
- [ ] **Core APIs Respond:**
  ```bash
  curl -f https://crowdstack.app/api/browse/events?limit=1
  curl -f https://crowdstack.app/api/browse/venues?limit=1
  curl -f https://crowdstack.app/api/browse/djs?limit=1
  ```

### Critical Path Testing

Test these user flows after each major change:

#### Browse Flow
1. Homepage loads
2. Click "Browse Events"
3. Event list displays
4. Click on event
5. Event detail page loads with all data

#### Registration Flow
1. Navigate to event detail page
2. Click "Register" button
3. Fill registration form
4. Submit registration
5. Confirmation page displays
6. Check email confirmation (if enabled)

#### Check-in Flow (Organizer)
1. Log in as organizer
2. Navigate to event dashboard
3. Open check-in page
4. Scan QR code (or manual entry)
5. Attendee marked as checked in
6. Check-in count updates

#### Promoter Flow
1. Get promoter referral link
2. Share link with attendee
3. Attendee registers via link
4. Registration shows promoter attribution
5. Promoter dashboard shows referral

### Load Test Regression

After each major change, run baseline load test:

```bash
# Reset load test to 50 users
# Edit scripts/load-test.js: target: 50

# Run test
BASE_URL=https://crowdstack.app k6 run scripts/load-test.js
```

**Baseline Metrics to Maintain:**
- Avg response: < 100ms
- P95: < 200ms
- Failed: 0%
- Request rate: > 20 req/s

**If metrics degrade:**
- Investigate slow endpoints
- Check for new N+1 queries
- Verify caching still works
- Review database query performance

---

## 6. Release Checklist

### Pre-Release

Complete all items before deploying to production:

- [ ] **Code Review:** All PRs reviewed and approved
- [ ] **All PRs Merged:** No pending PRs for this release
- [ ] **TypeScript Errors:** `pnpm typecheck` shows 0 errors
- [ ] **Lint:** `pnpm lint` passes
- [ ] **Build:** `pnpm build` succeeds
- [ ] **Security Audit:** `pnpm audit` shows no critical vulnerabilities
- [ ] **Load Test:** k6 test passes thresholds (50 users)
- [ ] **Staging Tested:** Manual testing completed in staging (if available)
- [ ] **Documentation:** README/CHANGELOG updated if needed
- [ ] **Database Migrations:** All migrations applied and tested
- [ ] **Environment Variables:** All required env vars set in Vercel

### Post-Release

Immediately after deployment:

- [ ] **Production Responds:** Homepage loads successfully
- [ ] **Core APIs Work:** Browse endpoints return data
- [ ] **Error Monitoring:** Check Vercel logs for errors
- [ ] **Quick Load Test:** Run 10-user test to verify performance
- [ ] **Smoke Test:** Test critical user flow (browse → event → register)
- [ ] **Team Notification:** Notify team of release (Slack/Discord)
- [ ] **Monitor:** Watch error logs for 15-30 minutes

### Rollback Plan

If critical issues found:

1. **Immediate:** Revert to previous deployment in Vercel
2. **Investigate:** Review error logs and recent changes
3. **Fix:** Implement fix in separate branch
4. **Test:** Verify fix in staging
5. **Redeploy:** Deploy fix to production

---

## 7. Performance Optimization Guidelines

### When to Optimize

Optimize when:
- Load test shows P95 > 500ms
- Single endpoint > 1s response time
- Response payload > 50KB
- Database query > 500ms
- User reports slow page loads

### Optimization Checklist

1. **Identify Bottleneck**
   - Check response times per endpoint
   - Review database query logs
   - Check response payload sizes

2. **Query Optimization**
   - Combine multiple queries into single JOIN
   - Add database indexes for JOIN columns
   - Remove unnecessary data from responses

3. **Caching**
   - Add appropriate cache headers
   - Enable edge runtime for public APIs
   - Set `revalidate` for ISR

4. **Verify Improvement**
   - Run load test again
   - Compare before/after metrics
   - Document improvement

### Common Optimizations

#### Remove Base64 Data URIs
```typescript
// BAD: Includes base64 images in response
.select('id, name, logo_url') // logo_url contains data:image/...

// GOOD: Exclude images from browse, fetch on detail page
.select('id, name') // logo_url fetched separately on detail page
```

#### Combine Queries
```typescript
// BAD: N+1 queries
const { data: events } = await supabase.from("events").select("*");
for (const event of events) {
  const { data: tags } = await supabase.from("event_tags").select("*").eq("event_id", event.id);
}

// GOOD: Single query
const { data: events } = await supabase
  .from("events")
  .select("*, event_tags(*)");
```

#### Add Database Indexes
```sql
CREATE INDEX IF NOT EXISTS idx_venue_tags_venue_id ON venue_tags(venue_id);
CREATE INDEX IF NOT EXISTS idx_event_tags_event_id ON event_tags(event_id);
```

---

## 8. Monitoring and Alerting

### Key Metrics to Monitor

- **Response Times:** P50, P95, P99 per endpoint
- **Error Rates:** 4xx, 5xx status codes
- **Request Volume:** Requests per second
- **Cache Hit Rate:** Vercel edge cache effectiveness
- **Database Query Time:** Slow query detection

### Recommended Tools

- **Vercel Analytics:** Built-in performance monitoring
- **Sentry:** Error tracking and alerting
- **Supabase Dashboard:** Database query performance
- **k6 Cloud:** Load testing with historical data (optional)

### Alert Thresholds

Set up alerts for:
- Error rate > 1%
- P95 response time > 1s
- Database query > 2s
- Cache hit rate < 50%

---

## Appendix: Quick Reference Commands

### Performance Testing
```bash
# Single endpoint timing
curl -w "\nTime: %{time_total}s\n" -o /dev/null "https://crowdstack.app/api/browse/events?limit=12"

# Response size check
curl -s "https://crowdstack.app/api/browse/venues?limit=12" | wc -c

# Load test (50 users)
BASE_URL=https://crowdstack.app k6 run scripts/load-test.js

# Check cache headers
curl -I "https://crowdstack.app/api/browse/events?limit=12" | grep -i cache
```

### Security Checks
```bash
# Dependency audit
pnpm audit

# TypeScript check
pnpm typecheck

# Lint check
pnpm lint
```

### Build Verification
```bash
# Full build test
pnpm build

# Type check only
pnpm typecheck
```

---

## Document Maintenance

This is a living document. Update it when:
- New optimization techniques are discovered
- Security vulnerabilities are found and patched
- Performance thresholds change
- New tools or processes are adopted

**Last Updated:** 2026-01-02
**Maintained By:** Development Team

