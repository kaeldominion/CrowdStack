import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId, userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { getUserVenueId } from "@/lib/data/get-user-entity";

export const dynamic = "force-dynamic";

export interface EventTableAvailability {
  id: string;
  table_id: string;
  event_id: string;
  is_available: boolean;
  override_minimum_spend: number | null;
  override_deposit: number | null;
  notes: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TableWithAvailability {
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
  zone: {
    id: string;
    name: string;
    display_order: number;
  };
  // Event-specific availability (null if no override record exists)
  availability: {
    is_available: boolean;
    override_minimum_spend: number | null;
    override_deposit: number | null;
    notes: string | null;
  } | null;
  // Computed effective values for this event
  effective_minimum_spend: number | null;
  effective_deposit: number | null;
}

/**
 * GET /api/venue/events/[eventId]/tables
 * Get all tables with their availability status for a specific event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
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

    const { eventId } = params;
    const serviceSupabase = createServiceRoleClient();

    // Verify the event belongs to this venue and get event currency
    const { data: event, error: eventError } = await serviceSupabase
      .from("events")
      .select("id, venue_id, currency")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.venue_id !== venueId) {
      return NextResponse.json({ error: "Event does not belong to this venue" }, { status: 403 });
    }

    // Get venue's base currency
    const { data: venue, error: venueError } = await serviceSupabase
      .from("venues")
      .select("currency")
      .eq("id", venueId)
      .single();

    // Determine effective currency: event override > venue default > USD
    const effectiveCurrency = event.currency || venue?.currency || "USD";

    // Fetch all active tables for this venue with their zones
    const { data: tables, error: tablesError } = await serviceSupabase
      .from("venue_tables")
      .select(`
        *,
        zone:table_zones(id, name, display_order)
      `)
      .eq("venue_id", venueId)
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (tablesError) {
      console.error("[Event Tables API] Error fetching tables:", tablesError);
      throw tablesError;
    }

    // Fetch availability overrides for this event
    const { data: availabilities, error: availError } = await serviceSupabase
      .from("event_table_availability")
      .select("*")
      .eq("event_id", eventId);

    if (availError) {
      console.error("[Event Tables API] Error fetching availability:", availError);
      throw availError;
    }

    // Create a lookup map for availability by table_id
    const availabilityMap = new Map<string, EventTableAvailability>();
    (availabilities || []).forEach((a: EventTableAvailability) => {
      availabilityMap.set(a.table_id, a);
    });

    // Merge tables with their availability status
    const tablesWithAvailability: TableWithAvailability[] = (tables || []).map((table: any) => {
      const availability = availabilityMap.get(table.id);

      // Compute effective values - use override if set, otherwise use table default
      const effectiveMinimumSpend = availability?.override_minimum_spend ?? table.minimum_spend;
      const effectiveDeposit = availability?.override_deposit ?? table.deposit_amount;

      return {
        ...table,
        availability: availability ? {
          is_available: availability.is_available,
          override_minimum_spend: availability.override_minimum_spend,
          override_deposit: availability.override_deposit,
          notes: availability.notes,
        } : null,
        effective_minimum_spend: effectiveMinimumSpend,
        effective_deposit: effectiveDeposit,
      };
    });

    // Group tables by zone for easier frontend rendering
    const zones = new Map<string, { zone: any; tables: TableWithAvailability[] }>();
    tablesWithAvailability.forEach((table) => {
      const zoneId = table.zone?.id;
      if (!zoneId) return;

      if (!zones.has(zoneId)) {
        zones.set(zoneId, {
          zone: table.zone,
          tables: [],
        });
      }
      zones.get(zoneId)!.tables.push(table);
    });

    // Sort zones by display_order and convert to array
    const groupedByZone = Array.from(zones.values()).sort(
      (a, b) => (a.zone.display_order || 0) - (b.zone.display_order || 0)
    );

    return NextResponse.json({
      tables: tablesWithAvailability,
      groupedByZone,
      currency: effectiveCurrency,
    });
  } catch (error: any) {
    console.error("[Event Tables API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch event tables" },
      { status: 500 }
    );
  }
}

interface TableAvailabilityUpdate {
  table_id: string;
  is_available: boolean;
  override_minimum_spend?: number | null;
  override_deposit?: number | null;
  notes?: string | null;
}

/**
 * PUT /api/venue/events/[eventId]/tables
 * Bulk update table availability for an event
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
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

    const { eventId } = params;
    const body = await request.json();
    const { updates } = body as { updates: TableAvailabilityUpdate[] };

    if (!Array.isArray(updates)) {
      return NextResponse.json(
        { error: "Invalid request body - 'updates' must be an array" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Verify the event belongs to this venue
    const { data: event, error: eventError } = await serviceSupabase
      .from("events")
      .select("id, venue_id")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.venue_id !== venueId) {
      return NextResponse.json({ error: "Event does not belong to this venue" }, { status: 403 });
    }

    // Verify all tables belong to this venue
    const tableIds = updates.map((u) => u.table_id);
    const { data: tables, error: tablesError } = await serviceSupabase
      .from("venue_tables")
      .select("id, venue_id")
      .in("id", tableIds);

    if (tablesError) {
      console.error("[Event Tables API] Error verifying tables:", tablesError);
      throw tablesError;
    }

    const validTableIds = new Set((tables || []).filter((t: any) => t.venue_id === venueId).map((t: any) => t.id));
    const invalidTables = tableIds.filter((id) => !validTableIds.has(id));

    if (invalidTables.length > 0) {
      return NextResponse.json(
        { error: `Invalid table IDs: ${invalidTables.join(", ")}` },
        { status: 400 }
      );
    }

    // Upsert availability records
    const upsertData = updates.map((update) => ({
      event_id: eventId,
      table_id: update.table_id,
      is_available: update.is_available,
      override_minimum_spend: update.override_minimum_spend ?? null,
      override_deposit: update.override_deposit ?? null,
      notes: update.notes?.trim() || null,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await serviceSupabase
      .from("event_table_availability")
      .upsert(upsertData, {
        onConflict: "event_id,table_id",
      });

    if (upsertError) {
      console.error("[Event Tables API] Error upserting availability:", upsertError);
      throw upsertError;
    }

    return NextResponse.json({ success: true, updated: updates.length });
  } catch (error: any) {
    console.error("[Event Tables API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update table availability" },
      { status: 500 }
    );
  }
}
