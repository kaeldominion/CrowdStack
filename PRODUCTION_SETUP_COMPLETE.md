# Production Setup Status

## ✅ Completed Automatically

1. **Database Migrations** - All 39 migrations (including storage buckets) have been pushed to production Supabase
2. **Storage Buckets** - All 4 required buckets created:
   - `avatars`
   - `organizer-images`
   - `venue-images`
   - `event-photos`

## 📋 Manual Steps Required

### 1. Configure Authentication (5 minutes)

**File**: `scripts/configure-prod-auth.md`

1. Go to: https://supabase.com/dashboard/project/fvrjcyscwibrqpsviblx
2. Navigate to: **Authentication → URL Configuration**
3. Set **Site URL**: `https://crowdstack.app`
4. Add **Redirect URLs**:
   ```
   https://crowdstack.app/api/auth/callback
   https://crowdstack.app/auth/callback
   https://crowdstack.app/auth/magic
   https://crowdstack.app/login
   https://crowdstack.app/me
   ```
5. Click **Save**

### 2. Set Up Superadmin User (2 minutes)

**File**: `scripts/make-superadmin.sql`

**Important**: You must sign up/login to production first!

1. Go to: https://crowdstack.app (after deployment) or use Supabase Auth
2. Sign up/login with your email: `spencertarring@gmail.com`
3. Go to: https://supabase.com/dashboard/project/fvrjcyscwibrqpsviblx → **SQL Editor**
4. Copy and paste the contents of `scripts/make-superadmin.sql`
5. Run the query
6. Verify in: **Database → Tables → user_roles**

### 3. Configure Vercel Environment Variables (10 minutes)

**File**: `scripts/setup-vercel-env.md`

1. Get production `SUPABASE_SERVICE_ROLE_KEY` from Supabase dashboard
2. Generate `JWT_SECRET`: `openssl rand -hex 32`
3. Add all 8 environment variables to Vercel (Production environment only)
4. See `scripts/setup-vercel-env.md` for complete list

### 4. Verify Setup

Run these checks:

1. **Database Migrations**: 
   - Go to Supabase Dashboard → Database → Migrations
   - Verify all 39 migrations are applied

2. **Storage Buckets**:
   - Go to Storage → Buckets
   - Verify all 4 buckets exist and are public

3. **Authentication**:
   - Test magic link login flow
   - Verify redirects work correctly

4. **Health Check**:
   - After deployment, visit: https://crowdstack.app/health
   - Should return success

### 5. Merge to Main

Once all manual steps are complete:

```bash
git checkout main
git pull origin main
git merge develop
git push origin main
```

Vercel will automatically deploy to production.

## 📁 Helper Files Created

- `scripts/update-prod-db-auto.sh` - Automated migration script
- `scripts/setup-prod-storage.sql` - Storage bucket creation SQL
- `scripts/configure-prod-auth.md` - Auth configuration guide
- `scripts/setup-vercel-env.md` - Vercel environment variables guide
- `scripts/setup-prod-guide.md` - Complete setup guide
- `supabase/migrations/039_create_storage_buckets.sql` - Storage bucket migration

## 🔗 Quick Links

- **Production Supabase**: https://supabase.com/dashboard/project/fvrjcyscwibrqpsviblx
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Production Site**: https://crowdstack.app (after deployment)

