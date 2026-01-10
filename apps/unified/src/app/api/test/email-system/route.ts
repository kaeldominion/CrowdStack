import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId } from "@/lib/auth/check-role";
import { sendTemplateEmail } from "@crowdstack/shared/email/template-renderer";

/**
 * POST /api/test/email-system
 * Comprehensive email system test - sends test emails for all template types
 * Superadmin only
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = "force-dynamic";

interface TestResult {
  template: string;
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Check if superadmin
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roles = userRoles?.map((r) => r.role) || [];
    if (!roles.includes("superadmin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { recipient, templates } = body;

    if (!recipient) {
      return NextResponse.json(
        { error: "Recipient email is required" },
        { status: 400 }
      );
    }

    // Define test data for each template type
    const templateTestData: Record<string, Record<string, any>> = {
      promoter_welcome: {
        promoter_name: "Test Promoter",
        promoter_email: recipient,
      },
      promoter_event_assigned: {
        promoter_name: "Test Promoter",
        event_name: "Test Event - Friday Night Party",
        event_date: "Friday, January 17, 2025",
        event_time: "10:00 PM",
        event_time_full: "Friday, January 17, 2025 at 10:00 PM - 3:00 AM",
        venue_name: "Test Venue",
        venue_address: "123 Test Street, Miami, FL",
        payout_terms: "$5 per guest (min 10 guests)\nBonus: $50 at 20 guests",
        currency: "USD",
        referral_link: "https://crowdstack.app/e/test-event?ref=test123",
        dashboard_url: "https://crowdstack.app/app/promoter/events",
      },
      promoter_terms_updated: {
        promoter_name: "Test Promoter",
        event_name: "Test Event",
        changes: "per_head_rate: $3 → $5\nbonus_threshold: 15 → 20",
      },
      payout_ready: {
        promoter_name: "Test Promoter",
        event_name: "Test Event",
        payout_amount: 150,
        currency: "USD",
        statement_url: "https://crowdstack.app/statements/test",
      },
      payment_received: {
        promoter_name: "Test Promoter",
        event_name: "Test Event",
        payout_amount: 150,
        currency: "USD",
        proof_url: "https://crowdstack.app/proofs/test",
      },
      bonus_progress_80: {
        promoter_name: "Test Promoter",
        event_name: "Test Event",
        checkins_count: 16,
        bonus_threshold: 20,
        remaining_guests: 4,
        bonus_amount: 50,
        currency: "USD",
      },
      bonus_achieved: {
        promoter_name: "Test Promoter",
        event_name: "Test Event",
        checkins_count: 22,
        bonus_threshold: 20,
        bonus_amount: 50,
        currency: "USD",
      },
      venue_approval_request: {
        venue_name: "Test Venue",
        organizer_name: "Test Organizer",
        event_name: "Test Event - Saturday Night",
        event_date: "Saturday, January 18, 2025",
        approval_link: "https://crowdstack.app/app/venue/events/pending",
      },
      event_approved: {
        organizer_name: "Test Organizer",
        venue_name: "Test Venue",
        event_name: "Test Event - Saturday Night",
        event_link: "https://crowdstack.app/app/organizer/events/test-id",
      },
      event_rejected: {
        organizer_name: "Test Organizer",
        venue_name: "Test Venue",
        event_name: "Test Event - Saturday Night",
        event_link: "https://crowdstack.app/app/organizer/events/test-id",
        rejection_reason: "The venue is already booked for another event on this date.",
      },
      photos_published: {
        event_name: "Test Event",
        event_date: "January 15, 2025",
        venue_name: "Test Venue",
        gallery_url: "https://crowdstack.app/events/test-event/photos",
        custom_message: "Check out these amazing photos from the event!",
        photo_thumbnails_html: "",
      },
      event_reminder_6h: {
        event_name: "Test Event Tonight",
        event_date: "Tonight at 10:00 PM",
        venue_name: "Test Venue",
        venue_address: "123 Test Street, Miami, FL",
        event_url: "https://crowdstack.app/events/test-event",
      },
    };

    // Filter templates to test
    const templatesToTest = templates?.length
      ? templates
      : Object.keys(templateTestData);

    const results: TestResult[] = [];

    for (const templateSlug of templatesToTest) {
      const testData = templateTestData[templateSlug];
      if (!testData) {
        results.push({
          template: templateSlug,
          success: false,
          error: `No test data defined for template: ${templateSlug}`,
        });
        continue;
      }

      try {
        const result = await sendTemplateEmail(
          templateSlug,
          recipient,
          null,
          testData,
          { test_email: true }
        );

        results.push({
          template: templateSlug,
          success: result.success,
          messageId: result.messageId,
          error: result.error,
        });
      } catch (error: any) {
        results.push({
          template: templateSlug,
          success: false,
          error: error.message || "Unknown error",
        });
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: failed === 0,
      summary: {
        total: results.length,
        successful,
        failed,
      },
      results,
    });
  } catch (error: any) {
    console.error("[Email System Test] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to run email system test" },
      { status: 500 }
    );
  }
}
