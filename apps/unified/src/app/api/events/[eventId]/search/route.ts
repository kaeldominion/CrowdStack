import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { cookies } from "next/headers";

/**
 * GET /api/events/[eventId]/search
 * Search for attendees registered to this event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient();
    const serviceSupabase = createServiceRoleClient();

    // Get user - support localhost dev mode
    const localhostUser = cookieStore.get("localhost_user_id")?.value;
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || localhostUser;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();
    const showAll = searchParams.get("all") === "true";

    // If no query and not showing all, return empty
    if (!query && !showAll) {
      return NextResponse.json({ results: [] });
    }

    console.log(`[Search API] Searching for "${query}" in event ${params.eventId}`);

    // Search registrations with attendee info
    const { data: registrations, error } = await serviceSupabase
      .from("registrations")
      .select(`
        id,
        attendee:attendees(id, name, email, phone)
      `)
      .eq("event_id", params.eventId)
      .limit(showAll ? 100 : 20);

    if (error) {
      console.error("[Search API] Error:", error);
      return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }

    // Filter by query (name, email, phone) if query provided
    let filtered = registrations || [];
    if (query) {
    const searchLower = query.toLowerCase();
      filtered = filtered.filter((reg) => {
        const attendee = Array.isArray(reg.attendee) ? reg.attendee[0] : reg.attendee;
      if (!attendee) return false;
      
      return (
        attendee.name?.toLowerCase().includes(searchLower) ||
        attendee.email?.toLowerCase().includes(searchLower) ||
        attendee.phone?.includes(query)
      );
    });
    }

    // Get check-in status for each
    const registrationIds = filtered.map((r) => r.id);
    const { data: checkins } = await serviceSupabase
      .from("checkins")
      .select("registration_id")
      .in("registration_id", registrationIds);

    const checkedInIds = new Set(checkins?.map((c) => c.registration_id) || []);

    const results = filtered.map((reg) => {
      const attendee = Array.isArray(reg.attendee) ? reg.attendee[0] : reg.attendee;
      return {
      registration_id: reg.id,
        attendee_name: attendee?.name || "Unknown",
        attendee_email: attendee?.email || null,
        attendee_phone: attendee?.phone || null,
      checked_in: checkedInIds.has(reg.id),
      };
    });

    console.log(`[Search API] Found ${results.length} results`);

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("[Search API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Search failed" },
      { status: 500 }
    );
  }
}

