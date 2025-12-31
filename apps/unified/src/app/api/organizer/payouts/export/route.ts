import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId } from "@/lib/auth/check-role";

/**
 * GET /api/organizer/payouts/export
 * Export payouts to CSV
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get user's organizer ID
    const { data: organizer } = await serviceSupabase
      .from("organizers")
      .select("id")
      .eq("created_by", userId)
      .single();

    if (!organizer) {
      return NextResponse.json(
        { error: "Organizer not found" },
        { status: 404 }
      );
    }

    // Get all payout lines
    const { data: payoutLines, error: payoutError } = await serviceSupabase
      .from("payout_lines")
      .select(`
        id,
        promoter_id,
        checkins_count,
        commission_amount,
        payment_status,
        payment_notes,
        created_at,
        payout_runs!inner(
          event_id,
          events!inner(
            id,
            name,
            currency,
            start_time,
            organizer_id
          )
        ),
        promoter:promoters(id, name, email)
      `)
      .eq("payout_runs.events.organizer_id", organizer.id)
      .order("payout_runs.events.start_time", { ascending: false });

    if (payoutError) {
      throw payoutError;
    }

    // Filter by status if provided
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get("status");
    let filtered = payoutLines || [];
    if (statusFilter && statusFilter !== "all") {
      filtered = filtered.filter((pl: any) => pl.payment_status === statusFilter);
    }

    // Generate CSV
    const headers = [
      "Event Name",
      "Event Date",
      "Promoter",
      "Promoter Email",
      "Check-ins",
      "Amount",
      "Currency",
      "Payment Status",
      "Payment Method",
      "Notes",
      "Created At",
    ];

    const rows = filtered.map((pl: any) => {
      const event = pl.payout_runs?.events;
      const promoter = Array.isArray(pl.promoter) ? pl.promoter[0] : pl.promoter;
      const eventDate = event?.start_time
        ? new Date(event.start_time).toLocaleDateString()
        : "";

      return [
        event?.name || "",
        eventDate,
        promoter?.name || "",
        promoter?.email || "",
        pl.checkins_count || 0,
        pl.commission_amount || 0,
        event?.currency || "IDR",
        pl.payment_status || "pending_payment",
        "", // Payment method (manual input field, not stored)
        pl.payment_notes || "",
        pl.created_at ? new Date(pl.created_at).toLocaleString() : "",
      ];
    });

    // Escape CSV values
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return "";
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\n");

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="payouts-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error("[Export Payouts API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to export payouts" },
      { status: 500 }
    );
  }
}

