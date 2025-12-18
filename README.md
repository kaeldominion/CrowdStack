# CrowdStack

Production-ready monorepo for CrowdStack event management platform.

**Repository**: [https://github.com/kaeldominion/CrowdStack](https://github.com/kaeldominion/CrowdStack)

## Architecture

This monorepo uses pnpm workspaces and contains:

- **apps/web** - Marketing site + attendee-facing pages (event listings, registration, QR pass, photos gallery)
- **apps/app** - B2B dashboards (venue/organizer/promoter + door scanner)
- **packages/ui** - Shared UI components
- **packages/shared** - Shared types, utilities, and Supabase client setup

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Package Manager**: pnpm
- **Deployment**: Vercel

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Supabase account and projects (beta + prod)
- Git configured for GitHub

## How to Push First Commit

If you're setting up this repo for the first time:

```bash
# Initialize git (if not already done)
git init

# Add the remote repository
git remote add origin https://github.com/kaeldominion/CrowdStack.git

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Production-ready monorepo setup"

# Push to main branch
git push -u origin main

# Create and switch to develop branch
git checkout -b develop
git push -u origin develop
```

**Note**: The default branch should be `main`. The `develop` branch is used for beta deployments.

## Local Development Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Environment Variables

Copy the example files and add your service role key:

```bash
# For web app
cp apps/web/.env.local.example apps/web/.env.local

# For app
cp apps/app/.env.local.example apps/app/.env.local
```

The `.env.local.example` files are pre-configured with:
- **Beta Supabase** credentials (for local development)
- Local environment settings
- Localhost URLs

**apps/web/.env.local** and **apps/app/.env.local** should contain:
```env
NEXT_PUBLIC_SUPABASE_URL=https://aiopjznxnoqgmmqowpxb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpb3Bqem54bm9xZ21tcW93cHhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNDg3MzMsImV4cCI6MjA4MTYyNDczM30.BLHb8D33PSCKUeI4ZkM6KT-a_a8ns2QnjCeUY7h2IiU
SUPABASE_SERVICE_ROLE_KEY=YOUR_BETA_SERVICE_ROLE_KEY_HERE

NEXT_PUBLIC_APP_ENV=local
NEXT_PUBLIC_APP_VERSION=0.0.0-local

NEXT_PUBLIC_WEB_URL=http://localhost:3006
NEXT_PUBLIC_APP_URL=http://localhost:3007
```

**⚠️ Important**: Add the `SUPABASE_SERVICE_ROLE_KEY` from your Beta Supabase project:
1. Go to https://aiopjznxnoqgmmqowpxb.supabase.co → Settings → API
2. Copy the `service_role` `secret` key
3. Replace `YOUR_BETA_SERVICE_ROLE_KEY_HERE` in both `.env.local` files

### 3. Set Up Supabase Database

1. Create a Supabase project (or use existing)
2. Run the migrations in order:

```bash
# Run migrations in Supabase SQL Editor or via Supabase CLI
# Migration files are in supabase/migrations/

# 001_healthcheck.sql - Basic healthcheck table
# 002_core_schema.sql - All core tables (venues, events, registrations, etc.)
# 003_rls_policies.sql - Row Level Security policies
# 004_seed_data.sql - Sample data for development
```

**Important**: Run migrations in order (001, 002, 003, 004) in your Supabase SQL Editor.

**Required Environment Variable**: Add `JWT_SECRET` to your `.env.local` files:
```env
JWT_SECRET=your-secure-random-secret-key-here
```

This is used for signing QR pass tokens. Generate a secure random string (e.g., using `openssl rand -hex 32`).

### 4. Run Development Server

```bash
# Start both servers simultaneously (recommended)
pnpm dev:all

# Or start individually
pnpm dev        # Port 3006 (web app only)
pnpm dev:web    # Port 3006 (web app)
pnpm dev:app    # Port 3007 (B2B app)
```

**Recommended**: Use `pnpm dev:all` to start both servers at once with colored output.

The apps will be available at:
- **Web**: http://localhost:3006
- **App**: http://localhost:3007

### 5. Verify Setup

Visit http://localhost:3006/health to verify Supabase connectivity.

## Available Scripts

- `pnpm dev` - Start web app development server on **port 3006** (default)
- `pnpm dev:web` - Start web app development server on **port 3006**
- `pnpm dev:app` - Start B2B app development server on **port 3007**
- `pnpm build` - Build all apps
- `pnpm build:web` - Build web app only
- `pnpm build:app` - Build app only
- `pnpm lint` - Lint all packages and apps
- `pnpm typecheck` - Type check all packages and apps
- `pnpm test` - Run tests (when configured)
- `pnpm clean` - Clean all build artifacts and node_modules

## Environment Management

### Environment Variables

| Variable | Description | Client/Server |
|----------|-------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Both |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Both |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (admin) | Server only |
| `NEXT_PUBLIC_APP_ENV` | Environment: `local`, `beta`, or `prod` | Both |
| `NEXT_PUBLIC_APP_VERSION` | App version string | Both |
| `NEXT_PUBLIC_WEB_URL` | Web app URL | Both |
| `NEXT_PUBLIC_APP_URL` | App URL | Both |

**⚠️ Security Note**: `SUPABASE_SERVICE_ROLE_KEY` must NEVER be exposed to the client. It bypasses Row Level Security.

### Environment Files

- `.env.local` - Local development (gitignored)
- `.env.example` - Example template (committed)

## Supabase Setup

### Creating Supabase Projects

You need **two separate Supabase projects**:

1. **Beta Project** - For beta/staging environment
2. **Prod Project** - For production environment

**Never mix environments** - Beta deployments must never point to prod Supabase.

### Steps to Create Projects

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project for beta
3. Create a new project for prod
4. For each project:
   - Go to Settings → API
   - Copy the Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy the `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy the `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY`
5. Run the healthcheck migration in both projects

### Environment Mapping

| Environment | Supabase Project | Vercel Projects | Domains |
|-------------|------------------|----------------|---------|
| Local | Use beta project (or create local) | N/A | localhost:3006 (web), localhost:3007 (app) |
| Beta | **Beta Supabase** | `crowdstack-web-beta`, `crowdstack-app-beta` | `beta.crowdstack.app`, `app-beta.crowdstack.app` |
| Prod | **Prod Supabase** | `crowdstack-web-prod`, `crowdstack-app-prod` | `crowdstack.app`, `app.crowdstack.app` |

**Important**: Beta Vercel deployments must use the Beta Supabase project. Production Vercel deployments must use the Prod Supabase project. Never mix environments.

## Branch Workflow (develop → main)

This project uses a two-branch strategy:

- **`develop` branch** → Auto-deploys to **beta** environments
  - Used for testing and staging
  - All feature development happens here
  - Merges to `main` when ready for production

- **`main` branch** → Auto-deploys to **production** environments
  - Production-ready code only
  - Protected branch (recommended)
  - Only updated via merges from `develop`

### Workflow Example

```bash
# Work on develop branch
git checkout develop
git pull origin develop

# Make changes, commit, push
git add .
git commit -m "Add new feature"
git push origin develop

# After testing in beta, merge to main for production
git checkout main
git merge develop
git push origin main
```

## Vercel Deployment

We use **2 Vercel projects** with preview deployments, pointing to the same GitHub repository:

| Vercel Project | Root Directory | Production Branch | Preview Branch | Production Domain | Preview Domain |
|----------------|----------------|-------------------|----------------|-------------------|----------------|
| `crowdstack-web` | `apps/web` | `main` | `develop` | `crowdstack.app` | `beta.crowdstack.app` |
| `crowdstack-app` | `apps/app` | `main` | `develop` | `app.crowdstack.app` | `app-beta.crowdstack.app` |

**Deployment Strategy:**
- **Production**: Deploys from `main` branch → Production domains
- **Beta/Preview**: Deploys from `develop` branch → Preview domains
- Vercel automatically creates preview deployments for the `develop` branch

### Environment Variable Mapping

Each Vercel project has environment variables configured separately for **Production** and **Preview** environments:

| Vercel Project | Environment | Supabase Project | NEXT_PUBLIC_APP_ENV |
|----------------|------------|------------------|---------------------|
| `crowdstack-web` | Production (main) | **Prod Supabase** | `prod` |
| `crowdstack-web` | Preview (develop) | **Beta Supabase** | `beta` |
| `crowdstack-app` | Production (main) | **Prod Supabase** | `prod` |
| `crowdstack-app` | Preview (develop) | **Beta Supabase** | `beta` |

**⚠️ Critical**: Preview deployments (develop branch) MUST use the Beta Supabase project. Production deployments (main branch) MUST use the Prod Supabase project. Never mix environments.

**How to Set Environment Variables in Vercel:**
1. Go to your project → Settings → Environment Variables
2. Add each variable and select which environments it applies to:
   - **Production**: For `main` branch deployments
   - **Preview**: For `develop` branch deployments
3. This allows different Supabase credentials for beta vs prod

### Required Environment Variables

Each Vercel project requires environment variables configured separately for **Production** and **Preview** environments:

| Variable | Description | Example Values |
|----------|-------------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Beta: `https://xxx-beta.supabase.co`<br>Prod: `https://xxx-prod.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Get from Supabase project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) | Get from Supabase project Settings → API |
| `NEXT_PUBLIC_APP_ENV` | Environment identifier | Beta projects: `beta`<br>Prod projects: `prod` |
| `NEXT_PUBLIC_APP_VERSION` | App version string | Use `$VERCEL_GIT_COMMIT_SHA` or custom version |
| `NEXT_PUBLIC_WEB_URL` | Web app URL | Beta: `https://beta.crowdstack.app`<br>Prod: `https://crowdstack.app` |
| `NEXT_PUBLIC_APP_URL` | B2B app URL | Beta: `https://app-beta.crowdstack.app`<br>Prod: `https://app.crowdstack.app` |

**Note**: `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be exposed to the client.

### Setting Up Vercel Projects

All 4 projects point to the same GitHub repository: `https://github.com/kaeldominion/CrowdStack`

#### 1. Install Vercel CLI (if not already installed)

```bash
npm i -g vercel
```

#### 2. Create Vercel Projects via Dashboard

Go to [Vercel Dashboard](https://vercel.com/dashboard) and create 4 new projects, all connected to `https://github.com/kaeldominion/CrowdStack`:

**Project 1: `crowdstack-web-beta`**
- **Repository**: `kaeldominion/CrowdStack`
- **Root Directory**: `apps/web`
- **Framework Preset**: Next.js
- **Build Command**: (auto-detected, or use `cd ../.. && pnpm build:web`)
- **Install Command**: `corepack enable && corepack prepare pnpm@8.15.0 --activate && cd ../.. && pnpm install`
- **Branch**: `develop` (auto-deploy on push)
- **Environment Variables** (use Beta Supabase):
  ```
  NEXT_PUBLIC_SUPABASE_URL=<beta-supabase-url>
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<beta-anon-key>
  SUPABASE_SERVICE_ROLE_KEY=<beta-service-role-key>
  NEXT_PUBLIC_APP_ENV=beta
  NEXT_PUBLIC_APP_VERSION=$VERCEL_GIT_COMMIT_SHA
  NEXT_PUBLIC_WEB_URL=https://beta.crowdstack.app
  NEXT_PUBLIC_APP_URL=https://app-beta.crowdstack.app
  ```

**Project 2: `crowdstack-web-prod`**
- **Repository**: `kaeldominion/CrowdStack`
- **Root Directory**: `apps/web`
- **Framework Preset**: Next.js
- **Build Command**: (auto-detected, or use `cd ../.. && pnpm build:web`)
- **Install Command**: `corepack enable && corepack prepare pnpm@8.15.0 --activate && cd ../.. && pnpm install`
- **Branch**: `main` (auto-deploy on push)
- **Environment Variables** (use Prod Supabase):
  ```
  NEXT_PUBLIC_SUPABASE_URL=<prod-supabase-url>
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<prod-anon-key>
  SUPABASE_SERVICE_ROLE_KEY=<prod-service-role-key>
  NEXT_PUBLIC_APP_ENV=prod
  NEXT_PUBLIC_APP_VERSION=$VERCEL_GIT_COMMIT_SHA
  NEXT_PUBLIC_WEB_URL=https://crowdstack.app
  NEXT_PUBLIC_APP_URL=https://app.crowdstack.app
  ```

**Project 3: `crowdstack-app-beta`**
- **Repository**: `kaeldominion/CrowdStack`
- **Root Directory**: `apps/app`
- **Framework Preset**: Next.js
- **Build Command**: (auto-detected, or use `cd ../.. && pnpm build:app`)
- **Install Command**: `corepack enable && corepack prepare pnpm@8.15.0 --activate && cd ../.. && pnpm install`
- **Branch**: `develop` (auto-deploy on push)
- **Environment Variables** (use Beta Supabase):
  ```
  NEXT_PUBLIC_SUPABASE_URL=<beta-supabase-url>
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<beta-anon-key>
  SUPABASE_SERVICE_ROLE_KEY=<beta-service-role-key>
  NEXT_PUBLIC_APP_ENV=beta
  NEXT_PUBLIC_APP_VERSION=$VERCEL_GIT_COMMIT_SHA
  NEXT_PUBLIC_WEB_URL=https://beta.crowdstack.app
  NEXT_PUBLIC_APP_URL=https://app-beta.crowdstack.app
  ```

**Project 4: `crowdstack-app-prod`**
- **Repository**: `kaeldominion/CrowdStack`
- **Root Directory**: `apps/app`
- **Framework Preset**: Next.js
- **Build Command**: (auto-detected, or use `cd ../.. && pnpm build:app`)
- **Install Command**: `corepack enable && corepack prepare pnpm@8.15.0 --activate && cd ../.. && pnpm install`
- **Branch**: `main` (auto-deploy on push)
- **Environment Variables** (use Prod Supabase):
  ```
  NEXT_PUBLIC_SUPABASE_URL=<prod-supabase-url>
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<prod-anon-key>
  SUPABASE_SERVICE_ROLE_KEY=<prod-service-role-key>
  NEXT_PUBLIC_APP_ENV=prod
  NEXT_PUBLIC_APP_VERSION=$VERCEL_GIT_COMMIT_SHA
  NEXT_PUBLIC_WEB_URL=https://crowdstack.app
  NEXT_PUBLIC_APP_URL=https://app.crowdstack.app
  ```

#### 2. Configure Custom Domains

For each Vercel project:
- **Production domain**: Add `crowdstack.app` (web) or `app.crowdstack.app` (app) in Settings → Domains
- **Preview domain**: Add `beta.crowdstack.app` (web) or `app-beta.crowdstack.app` (app) and assign it to the `develop` branch
- Configure DNS records as instructed by Vercel

### Promoting from Beta to Prod

1. **Test thoroughly in beta**:
   - Visit `beta.crowdstack.app` and `app-beta.crowdstack.app`
   - Verify all features work
   - Check health endpoints at `/health`
   - Confirm environment badge shows "Beta"

2. **Merge to main**:
   ```bash
   git checkout main
   git merge develop
   git push origin main
   ```

3. **Vercel auto-deploys**:
   - Pushing to `main` branch triggers production deployments
   - Both `crowdstack-web` and `crowdstack-app` projects will deploy to production domains
   - Monitor deployments in Vercel dashboard

4. **Verify production**:
   - Visit `crowdstack.app` and `app.crowdstack.app`
   - Confirm environment badge shows "Prod"
   - Check version numbers match the commit SHA
   - Verify health endpoints are working

## Version and Environment Display

The app displays version and environment in the footer:
- **Version**: From `NEXT_PUBLIC_APP_VERSION` (set via Vercel env vars or CI)
- **Environment**: From `NEXT_PUBLIC_APP_ENV` (local/beta/prod)

In Vercel, you can use:
- `NEXT_PUBLIC_APP_VERSION=$VERCEL_GIT_COMMIT_SHA` for commit-based versions
- Or set a custom version string

## Logging

Health check endpoints log to console:
- Status (ok/error)
- Supabase connection status
- Response time
- Timestamp

Check Vercel function logs for production monitoring.

## Troubleshooting

### Vercel Build Issues with pnpm

If you see errors about pnpm version (e.g., "Got: 6.35.1" instead of ">=8.0.0"):

**The Problem**: Vercel is using an old pnpm version or npm instead of pnpm.

**Solution 1: Set Install Command in Vercel Dashboard (Recommended)**
1. Go to your Vercel project Settings → General
2. Set **Install Command** to:
   ```
   cd ../.. && corepack enable && corepack prepare pnpm@8.15.0 --activate && corepack pnpm install
   ```
   (Note: Using `corepack pnpm` ensures we use the corepack-managed version)
3. Ensure **Root Directory** is set to `apps/web` (or `apps/app` for app projects)

**Solution 2: Install pnpm via npm (Most Reliable)**
If `corepack pnpm` still doesn't work, use npm to install pnpm globally:
```
cd ../.. && npm install -g pnpm@8.15.0 && pnpm install
```
This removes the old pnpm and installs the correct version before running install.

**Solution 3: Generate pnpm-lock.yaml**
Vercel auto-detects pnpm if `pnpm-lock.yaml` exists. To generate it locally:
```bash
npm install -g pnpm@8.15.0
pnpm install
git add pnpm-lock.yaml
git commit -m "Add pnpm-lock.yaml for Vercel"
git push
```

**Note**: The `packageManager` field in `package.json` should help Vercel detect pnpm, but manually setting the Install Command in Vercel dashboard ensures it works.

### Port Conflicts

If port 3006 is already in use:
```bash
# Find process using port 3006
lsof -i :3006

# Kill the process
kill -9 <PID>
```

### Supabase Connection Issues

1. Verify environment variables are set correctly
2. Check Supabase project is active
3. Verify healthcheck table exists and RLS policy allows public read
4. Check network/firewall settings

### Build Errors

1. Clear node_modules and reinstall:
   ```bash
   pnpm clean
   pnpm install
   ```

2. Clear Next.js cache:
   ```bash
   rm -rf apps/*/.next
   ```

### Type Errors

Run type checking:
```bash
pnpm typecheck
```

## Project Structure

```
CrowdStack/
├── apps/
│   ├── web/              # Marketing + attendee app
│   │   ├── src/
│   │   │   └── app/      # Next.js App Router
│   │   └── package.json
│   └── app/              # B2B dashboard app
│       ├── src/
│       │   └── app/
│       └── package.json
├── packages/
│   ├── ui/               # Shared UI components
│   │   └── src/
│   └── shared/           # Shared types, utils, Supabase clients
│       └── src/
├── supabase/
│   └── migrations/       # Database migrations
├── package.json          # Root workspace config
├── pnpm-workspace.yaml
└── README.md
```

## Database Migrations

### Running Migrations

Migrations are located in `supabase/migrations/`. Run them in order:

1. **001_healthcheck.sql** - Basic connectivity table
2. **002_core_schema.sql** - Core database schema (all tables)
3. **003_rls_policies.sql** - Row Level Security policies
4. **004_seed_data.sql** - Development seed data

**Via Supabase Dashboard:**
1. Go to your Supabase project → SQL Editor
2. Copy and paste each migration file content
3. Run them in order

**Via Supabase CLI:**
```bash
supabase db push
```

### Storage Buckets

Create the following storage buckets in Supabase:
- `event-photos` - For event photo albums
- `statements` - For payout PDF statements
- `qr-passes` (optional) - For QR pass assets

Set appropriate RLS policies for each bucket.

## Invite Token Generation

To generate invite tokens for B2B roles (venue_admin, event_organizer, promoter, door_staff):

**Via SQL:**
```sql
SELECT public.create_invite_token('venue_admin'::user_role, '{}'::jsonb);
SELECT public.create_invite_token('event_organizer'::user_role, '{}'::jsonb);
SELECT public.create_invite_token('promoter'::user_role, '{}'::jsonb);
SELECT public.create_invite_token('door_staff'::user_role, '{}'::jsonb);
```

**Via API (future):**
Create an admin endpoint or use the service role client to call `createInviteToken()` from `@crowdstack/shared`.

Invite tokens are single-use and do not expire. Share the token URL: `https://crowdstack.app/invite/{token}`

## Role-Based Access Control

The system implements RBAC with these roles:
- **superadmin** - Platform administrator with full access (bypasses RLS)
- **venue_admin** - Full access to venue data
- **event_organizer** - Manage their events
- **promoter** - View assigned events, track referrals
- **door_staff** - Check-in attendees at events
- **attendee** - Consumer-facing role

### Making a User Superadmin

To make a user a superadmin, run the SQL script:

```sql
-- In Supabase SQL Editor or via psql
\i scripts/make-superadmin.sql
```

Or manually:

```sql
-- Replace 'user@example.com' with the target email
INSERT INTO public.user_roles (user_id, role, metadata)
SELECT id, 'superadmin'::user_role, '{"created_by": "system"}'::jsonb
FROM auth.users
WHERE email = 'spencertarring@gmail.com'
ON CONFLICT (user_id, role) DO UPDATE SET updated_at = NOW();
```

Users are redirected based on their role:
- Venue admins → `/app/venue`
- Organizers → `/app/organizer`
- Promoters → `/app/promoter`
- Door staff → `/door`
- Attendees → `/me`

## API Routes

### Web App (`apps/web`)
- `POST /api/events/[eventSlug]/register` - Register for event
- `POST /api/invites/[token]/accept` - Accept invite token

### B2B App (`apps/app`)
- `POST /api/events/create` - Create new event
- `POST /api/events/[eventId]/checkin` - Check-in attendee
- `POST /api/events/[eventId]/quick-add` - Quick-add attendee at door
- `POST /api/events/[eventId]/payouts/generate` - Generate payout statements
- `POST /api/events/[eventId]/photos/publish` - Publish photo album

## Environment Variables

### Required for All Apps

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Get from Supabase Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server only) | Get from Supabase Settings → API |
| `JWT_SECRET` | Secret for QR pass signing | Generate secure random string |
| `NEXT_PUBLIC_APP_ENV` | Environment identifier | `local`, `beta`, or `prod` |
| `NEXT_PUBLIC_APP_VERSION` | App version | `$VERCEL_GIT_COMMIT_SHA` or custom |
| `NEXT_PUBLIC_WEB_URL` | Web app URL | `http://localhost:3006` (local) |
| `NEXT_PUBLIC_APP_URL` | B2B app URL | `http://localhost:3007` (local) |

### Environment-Specific URLs

**Local:**
- `NEXT_PUBLIC_WEB_URL=http://localhost:3006`
- `NEXT_PUBLIC_APP_URL=http://localhost:3007`

**Beta (Preview):**
- `NEXT_PUBLIC_WEB_URL=https://beta.crowdstack.app`
- `NEXT_PUBLIC_APP_URL=https://app-beta.crowdstack.app`

**Production:**
- `NEXT_PUBLIC_WEB_URL=https://crowdstack.app`
- `NEXT_PUBLIC_APP_URL=https://app.crowdstack.app`

## Deployment Notes

### Vercel Configuration

Each Vercel project should have:
- **Root Directory**: `apps/web` or `apps/app`
- **Build Command**: `cd ../.. && pnpm build:web` or `cd ../.. && pnpm build:app`
- **Install Command**: `corepack enable && corepack prepare pnpm@8.15.0 --activate && cd ../.. && pnpm install`

### Supabase Projects

**Critical**: Never mix environments!
- **Beta Supabase** → Used by `develop` branch deployments
- **Prod Supabase** → Used by `main` branch deployments

Both projects should have:
- All migrations run (001-004)
- Storage buckets created
- RLS policies enabled
- Same schema structure

### Migration Deployment

When deploying new migrations:
1. Run migrations in **Beta Supabase** first (for local/preview testing)
2. Test thoroughly in beta environment
3. **When ready for production**, run migrations in **Prod Supabase**
4. Deploy to production

**Migration Workflow:**

- **During Development**: Only update Beta Supabase
  ```bash
  # Link to Beta and push migrations
  ./scripts/update-beta-db.sh
  ```

- **Before Production Release**: Sync migrations to Prod Supabase
  ```bash
  # Link to Prod and push migrations
  ./scripts/update-prod-db.sh
  ```

**⚠️ Important**: 
- Always test migrations in Beta first
- Only sync to Prod when you're ready to deploy to production
- Production migrations should match your `main` branch code
- Never run untested migrations directly on Prod

## Next Steps

1. Set up Supabase Storage buckets
2. Configure email templates (Supabase Auth)
3. Implement QR code scanning in door scanner
4. Add analytics queries to dashboards
5. Set up n8n webhook polling from `event_outbox` table

## Support

For issues or questions, please open an issue in the repository.

