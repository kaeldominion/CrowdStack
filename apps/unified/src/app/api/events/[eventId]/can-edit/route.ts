import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";

type ManageRole = "admin" | "organizer" | "venue" | null;

export async function GET(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ canEdit: false, role: null });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get the event
    const { data: event } = await serviceSupabase
      .from("events")
      .select("organizer_id, venue_id")
      .eq("id", eventId)
      .single();

    if (!event) {
      return NextResponse.json({ canEdit: false, role: null });
    }

    // Check if user is superadmin
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    
    const isSuperadmin = userRoles?.some((r) => r.role === "superadmin");
    if (isSuperadmin) {
      return NextResponse.json({ canEdit: true, role: "admin" as ManageRole });
    }

    // Check if user is the organizer creator
    const { data: organizerCreator } = await serviceSupabase
      .from("organizers")
      .select("id")
      .eq("id", event.organizer_id)
      .eq("created_by", user.id)
      .single();

    if (organizerCreator) {
      return NextResponse.json({ canEdit: true, role: "organizer" as ManageRole });
    }

    // Check if user is an organizer team member
    const { data: organizerUser } = await serviceSupabase
      .from("organizer_users")
      .select("id")
      .eq("organizer_id", event.organizer_id)
      .eq("user_id", user.id)
      .single();

    if (organizerUser) {
      return NextResponse.json({ canEdit: true, role: "organizer" as ManageRole });
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
        return NextResponse.json({ canEdit: true, role: "venue" as ManageRole });
      }

      const { data: venueCreator } = await serviceSupabase
        .from("venues")
        .select("id")
        .eq("id", event.venue_id)
        .eq("created_by", user.id)
        .single();

      if (venueCreator) {
        return NextResponse.json({ canEdit: true, role: "venue" as ManageRole });
      }
    }

    return NextResponse.json({ canEdit: false, role: null });
  } catch (error) {
    console.error("Error checking edit permission:", error);
    return NextResponse.json({ canEdit: false, role: null });
  }
}

