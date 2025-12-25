# Local Development Setup - Unified Origin

## Overview

Local development uses a **single origin** (`http://localhost:3006`) to fix Supabase auth cookie sharing issues. Both apps run simultaneously, with `apps/web` proxying B2B routes to `apps/app`.

## Architecture

```
┌─────────────────────────────────────┐
│   Browser (localhost:3006)          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   apps/web (port 3006)              │
│   - Serves web routes directly      │
│   - Proxies /app/* → apps/app       │
│   - Proxies /door/* → apps/app      │
└──────────────┬──────────────────────┘
               │ (proxied requests)
               ▼
┌─────────────────────────────────────┐
│   apps/app (port 3007 - internal)   │
│   - B2B dashboards                  │
│   - Door scanner                    │
│   - Admin panel                     │
└─────────────────────────────────────┘
```

## How to Run

```bash
# Start both apps (recommended)
pnpm dev

# Or start individually
pnpm dev:web    # Start web on 3006
pnpm dev:app    # Start app on 3007 (internal only)
```

## URL Structure

All local development happens at `http://localhost:3006`:

- **Web App**: `http://localhost:3006/` (direct)
- **B2B Dashboard**: `http://localhost:3006/app/` (proxied)
- **Door Scanner**: `http://localhost:3006/door/` (proxied)
- **API Routes**: Automatically proxied when accessed from `localhost:3006`

## Implementation Details

### 1. Next.js Rewrites (apps/web/next.config.js)

The web app uses Next.js rewrites to proxy requests to apps/app:

```javascript
async rewrites() {
  const isLocalDev = 
    process.env.NODE_ENV === "development" || 
    process.env.NEXT_PUBLIC_APP_ENV === "local";
  
  if (isLocalDev) {
    return [
      { source: "/app/:path*", destination: "http://localhost:3007/app/:path*" },
      { source: "/door/:path*", destination: "http://localhost:3007/door/:path*" },
      // API routes...
    ];
  }
  return [];
}
```

### 2. Package Scripts

- `pnpm dev` - Starts both apps concurrently (web on 3006, app on 3007)
- `pnpm dev:web` - Start web only
- `pnpm dev:app` - Start app only (for debugging)

### 3. Environment Variables

**apps/web/.env.local**:
```env
NEXT_PUBLIC_WEB_URL=http://localhost:3006
NEXT_PUBLIC_APP_URL=http://localhost:3006  # Use unified origin for local dev
```

**apps/app/.env.local**:
```env
NEXT_PUBLIC_WEB_URL=http://localhost:3006
NEXT_PUBLIC_APP_URL=http://localhost:3006  # Use unified origin for local dev
```

Note: Both apps use `localhost:3006` as `NEXT_PUBLIC_APP_URL` in local dev, even though apps/app runs on 3007 internally.

## Benefits

1. **Single Origin**: All requests come from `localhost:3006`, so Supabase auth cookies work seamlessly
2. **No Cookie Sharing Issues**: No need for token-sharing workarounds
3. **Simpler Development**: Access everything from one URL
4. **Production Unchanged**: Production still uses separate Vercel projects with subdomains

## Troubleshooting

### Proxy Not Working

1. **Check both servers are running**:
   ```bash
   # Should see both WEB and APP in console
   pnpm dev
   ```

2. **Verify rewrites are active**:
   - Check `apps/web/next.config.js` has rewrites
   - Ensure `NODE_ENV=development` or `NEXT_PUBLIC_APP_ENV=local`

3. **Check port 3007 is accessible**:
   ```bash
   curl http://localhost:3007/app
   ```

### Still Getting Auth Errors

1. **Clear browser cookies** for `localhost`
2. **Check environment variables** - both apps should use `localhost:3006` as `NEXT_PUBLIC_APP_URL`
3. **Verify Supabase redirect URLs** include `http://localhost:3006/**`

## Production

This setup is **LOCAL DEV ONLY**. Production deployment:
- Uses separate Vercel projects
- Web: `crowdstack.app` (or `beta.crowdstack.app`)
- App: `app.crowdstack.app` (or `app-beta.crowdstack.app`)
- Cookies shared via `.crowdstack.app` domain
- No proxying needed







