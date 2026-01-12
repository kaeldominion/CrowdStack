# Purging Vercel Edge Cache for Stale Profile Data

## Problem
Even with `force-dynamic` and `noStore()`, Vercel's Edge Cache can still serve stale responses for hours, especially for public pages.

## Solution 1: Manual Cache Purge (Immediate Fix)

### Via Vercel Dashboard
1. Go to Vercel Dashboard → Your Project
2. Navigate to **Deployments** tab
3. Find the latest deployment
4. Click the **"..."** menu (three dots)
5. Select **"Redeploy"** or **"Purge Cache"** (if available)
6. Wait for redeploy to complete (2-3 minutes)

### Via Vercel CLI (if you have access)
```bash
# Install Vercel CLI if needed
npm i -g vercel

# Login
vercel login

# Purge cache for specific path
vercel cache-purge /promoter/ayu-paige
vercel cache-purge /v/venue-slug

# Or purge all cache
vercel cache-purge --all
```

## Solution 2: Add Cache-Busting Query Parameter (Workaround)

Users can manually add `?v=1` or `?t=timestamp` to the URL to bypass cache:
- `https://crowdstack.app/promoter/ayu-paige?v=1`
- `https://crowdstack.app/promoter/ayu-paige?t=1234567890`

## Solution 3: Verify Fix is Deployed

The latest fix (commit `b68459f`) passes data directly from server to client, bypassing the API layer. This should help, but Vercel Edge Cache may still cache the page HTML.

To verify:
1. Check deployment status in Vercel Dashboard
2. Verify the commit SHA matches `b68459f` or later
3. Hard refresh the page (Cmd+Shift+R / Ctrl+Shift+R)

## Solution 4: Add Response Headers (Future Prevention)

We could add headers to explicitly tell Vercel not to cache:
```typescript
// In next.config.js headers()
{
  key: 'X-Vercel-Cache-Bypass',
  value: '1',
}
```

Or use Vercel's cache control:
```typescript
{
  key: 'CDN-Cache-Control',
  value: 'no-store',
}
```

## Solution 5: Use On-Demand Revalidation (Best Long-term)

Next.js 13+ supports on-demand revalidation. After updating a promoter profile, we could call:

```typescript
import { revalidatePath } from 'next/cache';

// After updating promoter profile
revalidatePath(`/promoter/${slug}`);
```

However, `revalidatePath` only works in Server Components/Route Handlers, not in API routes. We'd need to call it from a server action or use the revalidation API.

## Recommended Immediate Action

1. **Check if fix is deployed**: Look at Vercel deployment logs
2. **If deployed but still stale**: Manually purge Vercel cache (Solution 1)
3. **If not deployed yet**: Wait for deployment, then purge cache
4. **For testing**: Use cache-busting query parameter (Solution 2)
