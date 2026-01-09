import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getCurrencySymbol } from "@/lib/constants/currencies";

export const dynamic = "force-dynamic";

interface EventWithVenue {
  id: string;
  name: string;
  slug: string;
  start_time: string;
  end_time: string | null;
  timezone: string | null;
  currency: string | null;
  cover_image: string | null;
  venue: {
    id: string;
    name: string;
    slug: string;
    currency: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
  } | null;
}

/**
 * GET /api/book/[code]
 * Get booking link details (public endpoint for direct booking links)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;
    const serviceSupabase = createServiceRoleClient();

    // Find the booking link
    const { data: link, error: linkError } = await serviceSupabase
      .from("table_booking_links")
      .select(`
        id,
        event_id,
        table_id,
        code,
        is_active,
        expires_at
      `)
      .eq("code", code.toUpperCase())
      .single();

    if (linkError || !link) {
      return NextResponse.json({ error: "Booking link not found" }, { status: 404 });
    }

    // Check if link is active
    if (!link.is_active) {
      return NextResponse.json({ error: "This booking link is no longer active" }, { status: 410 });
    }

    // Check if link has expired
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return NextResponse.json({ error: "This booking link has expired" }, { status: 410 });
    }

    // Get event details
    const { data: eventData, error: eventError } = await serviceSupabase
      .from("events")
      .select(`
        id,
        name,
        slug,
        start_time,
        end_time,
        timezone,
        currency,
        cover_image,
        venue:venues(
          id,
          name,
          slug,
          currency,
          address,
          city,
          state,
          country
        )
      `)
      .eq("id", link.event_id)
      .single();

    if (eventError || !eventData) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Type assertion to fix Supabase's nested relation type inference
    const event = eventData as unknown as EventWithVenue;

    // Check if event is in the future
    const eventEnd = event.end_time ? new Date(event.end_time) : null;
    if (eventEnd && eventEnd < new Date()) {
      return NextResponse.json({ error: "This event has already ended" }, { status: 410 });
    }

    const currency = event.currency || event.venue?.currency || "USD";
    const currencySymbol = getCurrencySymbol(currency);

    // If table_id is specified, get specific table info
    let table = null;
    if (link.table_id) {
      const { data: tableData } = await serviceSupabase
        .from("venue_tables")
        .select(`
          id,
          name,
          capacity,
          minimum_spend,
          deposit_amount,
          zone:table_zones(id, name)
        `)
        .eq("id", link.table_id)
        .single();

      if (tableData) {
        // Check event-specific overrides
        const { data: availability } = await serviceSupabase
          .from("event_table_availability")
          .select("is_available, override_minimum_spend, override_deposit")
          .eq("event_id", event.id)
          .eq("table_id", link.table_id)
          .single();

        // If table is marked as not available, still allow booking via direct link
        table = {
          id: tableData.id,
          name: tableData.name,
          capacity: tableData.capacity,
          minimum_spend: availability?.override_minimum_spend ?? tableData.minimum_spend,
          deposit_amount: availability?.override_deposit ?? tableData.deposit_amount,
          zone: tableData.zone,
        };
      }
    }

    // If no specific table, get all available tables
    let availableTables: any[] = [];
    if (!link.table_id) {
      const { data: tables } = await serviceSupabase
        .from("venue_tables")
        .select(`
          id,
          name,
          capacity,
          minimum_spend,
          deposit_amount,
          zone:table_zones(id, name)
        `)
        .eq("venue_id", event.venue?.id)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (tables) {
        // Get event-specific overrides
        const { data: availabilities } = await serviceSupabase
          .from("event_table_availability")
          .select("table_id, is_available, override_minimum_spend, override_deposit")
          .eq("event_id", event.id);

        const availabilityMap = new Map(
          availabilities?.map((a) => [a.table_id, a]) || []
        );

        // Filter to only available tables and apply overrides
        availableTables = tables
          .filter((t) => {
            const avail = availabilityMap.get(t.id);
            return !avail || avail.is_available !== false;
          })
          .map((t) => {
            const avail = availabilityMap.get(t.id);
            return {
              id: t.id,
              name: t.name,
              capacity: t.capacity,
              minimum_spend: avail?.override_minimum_spend ?? t.minimum_spend,
              deposit_amount: avail?.override_deposit ?? t.deposit_amount,
              zone: t.zone,
            };
          });
      }
    }

    return NextResponse.json({
      link: {
        id: link.id,
        code: link.code,
        table_id: link.table_id,
      },
      event: {
        id: event.id,
        name: event.name,
        slug: event.slug,
        start_time: event.start_time,
        end_time: event.end_time,
        timezone: event.timezone,
        cover_image: event.cover_image,
        venue: event.venue,
      },
      table,
      availableTables,
      currency,
      currencySymbol,
    });
  } catch (error: any) {
    console.error("Error in book/[code] GET:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch booking link" },
      { status: 500 }
    );
  }
}
