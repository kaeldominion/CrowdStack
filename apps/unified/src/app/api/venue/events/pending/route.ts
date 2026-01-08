import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserVenueId } from "@/lib/data/get-user-entity";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get venue ID for current user
    const venueId = await getUserVenueId();

    if (!venueId) {
      return NextResponse.json({ error: "No venue found" }, { status: 404 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get pending events for this venue
    const { data: events, error } = await serviceSupabase
      .from("events")
      .select(`
        id,
        name,
        slug,
        description,
        start_time,
        end_time,
        status,
        venue_approval_status,
        created_at,
        organizer:organizers(id, name, email)
      `)
      .eq("venue_id", venueId)
      .eq("venue_approval_status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ events: events || [] });
  } catch (error: any) {
    console.error("Error fetching pending events:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch pending events" },
      { status: 500 }
    );
  }
}

