# Quick Start Guide

Get up and running with CrowdStack in 5 minutes.

## Prerequisites

- Node.js 18+ (use `nvm use` if you have nvm)
- pnpm 8+ (`npm install -g pnpm`)

## Setup Steps

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a project
2. Copy your project URL and API keys from Settings → API
3. Run the SQL migration from `supabase/migrations/001_healthcheck.sql` in the SQL Editor

### 3. Configure Environment

Create `.env.local` in both `apps/web` and `apps/app`:

```bash
# Copy the example (you'll need to fill in your Supabase credentials)
cp .env.local.example apps/web/.env.local
cp .env.local.example apps/app/.env.local
```

Then edit both files and add your Supabase credentials:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 4. Start Development Server

```bash
pnpm dev
```

This starts the web app on **http://localhost:3006**

### 5. Verify It Works

1. Visit http://localhost:3006
2. Click "Health Check" or visit http://localhost:3006/health
3. You should see "Connected" for Supabase

## Running Both Apps

- **Web app** (port 3006): `pnpm dev` or `pnpm dev:web`
- **B2B app** (port 3007): `pnpm dev:app`

## Next Steps

- Read the full [README.md](./README.md) for deployment setup
- Set up Vercel projects for beta/prod deployments
- Create your second Supabase project for production

## Troubleshooting

**Port 3006 already in use?**
```bash
lsof -i :3006  # Find the process
kill -9 <PID>  # Kill it
```

**Supabase connection failing?**
- Verify your `.env.local` files have correct credentials
- Check the healthcheck table exists in Supabase
- Ensure RLS policy allows public read access

**Build errors?**
```bash
pnpm clean
pnpm install
```

