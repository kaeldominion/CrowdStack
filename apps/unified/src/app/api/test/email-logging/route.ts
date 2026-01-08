import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient, createClient } from "@crowdstack/shared/supabase/server";
import { sendTemplateEmail } from "@crowdstack/shared/email/template-renderer";

/**
 * POST /api/test/email-logging
 * Test endpoint to verify email logging is working
 * Sends a test email and verifies it's logged correctly
 * 
 * Authentication: Uses cookies (Supabase session) OR service role key in header
 * For testing: Set X-Service-Role-Key header with SUPABASE_SERVICE_ROLE_KEY
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
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
    const testEmail = body.email || "test@example.com";

    const supabase = createServiceRoleClient();

    // Send a test email using a simple template (like welcome)
    const result = await sendTemplateEmail(
      "welcome",
      testEmail,
      null,
      {
        user_name: "Test User",
        app_url: process.env.NEXT_PUBLIC_WEB_URL || "https://crowdstack.app",
      },
      {
        test: true,
        test_timestamp: new Date().toISOString(),
      }
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send test email" },
        { status: 500 }
      );
    }

    // Wait a moment for the log to be created
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify the log was created
    const { data: logEntry, error: logError } = await supabase
      .from("email_send_logs")
      .select("*")
      .eq("recipient", testEmail)
      .eq("metadata->>test", "true")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (logError || !logEntry) {
      return NextResponse.json({
        success: false,
        message: "Email sent but log entry not found",
        emailResult: result,
        logError: logError?.message,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Email sent and logged successfully",
      emailResult: result,
      logEntry: {
        id: logEntry.id,
        template_slug: logEntry.template_slug,
        recipient: logEntry.recipient,
        subject: logEntry.subject,
        status: logEntry.status,
        postmark_message_id: (logEntry.metadata as any)?.postmark_message_id,
        created_at: logEntry.created_at,
      },
    });
  } catch (error: any) {
    console.error("Error testing email logging:", error);
    return NextResponse.json(
      { error: error.message || "Failed to test email logging" },
      { status: 500 }
    );
  }
}

