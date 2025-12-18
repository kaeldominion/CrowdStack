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

Create `.env.local` files in both `apps/web` and `apps/app`:

**apps/web/.env.local:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

NEXT_PUBLIC_APP_ENV=local
NEXT_PUBLIC_APP_VERSION=0.0.0-local

NEXT_PUBLIC_WEB_URL=http://localhost:3006
NEXT_PUBLIC_APP_URL=http://localhost:3007
```

**apps/app/.env.local:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

NEXT_PUBLIC_APP_ENV=local
NEXT_PUBLIC_APP_VERSION=0.0.0-local

NEXT_PUBLIC_WEB_URL=http://localhost:3006
NEXT_PUBLIC_APP_URL=http://localhost:3007
```

### 3. Set Up Supabase Database

1. Create a Supabase project (or use existing)
2. Run the migration to create the healthcheck table:

```sql
-- Run this in your Supabase SQL Editor
CREATE TABLE IF NOT EXISTS public.healthcheck (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.healthcheck (id) VALUES (gen_random_uuid())
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.healthcheck ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access for health checks"
  ON public.healthcheck
  FOR SELECT
  USING (true);
```

### 4. Run Development Server

```bash
# Start web app on port 3006 (default)
pnpm dev

# Or start individually
pnpm dev:web  # Port 3006 (web app)
pnpm dev:app  # Port 3007 (B2B app)
```

**Default Port**: The `pnpm dev` command runs the web app on **port 3006** by default.

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

We use **4 separate Vercel projects** pointing to the same GitHub repository with different configurations:

| Vercel Project | Root Directory | Branch | Domain |
|----------------|----------------|--------|--------|
| `crowdstack-web-beta` | `apps/web` | `develop` | `beta.crowdstack.app` |
| `crowdstack-web-prod` | `apps/web` | `main` | `crowdstack.app` |
| `crowdstack-app-beta` | `apps/app` | `develop` | `app-beta.crowdstack.app` |
| `crowdstack-app-prod` | `apps/app` | `main` | `app.crowdstack.app` |

### Environment Variable Mapping

Each Vercel project must be configured with the correct environment variables pointing to the appropriate Supabase project:

| Vercel Project | Supabase Project | NEXT_PUBLIC_APP_ENV |
|----------------|------------------|---------------------|
| `crowdstack-web-beta` | **Beta Supabase** | `beta` |
| `crowdstack-web-prod` | **Prod Supabase** | `prod` |
| `crowdstack-app-beta` | **Beta Supabase** | `beta` |
| `crowdstack-app-prod` | **Prod Supabase** | `prod` |

**⚠️ Critical**: Beta Vercel projects MUST use the Beta Supabase project. Prod Vercel projects MUST use the Prod Supabase project. Never mix environments.

### Required Environment Variables for Each Vercel Project

All 4 Vercel projects require these environment variables (with values specific to their environment):

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
- **Install Command**: `cd ../.. && pnpm install`
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
- **Install Command**: `cd ../.. && pnpm install`
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
- **Install Command**: `cd ../.. && pnpm install`
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
- **Install Command**: `cd ../.. && pnpm install`
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

#### 4. Configure Custom Domains

In each Vercel project settings:
- Add custom domain
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
   - Both `crowdstack-web-prod` and `crowdstack-app-prod` will deploy automatically
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

## Next Steps

1. Set up authentication flows
2. Create event management features
3. Implement QR code generation/scanning
4. Add photo gallery functionality
5. Set up analytics and monitoring

## Support

For issues or questions, please open an issue in the repository.

