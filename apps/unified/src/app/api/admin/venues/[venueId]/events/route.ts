import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(
  request: NextRequest,
  { params }: { params: { venueId: string } }
) {
  try {
    const supabase = createServiceRoleClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is superadmin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isSuperadmin = roles?.some((r: { role: string }) => r.role === "superadmin");
    if (!isSuperadmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { venueId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20");

    // Get events for this venue
    const { data: events, error } = await supabase
      .from("events")
      .select(
        `
        id,
        name,
        slug,
        start_time,
        end_time,
        status,
        capacity
      `
      )
      .eq("venue_id", venueId)
      .order("start_time", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching venue events:", error);
      throw error;
    }

    // Get registration counts for events
    const eventsWithCounts = await Promise.all(
      (events || []).map(async (event: any) => {
        const { count: registrations } = await supabase
          .from("registrations")
          .select("*", { count: "exact", head: true })
          .eq("event_id", event.id);

        return {
          ...event,
          registrations: registrations || 0,
        };
      })
    );

    return NextResponse.json({ events: eventsWithCounts });
  } catch (error) {
    console.error("Error fetching venue events:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

