# CrowdStack Authentication Setup

## Architecture

- **Web App** (`crowdstack.app` / `localhost:3006`): Marketing, attendee-facing, login
- **B2B App** (`app.crowdstack.app` / `localhost:3007`): Venue, organizer, promoter dashboards

## How It Works

### Localhost (Development)

**Problem:** Browsers treat different ports as different origins, so cookies aren't shared between `localhost:3006` and `localhost:3007`.

**Solution:** Token-sharing via URL
1. User logs in on port 3006
2. After login, redirect to `localhost:3007/api/auth/session?access_token=...&refresh_token=...`
3. Session endpoint returns HTML page that sets cookies via JavaScript
4. Middleware reads cookies directly (bypasses Supabase SSR client issues)

### Production (Subdomains)

**Advantage:** `crowdstack.app` and `app.crowdstack.app` are subdomains, so cookies CAN be shared!

**Solution:** Standard Supabase SSR with shared cookie domain
1. User logs in on `crowdstack.app`
2. Supabase sets auth cookie with `domain: .crowdstack.app`
3. Cookie is automatically sent to `app.crowdstack.app`
4. Middleware uses standard Supabase SSR to read session

## Production Configuration

### 1. Supabase Dashboard Settings

In Supabase Dashboard → Authentication → URL Configuration:
- **Site URL:** `https://crowdstack.app`
- **Redirect URLs:**
  - `https://crowdstack.app/**`
  - `https://app.crowdstack.app/**`
  - `https://beta.crowdstack.app/**`
  - `https://app-beta.crowdstack.app/**`

### 2. Environment Variables

**Web App (Vercel):**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
NEXT_PUBLIC_WEB_URL=https://crowdstack.app
NEXT_PUBLIC_APP_URL=https://app.crowdstack.app
```

**B2B App (Vercel):**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
NEXT_PUBLIC_WEB_URL=https://crowdstack.app
NEXT_PUBLIC_APP_URL=https://app.crowdstack.app
```

### 3. Cookie Domain (Optional but Recommended)

For production, you may want to explicitly set the cookie domain to ensure sharing.

In `packages/shared/src/supabase/client.ts`, you can add:

```typescript
cookieOptions: {
  domain: process.env.NODE_ENV === 'production' ? '.crowdstack.app' : undefined,
}
```

## Security Notes

1. **Localhost token-sharing:** Tokens appear in URL (visible in browser history, server logs). This is acceptable for development only.

2. **Production:** Uses standard secure cookie-based auth. No tokens in URLs.

3. **HTTPS:** Always use HTTPS in production for cookie security.

## Testing

### Localhost
1. Start both servers: `pnpm dev:all`
2. Go to `http://localhost:3007/admin`
3. You'll be redirected to `localhost:3006/login`
4. Login with email/password
5. You'll see "Authenticating..." then land on `/admin`

### Production
1. Deploy both apps to Vercel
2. Set environment variables
3. Configure Supabase redirect URLs
4. Test login flow between domains

