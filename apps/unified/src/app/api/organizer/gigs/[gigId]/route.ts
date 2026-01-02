import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserOrganizerId } from "@/lib/data/get-user-entity";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";

/**
 * GET /api/organizer/gigs/[gigId]
 * Get gig posting details with all responses
 */
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

    if (!(await userHasRoleOrSuperadmin("event_organizer"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const organizerId = await getUserOrganizerId();
    if (!organizerId) {
      return NextResponse.json(
        { error: "Organizer profile not found" },
        { status: 404 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Get gig posting with event details
    const { data: gig, error: gigError } = await serviceSupabase
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
          venues (
            id,
            name
          )
        )
      `)
      .eq("id", gigId)
      .eq("organizer_id", organizerId)
      .single();

    if (gigError || !gig) {
      return NextResponse.json(
        { error: "Gig posting not found" },
        { status: 404 }
      );
    }

    // Get all responses with DJ details
    const { data: responses, error: responsesError } = await serviceSupabase
      .from("dj_gig_responses")
      .select(`
        *,
        djs (
          id,
          handle,
          name,
          profile_image_url,
          genres,
          location
        )
      `)
      .eq("gig_posting_id", gigId)
      .order("responded_at", { ascending: false });

    if (responsesError) {
      console.error("Error fetching responses:", responsesError);
    }

    // Get invitations
    const { data: invitations, error: invitationsError } = await serviceSupabase
      .from("dj_gig_invitations")
      .select(`
        *,
        djs (
          id,
          handle,
          name,
          profile_image_url
        )
      `)
      .eq("gig_posting_id", gigId);

    if (invitationsError) {
      console.error("Error fetching invitations:", invitationsError);
    }

    return NextResponse.json({
      gig,
      responses: responses || [],
      invitations: invitations || [],
    });
  } catch (error: any) {
    console.error("Error in GET /api/organizer/gigs/[gigId]:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/organizer/gigs/[gigId]
 * Update gig posting
 */
export async function PATCH(
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

    if (!(await userHasRoleOrSuperadmin("event_organizer"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const organizerId = await getUserOrganizerId();
    if (!organizerId) {
      return NextResponse.json(
        { error: "Organizer profile not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      requirements,
      payment_amount,
      payment_currency,
      show_payment,
      status,
      deadline,
    } = body;

    const serviceSupabase = createServiceRoleClient();

    // Verify gig belongs to organizer
    const { data: existingGig, error: checkError } = await serviceSupabase
      .from("dj_gig_postings")
      .select("id, organizer_id")
      .eq("id", gigId)
      .eq("organizer_id", organizerId)
      .single();

    if (checkError || !existingGig) {
      return NextResponse.json(
        { error: "Gig posting not found" },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (requirements !== undefined) updateData.requirements = requirements;
    if (payment_amount !== undefined) updateData.payment_amount = payment_amount;
    if (payment_currency !== undefined) updateData.payment_currency = payment_currency;
    if (show_payment !== undefined) updateData.show_payment = show_payment;
    if (status !== undefined) updateData.status = status;
    if (deadline !== undefined) updateData.deadline = deadline;

    // Update gig posting
    const { data: updatedGig, error: updateError } = await serviceSupabase
      .from("dj_gig_postings")
      .update(updateData)
      .eq("id", gigId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating gig posting:", updateError);
      return NextResponse.json(
        { error: "Failed to update gig posting" },
        { status: 500 }
      );
    }

    return NextResponse.json({ gig: updatedGig });
  } catch (error: any) {
    console.error("Error in PATCH /api/organizer/gigs/[gigId]:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

