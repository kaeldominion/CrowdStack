import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId, userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { getUserVenueId } from "@/lib/data/get-user-entity";

export const dynamic = "force-dynamic";

export interface VenueTable {
  id: string;
  venue_id: string;
  zone_id: string;
  name: string;
  capacity: number;
  notes: string | null;
  minimum_spend: number | null;
  deposit_amount: number | null;
  is_active: boolean;
  display_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  zone?: {
    id: string;
    name: string;
  };
}

/**
 * GET /api/venue/tables
 * List all tables for the current venue
 * Optional query param: ?zone_id=xxx to filter by zone
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const zoneId = searchParams.get("zone_id");

    const serviceSupabase = createServiceRoleClient();

    let query = serviceSupabase
      .from("venue_tables")
      .select(`
        *,
        zone:table_zones(id, name)
      `)
      .eq("venue_id", venueId)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    if (zoneId) {
      query = query.eq("zone_id", zoneId);
    }

    const { data: tables, error } = await query;

    if (error) {
      console.error("[Tables API] Error fetching tables:", error);
      throw error;
    }

    return NextResponse.json({ tables: tables || [] });
  } catch (error: any) {
    console.error("[Tables API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch tables" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/venue/tables
 * Create a new table
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
    const { zone_id, name, capacity, notes, minimum_spend, deposit_amount } = body;

    // Validate required fields
    if (!zone_id) {
      return NextResponse.json(
        { error: "Zone is required" },
        { status: 400 }
      );
    }

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Table name is required" },
        { status: 400 }
      );
    }

    if (!capacity || typeof capacity !== "number" || capacity < 1) {
      return NextResponse.json(
        { error: "Valid capacity is required" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Verify the zone belongs to this venue
    const { data: zone, error: zoneError } = await serviceSupabase
      .from("table_zones")
      .select("id, venue_id")
      .eq("id", zone_id)
      .single();

    if (zoneError || !zone) {
      return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }

    if (zone.venue_id !== venueId) {
      return NextResponse.json({ error: "Zone does not belong to this venue" }, { status: 403 });
    }

    // Get the max display_order for this zone
    const { data: maxOrderResult } = await serviceSupabase
      .from("venue_tables")
      .select("display_order")
      .eq("zone_id", zone_id)
      .order("display_order", { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (maxOrderResult?.display_order ?? -1) + 1;

    const { data: table, error } = await serviceSupabase
      .from("venue_tables")
      .insert({
        venue_id: venueId,
        zone_id,
        name: name.trim(),
        capacity,
        notes: notes?.trim() || null,
        minimum_spend: minimum_spend || null,
        deposit_amount: deposit_amount || null,
        is_active: true,
        display_order: nextOrder,
        created_by: userId,
      })
      .select(`
        *,
        zone:table_zones(id, name)
      `)
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A table with this name already exists" },
          { status: 409 }
        );
      }
      console.error("[Tables API] Error creating table:", error);
      throw error;
    }

    return NextResponse.json({ table }, { status: 201 });
  } catch (error: any) {
    console.error("[Tables API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create table" },
      { status: 500 }
    );
  }
}
