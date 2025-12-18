# Quick Start Guide

## Start Both Servers

**Option 1: Using the start script (recommended)**
```bash
cd /Users/spencertarring/kaeldominion/CrowdStack
./scripts/start-dev.sh
```

**Option 2: Using pnpm directly**
```bash
cd /Users/spencertarring/kaeldominion/CrowdStack
pnpm dev:all
```

**Option 3: If pnpm is not in PATH, use npx**
```bash
cd /Users/spencertarring/kaeldominion/CrowdStack
npm run dev:all:npx
```

**Option 4: Start them individually in separate terminals**

Terminal 1 - Web app (port 3006):
```bash
cd /Users/spencertarring/kaeldominion/CrowdStack
pnpm dev:web
# or: npx -y pnpm@8.15.0 --filter web dev
```

Terminal 2 - B2B app (port 3007):
```bash
cd /Users/spencertarring/kaeldominion/CrowdStack
pnpm dev:app
# or: npx -y pnpm@8.15.0 --filter app dev
```

## Access the Admin Dashboard

1. Make sure you're logged in at http://localhost:3006
2. Make sure you have the superadmin role assigned in Supabase
3. Visit: http://localhost:3007/app/admin

## If Port 3007 Won't Start

1. Check if port is in use: `lsof -ti:3007`
2. Kill existing process: `kill -9 $(lsof -ti:3007)`
3. Try starting again: `cd apps/app && pnpm dev`

## Troubleshooting

- **"Connection refused"**: Server isn't running. Start it with `pnpm dev:app`
- **"Redirected to login"**: You need to log in first at http://localhost:3006/login
- **"Forbidden"**: You need the superadmin role. Run the SQL in `scripts/make-superadmin.sql`

