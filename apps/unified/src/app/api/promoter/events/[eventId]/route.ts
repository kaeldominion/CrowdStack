import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserPromoterId } from "@/lib/data/get-user-entity";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const promoterId = await getUserPromoterId();

    if (!promoterId) {
      return NextResponse.json(
        { error: "Promoter profile not found" },
        { status: 403 }
      );
    }

    const serviceClient = createServiceRoleClient();

    // Check if promoter is assigned to this event
    const { data: assignment } = await serviceClient
      .from("event_promoters")
      .select("id")
      .eq("event_id", params.eventId)
      .eq("promoter_id", promoterId)
      .single();

    if (!assignment) {
      return NextResponse.json(
        { error: "Not assigned to this event" },
        { status: 403 }
      );
    }

    // Fetch event details
    const { data: event, error } = await serviceClient
      .from("events")
      .select(`
        id,
        name,
        slug,
        description,
        start_time,
        end_time,
        max_guestlist_size,
        status,
        flier_url,
        flier_video_url,
        timezone,
        organizer_id,
        venue_id,
        venue:venues (
          id,
          name,
          slug,
          address,
          city
        ),
        organizer:organizers (
          id,
          name
        )
      `)
      .eq("id", params.eventId)
      .single();

    if (error || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error("Error fetching promoter event:", error);
    return NextResponse.json(
      { error: "Failed to fetch event" },
      { status: 500 }
    );
  }
}

