import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId, userHasRoleOrSuperadmin } from "@/lib/auth/check-role";

export const dynamic = "force-dynamic";

/**
 * GET /api/venue/table-bookings/[bookingId]/guests
 * Get all party guests for a booking
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await userHasRoleOrSuperadmin("venue_admin");
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { bookingId } = params;
    const serviceSupabase = createServiceRoleClient();

    // Get party guests for this booking
    const { data: guests, error } = await serviceSupabase
      .from("table_party_guests")
      .select("id, guest_name, guest_email, guest_phone, status, is_host, checked_in, checked_in_at, joined_at")
      .eq("booking_id", bookingId)
      .order("is_host", { ascending: false })
      .order("joined_at", { ascending: true });

    if (error) {
      console.error("Error fetching party guests:", error);
      return NextResponse.json({ error: "Failed to fetch guests" }, { status: 500 });
    }

    return NextResponse.json({
      guests: guests || [],
    });
  } catch (error: any) {
    console.error("Error in party guests GET:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch guests" },
      { status: 500 }
    );
  }
}
