# Production Supabase Setup Guide

This guide walks you through setting up production Supabase step by step.

## Step 1: Run Database Migrations

### Option A: Using Supabase CLI (Recommended)

1. Run the migration script:
   ```bash
   ./scripts/update-prod-db.sh
   ```

2. When prompted:
   - Confirm with `yes`
   - Enter project reference ID: `fvrjcyscwibrqpsviblx`

### Option B: Manual via Supabase Dashboard

1. Go to https://supabase.com/dashboard/project/fvrjcyscwibrqpsviblx
2. Navigate to SQL Editor
3. Run each migration file from `supabase/migrations/` in order (001 through 038)
4. Verify all migrations are applied in Database → Migrations

## Step 2: Create Storage Buckets

### Option A: Using SQL (Quickest)

1. Go to Production Supabase → SQL Editor
2. Copy and paste the contents of `scripts/setup-prod-storage.sql`
3. Run the query
4. Verify buckets exist in Storage → Buckets

### Option B: Via Dashboard

1. Go to Storage → New bucket
2. Create each bucket with **Public bucket** enabled:
   - `avatars`
   - `organizer-images`
   - `venue-images`
   - `event-photos`

## Step 3: Configure Authentication

1. Go to Production Supabase → Authentication → URL Configuration
2. Set **Site URL**: `https://crowdstack.app`
3. Add **Redirect URLs** (one per line):
   ```
   https://crowdstack.app/api/auth/callback
   https://crowdstack.app/auth/callback
   https://crowdstack.app/auth/magic
   https://crowdstack.app/login
   https://crowdstack.app/me
   ```
4. Click Save

## Step 4: Set Up Superadmin

1. First, sign up/login to production at https://crowdstack.app with your email
2. Go to Production Supabase → SQL Editor
3. Run `scripts/make-superadmin.sql` (or update the email in the script first)
4. Verify role assignment in Database → Tables → user_roles

## Step 5: Get Production Supabase Keys

1. Go to https://supabase.com/dashboard/project/fvrjcyscwibrqpsviblx
2. Navigate to Settings → API
3. Copy:
   - Project URL (already have: `https://fvrjcyscwibrqpsviblx.supabase.co`)
   - `anon` `public` key (already have in VERCEL_ENV_SETUP.md)
   - `service_role` `secret` key (NEED TO COPY THIS)

## Step 6: Generate JWT Secret

Run in terminal:
```bash
openssl rand -hex 32
```

Copy the output - you'll need it for Vercel.

## Step 7: Update Vercel Environment Variables

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add/Update these variables for **Production** environment:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://fvrjcyscwibrqpsviblx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2cmpjeXNjd2licnFwc3ZpYmx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNDc5NTMsImV4cCI6MjA4MTYyMzk1M30.cpk5MaPXqzQ3-eiZFaUT58EmKbABs-cOzTvgKtGNIzU
   SUPABASE_SERVICE_ROLE_KEY=<paste-from-step-5>
   JWT_SECRET=<paste-from-step-6>
   NEXT_PUBLIC_APP_ENV=prod
   NEXT_PUBLIC_APP_VERSION=$VERCEL_GIT_COMMIT_SHA
   NEXT_PUBLIC_WEB_URL=https://crowdstack.app
   NEXT_PUBLIC_APP_URL=https://crowdstack.app
   ```

3. Make sure each variable is set to **Production** environment only
4. Save all variables

## Step 8: Verify Setup

1. Check migrations: Supabase Dashboard → Database → Migrations (all 38 should show)
2. Check storage: Storage → Buckets (all 4 should exist and be public)
3. After deployment, test: https://crowdstack.app/health
4. Test authentication: Request magic link and verify redirect works

## Step 9: Merge to Main

Once everything is verified:

```bash
git checkout main
git pull origin main
git merge develop
git push origin main
```

Vercel will automatically deploy to production.

