import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { getUserVenueIds } from "@/lib/data/get-user-entity";
import { cookies } from "next/headers";

const SELECTED_VENUE_COOKIE = "selected_venue_id";

/**
 * POST /api/venue/select
 * Set the selected venue for the current user
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { venueId } = body;

    if (!venueId) {
      return NextResponse.json({ error: "venueId is required" }, { status: 400 });
    }

    // Verify user has access to this venue
    const venueIds = await getUserVenueIds();
    if (!venueIds.includes(venueId)) {
      return NextResponse.json(
        { error: "You don't have access to this venue" },
        { status: 403 }
      );
    }

    // Set cookie (expires in 1 year)
    const cookieStore = await cookies();
    cookieStore.set(SELECTED_VENUE_COOKIE, venueId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    });

    return NextResponse.json({ success: true, venueId });
  } catch (error: any) {
    console.error("Error setting selected venue:", error);
    return NextResponse.json(
      { error: error.message || "Failed to set selected venue" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/venue/select
 * Get the currently selected venue
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const selectedVenueId = cookieStore.get(SELECTED_VENUE_COOKIE)?.value;

    if (!selectedVenueId) {
      return NextResponse.json({ venueId: null });
    }

    // Verify user still has access
    const venueIds = await getUserVenueIds();
    if (!venueIds.includes(selectedVenueId)) {
      // Clear invalid cookie
      cookieStore.delete(SELECTED_VENUE_COOKIE);
      return NextResponse.json({ venueId: null });
    }

    return NextResponse.json({ venueId: selectedVenueId });
  } catch (error: any) {
    console.error("Error getting selected venue:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get selected venue" },
      { status: 500 }
    );
  }
}

