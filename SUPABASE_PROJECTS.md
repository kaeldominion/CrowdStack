# Supabase Project Configuration

This document tracks the Supabase projects used for different environments.

## Projects

### Beta & Localhost Development
- **Project URL**: https://supabase.com/dashboard/project/aiopjznxnoqgmmqowpxb
- **Project ID**: `aiopjznxnoqgmmqowpxb`
- **Used for**: 
  - Local development (`NEXT_PUBLIC_APP_ENV=local`)
  - Beta/preview deployments (`NEXT_PUBLIC_APP_ENV=beta`)

### Production
- **Project URL**: https://supabase.com/dashboard/project/fvrjcyscwibrqpsviblx
- **Project ID**: `fvrjcyscwibrqpsviblx`
- **Used for**: 
  - Production deployments (`NEXT_PUBLIC_APP_ENV=prod`)

## Environment Variables

### Beta/Local Project
For local development and beta, use the beta project credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://aiopjznxnoqgmmqowpxb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<get from Supabase dashboard>
SUPABASE_SERVICE_ROLE_KEY=<get from Supabase dashboard>
```

### Production Project
For production deployments, use the production project credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://fvrjcyscwibrqpsviblx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<get from Supabase dashboard>
SUPABASE_SERVICE_ROLE_KEY=<get from Supabase dashboard>
```

## Database Connection

To connect via psql:
```bash
# For beta/local project (get connection string from Supabase dashboard)
psql "postgresql://postgres.[project-ref]@aws-[region].pooler.supabase.com:5432/postgres"

# Or use direct connection (non-pooled)
psql "postgresql://postgres.[project-ref]:[password]@db.[project-ref].supabase.co:5432/postgres"
```

Connection strings can be found in:
- Supabase Dashboard → Project Settings → Database → Connection string

