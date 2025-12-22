# Root Cause Analysis: Login Not Working on Port 3007

## The Problem

1. **Cookies are domain-specific**: When you log in on `localhost:3006`, Supabase sets cookies for that origin only
2. **Different origins**: `localhost:3006` and `localhost:3007` are treated as different origins by browsers
3. **Session not shared**: The session cookies from 3006 are not available when accessing 3007

## Why 3006 Works But 3007 Doesn't

- Login on 3006 → Cookies set for `localhost:3006` → ✅ Works
- Try to access 3007 → No cookies available → ❌ Redirects to login

## The Real Solution

We need **ONE login** that works for both apps. Options:

### Option 1: Single Login on 3006 (Recommended for Localhost)
- Remove login from 3007
- All logins go through 3006
- After login, redirect to 3007 if needed
- **Problem**: Cookies still won't be shared, but we can pass tokens via URL or use a different session storage

### Option 2: Supabase Redirect URL Configuration
- Configure Supabase to allow redirects to both `localhost:3006` and `localhost:3007`
- This is required for magic links to work on both ports
- **Check**: Supabase Dashboard → Authentication → URL Configuration

### Option 3: Shared Cookie Domain (Production Only)
- In production, use `crowdstack.app` and `app.crowdstack.app`
- Configure cookies with `.crowdstack.app` domain (shared across subdomains)
- **Note**: This won't work on localhost with different ports

## What to Check

1. **Supabase Dashboard** → Authentication → URL Configuration
   - Is `http://localhost:3006` in allowed redirect URLs?
   - Is `http://localhost:3007` in allowed redirect URLs?
   - Is `http://localhost:3006/auth/magic` allowed?
   - Is `http://localhost:3007/auth/magic` allowed?

2. **Environment Variables**
   - Are both apps using the same `NEXT_PUBLIC_SUPABASE_URL`?
   - Are both apps using the same `NEXT_PUBLIC_SUPABASE_ANON_KEY`?

3. **Session Storage**
   - How is the session being stored? (cookies vs localStorage)
   - Can we use a different approach for localhost?

## Next Steps

1. Check Supabase redirect URL configuration
2. Verify both apps use same Supabase credentials
3. Implement single login flow (remove app login)
4. Handle session sharing for localhost (maybe via URL params or localStorage sync)




