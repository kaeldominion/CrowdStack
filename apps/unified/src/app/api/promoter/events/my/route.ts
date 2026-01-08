import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { getUserPromoterId } from "@/lib/data/get-user-entity";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
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

    // Get events this promoter is assigned to
    const { data: eventPromoters } = await serviceSupabase
      .from("event_promoters")
      .select("event_id")
      .eq("promoter_id", promoterId);

    const eventIds = eventPromoters?.map((ep) => ep.event_id) || [];

    if (eventIds.length === 0) {
      return NextResponse.json({ events: [] });
    }

    const { data: events } = await serviceSupabase
      .from("events")
      .select(`
        *,
        venue:venues(name)
      `)
      .in("id", eventIds)
      .order("start_time", { ascending: false });

    return NextResponse.json({ events: events || [] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch my events" },
      { status: 500 }
    );
  }
}

