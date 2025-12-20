# Authentication Flow Explanation

## Email/Password Login

**Current Implementation:**
- Uses `signInWithPassword()` which directly returns a session
- Session cookies are set automatically by `@supabase/ssr` in the browser
- **Does NOT use the callback route** - session is created immediately
- Relies on cookie sharing between localhost ports

**How it works:**
1. User enters email/password on `localhost:3006`
2. `signInWithPassword()` creates session → cookies set for `localhost:3006`
3. If cookies are shared → user can access `localhost:3007` immediately
4. If cookies aren't shared → user gets redirected back to login (validation loop)

## Magic Link Login

**Current Implementation:**
- Uses server-side callback route (`/api/auth/callback`)
- More reliable because it handles code exchange server-side
- Sets cookies on the correct origin

**How it works:**
1. User requests magic link → Supabase sends email
2. User clicks link → redirects to `/api/auth/callback?code=...`
3. Server exchanges code → sets cookies on correct origin
4. Redirects to destination

## Is This SSO (Single Sign-On)?

**Short answer: Partially, but not true SSO**

**What we have:**
- ✅ Single login page (on 3006)
- ✅ Session cookies that SHOULD be shared between localhost ports
- ✅ If cookies work → user is authenticated on both ports automatically
- ❌ If cookies don't work → validation loop or need token-sharing

**True SSO would mean:**
- Log in once on 3006
- Automatically authenticated on 3007 without any redirects
- Works reliably across all browsers
- No fallback mechanisms needed

**Current status:**
- Works if cookies are shared (most browsers on localhost)
- May not work if cookies aren't shared (some browsers/settings)
- Token-sharing fallback exists but isn't currently used for email/password

## Recommendations

1. **For email/password**: Current approach should work if cookies are shared
2. **For magic links**: Server-side callback is more reliable
3. **For true SSO**: Would need to ensure cookie sharing works, or implement token-sharing for email/password too


