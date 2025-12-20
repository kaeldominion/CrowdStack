# Configure Production Authentication Settings

## Steps to Configure Authentication in Production Supabase

1. **Go to Production Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/fvrjcyscwibrqpsviblx
   - Or navigate: Authentication → URL Configuration

2. **Set Site URL**
   - Find the "Site URL" field
   - Set it to: `https://crowdstack.app`
   - Click Save

3. **Add Redirect URLs**
   - Find the "Redirect URLs" section
   - Add each of these URLs (one per line):
     ```
     https://crowdstack.app/api/auth/callback
     https://crowdstack.app/auth/callback
     https://crowdstack.app/auth/magic
     https://crowdstack.app/login
     https://crowdstack.app/me
     ```
   - Click Save

4. **Verify Configuration**
   - The Site URL should be: `https://crowdstack.app`
   - All 5 redirect URLs should be listed
   - Settings should be saved

## Why This Is Important

These settings ensure that:
- Magic link emails redirect to the correct production domain
- Authentication callbacks work properly
- Users can log in and access protected routes
- OAuth providers (if used) redirect correctly

