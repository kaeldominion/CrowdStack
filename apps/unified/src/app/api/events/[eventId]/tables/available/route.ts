import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getCacheControl } from "@/lib/cache";

interface TableWithAvailability {
  id: string;
  name: string;
  capacity: number;
  notes: string | null;
  minimum_spend: number | null;
  deposit_amount: number | null;
  display_order: number;
  zone: {
    id: string;
    name: string;
    description: string | null;
    display_order: number;
  };
  // Effective values (using overrides if set)
  effective_minimum_spend: number | null;
  effective_deposit: number | null;
  effective_capacity: number;
  has_confirmed_booking: boolean;
}

interface ZoneWithTables {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  tables: TableWithAvailability[];
}

interface EventWithVenue {
  id: string;
  name: string;
  status: string;
  table_booking_mode: string | null;
  venue_id: string;
  currency: string | null;
  venue: {
    id: string;
    name: string;
    currency: string | null;
    table_commission_rate: number | null;
  } | null;
}

/**
 * GET /api/events/[eventId]/tables/available
 * Get available tables for booking grouped by zone
 *
 * Query params:
 * - ref: promoter referral code (optional)
 * - code: direct booking link code (optional)
 *
 * Returns tables based on event's table_booking_mode:
 * - 'disabled': returns empty (no tables shown)
 * - 'promoter_only': requires valid ref param
 * - 'direct': returns all available tables
 * - If 'code' param provided: bypasses mode restrictions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const supabase = createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const refCode = searchParams.get("ref");
    const linkCode = searchParams.get("code");

    // Get event with booking mode and venue info
    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select(`
        id,
        name,
        status,
        table_booking_mode,
        venue_id,
        currency,
        venue:venues(
          id,
          name,
          currency,
          table_commission_rate
        )
      `)
      .eq("id", params.eventId)
      .single();

    if (eventError || !eventData) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Type assertion to fix Supabase's nested relation type inference
    const event = eventData as unknown as EventWithVenue;

    // Only published events can show tables
    if (event.status !== "published") {
      return NextResponse.json(
        { error: "Event not available" },
        { status: 404 }
      );
    }

    // Check if access is via direct booking link
    let isDirectLink = false;
    let specificTableId: string | null = null;

    if (linkCode) {
      const { data: bookingLink } = await supabase
        .from("table_booking_links")
        .select("id, table_id, is_active, expires_at")
        .eq("code", linkCode)
        .eq("event_id", params.eventId)
        .single();

      if (bookingLink && bookingLink.is_active) {
        const isExpired = bookingLink.expires_at && new Date(bookingLink.expires_at) < new Date();
        if (!isExpired) {
          isDirectLink = true;
          specificTableId = bookingLink.table_id;
        }
      }
    }

    // Determine if we should show tables based on booking mode
    const bookingMode = event.table_booking_mode || "disabled";

    if (!isDirectLink) {
      if (bookingMode === "disabled") {
        return NextResponse.json({
          tables: [],
          zones: [],
          bookingEnabled: false,
          currency: event.currency || event.venue?.currency || "USD",
        });
      }

      if (bookingMode === "promoter_only" && !refCode) {
        return NextResponse.json({
          tables: [],
          zones: [],
          bookingEnabled: false,
          message: "Table booking requires a promoter referral link",
          currency: event.currency || event.venue?.currency || "USD",
        });
      }
    }

    // Get all zones for the venue
    const { data: zones, error: zonesError } = await supabase
      .from("table_zones")
      .select("id, name, description, display_order")
      .eq("venue_id", event.venue_id)
      .order("display_order", { ascending: true });

    if (zonesError) {
      console.error("Error fetching zones:", zonesError);
      return NextResponse.json(
        { error: "Failed to fetch table zones" },
        { status: 500 }
      );
    }

    if (!zones || zones.length === 0) {
      return NextResponse.json({
        tables: [],
        zones: [],
        bookingEnabled: true,
        currency: event.currency || event.venue?.currency || "USD",
      });
    }

    // Get all active tables for the venue
    let tablesQuery = supabase
      .from("venue_tables")
      .select(`
        id,
        zone_id,
        name,
        capacity,
        notes,
        minimum_spend,
        deposit_amount,
        display_order
      `)
      .eq("venue_id", event.venue_id)
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    // If direct link specifies a table, only fetch that one
    if (specificTableId) {
      tablesQuery = tablesQuery.eq("id", specificTableId);
    }

    const { data: tables, error: tablesError } = await tablesQuery;

    if (tablesError) {
      console.error("Error fetching tables:", tablesError);
      return NextResponse.json(
        { error: "Failed to fetch tables" },
        { status: 500 }
      );
    }

    if (!tables || tables.length === 0) {
      return NextResponse.json({
        tables: [],
        zones: [],
        bookingEnabled: true,
        currency: event.currency || event.venue?.currency || "USD",
      });
    }

    // Get event-specific availability overrides
    const { data: availability } = await supabase
      .from("event_table_availability")
      .select("table_id, is_available, override_minimum_spend, override_deposit, override_capacity, notes")
      .eq("event_id", params.eventId);

    const availabilityMap = new Map(
      (availability || []).map((a) => [a.table_id, a])
    );

    // Get confirmed bookings for this event to mark tables as reserved
    const { data: confirmedBookings } = await supabase
      .from("table_bookings")
      .select("table_id")
      .eq("event_id", params.eventId)
      .eq("status", "confirmed");

    const confirmedTableIds = new Set(
      (confirmedBookings || []).map((b) => b.table_id)
    );

    // Build zone map for quick lookup
    const zoneMap = new Map(zones.map((z) => [z.id, z]));

    // Process tables with availability info
    const processedTables: TableWithAvailability[] = tables
      .filter((table) => {
        const avail = availabilityMap.get(table.id);
        // If no availability record, default to available
        // If availability record exists, check is_available
        return !avail || avail.is_available !== false;
      })
      .map((table) => {
        const avail = availabilityMap.get(table.id);
        const zone = zoneMap.get(table.zone_id);

        // Compute effective values using overrides when available
        const effectiveCapacity = avail?.override_capacity ?? table.capacity;

        return {
          id: table.id,
          name: table.name,
          capacity: table.capacity,
          notes: table.notes,
          minimum_spend: table.minimum_spend,
          deposit_amount: table.deposit_amount,
          display_order: table.display_order,
          zone: zone
            ? {
                id: zone.id,
                name: zone.name,
                description: zone.description,
                display_order: zone.display_order,
              }
            : {
                id: table.zone_id,
                name: "Unknown",
                description: null,
                display_order: 0,
              },
          effective_minimum_spend:
            avail?.override_minimum_spend ?? table.minimum_spend,
          effective_deposit:
            avail?.override_deposit ?? table.deposit_amount,
          effective_capacity: effectiveCapacity,
          has_confirmed_booking: confirmedTableIds.has(table.id),
        };
      });

    // Group tables by zone
    const zoneGroups: ZoneWithTables[] = zones
      .map((zone) => ({
        id: zone.id,
        name: zone.name,
        description: zone.description,
        display_order: zone.display_order,
        tables: processedTables
          .filter((t) => t.zone.id === zone.id)
          .sort((a, b) => a.display_order - b.display_order),
      }))
      .filter((z) => z.tables.length > 0);

    return NextResponse.json(
      {
        zones: zoneGroups,
        tables: processedTables,
        bookingEnabled: true,
        currency: event.currency || event.venue?.currency || "USD",
        eventName: event.name,
      },
      {
        headers: {
          "Cache-Control": getCacheControl({
            tier: "public-short",
            maxAge: 30,
            swr: 60,
          }),
        },
      }
    );
  } catch (error: any) {
    console.error("Error in tables/available:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch available tables" },
      { status: 500 }
    );
  }
}
