import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserRoles } from "@crowdstack/shared/auth/roles";
import { getUserDJId, getUserDJIds } from "@/lib/data/get-user-entity";

/**
 * GET /api/dj/gigs/[gigId]
 * Get gig posting details
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gigId: string }> | { gigId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const { gigId } = resolvedParams;

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

    // Get all DJ profiles and selected one
    const allDJIds = await getUserDJIds();
    if (allDJIds.length === 0) {
      return NextResponse.json(
        { error: "No DJ profiles found" },
        { status: 404 }
      );
    }

    const selectedDJId = await getUserDJId();

    // Get gig posting
    const { data: gig, error: gigError } = await serviceSupabase
      .from("dj_gig_postings")
      .select(`
        *,
        events (
          id,
          name,
          slug,
          description,
          start_time,
          end_time,
          venue_id,
          flier_url,
          status,
          venues (
            id,
            name,
            address,
            city,
            state,
            country
          )
        ),
        organizers (
          id,
          name,
          logo_url
        )
      `)
      .eq("id", gigId)
      .single();

    if (gigError || !gig) {
      return NextResponse.json(
        { error: "Gig posting not found" },
        { status: 404 }
      );
    }

    // Check if any DJ profile has access (open posting or has invitation)
    const isOpen = gig.posting_type === "open" && gig.status === "active";
    const { data: invitations } = await serviceSupabase
      .from("dj_gig_invitations")
      .select("id, dj_id, invited_at, viewed_at")
      .eq("gig_posting_id", gigId)
      .in("dj_id", allDJIds);

    const relevantInvitation = invitations?.find((inv: any) => 
      selectedDJId ? inv.dj_id === selectedDJId : true
    ) || invitations?.[0] || null;

    if (!isOpen && !relevantInvitation) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Get responses for all DJ profiles
    const { data: responses } = await serviceSupabase
      .from("dj_gig_responses")
      .select("*")
      .eq("gig_posting_id", gigId)
      .in("dj_id", allDJIds);

    // Get response for selected DJ (or first one if no selection)
    const selectedResponse = selectedDJId 
      ? responses?.find((r: any) => r.dj_id === selectedDJId)
      : responses?.[0] || null;

    // Mark invitation as viewed if not already
    if (relevantInvitation && !relevantInvitation.viewed_at) {
      await serviceSupabase
        .from("dj_gig_invitations")
        .update({ viewed_at: new Date().toISOString() })
        .eq("id", relevantInvitation.id);
    }

    return NextResponse.json({
      gig,
      invitation: relevantInvitation || null,
      response: selectedResponse || null,
      can_respond_as: selectedDJId || relevantInvitation?.dj_id || allDJIds[0], // Which DJ profile can respond
      all_responses: responses || [], // All responses from all profiles
    });
  } catch (error: any) {
    console.error("Error in GET /api/dj/gigs/[gigId]:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

