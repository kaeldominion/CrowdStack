# Supabase Configuration Check

## The Real Issue

**Cookies are domain-specific**. When you log in on `localhost:3006`, Supabase sets cookies for that origin only. When you try to access `localhost:3007`, those cookies aren't available because they're different origins.

## What to Check in Supabase Dashboard

1. **Go to**: https://app.supabase.com → Your Project → Authentication → URL Configuration

2. **Check "Redirect URLs"** - Make sure BOTH are added:
   - `http://localhost:3006/**`
   - `http://localhost:3007/**`
   - `http://localhost:3006/auth/magic`
   - `http://localhost:3007/auth/magic` (if needed)

3. **Check "Site URL"** - Should be set to:
   - `http://localhost:3006` (or the primary app)

## The Cookie Problem

Even with redirect URLs configured, **cookies still won't be shared** between `localhost:3006` and `localhost:3007` because they're different origins.

## Possible Solutions

### Option 1: Use Same Port (Not Recommended)
- Run both apps on the same port with different paths
- Cookies would be shared
- But this doesn't match production setup

### Option 2: Proxy Approach (Localhost Only)
- Use a proxy (like nginx) to serve both apps on same domain
- `localhost:3000/web` and `localhost:3000/app`
- Cookies would be shared
- Complex setup

### Option 3: Token-Based Session Sharing (Recommended)
- After login on 3006, get the session token
- Pass it to 3007 via URL parameter or localStorage
- 3007 can then use the token to create a session
- Requires custom implementation

### Option 4: Accept Localhost Limitation
- In production, both apps will be on same domain (subdomains)
- Use shared cookie domain (`.crowdstack.app`)
- For localhost, just accept that you need to log in separately
- Or use a single port for local development

## Current Status

✅ Removed duplicate login pages
✅ App middleware redirects to web login
✅ Single login flow on `localhost:3006`

❌ Cookies still won't be shared between ports
❌ Need to check Supabase redirect URL configuration
❌ May need custom session sharing for localhost

## Next Steps

1. **Check Supabase redirect URLs** (most important)
2. **Test login flow** - Does it work after adding redirect URLs?
3. **If still not working**, implement token-based session sharing for localhost







