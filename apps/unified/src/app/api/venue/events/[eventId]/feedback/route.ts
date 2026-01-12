import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { getEventFeedback } from "@/lib/data/venue-feedback";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";

/**
 * GET /api/venue/events/[eventId]/feedback
 * Get feedback for a specific event
 * Venue admins only
 */
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has venue_admin role or is superadmin
    const hasAccess = await userHasRoleOrSuperadmin("venue_admin");

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const feedback = await getEventFeedback(params.eventId);

    if (!feedback) {
      return NextResponse.json(
        { error: "Event not found or no access" },
        { status: 404 }
      );
    }

    return NextResponse.json({ feedback });
  } catch (error: any) {
    console.error("[Venue Feedback API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
