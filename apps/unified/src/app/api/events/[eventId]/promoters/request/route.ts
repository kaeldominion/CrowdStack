import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { getUserPromoterId } from "@/lib/data/get-user-entity";

export async function POST(
  request: Request,
  { params }: { params: { eventId: string } }
) {
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

    // Check if event is public
    const { data: event } = await serviceSupabase
      .from("events")
      .select("promoter_access_type")
      .eq("id", params.eventId)
      .single();

    if (!event || event.promoter_access_type !== "public") {
      return NextResponse.json(
        { error: "Event is not available for promotion" },
        { status: 400 }
      );
    }

    // Check if already assigned
    const { data: existing } = await serviceSupabase
      .from("event_promoters")
      .select("id")
      .eq("event_id", params.eventId)
      .eq("promoter_id", promoterId)
      .single();

    if (existing) {
      return NextResponse.json({ success: true, message: "Already assigned" });
    }

    // Add promoter to event (with default commission - would need to be configured)
    const { error } = await serviceSupabase.from("event_promoters").insert({
      event_id: params.eventId,
      promoter_id: promoterId,
      commission_type: "flat_per_head",
      commission_config: { amount_per_head: 0 }, // Default, should be configured
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to request promotion" },
      { status: 500 }
    );
  }
}

