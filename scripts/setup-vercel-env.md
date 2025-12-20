# Vercel Production Environment Variables Setup

## Step 1: Get Production Supabase Keys

1. Go to: https://supabase.com/dashboard/project/fvrjcyscwibrqpsviblx
2. Navigate to: **Settings → API**
3. Copy the following:
   - **Project URL**: `https://fvrjcyscwibrqpsviblx.supabase.co` (already known)
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2cmpjeXNjd2licnFwc3ZpYmx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNDc5NTMsImV4cCI6MjA4MTYyMzk1M30.cpk5MaPXqzQ3-eiZFaUT58EmKbABs-cOzTvgKtGNIzU` (already known)
   - **service_role secret key**: ⚠️ **COPY THIS FROM THE DASHBOARD** (it's different from beta)

## Step 2: Generate JWT Secret

Run this command in your terminal:
```bash
openssl rand -hex 32
```

Copy the output - you'll need it for the `JWT_SECRET` variable.

## Step 3: Add Variables to Vercel

1. Go to: https://vercel.com/dashboard
2. Navigate to your project → **Settings → Environment Variables**
3. For each variable below, click **Add New** and set it for **Production** environment only:

### Required Variables:

| Variable Name | Value | Notes |
|--------------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://fvrjcyscwibrqpsviblx.supabase.co` | Production Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2cmpjeXNjd2licnFwc3ZpYmx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNDc5NTMsImV4cCI6MjA4MTYyMzk1M30.cpk5MaPXqzQ3-eiZFaUT58EmKbABs-cOzTvgKtGNIzU` | Production anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | `<paste-from-step-1>` | Production service role key (secret) |
| `JWT_SECRET` | `<paste-from-step-2>` | Generated random hex string |
| `NEXT_PUBLIC_APP_ENV` | `prod` | Environment identifier |
| `NEXT_PUBLIC_APP_VERSION` | `$VERCEL_GIT_COMMIT_SHA` | Auto-populated by Vercel |
| `NEXT_PUBLIC_WEB_URL` | `https://crowdstack.app` | Production web URL |
| `NEXT_PUBLIC_APP_URL` | `https://crowdstack.app` | Production app URL (unified) |

## Step 4: Verify Variables

1. Make sure each variable is set to **Production** environment
2. Preview variables should remain pointing to beta Supabase
3. All 8 variables should be listed
4. Click **Save** after adding each variable

## Important Notes

- ⚠️ **Never mix environments**: Production variables must use production Supabase
- 🔒 **SUPABASE_SERVICE_ROLE_KEY** is secret - never expose to client
- 🔑 **JWT_SECRET** must be unique for production (different from beta)
- 📝 **NEXT_PUBLIC_APP_VERSION** uses Vercel's built-in variable

## After Setting Variables

1. Vercel will automatically redeploy on the next push to `main`
2. Or trigger a manual redeploy: Deployments → ... → Redeploy
3. Verify the deployment uses the correct environment variables

