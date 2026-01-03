import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient, createClient } from "@crowdstack/shared/supabase/server";

/**
 * POST /api/test/postmark-webhook
 * Test endpoint to simulate Postmark webhook events
 * Useful for testing webhook handling without setting up actual Postmark webhooks
 * 
 * Authentication: Uses cookies (Supabase session) OR service role key in header
 * For testing: Set X-Service-Role-Key header with SUPABASE_SERVICE_ROLE_KEY
 * 
 * Body: {
 *   recordType: "Open" | "Click" | "Bounce" | "Delivery" | "SpamComplaint",
 *   messageId: string (Postmark MessageID),
 *   recipient?: string,
 *   receivedAt?: string (ISO timestamp)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Allow service role key for testing (bypass auth)
    const serviceRoleKey = request.headers.get("x-service-role-key");
    if (serviceRoleKey && serviceRoleKey === process.env.SUPABASE_SERVICE_ROLE_KEY) {
      // Service role key provided - allow access
    } else {
      // Check normal authentication
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json(
          { 
            error: "Unauthorized",
            hint: "Either log in via browser or provide X-Service-Role-Key header"
          },
          { status: 401 }
        );
      }

      // Check if user is superadmin
      const serviceSupabase = createServiceRoleClient();
      const { data: userRoles } = await serviceSupabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const userRoleNames = userRoles?.map((r) => r.role) || [];
      if (!userRoleNames.includes("superadmin")) {
        return NextResponse.json({ error: "Forbidden: Superadmin role required" }, { status: 403 });
      }
    }

    const body = await request.json();
    const recordType = body.recordType;
    const messageId = body.messageId;
    const recipient = body.recipient;
    const receivedAt = body.receivedAt || new Date().toISOString();

    if (!recordType || !messageId) {
      return NextResponse.json(
        { error: "recordType and messageId are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Find the email log entry by Postmark message ID
    const { data: emailLog, error: findError } = await supabase
      .from("email_send_logs")
      .select("id, status, opened_at, clicked_at, recipient, subject")
      .eq("metadata->>postmark_message_id", messageId)
      .single();

    if (findError || !emailLog) {
      return NextResponse.json({
        success: false,
        message: "Email log not found for this message ID",
        messageId,
        error: findError?.message,
        suggestion: "Make sure the messageId matches a postmark_message_id in email_send_logs",
      });
    }

    // Update based on record type
    const updates: Record<string, any> = {};

    switch (recordType) {
      case "Open":
        if (!emailLog.opened_at) {
          updates.opened_at = receivedAt;
        }
        break;

      case "Click":
        if (!emailLog.clicked_at) {
          updates.clicked_at = receivedAt;
        }
        break;

      case "Bounce":
        updates.status = "bounced";
        updates.error_message = body.description || body.message || "Email bounced";
        break;

      case "Delivery":
        if (emailLog.status === "pending") {
          updates.status = "sent";
          updates.sent_at = receivedAt;
        }
        break;

      case "SpamComplaint":
        updates.status = "bounced";
        updates.error_message = "Spam complaint";
        break;

      default:
        return NextResponse.json(
          { error: `Unknown record type: ${recordType}` },
          { status: 400 }
        );
    }

    // Update the email log if we have changes
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from("email_send_logs")
        .update(updates)
        .eq("id", emailLog.id);

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to update email log", details: updateError.message },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json({
        success: true,
        message: "No updates needed (already processed)",
        emailLog,
      });
    }

    // Fetch updated log
    const { data: updatedLog } = await supabase
      .from("email_send_logs")
      .select("*")
      .eq("id", emailLog.id)
      .single();

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${recordType} event`,
      updates,
      emailLog: updatedLog,
    });
  } catch (error: any) {
    console.error("Error testing Postmark webhook:", error);
    return NextResponse.json(
      { error: error.message || "Failed to test webhook" },
      { status: 500 }
    );
  }
}

