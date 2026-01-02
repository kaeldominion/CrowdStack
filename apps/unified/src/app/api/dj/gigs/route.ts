import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserRoles } from "@crowdstack/shared/auth/roles";
import { getUserDJId, getUserDJIds } from "@/lib/data/get-user-entity";

/**
 * GET /api/dj/gigs
 * List available gigs for all DJ profiles (open postings + invitations)
 * Shows gigs for all profiles, but marks which profile can respond
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

    const roles = await getUserRoles();
    if (!roles.includes("dj") && !roles.includes("superadmin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get all DJ profiles for this user
    const allDJIds = await getUserDJIds();
    if (allDJIds.length === 0) {
      return NextResponse.json(
        { error: "No DJ profiles found" },
        { status: 404 }
      );
    }

    // Get selected DJ profile (for responding)
    const selectedDJId = await getUserDJId();

    // Get open gig postings
    const { data: openGigs, error: openGigsError } = await serviceSupabase
      .from("dj_gig_postings")
      .select(`
        *,
        events (
          id,
          name,
          slug,
          start_time,
          end_time,
          venue_id,
          flier_url,
          status,
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
      `)
      .eq("status", "active")
      .eq("posting_type", "open")
      .order("created_at", { ascending: false });

    if (openGigsError) {
      console.error("Error fetching open gigs:", openGigsError);
    }

    // Get invitations for ALL DJ profiles
    const { data: invitations, error: invitationsError } = await serviceSupabase
      .from("dj_gig_invitations")
      .select(`
        *,
        dj_id,
        dj_gig_postings (
          *,
          events (
            id,
            name,
            slug,
            start_time,
            end_time,
            venue_id,
            flier_url,
            status,
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
      .order("invited_at", { ascending: false });

    if (invitationsError) {
      console.error("Error fetching invitations:", invitationsError);
    }

    // Get responses for ALL DJ profiles
    const { data: responses, error: responsesError } = await serviceSupabase
      .from("dj_gig_responses")
      .select("gig_posting_id, dj_id, status")
      .in("dj_id", allDJIds);

    if (responsesError) {
      console.error("Error fetching responses:", responsesError);
    }

    // Create response map: gig_posting_id -> { dj_id -> status }
    const responseMap = new Map<string, Map<string, string>>();
    (responses || []).forEach((r: any) => {
      if (!responseMap.has(r.gig_posting_id)) {
        responseMap.set(r.gig_posting_id, new Map());
      }
      responseMap.get(r.gig_posting_id)!.set(r.dj_id, r.status);
    });

    // Combine open gigs and invitations, mark response status
    const allGigs = [
      ...(openGigs || []).map((gig: any) => {
        const gigResponses = responseMap.get(gig.id);
        const selectedDJResponse = selectedDJId && gigResponses?.get(selectedDJId);
        return {
          ...gig,
          type: "open" as const,
          invitation: null,
          response_status: selectedDJResponse || null,
          can_respond_as: selectedDJId, // Which DJ profile can respond
          all_responses: gigResponses ? Object.fromEntries(gigResponses) : {}, // All responses from all profiles
        };
      }),
      ...(invitations || [])
        .filter((inv: any) => inv.dj_gig_postings) // Only include if gig still exists
        .map((inv: any) => {
          const gigResponses = responseMap.get(inv.dj_gig_postings.id);
          const invitedDJResponse = gigResponses?.get(inv.dj_id);
          const selectedDJResponse = selectedDJId && gigResponses?.get(selectedDJId);
          return {
            ...inv.dj_gig_postings,
            type: "invitation" as const,
            invitation: {
              id: inv.id,
              invited_at: inv.invited_at,
              viewed_at: inv.viewed_at,
              invited_dj_id: inv.dj_id, // Which DJ profile was invited
            },
            response_status: selectedDJResponse || invitedDJResponse || null,
            can_respond_as: selectedDJId || inv.dj_id, // Can respond as selected or invited profile
            all_responses: gigResponses ? Object.fromEntries(gigResponses) : {},
          };
        }),
    ];

    // Sort by created_at (most recent first)
    allGigs.sort((a: any, b: any) => {
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      return bTime - aTime;
    });

    return NextResponse.json({ gigs: allGigs });
  } catch (error: any) {
    console.error("Error in GET /api/dj/gigs:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

