import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { sendTemplateEmail } from "@crowdstack/shared/email/template-renderer";
import { sendEmail } from "@crowdstack/shared/email/postmark";
import { sendMagicLink } from "@crowdstack/shared/email/send-magic-link";
import { logEmail } from "@crowdstack/shared/email/log-email";

/**
 * GET /api/test/email-logging-verification
 * Test endpoint to verify all email sending mechanisms are logging correctly
 * 
 * This endpoint:
 * 1. Sends a test email via each mechanism
 * 2. Waits 2 seconds
 * 3. Checks if each email appears in email_send_logs
 * 4. Returns verification results
 */

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const testEmail = request.nextUrl.searchParams.get("email") || "test@example.com";
    const results: Record<string, { sent: boolean; logged: boolean; logId?: string; error?: string }> = {};

    // Test 1: Template Email
    try {
      const templateResult = await sendTemplateEmail(
        "welcome",
        testEmail,
        null,
        {
          user_name: "Test User",
          app_url: "https://crowdstack.app/app",
        },
        {
          test: true,
          test_type: "template",
        }
      );
      results.template = { sent: templateResult.success, logged: false };
    } catch (error: any) {
      results.template = { sent: false, logged: false, error: error.message };
    }

    // Test 2: Direct Postmark Email
    try {
      await sendEmail({
        from: "notifications@crowdstack.app",
        to: testEmail,
        subject: "[TEST] Direct Postmark Email",
        htmlBody: "<p>This is a test email sent via direct Postmark.</p>",
        textBody: "This is a test email sent via direct Postmark.",
        emailType: "direct",
        metadata: {
          test: true,
          test_type: "direct",
        },
      });
      results.direct = { sent: true, logged: false };
    } catch (error: any) {
      results.direct = { sent: false, logged: false, error: error.message };
    }

    // Test 3: Magic Link (via wrapper)
    try {
      await sendMagicLink(
        testEmail,
        "https://crowdstack.app/test",
        "[TEST] Magic Link",
        {
          test: true,
          test_type: "magic_link_wrapper",
        }
      );
      results.magicLinkWrapper = { sent: true, logged: false };
    } catch (error: any) {
      results.magicLinkWrapper = { sent: false, logged: false, error: error.message };
    }

    // Wait 2 seconds for logs to be written
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if emails were logged
    const supabase = createServiceRoleClient();
    const { data: logs } = await supabase
      .from("email_send_logs")
      .select("id, email_type, template_slug, metadata")
      .eq("recipient", testEmail)
      .gte("created_at", new Date(Date.now() - 10000).toISOString()) // Last 10 seconds
      .order("created_at", { ascending: false });

    // Match logs to test types
    if (logs) {
      const templateLog = logs.find(l => l.metadata?.test_type === "template");
      if (templateLog) {
        results.template.logged = true;
        results.template.logId = templateLog.id;
      }

      const directLog = logs.find(l => l.metadata?.test_type === "direct");
      if (directLog) {
        results.direct.logged = true;
        results.direct.logId = directLog.id;
      }

      const magicLinkLog = logs.find(l => l.metadata?.test_type === "magic_link_wrapper");
      if (magicLinkLog) {
        results.magicLinkWrapper.logged = true;
        results.magicLinkWrapper.logId = magicLinkLog.id;
      }
    }

    // Summary
    const allLogged = Object.values(results).every(r => r.logged);
    const allSent = Object.values(results).every(r => r.sent);

    return NextResponse.json({
      success: allLogged && allSent,
      message: allLogged 
        ? "✅ All email mechanisms are logging correctly"
        : "⚠️ Some email mechanisms are not logging correctly",
      results,
      logsFound: logs?.length || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Email Logging Verification] Error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || "Failed to verify email logging",
      },
      { status: 500 }
    );
  }
}
