import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { cookies } from "next/headers";

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient();

    // Check for localhost development mode
    const localhostUser = cookieStore.get("localhost_user_id")?.value;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const userId = user?.id || localhostUser;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();

    // Get the promoter for this user
    const { data: promoter } = await serviceClient
      .from("promoters")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!promoter) {
      return NextResponse.json(
        { error: "Promoter profile not found" },
        { status: 403 }
      );
    }

    // Check if promoter is assigned to this event
    const { data: assignment } = await serviceClient
      .from("event_promoters")
      .select("id")
      .eq("event_id", params.eventId)
      .eq("promoter_id", promoter.id)
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
        capacity,
        status,
        venue:venues (
          id,
          name,
          address
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

