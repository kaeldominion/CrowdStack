# Postmark Webhook Setup Guide

This guide explains how to configure Postmark webhooks to track email delivery stats for photo notifications.

## Prerequisites

- Postmark account with API access
- Your production domain deployed (webhooks need a public URL)

## Step 1: Configure Webhook URL in Postmark

1. Log in to your [Postmark Dashboard](https://account.postmarkapp.com/)
2. Navigate to **Servers** → Select your server
3. Go to **Webhooks** tab
4. Click **Add Webhook**
5. Enter your webhook URL:
   ```
   https://yourdomain.com/api/webhooks/postmark
   ```
   (Replace `yourdomain.com` with your actual domain)

6. Select the following event types to subscribe to:
   - ✅ **Delivery** - Email successfully delivered
   - ✅ **Open** - Recipient opened the email
   - ✅ **Click** - Recipient clicked a link
   - ✅ **Bounce** - Email bounced (hard or soft)
   - ✅ **SpamComplaint** - Recipient marked as spam

7. Click **Save Webhook**

## Step 2: Configure Webhook Secret (Optional but Recommended)

For security, Postmark can sign webhook requests. To enable signature verification:

1. In the webhook settings, copy the **Webhook Secret** (or generate a new one)
2. Add it to your environment variables:
   ```bash
   POSTMARK_WEBHOOK_SECRET=your_webhook_secret_here
   ```
3. Deploy the updated environment variable to your hosting platform

**Note:** The webhook handler will work without the secret, but signature verification adds an extra layer of security.

## Step 3: Test the Webhook

1. Publish a photo album with auto-email enabled
2. Check your Postmark dashboard → **Activity** to see if emails were sent
3. Check your application logs for webhook events:
   ```
   [Postmark Webhook] Updated Delivery event for user@example.com
   [Postmark Webhook] Updated Open event for user@example.com
   ```

## Step 4: Verify Email Stats

1. Navigate to your event's photo gallery
2. Click the **Email Stats** tab
3. You should see:
   - Delivery rates
   - Open rates
   - Click rates
   - Bounce rates
   - Individual email logs with timestamps

## Troubleshooting

### Webhook Not Receiving Events

1. **Check webhook URL is correct** - Must be publicly accessible
2. **Verify event types are selected** - All 5 event types must be enabled
3. **Check server logs** - Look for webhook POST requests in your application logs
4. **Test with Postmark's webhook tester** - Postmark dashboard has a "Test Webhook" feature

### Events Not Matching Message Logs

The webhook matches emails by:
- `email_recipient_email` (must match exactly)
- `email_message_type` (must be "photo_notification")

If emails aren't matching:
- Check that `email_recipient_email` in the database matches the recipient in Postmark
- Verify the email was logged with `email_message_type: "photo_notification"`

### Signature Verification Failing

If you see "Invalid signature" errors:
- Verify `POSTMARK_WEBHOOK_SECRET` matches the secret in Postmark dashboard
- Ensure the secret is set in your production environment variables
- Check that the webhook secret hasn't been regenerated in Postmark

## Webhook Payload Structure

The webhook handler expects Postmark's standard webhook format:

```json
{
  "RecordType": "Delivery|Open|Click|Bounce|SpamComplaint",
  "Recipient": "user@example.com",
  "MessageID": "postmark-message-id",
  "DeliveredAt": "2024-01-01T12:00:00Z",
  "OpenedAt": "2024-01-01T12:05:00Z",
  "ClickedAt": "2024-01-01T12:10:00Z",
  "BouncedAt": "2024-01-01T12:00:00Z",
  "Description": "Bounce reason (for bounces)"
}
```

## Local Development

For local development, you can use a tool like [ngrok](https://ngrok.com/) to expose your local server:

```bash
ngrok http 3000
```

Then use the ngrok URL in Postmark webhook settings:
```
https://your-ngrok-url.ngrok.io/api/webhooks/postmark
```

**Note:** Remember to update the webhook URL back to your production domain when done testing!

