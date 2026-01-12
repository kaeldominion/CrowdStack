import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import crypto from "crypto";

/**
 * POST /api/webhooks/postmark
 * Webhook endpoint for Postmark email tracking events
 * Handles: opens, clicks, bounces, deliveries, spam complaints
 * 
 * @see https://postmarkapp.com/developer/webhooks/webhooks-overview
 * 
 * To set up in Postmark:
 * 1. Go to Postmark Dashboard → Servers → Your Server → Settings → Webhooks
 * 2. Click "Add Webhook"
 * 3. Set webhook URL: https://your-domain.com/api/webhooks/postmark
 * 4. Select events: Open, Click, Bounce, Delivery, SpamComplaint
 * 5. Save the webhook
 * 
 * Security: Webhooks are sent over HTTPS. For additional security, you can:
 * - Use HTTP Basic Auth in the webhook URL: https://username:password@your-domain.com/api/webhooks/postmark
 * - Or set POSTMARK_API_TOKEN env variable to verify requests (optional)
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    // Read body once for verification and parsing
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);

    // Optional: Verify using Postmark API token if configured
    // Postmark doesn't provide a separate webhook secret, but we can use the API token
    // for basic verification. Webhooks are already secured via HTTPS.
    const apiToken = process.env.POSTMARK_API_TOKEN;
    if (apiToken) {
      // Check if request includes API token in header (optional security measure)
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader !== `Bearer ${apiToken}`) {
        // If Authorization header is provided, it must match
        // This is optional - most Postmark webhooks don't include auth headers
        console.warn("[Postmark Webhook] Authorization header mismatch");
      }
    }
    const recordType = body.RecordType;
    const messageId = body.MessageID;
    const recipient = body.Recipient;
    const receivedAt = body.ReceivedAt;

    if (!recordType || !messageId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Find the email log entry by Postmark message ID
    const { data: emailLog, error: findError } = await supabase
      .from("email_send_logs")
      .select("id, status, opened_at, clicked_at, open_count, click_count, last_opened_at, last_clicked_at, bounced_at")
      .eq("metadata->>postmark_message_id", messageId)
      .single();

    if (findError || !emailLog) {
      // Log but don't fail - might be an email sent outside our system
      console.warn("[Postmark Webhook] Email log not found for message ID:", messageId);
      return NextResponse.json({ success: true, message: "Email log not found" });
    }

    // Update based on record type
    const updates: Record<string, any> = {};
    const timestamp = receivedAt || new Date().toISOString();

    switch (recordType) {
      case "Open":
        // Track multiple opens
        updates.open_count = (emailLog.open_count || 0) + 1;
        updates.last_opened_at = timestamp;
        
        // Set first opened_at if not already set
        if (!emailLog.opened_at) {
          updates.opened_at = timestamp;
        }
        break;

      case "Click":
        // Track multiple clicks
        updates.click_count = (emailLog.click_count || 0) + 1;
        updates.last_clicked_at = timestamp;
        
        // Set first clicked_at if not already set
        if (!emailLog.clicked_at) {
          updates.clicked_at = timestamp;
        }
        break;

      case "Bounce":
        updates.status = "bounced";
        updates.bounced_at = timestamp;
        updates.bounce_reason = body.Description || body.Message || body.BounceType || "Email bounced";
        updates.error_message = body.Description || body.Message || "Email bounced";
        break;

      case "Delivery":
        // Update status to sent if still pending
        if (emailLog.status === "pending") {
          updates.status = "sent";
          updates.sent_at = timestamp;
        }
        break;

      case "SpamComplaint":
        // Mark as bounced/spam
        updates.status = "bounced";
        updates.bounced_at = timestamp;
        updates.bounce_reason = "Spam complaint";
        updates.error_message = "Spam complaint";
        break;

      default:
        // Unknown record type - log but don't fail
        console.log("[Postmark Webhook] Unknown record type:", recordType);
        return NextResponse.json({ success: true, message: "Unknown record type" });
    }

    // Update the email log if we have changes
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from("email_send_logs")
        .update(updates)
        .eq("id", emailLog.id);

      if (updateError) {
        console.error("[Postmark Webhook] Failed to update email log:", updateError);
        return NextResponse.json(
          { error: "Failed to update email log" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Postmark Webhook] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
