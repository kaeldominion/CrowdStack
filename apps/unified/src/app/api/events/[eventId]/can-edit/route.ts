import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ canEdit: false });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get the event
    const { data: event } = await serviceSupabase
      .from("events")
      .select("organizer_id, venue_id")
      .eq("id", eventId)
      .single();

    if (!event) {
      return NextResponse.json({ canEdit: false });
    }

    // Check if user is superadmin
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    
    const isSuperadmin = userRoles?.some((r) => r.role === "superadmin");
    if (isSuperadmin) {
      return NextResponse.json({ canEdit: true });
    }

    // Check if user is the organizer creator
    const { data: organizerCreator } = await serviceSupabase
      .from("organizers")
      .select("id")
      .eq("id", event.organizer_id)
      .eq("created_by", user.id)
      .single();

    if (organizerCreator) {
      return NextResponse.json({ canEdit: true });
    }

    // Check if user is an organizer team member
    const { data: organizerUser } = await serviceSupabase
      .from("organizer_users")
      .select("id")
      .eq("organizer_id", event.organizer_id)
      .eq("user_id", user.id)
      .single();

    if (organizerUser) {
      return NextResponse.json({ canEdit: true });
    }

    // Check if user is venue admin (can also edit)
    if (event.venue_id) {
      const { data: venueUser } = await serviceSupabase
        .from("venue_users")
        .select("id")
        .eq("venue_id", event.venue_id)
        .eq("user_id", user.id)
        .single();

      if (venueUser) {
        return NextResponse.json({ canEdit: true });
      }

      const { data: venueCreator } = await serviceSupabase
        .from("venues")
        .select("id")
        .eq("id", event.venue_id)
        .eq("created_by", user.id)
        .single();

      if (venueCreator) {
        return NextResponse.json({ canEdit: true });
      }
    }

    return NextResponse.json({ canEdit: false });
  } catch (error) {
    console.error("Error checking edit permission:", error);
    return NextResponse.json({ canEdit: false });
  }
}

