# Vercel Production Environment Variables Setup

## Step 1: Get Production Supabase Keys

1. Go to: https://supabase.com/dashboard/project/fvrjcyscwibrqpsviblx
2. Navigate to: **Settings → API**
3. Copy the following:
   - **Project URL**: `https://fvrjcyscwibrqpsviblx.supabase.co` (already known)
   - **anon public key**: `sb_publishable_9inQqEPBbE7eHTtT6cjT6A_IFI8ccjf` (already known)
   - **service_role secret key**: `sb_secret_7HGZwimyMdImzcEGLrhjqQ_5LuA0IGg`

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
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_9inQqEPBbE7eHTtT6cjT6A_IFI8ccjf` | Production anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | `<paste-from-step-1>` | Production service role key (secret) |
| `JWT_SECRET` | `b8857b6383e52b5487ccf95558328a90a01a1c3c4145c264702bffef8a2df7ac` | Generated random hex string |
| `NEXT_PUBLIC_APP_ENV` | `prod` | Environment identifier |
| `NEXT_PUBLIC_APP_VERSION` | `$VERCEL_GIT_COMMIT_SHA` | Auto-populated by Vercel |
| `NEXT_PUBLIC_WEB_URL` | `https://crowdstack.app` | Production URL (used for venue pages, share links) |
| `NEXT_PUBLIC_APP_URL` | `https://crowdstack.app` | Production URL (used for door staff invites, app links) |

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
- 🌐 **NEXT_PUBLIC_WEB_URL and NEXT_PUBLIC_APP_URL**: Both point to the same domain since the app is unified, but they're used in different contexts (venue URLs vs door staff invites)

## After Setting Variables

1. Vercel will automatically redeploy on the next push to `main`
2. Or trigger a manual redeploy: Deployments → ... → Redeploy
3. Verify the deployment uses the correct environment variables

