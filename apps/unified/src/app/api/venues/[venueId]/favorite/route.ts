import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * POST /api/venues/[venueId]/favorite
 * Favorite a venue
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { venueId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Verify venue exists
    const { data: venue, error: venueError } = await serviceSupabase
      .from("venues")
      .select("id")
      .eq("id", params.venueId)
      .single();

    if (venueError || !venue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    // Check if already favorited
    const { data: existing } = await serviceSupabase
      .from("venue_favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("venue_id", params.venueId)
      .single();

    if (existing) {
      return NextResponse.json({ favorited: true, message: "Already favorited" });
    }

    // Add favorite
    const { error: insertError } = await serviceSupabase
      .from("venue_favorites")
      .insert({
        user_id: user.id,
        venue_id: params.venueId,
      });

    if (insertError) {
      console.error("Error favoriting venue:", insertError);
      return NextResponse.json(
        { error: "Failed to favorite venue" },
        { status: 500 }
      );
    }

    return NextResponse.json({ favorited: true });
  } catch (error: any) {
    console.error("Error favoriting venue:", error);
    return NextResponse.json(
      { error: error.message || "Failed to favorite venue" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/venues/[venueId]/favorite
 * Unfavorite a venue
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { venueId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Remove favorite
    const { error: deleteError } = await serviceSupabase
      .from("venue_favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("venue_id", params.venueId);

    if (deleteError) {
      console.error("Error unfavoriting venue:", deleteError);
      return NextResponse.json(
        { error: "Failed to unfavorite venue" },
        { status: 500 }
      );
    }

    return NextResponse.json({ favorited: false });
  } catch (error: any) {
    console.error("Error unfavoriting venue:", error);
    return NextResponse.json(
      { error: error.message || "Failed to unfavorite venue" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/venues/[venueId]/favorite
 * Check if venue is favorited
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { venueId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ favorited: false });
    }

    const serviceSupabase = createServiceRoleClient();

    const { data: favorite } = await serviceSupabase
      .from("venue_favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("venue_id", params.venueId)
      .single();

    return NextResponse.json({ favorited: !!favorite });
  } catch (error: any) {
    console.error("Error checking favorite status:", error);
    return NextResponse.json({ favorited: false });
  }
}

