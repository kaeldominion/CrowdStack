# Vercel Analytics Custom Events Troubleshooting

## Issue: Custom Events Not Showing in Vercel Analytics

### Requirements

**⚠️ IMPORTANT: Custom events require Vercel Pro or Enterprise plan**

Custom events are only available on paid plans. If you're on the Hobby (free) plan, custom events will not appear in the dashboard.

### Verification Steps

1. **Check Your Vercel Plan**
   - Go to https://vercel.com/dashboard
   - Navigate to your project settings
   - Check your plan tier (should be Pro or Enterprise)

2. **Verify Analytics is Enabled**
   - In Vercel Dashboard → Your Project → Analytics
   - Ensure "Web Analytics" is enabled
   - Check that custom events are visible in the UI

3. **Check Network Requests**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Filter for `/_vercel/insights/view`
   - Trigger an event (e.g., create an event, register for an event)
   - Verify requests are being sent with status 200 or 204

4. **Check Server Logs**
   - Events are tracked server-side in API routes
   - Check Vercel deployment logs for `[Analytics]` messages
   - Look for any errors related to tracking

5. **Enable Debug Logging**
   - Set environment variable: `ENABLE_ANALYTICS_DEBUG=true`
   - This will log all tracking attempts to help diagnose issues

### Implementation Details

**Client-Side Events:**
- Located in: `apps/unified/src/lib/analytics.ts`
- Uses: `track()` from `@vercel/analytics`
- Example: `trackEvent("user_login", { method: "magic_link" })`

**Server-Side Events:**
- Located in: `apps/unified/src/lib/analytics/server.ts`
- Uses: `track()` from `@vercel/analytics/server`
- Requires: `NextRequest` object for proper tracking
- Example: `await trackServerEvent("event_created", { event_id: "123" }, request)`

### Events Being Tracked

- `event_created` - When an event is created
- `event_registration` - When a user registers for an event
- `attendee_checkin` - When an attendee checks in
- `referral_click` - When a referral link is clicked
- `referral_conversion` - When a referral converts to registration
- `photo_published` - When photos are published
- `payout_generated` - When payouts are generated
- `event_approved` - When venue approves an event
- `event_rejected` - When venue rejects an event
- `promoter_approved` - When promoter is approved

### Common Issues

1. **Events not appearing**
   - Check if you're on Pro/Enterprise plan
   - Wait a few minutes (events can take time to process)
   - Verify events are being triggered (check logs)

2. **Server-side events not working**
   - Ensure `NextRequest` is passed to tracking functions
   - Check that API routes are calling tracking functions correctly
   - Verify no errors in server logs

3. **Client-side events not working**
   - Ensure `<Analytics />` component is in root layout
   - Check browser console for errors
   - Verify `@vercel/analytics` package is installed

### Testing

To test if events are working:

1. **Create a test event:**
   - Create a new event in the dashboard
   - Check Vercel Analytics dashboard for `event_created` event

2. **Register for an event:**
   - Register for any published event
   - Check for `event_registration` event

3. **Check in an attendee:**
   - Use the door scanner or manual check-in
   - Check for `attendee_checkin` event

### Debug Mode

To enable detailed logging:

```bash
# In Vercel Dashboard → Project Settings → Environment Variables
ENABLE_ANALYTICS_DEBUG=true
```

This will log all tracking attempts to help diagnose issues.

### Support

If events still don't appear after checking all of the above:
1. Verify your Vercel plan supports custom events
2. Check Vercel Analytics documentation: https://vercel.com/docs/analytics/custom-events
3. Contact Vercel support if plan is correct but events still don't appear

