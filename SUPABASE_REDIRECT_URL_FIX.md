# Fix: Magic Link Redirecting to Localhost

## Problem
Magic links from beta.crowdstack.app are redirecting to localhost:3006 instead of the beta URL.

## Root Cause
Supabase has a "Site URL" and "Redirect URLs" configuration in the dashboard that can override the `emailRedirectTo` parameter passed in code.

## Solution

### 1. Update Supabase Dashboard Settings

Go to your Supabase project dashboard (beta: https://aiopjznxnoqgmmqowpxb.supabase.co):

1. Navigate to **Authentication** → **URL Configuration**
2. Set **Site URL** to: `https://beta.crowdstack.app`
3. Add to **Redirect URLs** (one per line):
   ```
   https://beta.crowdstack.app/api/auth/callback
   https://beta.crowdstack.app/auth/callback
   https://beta.crowdstack.app/auth/magic
   https://beta.crowdstack.app/login
   https://beta.crowdstack.app/me
   ```

### 2. For Production (crowdstack.app)

Do the same for the production Supabase project:
1. Site URL: `https://crowdstack.app`
2. Redirect URLs:
   ```
   https://crowdstack.app/api/auth/callback
   https://crowdstack.app/auth/callback
   https://crowdstack.app/auth/magic
   https://crowdstack.app/login
   https://crowdstack.app/me
   ```

### 3. Code Already Correct

The code uses `window.location.origin` (client-side) and `request.nextUrl.origin` (server-side) which automatically uses the correct domain. The issue is in Supabase dashboard configuration.

## Verification

After updating Supabase settings:
1. Request a magic link from beta.crowdstack.app
2. Check the email - the link should start with `https://beta.crowdstack.app`
3. Click the link - it should stay on beta.crowdstack.app

