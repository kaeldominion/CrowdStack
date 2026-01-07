# Sentry Quick Setup Guide

## Your Sentry DSN

You've provided your Sentry DSN. Here's how to set it up:

## Environment Variables for Vercel

Add these to your Vercel project → Settings → Environment Variables:

### For Production Environment:
```
NEXT_PUBLIC_SENTRY_DSN=https://55f917dbe1e1fcef95c38c4349664764@o4510667665768448.ingest.us.sentry.io/4510667668979712
SENTRY_DSN=https://55f917dbe1e1fcef95c38c4349664764@o4510667665768448.ingest.us.sentry.io/4510667668979712
SENTRY_ORG=4510667665768448
SENTRY_PROJECT=4510667668979712
```

### For Preview/Development Environment:
Use the same values (or create a separate Sentry project for dev if preferred):
```
NEXT_PUBLIC_SENTRY_DSN=https://55f917dbe1e1fcef95c38c4349664764@o4510667665768448.ingest.us.sentry.io/4510667668979712
SENTRY_DSN=https://55f917dbe1e1fcef95c38c4349664764@o4510667665768448.ingest.us.sentry.io/4510667668979712
SENTRY_ORG=4510667665768448
SENTRY_PROJECT=4510667668979712
```

## How to Add in Vercel

1. Go to your Vercel project dashboard
2. Navigate to: **Settings** → **Environment Variables**
3. Click **"Add New"** for each variable above
4. Select the appropriate environment:
   - **Production** for production deployments
   - **Preview** for preview deployments (optional, but recommended)
5. Click **"Save"**

## Verify Setup

After deploying:

1. **Check Sentry Dashboard**: Go to https://sentry.io and check if errors are appearing
2. **Test Error Tracking**: Open your production site and run this in the browser console:
   ```javascript
   throw new Error("Test error from Sentry");
   ```
3. **Check Build Logs**: Verify Sentry source maps are uploading during build

## What Gets Tracked

- ✅ Client-side JavaScript errors
- ✅ Server-side API route errors
- ✅ React component errors (via error boundaries)
- ✅ Performance issues (slow API routes, slow pages)
- ✅ Session replays (when errors occur)

## Next Steps

1. ✅ Add environment variables to Vercel (see above)
2. ✅ Deploy your changes
3. ✅ Set up alerts in Sentry (Alerts → Create Alert Rule)
4. ✅ Configure uptime monitoring (see MONITORING_SETUP.md)

## Troubleshooting

### Errors not appearing in Sentry?
- Verify DSN is correct in Vercel environment variables
- Check that `NEXT_PUBLIC_SENTRY_DSN` is set (required for client-side)
- Check browser console for Sentry initialization errors
- Verify deployment completed successfully

### Source maps not uploading?
- Check build logs for Sentry upload messages
- Verify `SENTRY_ORG` and `SENTRY_PROJECT` are set correctly
- Ensure you have a Sentry auth token (may be needed for source maps)

## Sentry Dashboard

Access your Sentry project at:
- https://sentry.io/organizations/[your-org]/projects/[your-project]/

Or just go to https://sentry.io and navigate to your project.

