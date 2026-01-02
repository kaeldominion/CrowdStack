import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserRoles } from "@crowdstack/shared/auth/roles";
// import { emitOutboxEvent } from "@crowdstack/shared/outbox/emit";
import { getUserDJId, getUserDJIds } from "@/lib/data/get-user-entity";

/**
 * POST /api/dj/gigs/[gigId]/respond
 * Respond to a gig posting (interested or declined)
 * Uses selected DJ profile, or allows specifying dj_id in body
 */
export async function POST(
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

    const body = await request.json();
    const { status, message, dj_id: specifiedDJId } = body;

    if (!status || !["interested", "declined"].includes(status)) {
      return NextResponse.json(
        { error: "status must be 'interested' or 'declined'" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Get all DJ profiles user owns
    const allDJIds = await getUserDJIds();
    if (allDJIds.length === 0) {
      return NextResponse.json(
        { error: "No DJ profiles found" },
        { status: 404 }
      );
    }

    // Use specified DJ ID or selected DJ ID
    let djId = specifiedDJId;
    if (!djId) {
      djId = await getUserDJId();
    }

    // Verify the DJ profile belongs to the user
    if (!djId || !allDJIds.includes(djId)) {
      return NextResponse.json(
        { error: "Invalid DJ profile or access denied" },
        { status: 403 }
      );
    }

    // Verify gig exists and DJ has access
    const { data: gig, error: gigError } = await serviceSupabase
      .from("dj_gig_postings")
      .select("id, posting_type, status, organizer_id")
      .eq("id", gigId)
      .single();

    if (gigError || !gig) {
      return NextResponse.json(
        { error: "Gig posting not found" },
        { status: 404 }
      );
    }

    // Check access (open posting or has invitation for this specific DJ)
    const isOpen = gig.posting_type === "open" && gig.status === "active";
    const { data: invitation } = await serviceSupabase
      .from("dj_gig_invitations")
      .select("id")
      .eq("gig_posting_id", gigId)
      .eq("dj_id", djId)
      .single();

    if (!isOpen && !invitation) {
      return NextResponse.json(
        { error: "Access denied. This gig is invite-only and you haven't been invited as this DJ profile." },
        { status: 403 }
      );
    }

    // Create or update response
    const { data: response, error: responseError } = await serviceSupabase
      .from("dj_gig_responses")
      .upsert({
        gig_posting_id: gigId,
        dj_id: djId,
        status,
        message: message || null,
        responded_at: new Date().toISOString(),
      }, {
        onConflict: "gig_posting_id,dj_id",
      })
      .select()
      .single();

    if (responseError) {
      console.error("Error creating/updating response:", responseError);
      return NextResponse.json(
        { error: "Failed to save response" },
        { status: 500 }
      );
    }

    // Send notification to organizer
    // TODO: Add notification system integration

    // TODO: Emit outbox event when event type is added
    // await emitOutboxEvent("dj_gig_response", {
    //   gig_posting_id: gigId,
    //   dj_id: djId,
    //   status,
    //   organizer_id: gig.organizer_id,
    // });

    return NextResponse.json({ response });
  } catch (error: any) {
    console.error("Error in POST /api/dj/gigs/[gigId]/respond:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

