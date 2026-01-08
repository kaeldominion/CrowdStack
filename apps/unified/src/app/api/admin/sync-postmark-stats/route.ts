import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";

/**
 * POST /api/admin/sync-postmark-stats
 * Sync email open/click stats from Postmark API for emails sent in the last N days
 * Also backfills missing email logs by querying Postmark for sent emails
 * This is useful for backfilling stats or syncing historical data
 * 
 * Requires: superadmin role
 * 
 * Body: { days?: number, backfillMissing?: boolean }
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    // Check permissions
    if (!(await userHasRoleOrSuperadmin("superadmin"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const apiToken = process.env.POSTMARK_API_TOKEN;
    if (!apiToken) {
      return NextResponse.json(
        { error: "POSTMARK_API_TOKEN not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const days = body.days || 7; // Default to last 7 days
    const backfillMissing = body.backfillMissing !== false; // Default to true

    const supabase = createServiceRoleClient();

    let backfilled = 0;

    // Get all email logs from the last N days that have a Postmark message ID
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data: emailLogs, error: fetchError } = await supabase
      .from("email_send_logs")
      .select("id, metadata")
      .gte("created_at", cutoffDate.toISOString())
      .not("metadata->>postmark_message_id", "is", null);

    if (fetchError) {
      throw fetchError;
    }

    if (!emailLogs || emailLogs.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        message: "No emails to sync",
      });
    }

    let synced = 0;
    let updated = 0;

    // Fetch stats from Postmark for each message
    for (const log of emailLogs) {
      const messageId = (log.metadata as any)?.postmark_message_id;
      if (!messageId) continue;

      try {
        // Get message details from Postmark
        const response = await fetch(
          `https://api.postmarkapp.com/messages/outbound/${messageId}/details`,
          {
            headers: {
              "Accept": "application/json",
              "X-Postmark-Server-Token": apiToken,
            },
          }
        );

        if (!response.ok) {
          console.warn(`[Sync Postmark] Failed to fetch message ${messageId}:`, response.status);
          continue;
        }

        const messageDetails = await response.json();

        // Update email log with stats
        const updates: Record<string, any> = {};

        // Update status
        if (messageDetails.Status === "Delivered" && messageDetails.DeliveredAt) {
          updates.status = "sent";
          updates.sent_at = messageDetails.DeliveredAt;
        } else if (messageDetails.Status === "Bounced" && messageDetails.BouncedAt) {
          updates.status = "bounced";
          updates.error_message = messageDetails.Message || "Email bounced";
        }

        // Update open tracking (first open)
        if (messageDetails.Opens && messageDetails.Opens.length > 0) {
          const firstOpen = messageDetails.Opens[0];
          if (firstOpen.ReceivedAt) {
            updates.opened_at = firstOpen.ReceivedAt;
          }
        }

        // Update click tracking (first click)
        if (messageDetails.Clicks && messageDetails.Clicks.length > 0) {
          const firstClick = messageDetails.Clicks[0];
          if (firstClick.ReceivedAt) {
            updates.clicked_at = firstClick.ReceivedAt;
          }
        }

        // Only update if we have changes
        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await supabase
            .from("email_send_logs")
            .update(updates)
            .eq("id", log.id);

          if (!updateError) {
            updated++;
          }
        }

        synced++;
      } catch (error) {
        console.error(`[Sync Postmark] Error syncing message ${messageId}:`, error);
      }
    }

    // Optionally backfill missing email logs from Postmark
    if (backfillMissing) {
      try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        // Get all sent emails from Postmark in the date range
        const response = await fetch(
          `https://api.postmarkapp.com/messages/outbound?count=500&offset=0`,
          {
            headers: {
              "Accept": "application/json",
              "X-Postmark-Server-Token": apiToken,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const messages = data.Messages || [];

          for (const message of messages) {
            // Check if we already have a log for this message
            const { data: existingLog } = await supabase
              .from("email_send_logs")
              .select("id")
              .eq("metadata->>postmark_message_id", message.MessageID)
              .single();

            if (!existingLog && message.DeliveredAt) {
              // Try to match by recipient and subject
              const { data: matchedLog } = await supabase
                .from("email_send_logs")
                .select("id")
                .eq("recipient", message.Recipient)
                .eq("subject", message.Subject)
                .gte("created_at", cutoffDate.toISOString())
                .single();

              if (!matchedLog) {
                // Create a new log entry for this email
                // Try to determine template slug from tag
                const tag = message.Tag || "";
                const templateSlug = tag.startsWith("template:") 
                  ? tag.replace("template:", "") 
                  : "unknown";

                const { error: insertError } = await supabase
                  .from("email_send_logs")
                  .insert({
                    template_slug: templateSlug,
                    recipient: message.Recipient,
                    subject: message.Subject,
                    status: message.Status === "Delivered" ? "sent" : "pending",
                    sent_at: message.DeliveredAt || message.SubmittedAt,
                    metadata: {
                      postmark_message_id: message.MessageID,
                      backfilled: true,
                    },
                  });

                if (!insertError) {
                  backfilled++;
                }
              } else {
                // Update existing log with Postmark message ID if missing
                // First get the current metadata
                const { data: existingLog } = await supabase
                  .from("email_send_logs")
                  .select("metadata")
                  .eq("id", matchedLog.id)
                  .single();

                const currentMetadata = (existingLog?.metadata as Record<string, any>) || {};
                if (!currentMetadata.postmark_message_id) {
                  await supabase
                    .from("email_send_logs")
                    .update({
                      metadata: {
                        ...currentMetadata,
                        postmark_message_id: message.MessageID,
                      },
                    })
                    .eq("id", matchedLog.id);
                }
              }
            }
          }
        }
      } catch (backfillError) {
        console.error("[Sync Postmark] Error backfilling missing logs:", backfillError);
      }
    }

    return NextResponse.json({
      success: true,
      synced,
      updated,
      backfilled,
      total: emailLogs.length,
    });
  } catch (error: any) {
    console.error("Error syncing Postmark stats:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync stats" },
      { status: 500 }
    );
  }
}

