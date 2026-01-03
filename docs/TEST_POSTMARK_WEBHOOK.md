# Testing Postmark Webhook Integration

## Quick Test (No Postmark Setup Required)

Use our test endpoints to simulate webhook events:

### Step 1: Send a Test Email

```bash
# Get your service role key from .env.local
export SERVICE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY apps/unified/.env.local | cut -d '=' -f2)

# Send test email
curl -X POST http://localhost:3000/api/test/email-logging \
  -H "X-Service-Role-Key: $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com"}'
```

**Note the `postmark_message_id` from the response** (e.g., `b4eaef89-9c2c-48f7-9469-325badda8e72`)

### Step 2: Simulate Webhook Events

```bash
# Simulate an "Open" event
curl -X POST http://localhost:3000/api/test/postmark-webhook \
  -H "X-Service-Role-Key: $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "recordType": "Open",
    "messageId": "YOUR_MESSAGE_ID_FROM_STEP_1",
    "receivedAt": "2026-01-03T12:00:00Z"
  }'

# Simulate a "Click" event
curl -X POST http://localhost:3000/api/test/postmark-webhook \
  -H "X-Service-Role-Key: $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "recordType": "Click",
    "messageId": "YOUR_MESSAGE_ID_FROM_STEP_1",
    "receivedAt": "2026-01-03T12:05:00Z"
  }'
```

### Step 3: Verify Stats Updated

```bash
# Check email stats
curl http://localhost:3000/api/test/email-stats?limit=1 \
  -H "X-Service-Role-Key: $SERVICE_KEY"
```

You should see `opened_at` and `clicked_at` timestamps in the response.

---

## Test with Real Postmark Webhook (Local with ngrok)

### Step 1: Install ngrok

```bash
# Mac
brew install ngrok

# Or download from https://ngrok.com/download
```

### Step 2: Start Your Dev Server

```bash
pnpm dev:unified
```

### Step 3: Expose Local Server with ngrok

```bash
ngrok http 3000
```

You'll see output like:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

**Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

### Step 4: Set Up Webhook in Postmark

1. Go to https://account.postmarkapp.com/
2. Navigate to: **Servers** → Your Server → **Settings** → **Webhooks**
3. Click **"Add Webhook"**
4. Set webhook URL: `https://abc123.ngrok.io/api/webhooks/postmark`
5. Select events:
   - ✅ Open
   - ✅ Click
   - ✅ Bounce
   - ✅ Delivery
   - ✅ SpamComplaint
6. Click **"Save"**

### Step 5: Send a Real Email

```bash
# Send test email (this will go through Postmark)
curl -X POST http://localhost:3000/api/test/email-logging \
  -H "X-Service-Role-Key: $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": "your-real-email@example.com"}'
```

### Step 6: Open/Click the Email

1. **Check your email inbox** for the test email
2. **Open the email** - Postmark will automatically send a webhook
3. **Click any link** in the email - Postmark will send another webhook

### Step 7: Verify Webhook Received

Check your server logs - you should see:
```
[Postmark Webhook] Processing Open event for message ID: ...
[Postmark Webhook] Processing Click event for message ID: ...
```

Or check the stats:
```bash
curl http://localhost:3000/api/test/email-stats?limit=1 \
  -H "X-Service-Role-Key: $SERVICE_KEY"
```

---

## Test with Real Postmark Webhook (Production)

### Step 1: Set Up Webhook in Postmark

1. Go to https://account.postmarkapp.com/
2. Navigate to: **Servers** → Your Server → **Settings** → **Webhooks**
3. Click **"Add Webhook"**
4. Set webhook URL: `https://crowdstack.app/api/webhooks/postmark`
   (Or `https://beta.crowdstack.app/api/webhooks/postmark` for beta)
5. Select events: Open, Click, Bounce, Delivery, SpamComplaint
6. Click **"Save"**

### Step 2: Send a Real Email

Send an email through your app (e.g., publish photos, send event invite, etc.)

### Step 3: Open/Click the Email

1. Open the email in your inbox
2. Click a link in the email

### Step 4: Verify in Postmark Dashboard

1. Go to Postmark Dashboard → Webhooks
2. Click on your webhook
3. View **"Webhook Activity"** - you should see successful requests

### Step 5: Verify in Your App

Check email stats in your event management page, or via API:

```bash
curl https://crowdstack.app/api/test/email-stats?limit=10 \
  -H "X-Service-Role-Key: YOUR_SERVICE_ROLE_KEY"
```

---

## Using the Test Script

The easiest way to test everything:

```bash
# Make sure your dev server is running
pnpm dev:unified

# In another terminal, run the test script
./scripts/test-email-logging.sh \
  http://localhost:3000 \
  "YOUR_SERVICE_ROLE_KEY" \
  your-email@example.com
```

This will:
1. ✅ Send a test email
2. ✅ Verify it's logged
3. ✅ Simulate Open and Click events
4. ✅ Show final stats

---

## Troubleshooting

### Webhook Not Receiving Events

1. **Check ngrok is running**: Make sure `ngrok http 3000` is still active
2. **Check webhook URL**: Verify it matches your ngrok URL exactly
3. **Check Postmark logs**: Go to Webhooks → Your webhook → Activity
4. **Check server logs**: Look for `[Postmark Webhook]` messages

### Events Not Updating Stats

1. **Verify message ID matches**: The webhook `MessageID` must match `postmark_message_id` in logs
2. **Check email was logged**: Make sure the email was sent and logged before webhook fires
3. **Check server logs**: Look for errors in webhook processing

### ngrok URL Changes

If ngrok restarts, you'll get a new URL. Update the webhook URL in Postmark to match.

---

## Quick Reference

**Test Endpoints:**
- `POST /api/test/email-logging` - Send test email
- `POST /api/test/postmark-webhook` - Simulate webhook event
- `GET /api/test/email-stats` - View email logs and stats

**Real Webhook Endpoint:**
- `POST /api/webhooks/postmark` - Receives real Postmark webhooks

**Required Headers for Test Endpoints:**
- `X-Service-Role-Key: YOUR_SERVICE_ROLE_KEY`

