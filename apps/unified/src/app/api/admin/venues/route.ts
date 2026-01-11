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

    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);
    const offset = (safePage - 1) * safeLimit;

    const cookieStore = await cookies();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let userId = user?.id;

    if (!userId) {
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

    // Build query with optional search
    let query = serviceSupabase
      .from("venues")
      .select("*", { count: "exact" });

    if (search) {
      query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: venues, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + safeLimit - 1);

    if (error) throw error;

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / safeLimit);
    const hasMore = safePage < totalPages;

    // Batch fetch event counts
    const venueIds = (venues || []).map((v: any) => v.id);
    const eventCountMap = new Map<string, number>();

    if (venueIds.length > 0) {
      const { data: eventCounts } = await serviceSupabase
        .from("events")
        .select("venue_id")
        .in("venue_id", venueIds);

      (eventCounts || []).forEach((e: any) => {
        eventCountMap.set(e.venue_id, (eventCountMap.get(e.venue_id) || 0) + 1);
      });
    }

    const venuesWithCounts = (venues || []).map((venue: any) => ({
      ...venue,
      events_count: eventCountMap.get(venue.id) || 0,
    }));

    return NextResponse.json({
      venues: venuesWithCounts,
      pagination: { page: safePage, limit: safeLimit, total: totalCount, totalPages, hasMore }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch venues" },
      { status: 500 }
    );
  }
}

