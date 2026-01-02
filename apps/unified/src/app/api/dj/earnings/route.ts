import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserDJIds } from "@/lib/data/get-user-entity";

/**
 * GET /api/dj/earnings
 * Get DJ gig earnings (separate from promoter earnings)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const djIds = await getUserDJIds();
    if (djIds.length === 0) {
      return NextResponse.json({ earnings: [], summary: { total: 0, confirmed: 0, pending: 0, by_currency: {} } });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get all confirmed gig responses for this user's DJ profiles
    const { data: gigResponses, error } = await serviceSupabase
      .from("dj_gig_responses")
      .select(`
        id,
        status,
        confirmed_at,
        dj_gig_postings!inner(
          id,
          title,
          payment_amount,
          payment_currency,
          show_payment,
          event_id,
          events!inner(
            id,
            name,
            slug,
            start_time,
            status
          )
        )
      `)
      .eq("status", "confirmed")
      .in("dj_id", djIds)
      .order("confirmed_at", { ascending: false });

    if (error) {
      console.error("Error fetching DJ gig earnings:", error);
      return NextResponse.json(
        { error: "Failed to fetch earnings" },
        { status: 500 }
      );
    }

    // Format earnings data
    const earnings = (gigResponses || []).map((response: any) => {
      const gig = response.dj_gig_postings;
      const event = gig.events;

      return {
        gig_response_id: response.id,
        gig_posting_id: gig.id,
        gig_title: gig.title,
        event_id: event.id,
        event_name: event.name,
        event_slug: event.slug,
        event_date: event.start_time,
        event_status: event.status,
        payment_amount: gig.payment_amount,
        payment_currency: gig.payment_currency || "USD",
        show_payment: gig.show_payment,
        confirmed_at: response.confirmed_at,
        // Payment status: For now, all are "pending" until organizer marks as paid
        // This could be enhanced with a dj_gig_payments table in the future
        payment_status: "pending" as "pending" | "confirmed" | "paid",
      };
    });

    // Calculate summary
    const summary = {
      total: 0,
      confirmed: 0,
      pending: earnings.length,
      by_currency: {} as Record<string, { total: number; confirmed: number; pending: number }>,
    };

    earnings.forEach((earning) => {
      if (earning.payment_amount && earning.show_payment) {
        const currency = earning.payment_currency || "USD";
        const amount = parseFloat(earning.payment_amount.toString());

        summary.total += amount;

        if (!summary.by_currency[currency]) {
          summary.by_currency[currency] = { total: 0, confirmed: 0, pending: 0 };
        }
        summary.by_currency[currency].total += amount;

        if (earning.payment_status === "confirmed" || earning.payment_status === "paid") {
          summary.confirmed += amount;
          summary.by_currency[currency].confirmed += amount;
        } else {
          summary.by_currency[currency].pending += amount;
        }
      }
    });

    return NextResponse.json({ earnings, summary });
  } catch (error: any) {
    console.error("Error in GET /api/dj/earnings:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

