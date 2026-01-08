import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserRoles } from "@crowdstack/shared/auth/roles";
import { getUserDJIds } from "@/lib/data/get-user-entity";

/**
 * GET /api/dj/gigs/my-responses
 * Get all gigs all DJ profiles have responded to
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roles = await getUserRoles();
    if (!roles.includes("dj") && !roles.includes("superadmin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get all DJ profiles
    const allDJIds = await getUserDJIds();
    if (allDJIds.length === 0) {
      return NextResponse.json(
        { error: "No DJ profiles found" },
        { status: 404 }
      );
    }

    // Get all responses from all DJ profiles with gig details
    const { data: responses, error: responsesError } = await serviceSupabase
      .from("dj_gig_responses")
      .select(`
        *,
        dj_id,
        djs!inner(id, name, handle),
        dj_gig_postings (
          *,
          events (
            id,
            name,
            slug,
            start_time,
            end_time,
            venue_id,
            venues (
              id,
              name,
              city,
              state
            )
          ),
          organizers (
            id,
            name
          )
        )
      `)
      .in("dj_id", allDJIds)
      .order("responded_at", { ascending: false });

    if (responsesError) {
      console.error("Error fetching responses:", responsesError);
      return NextResponse.json(
        { error: "Failed to fetch responses" },
        { status: 500 }
      );
    }

    // Format responses with DJ profile info
    const formattedResponses = (responses || []).map((response: any) => {
      const gig = response.dj_gig_postings;
      const djProfile = response.djs;
      return {
        id: response.id,
        dj_id: response.dj_id,
        dj_profile: {
          id: djProfile?.id,
          name: djProfile?.name,
          handle: djProfile?.handle,
        },
        status: response.status,
        message: response.message,
        responded_at: response.responded_at,
        confirmed_at: response.confirmed_at,
        gig: {
          id: gig?.id,
          title: gig?.title,
          description: gig?.description,
          payment_amount: gig?.payment_amount,
          payment_currency: gig?.payment_currency,
          show_payment: gig?.show_payment,
          event: gig?.events,
          organizer: gig?.organizers,
        },
      };
    });

    return NextResponse.json({ responses: formattedResponses });
  } catch (error: any) {
    console.error("Error in GET /api/dj/gigs/my-responses:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

