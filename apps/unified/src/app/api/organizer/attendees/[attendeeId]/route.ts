import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { getOrganizerAttendeeDetails } from "@/lib/data/attendees-organizer";
import { getUserOrganizerId } from "@/lib/data/get-user-entity";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
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

    // Get organizer ID for this user (checks organizer_users junction table and created_by)
    const organizerId = await getUserOrganizerId();

    if (!organizerId) {
      return NextResponse.json({ error: "Organizer not found" }, { status: 404 });
    }

    // Get attendee details
    const details = await getOrganizerAttendeeDetails(attendeeId, organizerId);

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







