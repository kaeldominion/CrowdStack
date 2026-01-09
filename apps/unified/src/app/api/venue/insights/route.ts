import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { getVenueInsights } from "@/lib/data/venue-insights";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { CACHE, getCacheControl } from "@/lib/cache";

// Force dynamic rendering since this route uses cookies
export const dynamic = "force-dynamic";

/**
 * GET /api/venue/insights
 * Returns aggregated venue insights - no individual contact data
 * Privacy-first: Only shows names and numbers, no emails/phones
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const { getUserId } = await import("@/lib/auth/check-role");
      const userId = await getUserId();
      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Check if user has venue_admin role or is superadmin
    const hasAccess = await userHasRoleOrSuperadmin("venue_admin");

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const insights = await getVenueInsights();

    return NextResponse.json(
      { insights },
      {
        headers: {
          "Cache-Control": getCacheControl(CACHE.dashboardStats),
        },
      }
    );
  } catch (error: any) {
    console.error("[Venue Insights] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch venue insights" },
      { status: 500 }
    );
  }
}
