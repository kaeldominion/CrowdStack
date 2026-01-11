import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId, userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { getUserVenueId } from "@/lib/data/get-user-entity";

export const dynamic = "force-dynamic";

interface CSVRow {
  table_name?: string;
  table?: string;
  spend?: string;
  spend_amount?: string;
  amount?: string;
  total?: string;
  [key: string]: string | undefined;
}

interface PreviewRequest {
  csv_data: CSVRow[];
  column_mapping?: {
    table_name_column: string;
    spend_column: string;
  };
}

interface BookingForMatch {
  id: string;
  guest_name: string;
  table: {
    id: string;
    name: string;
  } | null;
  actual_spend: number | null;
  minimum_spend: number | null;
}

/**
 * POST /api/venue/events/[eventId]/closeout/preview
 * Preview CSV import matches before applying
 *
 * Takes CSV data and returns a preview of which rows match which bookings
 */
export async function POST(
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
    const body: PreviewRequest = await request.json();

    if (!body.csv_data || !Array.isArray(body.csv_data) || body.csv_data.length === 0) {
      return NextResponse.json(
        { error: "CSV data is required" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Verify event belongs to venue
    const { data: event, error: eventError } = await serviceSupabase
      .from("events")
      .select("id, venue_id, tables_closeout_at")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.venue_id !== venueId) {
      return NextResponse.json({ error: "Event does not belong to this venue" }, { status: 403 });
    }

    // Check if already closed out
    if (event.tables_closeout_at) {
      return NextResponse.json(
        { error: "Event closeout has already been completed and locked" },
        { status: 400 }
      );
    }

    // Get all bookings for this event
    const { data: bookingsData, error: bookingsError } = await serviceSupabase
      .from("table_bookings")
      .select(`
        id,
        guest_name,
        actual_spend,
        minimum_spend,
        table:venue_tables(id, name)
      `)
      .eq("event_id", eventId)
      .in("status", ["confirmed", "completed"]);

    if (bookingsError) {
      console.error("Error fetching bookings:", bookingsError);
      return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
    }

    const bookings = (bookingsData || []) as unknown as BookingForMatch[];

    // Auto-detect column names if not provided
    const sampleRow = body.csv_data[0];
    const columnKeys = Object.keys(sampleRow);

    let tableNameColumn = body.column_mapping?.table_name_column;
    let spendColumn = body.column_mapping?.spend_column;

    if (!tableNameColumn) {
      // Try to auto-detect table name column
      tableNameColumn = columnKeys.find((k) =>
        ["table_name", "table", "tablename", "name"].includes(k.toLowerCase())
      );
    }

    if (!spendColumn) {
      // Try to auto-detect spend column
      spendColumn = columnKeys.find((k) =>
        ["spend", "spend_amount", "amount", "total", "revenue"].includes(k.toLowerCase())
      );
    }

    if (!tableNameColumn || !spendColumn) {
      return NextResponse.json({
        error: "Could not auto-detect columns. Please provide column mapping.",
        available_columns: columnKeys,
        suggested_mapping: {
          table_name_column: tableNameColumn || null,
          spend_column: spendColumn || null,
        },
      }, { status: 400 });
    }

    // Build a map of table names to bookings for matching
    const tableNameToBooking = new Map<string, BookingForMatch>();
    for (const booking of bookings) {
      if (booking.table?.name) {
        // Store multiple variations for fuzzy matching
        const normalizedName = booking.table.name.toLowerCase().trim();
        tableNameToBooking.set(normalizedName, booking);
        // Also store without common prefixes
        const withoutPrefix = normalizedName.replace(/^(table\s*|vip\s*)/i, "").trim();
        if (withoutPrefix !== normalizedName) {
          tableNameToBooking.set(withoutPrefix, booking);
        }
      }
    }

    // Process CSV rows and match to bookings
    const matches: Array<{
      row_index: number;
      csv_table_name: string;
      csv_spend: number;
      matched: boolean;
      booking_id?: string;
      booking_guest_name?: string;
      booking_table_name?: string;
      current_spend?: number | null;
    }> = [];

    const unmatchedRows: Array<{
      row_index: number;
      csv_table_name: string;
      csv_spend: number;
    }> = [];

    const matchedBookingIds = new Set<string>();

    for (let i = 0; i < body.csv_data.length; i++) {
      const row = body.csv_data[i];
      const tableName = row[tableNameColumn!]?.toString().trim() || "";
      const spendStr = row[spendColumn!]?.toString().replace(/[^0-9.-]/g, "") || "0";
      const spend = parseFloat(spendStr) || 0;

      if (!tableName) {
        continue; // Skip rows without table name
      }

      // Try to match
      const normalizedTableName = tableName.toLowerCase().trim();
      let matchedBooking = tableNameToBooking.get(normalizedTableName);

      // Try without common prefixes
      if (!matchedBooking) {
        const withoutPrefix = normalizedTableName.replace(/^(table\s*|vip\s*)/i, "").trim();
        matchedBooking = tableNameToBooking.get(withoutPrefix);
      }

      if (matchedBooking && !matchedBookingIds.has(matchedBooking.id)) {
        matches.push({
          row_index: i,
          csv_table_name: tableName,
          csv_spend: spend,
          matched: true,
          booking_id: matchedBooking.id,
          booking_guest_name: matchedBooking.guest_name,
          booking_table_name: matchedBooking.table?.name,
          current_spend: matchedBooking.actual_spend,
        });
        matchedBookingIds.add(matchedBooking.id);
      } else {
        unmatchedRows.push({
          row_index: i,
          csv_table_name: tableName,
          csv_spend: spend,
        });
        matches.push({
          row_index: i,
          csv_table_name: tableName,
          csv_spend: spend,
          matched: false,
        });
      }
    }

    // Find bookings that weren't matched
    const unmatchedBookings = bookings.filter(
      (b) => !matchedBookingIds.has(b.id)
    ).map((b) => ({
      booking_id: b.id,
      guest_name: b.guest_name,
      table_name: b.table?.name,
      current_spend: b.actual_spend,
      minimum_spend: b.minimum_spend,
    }));

    return NextResponse.json({
      preview: {
        total_csv_rows: body.csv_data.length,
        matched_count: matches.filter((m) => m.matched).length,
        unmatched_csv_rows: unmatchedRows.length,
        unmatched_bookings: unmatchedBookings.length,
      },
      column_mapping: {
        table_name_column: tableNameColumn,
        spend_column: spendColumn,
      },
      matches,
      unmatched_csv_rows: unmatchedRows,
      unmatched_bookings: unmatchedBookings,
    });
  } catch (error: any) {
    console.error("Error in closeout preview:", error);
    return NextResponse.json(
      { error: error.message || "Failed to preview import" },
      { status: 500 }
    );
  }
}
