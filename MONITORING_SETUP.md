# Production Monitoring Setup Guide

This guide covers the complete monitoring strategy for CrowdStack in production.

## Overview

CrowdStack uses a multi-layered monitoring approach:

1. **Error Tracking**: Sentry (client, server, and edge runtime)
2. **Performance Monitoring**: Vercel Analytics + Speed Insights
3. **Uptime Monitoring**: External service (recommended)
4. **Log Aggregation**: Vercel Logs + optional third-party service

## 1. Sentry Error Tracking

### Setup

Sentry is already configured in the codebase. To activate it:

1. **Create a Sentry account** (if you don't have one):
   - Go to https://sentry.io/signup/
   - Create a new project and select "Next.js"

2. **Get your DSN**:
   - In Sentry dashboard → Settings → Projects → Your Project → Client Keys (DSN)
   - Copy the DSN (looks like: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`)

3. **Add environment variables in Vercel**:
   ```
   NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
   SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
   SENTRY_ORG=your-org-slug
   SENTRY_PROJECT=your-project-slug
   ```

   **Important**: Add these to both:
   - Production environment
   - Preview/Development environments (if you want error tracking in dev)

4. **Deploy**:
   - Push your changes and deploy to Vercel
   - Sentry will automatically upload source maps during build

### What Sentry Tracks

- **Client-side errors**: JavaScript errors in the browser
- **Server-side errors**: API route errors, server component errors
- **Edge runtime errors**: Middleware errors
- **Performance**: Transaction traces for slow operations
- **Session Replay**: User sessions when errors occur (helps debug issues)

### Configuration Files

- `sentry.client.config.ts` - Client-side error tracking
- `sentry.server.config.ts` - Server-side error tracking
- `sentry.edge.config.ts` - Edge runtime error tracking
- `src/instrumentation.ts` - Server instrumentation hook

### Error Filtering

The configuration automatically filters out:
- Browser extension errors
- Network connectivity errors (user-side issues)
- Transient Supabase connection errors

### Sentry Free Tier

- 5,000 errors/month
- 10,000 performance units/month
- 1,000 session replays/month
- Unlimited projects

**Upgrade when**: You exceed these limits or need advanced features.

## 2. Vercel Analytics & Speed Insights

### Already Configured ✅

Your app already has:
- `@vercel/analytics` - Web analytics and custom events
- `@vercel/speed-insights` - Real User Monitoring (RUM)

### Accessing Analytics

1. Go to Vercel Dashboard → Your Project → Analytics
2. View:
   - Page views
   - Custom events (event_created, event_registration, etc.)
   - Web Vitals (LCP, FID, CLS)
   - Performance metrics

### Custom Events Tracked

See `src/lib/analytics.ts` and `src/lib/analytics/server.ts` for all tracked events:
- `event_created`
- `event_registration`
- `attendee_checkin`
- `referral_click`
- `referral_conversion`
- `photo_published`
- `payout_generated`
- And more...

### Vercel Plan Requirements

- **Hobby (Free)**: Basic analytics, no custom events
- **Pro ($20/month)**: Full analytics + custom events
- **Enterprise**: Advanced features

## 3. Uptime Monitoring (Recommended)

Vercel doesn't provide external uptime monitoring. Use a third-party service:

### Recommended Services

#### Option 1: Better Uptime (Recommended)
- **Free tier**: 10 monitors, 1-minute checks
- **Paid**: $7/month for 50 monitors
- **Setup**: 
  1. Sign up at https://betteruptime.com
  2. Add monitors for:
     - `https://crowdstack.app` (homepage)
     - `https://app.crowdstack.app` (main app)
     - `https://app.crowdstack.app/api/health` (health check endpoint)
  3. Configure alerts (email, Slack, SMS)

#### Option 2: UptimeRobot
- **Free tier**: 50 monitors, 5-minute checks
- **Paid**: $7/month for 1-minute checks
- **Setup**: Similar to Better Uptime

#### Option 3: Pingdom
- **Free tier**: 1 monitor
- **Paid**: $10/month for multiple monitors
- More enterprise-focused

### Health Check Endpoint

Your app has a health check at `/health` that you can monitor:
- `https://app.crowdstack.app/health`

## 4. Log Aggregation

### Vercel Logs (Built-in)

Vercel provides logs for:
- Function logs (API routes)
- Build logs
- Deployment logs

**Access**: Vercel Dashboard → Your Project → Logs

### Enhanced Log Aggregation (Optional)

For better log search and analysis, consider:

#### Option 1: Axiom (Recommended for Vercel)
- **Free tier**: 500MB/month
- **Paid**: $25/month for 5GB
- **Setup**: 
  1. Install Vercel integration: https://vercel.com/integrations/axiom
  2. Follow setup instructions
  3. Logs automatically streamed from Vercel

#### Option 2: Logtail
- **Free tier**: 1GB/month
- **Paid**: $20/month for 5GB
- Similar setup via Vercel integration

#### Option 3: Datadog
- More expensive but comprehensive
- Good for enterprise setups

## 5. Monitoring Checklist

### Initial Setup
- [ ] Create Sentry account and project
- [ ] Add Sentry DSN to Vercel environment variables
- [ ] Deploy and verify Sentry is receiving errors
- [ ] Set up uptime monitoring (Better Uptime or similar)
- [ ] Configure alert notifications (email/Slack)
- [ ] Test error reporting (trigger a test error)

### Ongoing Monitoring
- [ ] Check Sentry dashboard daily for new errors
- [ ] Review Vercel Analytics weekly for trends
- [ ] Monitor uptime status
- [ ] Set up alerts for critical errors (Sentry)
- [ ] Review performance metrics monthly

### Alert Configuration

#### Sentry Alerts
1. Go to Sentry → Alerts → Create Alert Rule
2. Set up alerts for:
   - New issues (any new error)
   - High error rate (errors/minute threshold)
   - Critical errors (specific error types)

#### Uptime Monitoring Alerts
- Configure in your uptime service:
  - Email alerts for downtime
  - Slack webhook for team notifications
  - SMS for critical outages

## 6. Best Practices

### Error Handling
- Always use try/catch in API routes
- Use error boundaries for React components
- Log context with errors (user ID, event ID, etc.)

### Performance
- Monitor slow API routes in Sentry Performance
- Use Vercel Speed Insights to track Web Vitals
- Set up alerts for performance degradation

### Security
- Don't log sensitive data (passwords, tokens)
- Use Sentry's data scrubbing features
- Review error details before sharing publicly

## 7. Troubleshooting

### Sentry Not Receiving Errors
1. Check DSN is set correctly in Vercel
2. Verify `NEXT_PUBLIC_SENTRY_DSN` is in environment variables
3. Check browser console for Sentry initialization errors
4. Verify source maps are uploading (check build logs)

### Too Many Errors
1. Review error filtering in `sentry.client.config.ts`
2. Add more filters for common non-actionable errors
3. Adjust `tracesSampleRate` to reduce volume

### Performance Issues
1. Check Vercel Analytics for slow pages
2. Use Sentry Performance to identify slow transactions
3. Review function logs in Vercel for slow API routes

## 8. Cost Estimation

### Free Tier (Good for Starting)
- **Sentry**: Free (5K errors/month)
- **Vercel Analytics**: Free (basic) or Pro ($20/month for custom events)
- **Uptime Monitoring**: Free (Better Uptime or UptimeRobot)
- **Log Aggregation**: Free (Vercel logs) or Axiom free tier

**Total**: $0-20/month

### Recommended Production Setup
- **Sentry**: Free or Team ($26/month for 50K errors)
- **Vercel Analytics**: Pro ($20/month)
- **Uptime Monitoring**: Better Uptime ($7/month)
- **Log Aggregation**: Axiom ($25/month) or skip

**Total**: ~$47-72/month

## 9. Quick Start Commands

### Test Sentry Integration
```bash
# In your browser console on production site:
throw new Error("Test error from Sentry");
```

### Check Vercel Logs
```bash
# Install Vercel CLI
npm i -g vercel

# View logs
vercel logs [project-name] --follow
```

### View Sentry Issues
1. Go to https://sentry.io
2. Navigate to your project
3. View Issues tab for all errors

## 10. Support Resources

- **Sentry Docs**: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **Vercel Analytics**: https://vercel.com/docs/analytics
- **Vercel Speed Insights**: https://vercel.com/docs/speed-insights
- **Better Uptime**: https://betteruptime.com/docs

---

**Next Steps**: 
1. Set up Sentry account and add DSN to Vercel
2. Configure uptime monitoring
3. Set up alerts
4. Deploy and test!

