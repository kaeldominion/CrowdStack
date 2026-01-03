# Testing Email Logging and Postmark Integration

This guide explains how to test the email logging system and Postmark webhook integration.

## Prerequisites

1. **Environment Variables**:
   - `POSTMARK_API_TOKEN` - Your Postmark API token
   - `POSTMARK_WEBHOOK_SECRET` - (Optional) Webhook secret for signature verification
   - `NEXT_PUBLIC_WEB_URL` - Your application URL

2. **Access**: You need superadmin role to use test endpoints

## Test Endpoints

### 1. Test Email Logging

Send a test email and verify it's logged:

```bash
curl -X POST https://your-domain.com/api/test/email-logging \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Email sent and logged successfully",
  "emailResult": {
    "success": true,
    "messageId": "postmark-message-id-here"
  },
  "logEntry": {
    "id": "log-entry-id",
    "template_slug": "welcome",
    "recipient": "test@example.com",
    "subject": "Welcome to CrowdStack! 🎉",
    "status": "sent",
    "postmark_message_id": "postmark-message-id-here",
    "created_at": "2026-01-02T..."
  }
}
```

### 2. Test Postmark Webhook (Simulate Events)

Simulate Postmark webhook events to test tracking:

```bash
# Simulate an "Open" event
curl -X POST https://your-domain.com/api/test/postmark-webhook \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recordType": "Open",
    "messageId": "postmark-message-id-from-step-1",
    "receivedAt": "2026-01-02T12:00:00Z"
  }'

# Simulate a "Click" event
curl -X POST https://your-domain.com/api/test/postmark-webhook \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recordType": "Click",
    "messageId": "postmark-message-id-from-step-1",
    "receivedAt": "2026-01-02T12:05:00Z"
  }'
```

**Available Record Types**:
- `Open` - Email was opened
- `Click` - Link in email was clicked
- `Bounce` - Email bounced
- `Delivery` - Email was delivered
- `SpamComplaint` - Recipient marked as spam

### 3. Check Email Stats

View recent email logs and their tracking status:

```bash
# Get all recent logs
curl https://your-domain.com/api/test/email-stats?limit=50 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Filter by event ID
curl https://your-domain.com/api/test/email-stats?eventId=EVENT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Filter by template slug
curl https://your-domain.com/api/test/email-stats?templateSlug=photos_published \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response**:
```json
{
  "success": true,
  "stats": {
    "total": 20,
    "sent": 18,
    "pending": 1,
    "failed": 0,
    "bounced": 1,
    "opened": 12,
    "clicked": 5,
    "withPostmarkId": 19
  },
  "logs": [...]
}
```

### 4. Sync Postmark Stats

Backfill missing logs and sync open/click stats from Postmark:

```bash
curl -X POST https://your-domain.com/api/admin/sync-postmark-stats \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "days": 7,
    "backfillMissing": true
  }'
```

## Testing Workflow

### Step 1: Send Test Email
```bash
# Send a test email
curl -X POST https://your-domain.com/api/test/email-logging \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com"}'
```

**Note the `postmark_message_id` from the response.**

### Step 2: Verify Log Entry
```bash
# Check that the email was logged
curl https://your-domain.com/api/test/email-stats?limit=1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Step 3: Simulate Webhook Events
```bash
# Simulate email open
curl -X POST https://your-domain.com/api/test/postmark-webhook \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recordType": "Open",
    "messageId": "YOUR_MESSAGE_ID_FROM_STEP_1"
  }'

# Simulate email click
curl -X POST https://your-domain.com/api/test/postmark-webhook \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recordType": "Click",
    "messageId": "YOUR_MESSAGE_ID_FROM_STEP_1"
  }'
```

### Step 4: Verify Tracking
```bash
# Check that opens/clicks were recorded
curl https://your-domain.com/api/test/email-stats?limit=1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

You should see `opened_at` and `clicked_at` timestamps in the response.

## Testing Real Postmark Webhooks

### Option 1: Use ngrok (Local Testing)

1. **Install ngrok**: `brew install ngrok` (Mac) or download from [ngrok.com](https://ngrok.com)

2. **Start your local server**:
   ```bash
   pnpm dev:unified
   ```

3. **Expose local server**:
   ```bash
   ngrok http 3000
   ```

4. **Configure Postmark webhook**:
   - Go to Postmark Dashboard → Webhooks
   - Add webhook URL: `https://your-ngrok-url.ngrok.io/api/webhooks/postmark`
   - Select events: Open, Click, Bounce, Delivery, SpamComplaint
   - Copy the webhook secret

5. **Set environment variable**:
   ```bash
   export POSTMARK_WEBHOOK_SECRET=your-webhook-secret
   ```

6. **Send a test email** and open/click it - webhook should fire automatically

### Option 2: Use Postmark's Webhook Testing Tool

Postmark provides a webhook testing tool in their dashboard:
1. Go to Postmark Dashboard → Webhooks
2. Click "Test Webhook"
3. Select event type and fill in test data
4. Send test webhook

### Option 3: Manual Webhook Call

You can manually call the webhook endpoint with Postmark's webhook format:

```bash
curl -X POST https://your-domain.com/api/webhooks/postmark \
  -H "Content-Type: application/json" \
  -H "X-Postmark-Signature: YOUR_SIGNATURE" \
  -d '{
    "RecordType": "Open",
    "MessageID": "your-message-id",
    "Recipient": "test@example.com",
    "ReceivedAt": "2026-01-02T12:00:00Z"
  }'
```

## Troubleshooting

### Emails not being logged

1. **Check logs**: Look for `[Template Email] Failed to create log entry` in server logs
2. **Verify template exists**: Check that the template slug exists in `email_templates` table
3. **Check database permissions**: Ensure service role can insert into `email_send_logs`

### Webhook not updating stats

1. **Verify message ID**: Make sure `postmark_message_id` in webhook matches a log entry
2. **Check webhook signature**: If `POSTMARK_WEBHOOK_SECRET` is set, signature must match
3. **Check logs**: Look for `[Postmark Webhook]` errors in server logs

### Stats not showing in UI

1. **Verify event_id in metadata**: Email logs need `event_id` in metadata to show in event stats
2. **Check template_slug**: Stats are grouped by `template_slug` or `email_type` in metadata
3. **Refresh stats**: Use the sync endpoint to backfill missing data

## Production Setup

Once testing is complete:

1. **Set up production webhook**:
   - URL: `https://your-production-domain.com/api/webhooks/postmark`
   - Events: Open, Click, Bounce, Delivery, SpamComplaint
   - Set `POSTMARK_WEBHOOK_SECRET` in production environment

2. **Schedule sync job** (optional):
   - Set up a cron job to call `/api/admin/sync-postmark-stats` daily
   - This ensures no webhooks are missed

3. **Monitor logs**:
   - Watch for webhook errors
   - Check email delivery rates
   - Monitor open/click rates

