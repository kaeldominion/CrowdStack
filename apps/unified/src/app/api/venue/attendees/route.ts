import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { getUserVenueId } from "@/lib/data/get-user-entity";
import { getVenueAttendees } from "@/lib/data/attendees-venue";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const venueId = await getUserVenueId();
    if (!venueId) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const event_id = searchParams.get("event_id") || undefined;
    const has_check_in = searchParams.get("has_check_in")
      ? searchParams.get("has_check_in") === "true"
      : undefined;
    const is_flagged = searchParams.get("is_flagged")
      ? searchParams.get("is_flagged") === "true"
      : undefined;
    const min_strikes = searchParams.get("min_strikes")
      ? parseInt(searchParams.get("min_strikes")!)
      : undefined;

    const attendees = await getVenueAttendees(venueId, {
      search,
      event_id,
      has_check_in,
      is_flagged,
      min_strikes,
    });

    return NextResponse.json({ attendees, venueId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch attendees" }, { status: 500 });
  }
}

