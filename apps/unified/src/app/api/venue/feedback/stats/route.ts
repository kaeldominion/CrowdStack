import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { getVenueFeedbackStats } from "@/lib/data/venue-feedback";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";

/**
 * GET /api/venue/feedback/stats
 * Get aggregated feedback stats for venue
 * Venue admins only
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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

    const stats = await getVenueFeedbackStats();

    if (!stats) {
      return NextResponse.json(
        { error: "Venue not found or no access" },
        { status: 404 }
      );
    }

    return NextResponse.json({ stats });
  } catch (error: any) {
    console.error("[Venue Feedback Stats API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
