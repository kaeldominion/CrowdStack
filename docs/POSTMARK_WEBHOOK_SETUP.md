# Postmark Webhook Setup Guide

## Step 1: Set Up Webhook in Postmark

1. **Go to Postmark Dashboard**: https://account.postmarkapp.com/
2. **Navigate to**: Servers → Your Server → Settings → Webhooks
3. **Click**: "Add Webhook"
4. **Set the webhook URL**:
   - **Production**: `https://crowdstack.app/api/webhooks/postmark`
   - **Beta/Preview**: `https://beta.crowdstack.app/api/webhooks/postmark`
   - **Local (with ngrok)**: `https://your-ngrok-url.ngrok.io/api/webhooks/postmark`
   
   **Optional Security**: You can add HTTP Basic Auth to the URL:
   ```
   https://username:password@crowdstack.app/api/webhooks/postmark
   ```
   (Replace `username:password` with your chosen credentials)
5. **Select events to track**:
   - ✅ Open
   - ✅ Click
   - ✅ Bounce
   - ✅ Delivery
   - ✅ SpamComplaint
6. **Save** the webhook

## Step 2: Security (Optional)

Postmark webhooks are already secured via HTTPS. For additional security, you have two options:

### Option A: HTTP Basic Auth (Recommended)

Include credentials in the webhook URL:
```
https://username:password@crowdstack.app/api/webhooks/postmark
```

Then update your webhook endpoint to verify Basic Auth (if needed).

### Option B: No Additional Security

Webhooks are sent over HTTPS, which is sufficient for most use cases. No additional configuration needed.

**Note**: Postmark doesn't provide a separate "webhook secret" - webhooks are secured via HTTPS. The `POSTMARK_API_TOKEN` is only used for sending emails, not for webhook verification.

## Step 3: Verify Setup

### Test the Webhook

1. **Send a test email** (use the test endpoint or send a real email)
2. **Open the email** in your inbox
3. **Check the logs** - The webhook should automatically update `opened_at` in `email_send_logs`

### Check Webhook Logs in Postmark

1. Go to Postmark Dashboard → Webhooks
2. Click on your webhook
3. View "Webhook Activity" to see if requests are being sent and if they're successful

### Verify in Your App

Check the email stats endpoint:
```bash
curl https://your-domain.com/api/test/email-stats?limit=5 \
  -H "X-Service-Role-Key: YOUR_SERVICE_ROLE_KEY"
```

You should see `opened_at` and `clicked_at` timestamps populated.

## Troubleshooting

### Webhook Not Receiving Events

1. **Check webhook URL**: Make sure it's correct and accessible
2. **Check Postmark logs**: Go to Webhooks → Your webhook → Activity
3. **Verify signature**: If `POSTMARK_WEBHOOK_SECRET` is set, webhook signature must match
4. **Check server logs**: Look for `[Postmark Webhook]` errors

### Webhook Not Secure Enough

- Postmark webhooks are sent over HTTPS, which provides encryption
- For additional security, use HTTP Basic Auth in the webhook URL
- Or implement IP allowlisting (Postmark publishes their webhook IP ranges)

### Events Not Updating Stats

1. **Check message ID**: The webhook `MessageID` must match `postmark_message_id` in `email_send_logs`
2. **Verify log exists**: Make sure the email was logged before the webhook fires
3. **Check webhook payload**: Use Postmark's webhook testing tool to see the exact payload

## Security Notes

- ⚠️ **Never commit** `POSTMARK_WEBHOOK_SECRET` to git
- 🔒 The webhook secret is used to verify requests are actually from Postmark
- ✅ Without the secret, webhooks still work but aren't verified (less secure)
- 🔑 The secret is different for each webhook you create

## Optional: Testing with ngrok (Local Development)

If you want to test webhooks locally:

1. **Install ngrok**: `brew install ngrok` (Mac) or download from ngrok.com
2. **Start your dev server**: `pnpm dev:unified`
3. **Expose local server**: `ngrok http 3000`
4. **Copy the ngrok URL**: e.g., `https://abc123.ngrok.io`
5. **Set webhook URL in Postmark**: `https://abc123.ngrok.io/api/webhooks/postmark`
6. **Set `POSTMARK_WEBHOOK_SECRET` in `.env.local`**

Now webhooks from Postmark will be forwarded to your local server!
