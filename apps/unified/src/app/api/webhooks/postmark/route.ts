import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import crypto from "crypto";

/**
 * POST /api/webhooks/postmark
 * Handle Postmark webhook events for email delivery tracking
 * 
 * Webhook events: Delivery, Open, Click, Bounce, SpamComplaint, etc.
 * @see https://postmarkapp.com/developer/webhooks/webhooks-overview
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (optional but recommended)
    const signature = request.headers.get("X-Postmark-Signature");
    const webhookSecret = process.env.POSTMARK_WEBHOOK_SECRET;
    
    if (webhookSecret && signature) {
      const body = await request.text();
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(body)
        .digest("hex");
      
      if (signature !== expectedSignature) {
        console.error("[Postmark Webhook] Invalid signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const payload = await request.json();
    const recordType = payload.RecordType;

    // We only care about email delivery events
    const relevantEvents = [
      "Delivery",      // Email was successfully delivered
      "Open",          // Recipient opened the email
      "Click",         // Recipient clicked a link
      "Bounce",        // Email bounced (hard or soft)
      "SpamComplaint", // Recipient marked as spam
    ];

    if (!relevantEvents.includes(recordType)) {
      // Acknowledge but don't process
      return NextResponse.json({ received: true });
    }

    const serviceSupabase = createServiceRoleClient();

    // Extract email info from webhook payload
    const recipientEmail = payload.Recipient || payload.Email;
    const messageId = payload.MessageID;
    const timestamp = payload.DeliveredAt || payload.ReceivedAt || payload.OpenedAt || payload.ClickedAt || payload.BouncedAt || new Date().toISOString();

    if (!recipientEmail) {
      console.warn("[Postmark Webhook] No recipient email in payload:", payload);
      return NextResponse.json({ received: true });
    }

    // Find the message_log entry by recipient email and recent timestamp
    // We match by email_recipient_email and email_subject pattern
    const { data: messageLogs } = await serviceSupabase
      .from("message_logs")
      .select("id, email_recipient_email, email_subject, event_id, email_opened_at, email_clicked_at")
      .eq("email_recipient_email", recipientEmail)
      .eq("email_message_type", "photo_notification")
      .order("created_at", { ascending: false })
      .limit(10);

    if (!messageLogs || messageLogs.length === 0) {
      // No matching log found - might be a different email type
      console.log("[Postmark Webhook] No matching message log found for:", recipientEmail);
      return NextResponse.json({ received: true });
    }

    // Use the most recent matching log
    const messageLog = messageLogs[0];
    const updateData: any = {};

    // Update based on event type
    switch (recordType) {
      case "Delivery":
        updateData.email_delivered_at = timestamp;
        updateData.status = "delivered";
        break;

      case "Open":
        // Don't overwrite if already set (first open is most important)
        if (!messageLog.email_opened_at) {
          updateData.email_opened_at = timestamp;
        }
        break;

      case "Click":
        // Don't overwrite if already set (first click is most important)
        if (!messageLog.email_clicked_at) {
          updateData.email_clicked_at = timestamp;
        }
        break;

      case "Bounce":
        updateData.email_bounced_at = timestamp;
        updateData.email_bounce_reason = payload.Description || payload.BounceType || "Unknown bounce";
        updateData.status = "bounced";
        break;

      case "SpamComplaint":
        updateData.email_bounced_at = timestamp;
        updateData.email_bounce_reason = "Spam complaint";
        updateData.status = "spam_complaint";
        break;

      default:
        return NextResponse.json({ received: true });
    }

    // Update the message log
    const { error: updateError } = await serviceSupabase
      .from("message_logs")
      .update(updateData)
      .eq("id", messageLog.id);

    if (updateError) {
      console.error("[Postmark Webhook] Failed to update message log:", updateError);
      return NextResponse.json(
        { error: "Failed to update message log" },
        { status: 500 }
      );
    }

    console.log(`[Postmark Webhook] Updated ${recordType} event for ${recipientEmail}`);

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[Postmark Webhook] Error processing webhook:", error);
    // Always return 200 to prevent Postmark from retrying
    return NextResponse.json({ received: true, error: error.message });
  }
}

