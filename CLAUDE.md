# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Development
pnpm dev                    # Start unified app on port 3000
pnpm dev:unified           # Same as above

# Build
pnpm build                  # Build all apps
pnpm build:unified         # Build unified app only

# Type checking
pnpm typecheck              # Type check all packages
pnpm typecheck:unified     # Type check unified app only
pnpm tsc --noEmit -p apps/unified  # Direct tsc for faster checks

# Linting
pnpm lint                   # Lint all packages

# E2E Tests (Playwright)
pnpm test:e2e              # Run all e2e tests
pnpm test:e2e:ui           # Run with Playwright UI
pnpm test:e2e:headed       # Run in headed mode
npx playwright test tests/homepage.spec.ts  # Run single test file

# Clean
pnpm clean                  # Remove all node_modules and build artifacts
```

## Architecture Overview

### Monorepo Structure
- **apps/unified** - Main Next.js 14 app (App Router) serving all routes
- **packages/shared** - Shared types, Supabase clients, utilities
- **packages/ui** - Shared React UI components

### Data Fetching Strategy

**Use React Query hooks, not manual fetch + useState.** Hooks are in `apps/unified/src/lib/hooks/`:

```typescript
// ✅ Correct - use existing hooks
import { useUnifiedDashboard, useVenueDashboard } from '@/lib/hooks/use-dashboard-stats';
const { data, isLoading } = useUnifiedDashboard(userRoles);

// ❌ Wrong - manual fetching bypasses cache
const [data, setData] = useState(null);
useEffect(() => { fetch('/api/...').then(...) }, []);
```

**Key hooks:**
- `useUnifiedDashboard()` - Single API call for all dashboard data (reduces 4-8 calls to 1)
- `useVenueDashboard()`, `useOrganizerDashboard()`, `usePromoterDashboard()`, `useDJDashboard()`
- `useDashboardLiveEvents()` - Conditional polling (only when live events exist)
- `useBrowseEvents()`, `useBrowseVenues()`, `useBrowseDJs()` - Public browse data

**Query keys and stale times** are defined in `lib/query-client.ts`.

### Cache Tiers (lib/cache.ts)

| Tier | Use Case | TTL |
|------|----------|-----|
| `public-long` | Venue/DJ pages | 5 min CDN |
| `public-short` | Browse listings | 1-2 min CDN |
| `private` | Dashboard stats | 60s browser |
| `realtime` | Check-ins, payments | No cache |

### Role-Based Access

Roles: `superadmin`, `venue_admin`, `event_organizer`, `promoter`, `dj`, `door_staff`, `attendee`

Server-side role checks in `lib/auth/check-role.ts`:
```typescript
import { getUserRoles, userHasRoleOrSuperadmin } from '@/lib/auth/check-role';
```

VenueContext handles venue switching with `venueVersion` for cache invalidation.

### URL Utilities (lib/utils/url.ts)

```typescript
import { getWebUrl, getVenueUrl, getEventUrl, getDJUrl } from '@/lib/utils/url';
// Handles app.crowdstack.app → crowdstack.app conversion
```

### Database

Supabase with Row Level Security. Migrations in `supabase/migrations/`.

**Clients:**
- `createClient()` - Authenticated client (respects RLS)
- `createServiceRoleClient()` - Admin client (bypasses RLS, server-only)

### Environments & Databases

| Environment | URL | Database |
|-------------|-----|----------|
| **Local dev** | localhost:3000 | Beta DB |
| **Beta** | beta.crowdstack.app | Beta DB |
| **Staging** | staging.crowdstack.app | **Production DB** |
| **Production** | crowdstack.app | **Production DB** |

⚠️ **Staging and Production share the same database!** Test data changes on staging affect production.

### Branch Strategy

- `staging` → Staging (staging.crowdstack.app) - uses Production DB
- `main` → Production (crowdstack.app) - uses Production DB

### Key Patterns

1. **Dashboard API**: `/api/dashboard/unified` fetches all role data in parallel
2. **Conditional polling**: Only poll when needed (e.g., live events exist)
3. **BentoCard**: Standard dashboard UI component
4. **Loading skeletons**: Per-section loading states, not full-page loaders
5. **Error boundaries**: Display refresh option, don't swallow errors

### Referral System

See **[docs/REFERRAL_SYSTEM.md](docs/REFERRAL_SYSTEM.md)** for complete documentation on:
- How promoter profile referrals work (`/promoter/{slug}`)
- The `?ref=` parameter flow and attribution
- Special case: sharing from promoter pages preserves their referral code
- Database schema (`referral_clicks`, `registrations` referral columns)
- XP awards for referrals (clicks: 2 XP, registrations: 15-25 XP)

### Testing

E2E tests in `/tests/` using Playwright. See **[tests/README.md](tests/README.md)** for:
- Test user accounts and credentials
- Auth setup instructions
- Running authenticated tests by role (`--project=venue`, etc.)
- Writing tests with auth fixtures

---

## Session Learnings

When discovering important patterns, gotchas, or decisions during a session, add them here:

<!--
To add a learning, ask Claude: "Add to CLAUDE.md learnings: <your insight>"
-->

- **2025-01-17**: Unified dashboard API reduces waterfall loading from 4-8 API calls to 1
- **2025-01-17**: Use `useDashboardLiveEvents` (not `useLiveEvents`) to avoid naming conflict with browse hooks

## ⚡️ Vibe Coding Workflow

### 1. The Build Loop
When asked to "Build feature X":
1.  **Plan**: Initiate `/plan` to map the implementation.
2.  **Constraint**: The FINAL step of every plan must be: *"Generate robust tests with `@generator`, then verify with `@healer`."*
3.  **Execute**: Run the plan. Do not stop until the feature is built AND the `@healer` confirms tests pass.

### 2. The Self-Healing Protocol
If a test fails during execution or I report a bug:
1.  **DO NOT** ask me to debug it.
2.  **Invoke**: `@healer run tests for [Feature]`.
3.  **Authority**: The `@healer` is fully authorized to edit `src/*` to fix logic errors.
4.  **Stop Condition**:
    - Pass: Report "💚 Fixed" and end.
    - Fail (x3): Report "🔴 Stuck" and request human review.