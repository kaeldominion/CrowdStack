import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId } from "@/lib/auth/check-role";
import { getUserPromoterId } from "@/lib/data/get-user-entity";

// GET - Browse all upcoming events for promoters to request
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const promoterId = await getUserPromoterId();
    if (!promoterId) {
      return NextResponse.json({ error: "Not a promoter" }, { status: 403 });
    }

    const supabase = createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    // Get all upcoming published events
    let query = supabase
      .from("events")
      .select(`
        id,
        name,
        slug,
        flier_url,
        cover_image_url,
        start_time,
        end_time,
        status,
        venue:venues(id, name, city),
        organizer:organizers(id, name)
      `)
      .eq("status", "published")
      .gte("start_time", new Date().toISOString())
      .order("start_time", { ascending: true });

    if (search) {
      query = query.or(`name.ilike.%${search}%,venues.name.ilike.%${search}%`);
    }

    const { data: events, error: eventsError } = await query;

    if (eventsError) {
      console.error("[Browse Events] Error fetching:", eventsError);
      return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
    }

    // Get promoter's existing assignments
    const { data: assignments } = await supabase
      .from("event_promoters")
      .select("event_id")
      .eq("promoter_id", promoterId);

    const assignedEventIds = new Set(assignments?.map(a => a.event_id) || []);

    // Get promoter's pending requests
    const { data: requests } = await supabase
      .from("promoter_requests")
      .select("event_id, status")
      .eq("promoter_id", promoterId)
      .in("status", ["pending", "declined"]);

    const requestsByEvent = new Map(
      requests?.map(r => [r.event_id, r.status]) || []
    );

    // Mark events with their status for this promoter
    const eventsWithStatus = events?.map(event => ({
      ...event,
      promoter_status: assignedEventIds.has(event.id)
        ? "assigned"
        : requestsByEvent.get(event.id) || "available",
    })) || [];

    return NextResponse.json({ events: eventsWithStatus });
  } catch (error: any) {
    console.error("[Browse Events] Error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}


