# Troubleshooting Vercel Deployment Errors

## OpenTelemetry ContextManager Error

If you see an error like:
```
at NoopContextManager.with (/vercel/path0/node_modules/.pnpm/next@14.2.35_react-dom@18.3.1_react@18.3.1/node_modules/next/dist/compiled/@opentelemetry/api/index.js:1:7062)
```

This is typically caused by:

### 1. Missing Environment Variables (Most Common)

**Problem**: Missing `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` causes errors before async context is established.

**Solution**: 
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Verify all required variables are set for **Production** environment:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`
   - `NEXT_PUBLIC_APP_ENV=prod`
   - `NEXT_PUBLIC_APP_VERSION=$VERCEL_GIT_COMMIT_SHA`
   - `NEXT_PUBLIC_WEB_URL=https://crowdstack.app`
   - `NEXT_PUBLIC_APP_URL=https://crowdstack.app`

3. After adding variables, trigger a redeploy:
   - Go to Deployments → Click "..." on latest deployment → Redeploy

### 2. Incorrect Use of `cookies()` or `headers()`

**Problem**: Using `cookies()` or `headers()` from `next/headers` incorrectly can break async context.

**Solution**: Ensure all uses of `cookies()` are awaited:
```typescript
// ✅ Correct
const cookieStore = await cookies();

// ❌ Incorrect
const cookieStore = cookies();
```

### 3. Build Configuration Issues

**Problem**: Vercel build command or install command misconfigured.

**Solution**: Check `apps/unified/vercel.json`:
```json
{
  "buildCommand": "cd ../.. && npx -y pnpm@8.15.0 build:unified",
  "installCommand": "cd ../.. && npx -y pnpm@8.15.0 install"
}
```

Or set in Vercel Dashboard → Settings → General:
- **Build Command**: `cd ../.. && pnpm build:unified`
- **Install Command**: `cd ../.. && corepack enable && corepack prepare pnpm@8.15.0 --activate && corepack pnpm install`
- **Root Directory**: `apps/unified`

### 4. Next.js Version Compatibility

**Problem**: Next.js version incompatibility with OpenTelemetry.

**Solution**: Ensure you're using a stable Next.js version. Current: `^14.2.21`

### 5. Check Vercel Function Logs

1. Go to Vercel Dashboard → Your Project → Functions
2. Check the logs for the specific error
3. Look for which route/page is causing the error
4. Check if it's a specific API route or page component

### Quick Fix Checklist

- [ ] All 8 environment variables are set in Vercel (Production environment)
- [ ] Variables are spelled correctly (case-sensitive)
- [ ] No extra spaces in variable values
- [ ] `NEXT_PUBLIC_*` variables are set for Production (not just Preview)
- [ ] Redeployed after adding variables
- [ ] Build command is correct in Vercel settings
- [ ] Root directory is set to `apps/unified`

### Still Having Issues?

1. Check the full error stack trace in Vercel logs
2. Identify which route/component is failing
3. Verify that route has proper error handling
4. Check if the error happens on initial page load or specific actions

