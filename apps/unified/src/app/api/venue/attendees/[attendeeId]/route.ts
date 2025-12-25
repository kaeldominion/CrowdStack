import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getVenueAttendeeDetails } from "@/lib/data/attendees-venue";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ attendeeId: string }> }
) {
  try {
    const { attendeeId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get venue ID for this user
    const { data: venue } = await serviceSupabase
      .from("venues")
      .select("id")
      .eq("created_by", user.id)
      .single();

    if (!venue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    // Get attendee details
    const details = await getVenueAttendeeDetails(attendeeId, venue.id);

    if (!details) {
      return NextResponse.json({ error: "Attendee not found" }, { status: 404 });
    }

    return NextResponse.json(details);
  } catch (error: any) {
    console.error("Error fetching attendee details:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch attendee details" },
      { status: 500 }
    );
  }
}







