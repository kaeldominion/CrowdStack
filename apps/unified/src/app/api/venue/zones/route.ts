import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId, userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { getUserVenueId } from "@/lib/data/get-user-entity";

export const dynamic = "force-dynamic";

export interface TableZone {
  id: string;
  venue_id: string;
  name: string;
  description: string | null;
  display_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/venue/zones
 * List all table zones for the current venue
 */
export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await userHasRoleOrSuperadmin("venue_admin");
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const venueId = await getUserVenueId();
    if (!venueId) {
      return NextResponse.json({ error: "No venue found" }, { status: 404 });
    }

    const serviceSupabase = createServiceRoleClient();

    const { data: zones, error } = await serviceSupabase
      .from("table_zones")
      .select("*")
      .eq("venue_id", venueId)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("[Zones API] Error fetching zones:", error);
      throw error;
    }

    return NextResponse.json({ zones: zones || [] });
  } catch (error: any) {
    console.error("[Zones API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch zones" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/venue/zones
 * Create a new table zone
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await userHasRoleOrSuperadmin("venue_admin");
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const venueId = await getUserVenueId();
    if (!venueId) {
      return NextResponse.json({ error: "No venue found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Zone name is required" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Get the max display_order for this venue
    const { data: maxOrderResult } = await serviceSupabase
      .from("table_zones")
      .select("display_order")
      .eq("venue_id", venueId)
      .order("display_order", { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (maxOrderResult?.display_order ?? -1) + 1;

    const { data: zone, error } = await serviceSupabase
      .from("table_zones")
      .insert({
        venue_id: venueId,
        name: name.trim(),
        description: description?.trim() || null,
        display_order: nextOrder,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A zone with this name already exists" },
          { status: 409 }
        );
      }
      console.error("[Zones API] Error creating zone:", error);
      throw error;
    }

    return NextResponse.json({ zone }, { status: 201 });
  } catch (error: any) {
    console.error("[Zones API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create zone" },
      { status: 500 }
    );
  }
}
