import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { getUserVenueId } from "@/lib/data/get-user-entity";
import { flagAttendee } from "@/lib/data/flags";

export async function POST(
  request: NextRequest,
  { params }: { params: { attendeeId: string } }
) {
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

    const body = await request.json();
    const { reason, strike_count, permanent_ban, expires_at } = body;

    const flag = await flagAttendee({
      attendee_id: params.attendeeId,
      venue_id: venueId,
      reason,
      strike_count,
      permanent_ban,
      expires_at,
    });

    return NextResponse.json({ flag });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to flag attendee" },
      { status: 500 }
    );
  }
}

