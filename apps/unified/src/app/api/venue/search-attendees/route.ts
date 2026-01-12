import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId, userHasRoleOrSuperadmin } from "@/lib/auth/check-role";

export const dynamic = "force-dynamic";

/**
 * GET /api/venue/search-attendees
 * Search for attendees by email to assign to table bookings
 * Returns full contact info (venue admin only)
 *
 * Query params:
 * - q: search query (email, required, min 3 chars)
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await userHasRoleOrSuperadmin("venue_admin");
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";

    if (query.length < 3) {
      return NextResponse.json({
        attendees: [],
        message: "Enter at least 3 characters to search",
      });
    }

    const serviceSupabase = createServiceRoleClient();

    // Search attendees by email (primary) or name
    // Prioritize email matches since that's the unique identifier
    const { data: attendees, error } = await serviceSupabase
      .from("attendees")
      .select("id, name, email, phone, user_id, created_at")
      .or(`email.ilike.%${query}%,name.ilike.%${query}%`)
      .order("email", { ascending: true })
      .limit(10);

    if (error) {
      console.error("Error searching attendees:", error);
      return NextResponse.json(
        { error: "Failed to search attendees" },
        { status: 500 }
      );
    }

    // Filter to only show attendees with verified accounts (have user_id linked)
    // This ensures we're only assigning to real accounts, not orphaned records
    const verifiedAttendees = (attendees || []).filter(a => a.user_id !== null);

    return NextResponse.json({
      attendees: verifiedAttendees.map((a) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        phone: a.phone,
        has_account: !!a.user_id,
      })),
    });
  } catch (error: any) {
    console.error("Error in search-attendees:", error);
    return NextResponse.json(
      { error: error.message || "Failed to search attendees" },
      { status: 500 }
    );
  }
}
