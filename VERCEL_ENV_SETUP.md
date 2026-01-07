# Vercel Environment Variables Setup

Quick reference for setting up environment variables in your Vercel projects.

## Projects

- **crowdstack-web**: Unified app (Root: `apps/unified`)
  - Production: `crowdstack.app` (main branch)
  - Preview: `beta.crowdstack.app` (develop branch)

## Environment Variables for Unified App

### Production Environment (main branch)

Set these in Vercel → Settings → Environment Variables → **Production**:

```
NEXT_PUBLIC_SUPABASE_URL=https://fvrjcyscwibrqpsviblx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2cmpjeXNjd2licnFwc3ZpYmx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNDc5NTMsImV4cCI6MjA4MTYyMzk1M30.cpk5MaPXqzQ3-eiZFaUT58EmKbABs-cOzTvgKtGNIzU
SUPABASE_SERVICE_ROLE_KEY=<get-from-prod-supabase>
JWT_SECRET=<generate-secure-random-string>
NEXT_PUBLIC_APP_ENV=prod
NEXT_PUBLIC_APP_VERSION=$VERCEL_GIT_COMMIT_SHA

# Sentry Error Tracking (Optional but Recommended)
NEXT_PUBLIC_SENTRY_DSN=https://55f917dbe1e1fcef95c38c4349664764@o4510667665768448.ingest.us.sentry.io/4510667668979712
SENTRY_DSN=https://55f917dbe1e1fcef95c38c4349664764@o4510667665768448.ingest.us.sentry.io/4510667668979712
SENTRY_ORG=4510667665768448
SENTRY_PROJECT=4510667668979712
```

**To get SUPABASE_SERVICE_ROLE_KEY:**
1. Go to https://fvrjcyscwibrqpsviblx.supabase.co
2. Settings → API
3. Copy the `service_role` `secret` key

**To generate JWT_SECRET:**
```bash
openssl rand -hex 32
```

### Preview Environment (develop branch)

Set these in Vercel → Settings → Environment Variables → **Preview**:

```
NEXT_PUBLIC_SUPABASE_URL=https://aiopjznxnoqgmmqowpxb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpb3Bqem54bm9xZ21tcW93cHhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNDg3MzMsImV4cCI6MjA4MTYyNDczM30.BLHb8D33PSCKUeI4ZkM6KT-a_a8ns2QnjCeUY7h2IiU
SUPABASE_SERVICE_ROLE_KEY=<get-from-beta-supabase>
JWT_SECRET=<generate-secure-random-string>
NEXT_PUBLIC_APP_ENV=beta
NEXT_PUBLIC_APP_VERSION=$VERCEL_GIT_COMMIT_SHA

# Sentry Error Tracking (Optional but Recommended)
NEXT_PUBLIC_SENTRY_DSN=https://55f917dbe1e1fcef95c38c4349664764@o4510667665768448.ingest.us.sentry.io/4510667668979712
SENTRY_DSN=https://55f917dbe1e1fcef95c38c4349664764@o4510667665768448.ingest.us.sentry.io/4510667668979712
SENTRY_ORG=4510667665768448
SENTRY_PROJECT=4510667668979712
```

**To get SUPABASE_SERVICE_ROLE_KEY:**
1. Go to https://aiopjznxnoqgmmqowpxb.supabase.co
2. Settings → API
3. Copy the `service_role` `secret` key

## How to Add in Vercel

1. Go to your project → Settings → Environment Variables
2. Click "Add New"
3. Enter the variable name and value
4. Select which environments it applies to:
   - **Production**: For `main` branch
   - **Preview**: For `develop` branch
   - **Development**: For local development (optional)
5. Click "Save"

## Important Notes

- ⚠️ **Never mix environments**: Preview must use Beta Supabase, Production must use Prod Supabase
- 🔒 **SUPABASE_SERVICE_ROLE_KEY** is server-only and must never be exposed to the client
- 📝 **NEXT_PUBLIC_APP_VERSION** uses `$VERCEL_GIT_COMMIT_SHA` to show the commit hash in the footer
- 🐛 **Sentry DSN**: Get from https://sentry.io → Your Project → Settings → Client Keys (DSN). See `MONITORING_SETUP.md` for full setup instructions.

