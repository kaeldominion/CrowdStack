import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { cookies } from "next/headers";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);
    const offset = (safePage - 1) * safeLimit;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let userId = user?.id;

    if (!userId) {
      const cookieStore = await cookies();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase/)?.[1] || "supabase";
      const authCookieName = `sb-${projectRef}-auth-token`;
      const authCookie = cookieStore.get(authCookieName);

      if (authCookie) {
        try {
          const cookieValue = decodeURIComponent(authCookie.value);
          const parsed = JSON.parse(cookieValue);
          if (parsed.user?.id) {
            userId = parsed.user.id;
          }
        } catch (e) {
          // Cookie parse error
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roles = userRoles?.map((r) => r.role) || [];
    if (!roles.includes("superadmin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build query with optional search and status filter
    let query = serviceSupabase
      .from("events")
      .select(`*, venue:venues(name), organizer:organizers(name)`, { count: "exact" });

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data: events, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + safeLimit - 1);

    if (error) throw error;

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / safeLimit);
    const hasMore = safePage < totalPages;

    // Batch fetch counts
    const eventIds = (events || []).map((e: any) => e.id);
    const regCountMap = new Map<string, number>();
    const checkinCountMap = new Map<string, number>();

    if (eventIds.length > 0) {
      // Get all registrations for these events
      const { data: registrations } = await serviceSupabase
        .from("registrations")
        .select("id, event_id")
        .in("event_id", eventIds);

      (registrations || []).forEach((r: any) => {
        regCountMap.set(r.event_id, (regCountMap.get(r.event_id) || 0) + 1);
      });

      // Get all checkins for these registrations
      const regIds = (registrations || []).map((r: any) => r.id);
      if (regIds.length > 0) {
        const { data: checkins } = await serviceSupabase
          .from("checkins")
          .select("registration_id")
          .in("registration_id", regIds)
          .is("undo_at", null);

        // Map registration_id back to event_id
        const regToEvent = new Map<string, string>();
        (registrations || []).forEach((r: any) => {
          regToEvent.set(r.id, r.event_id);
        });

        (checkins || []).forEach((c: any) => {
          const eventId = regToEvent.get(c.registration_id);
          if (eventId) {
            checkinCountMap.set(eventId, (checkinCountMap.get(eventId) || 0) + 1);
          }
        });
      }
    }

    const eventsWithCounts = (events || []).map((event: any) => ({
      ...event,
      venue: event.venue,
      organizer: event.organizer,
      registrations_count: regCountMap.get(event.id) || 0,
      checkins_count: checkinCountMap.get(event.id) || 0,
    }));

    return NextResponse.json({
      events: eventsWithCounts,
      pagination: { page: safePage, limit: safeLimit, total: totalCount, totalPages, hasMore }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch events" },
      { status: 500 }
    );
  }
}

