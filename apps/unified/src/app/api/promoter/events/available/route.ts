import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { getUserPromoterId } from "@/lib/data/get-user-entity";

export async function GET() {
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
      return NextResponse.json({ error: "Promoter not found" }, { status: 404 });
    }

    const { createServiceRoleClient } = await import("@crowdstack/shared/supabase/server");
    const serviceSupabase = createServiceRoleClient();

    // Get events that are public and not yet assigned to this promoter
    const { data: allPublicEvents } = await serviceSupabase
      .from("events")
      .select(`
        *,
        venue:venues(name)
      `)
      .eq("promoter_access_type", "public")
      .eq("status", "published")
      .gte("start_time", new Date().toISOString());

    // Get events this promoter is already assigned to
    const { data: assignedEvents } = await serviceSupabase
      .from("event_promoters")
      .select("event_id")
      .eq("promoter_id", promoterId);

    const assignedEventIds = new Set(assignedEvents?.map((e) => e.event_id) || []);

    // Filter out assigned events
    const availableEvents = allPublicEvents?.filter((e) => !assignedEventIds.has(e.id)) || [];

    return NextResponse.json({ events: availableEvents });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch available events" },
      { status: 500 }
    );
  }
}

