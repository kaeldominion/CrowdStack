import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId, userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { getUserVenueId } from "@/lib/data/get-user-entity";

export const dynamic = "force-dynamic";

/**
 * GET /api/venue/events/[eventId]/commissions/export
 * Export commission data as CSV
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

    // Verify event belongs to venue
    const { data: event, error: eventError } = await serviceSupabase
      .from("events")
      .select("id, venue_id, name, slug, start_time, currency")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.venue_id !== venueId) {
      return NextResponse.json({ error: "Event does not belong to this venue" }, { status: 403 });
    }

    // Get all commissions with booking details
    const { data: commissions, error: commissionsError } = await serviceSupabase
      .from("table_booking_commissions")
      .select(`
        id,
        booking_id,
        spend_amount,
        spend_source,
        promoter_id,
        promoter_commission_rate,
        promoter_commission_amount,
        venue_commission_rate,
        venue_commission_amount,
        locked,
        created_at
      `)
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (commissionsError) {
      console.error("Error fetching commissions:", commissionsError);
      return NextResponse.json({ error: "Failed to fetch commissions" }, { status: 500 });
    }

    // Get booking details
    const bookingIds = commissions?.map((c) => c.booking_id) || [];
    let bookingsMap = new Map<string, any>();

    if (bookingIds.length > 0) {
      const { data: bookings } = await serviceSupabase
        .from("table_bookings")
        .select(`
          id,
          guest_name,
          guest_email,
          table:venue_tables(name)
        `)
        .in("id", bookingIds);

      if (bookings) {
        for (const b of bookings) {
          bookingsMap.set(b.id, b);
        }
      }
    }

    // Get promoter details
    const promoterIds = [...new Set(commissions?.filter((c) => c.promoter_id).map((c) => c.promoter_id!) || [])];
    let promotersMap = new Map<string, any>();

    if (promoterIds.length > 0) {
      const { data: promoters } = await serviceSupabase
        .from("promoters")
        .select("id, name")
        .in("id", promoterIds);

      if (promoters) {
        for (const p of promoters) {
          promotersMap.set(p.id, p);
        }
      }
    }

    // Build CSV
    const headers = [
      "Table",
      "Guest Name",
      "Guest Email",
      "Spend Amount",
      "Spend Source",
      "Promoter",
      "Promoter Rate (%)",
      "Promoter Commission",
      "Venue Rate (%)",
      "Venue Commission",
      "Locked",
    ];

    const rows = (commissions || []).map((c) => {
      const booking = bookingsMap.get(c.booking_id);
      const promoter = c.promoter_id ? promotersMap.get(c.promoter_id) : null;

      return [
        booking?.table?.name || "",
        booking?.guest_name || "",
        booking?.guest_email || "",
        c.spend_amount?.toFixed(2) || "0",
        c.spend_source || "",
        promoter?.name || "",
        c.promoter_commission_rate?.toString() || "",
        c.promoter_commission_amount?.toFixed(2) || "0",
        c.venue_commission_rate?.toString() || "",
        c.venue_commission_amount?.toFixed(2) || "0",
        c.locked ? "Yes" : "No",
      ];
    });

    // Calculate totals
    let totalSpend = 0;
    let totalPromoterCommission = 0;
    let totalVenueCommission = 0;

    for (const c of commissions || []) {
      totalSpend += c.spend_amount || 0;
      totalPromoterCommission += c.promoter_commission_amount || 0;
      totalVenueCommission += c.venue_commission_amount || 0;
    }

    // Add totals row
    rows.push([
      "TOTAL",
      "",
      "",
      totalSpend.toFixed(2),
      "",
      "",
      "",
      totalPromoterCommission.toFixed(2),
      "",
      totalVenueCommission.toFixed(2),
      "",
    ]);

    // Convert to CSV string
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => {
          // Escape quotes and wrap in quotes if contains comma
          const escaped = cell.replace(/"/g, '""');
          return escaped.includes(",") ? `"${escaped}"` : escaped;
        }).join(",")
      ),
    ].join("\n");

    // Generate filename
    const eventDate = event.start_time
      ? new Date(event.start_time).toISOString().split("T")[0]
      : "unknown";
    const filename = `commissions_${event.slug || event.id}_${eventDate}.csv`;

    // Return as downloadable CSV
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Error in commissions export:", error);
    return NextResponse.json(
      { error: error.message || "Failed to export commissions" },
      { status: 500 }
    );
  }
}
