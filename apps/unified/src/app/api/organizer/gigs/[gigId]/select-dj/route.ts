import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserOrganizerId } from "@/lib/data/get-user-entity";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { emitOutboxEvent } from "@crowdstack/shared/outbox/emit";
import { sendTemplateEmail } from "@crowdstack/shared/email/template-renderer";

/**
 * POST /api/organizer/gigs/[gigId]/select-dj
 * Select a DJ for the gig - adds to lineup and creates event_promoters entry
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
    const { dj_id } = body;

    if (!dj_id) {
      return NextResponse.json(
        { error: "dj_id is required" },
        { status: 400 }
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
          organizer_id
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

    // Verify DJ exists
    const { data: dj, error: djError } = await serviceSupabase
      .from("djs")
      .select("id, user_id")
      .eq("id", dj_id)
      .single();

    if (djError || !dj) {
      return NextResponse.json(
        { error: "DJ not found" },
        { status: 404 }
      );
    }

    // Get or create response (should exist if DJ responded)
    const { data: response, error: responseError } = await serviceSupabase
      .from("dj_gig_responses")
      .select("*")
      .eq("gig_posting_id", gigId)
      .eq("dj_id", dj_id)
      .single();

    if (responseError && responseError.code !== "PGRST116") {
      // PGRST116 is "not found" - that's ok, we'll create one
      console.error("Error checking response:", responseError);
    }

    // Update or create response as confirmed
    const { data: confirmedResponse, error: confirmError } = await serviceSupabase
      .from("dj_gig_responses")
      .upsert({
        id: response?.id,
        gig_posting_id: gigId,
        dj_id,
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
        message: response?.message || null,
      }, {
        onConflict: "gig_posting_id,dj_id",
      })
      .select()
      .single();

    if (confirmError) {
      console.error("Error confirming response:", confirmError);
      return NextResponse.json(
        { error: "Failed to confirm DJ response" },
        { status: 500 }
      );
    }

    const eventId = (gig.events as any).id;

    // Add DJ to lineup
    const { data: existingLineup } = await serviceSupabase
      .from("event_lineups")
      .select("display_order")
      .eq("event_id", eventId)
      .order("display_order", { ascending: false })
      .limit(1);

    const displayOrder = existingLineup && existingLineup.length > 0
      ? (existingLineup[0].display_order || 0) + 1
      : 0;

    // Check if DJ already in lineup
    const { data: existingLineupEntry } = await serviceSupabase
      .from("event_lineups")
      .select("id")
      .eq("event_id", eventId)
      .eq("dj_id", dj_id)
      .single();

    if (!existingLineupEntry) {
      const { error: lineupError } = await serviceSupabase
        .from("event_lineups")
        .insert({
          event_id: eventId,
          dj_id,
          display_order: displayOrder,
        });

      if (lineupError) {
        console.error("Error adding DJ to lineup:", lineupError);
        // Continue anyway - lineup might already exist
      }
    }

    // Note: We do NOT automatically create event_promoters entry
    // The organizer can add the DJ as a promoter separately if they're also getting a promoter deal
    // This keeps DJ gigs and promoter deals separate

    // Update gig posting status to 'filled'
    await serviceSupabase
      .from("dj_gig_postings")
      .update({ status: "filled" })
      .eq("id", gigId);

    // Send confirmation email to DJ
    try {
      const { data: djDetails } = await serviceSupabase
        .from("djs")
        .select("name, user_id, handle")
        .eq("id", dj_id)
        .single();

      if (djDetails?.user_id) {
        const { data: userData } = await serviceSupabase.auth.admin.getUserById(djDetails.user_id);
        const djEmail = userData?.user?.email;

        if (djEmail) {
          const { data: eventDetails } = await serviceSupabase
            .from("events")
            .select(`
              name,
              slug,
              start_time,
              venues(name, address, city, state)
            `)
            .eq("id", eventId)
            .single();

          const { data: organizerDetails } = await serviceSupabase
            .from("organizers")
            .select("name")
            .eq("id", gig.organizer_id)
            .single();

          // Supabase returns relations as arrays, so we need to access the first element
          const venue = eventDetails?.venues
            ? (Array.isArray(eventDetails.venues) 
                ? eventDetails.venues[0] 
                : eventDetails.venues)
            : null;

          await sendTemplateEmail(
            "dj_gig_confirmed",
            djEmail,
            djDetails.user_id,
            {
              dj_name: djDetails.name || djDetails.handle,
              organizer_name: organizerDetails?.name || "The organizer",
              gig_title: gig.title,
              event_name: eventDetails?.name || "Event",
              event_date: eventDetails?.start_time
                ? new Date(eventDetails.start_time).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "",
              venue_name: venue?.name || "Venue TBA",
              payment_amount: gig.payment_amount,
              payment_currency: gig.payment_currency || "USD",
              event_url: `${process.env.NEXT_PUBLIC_WEB_URL || "https://crowdstack.app"}/e/${eventDetails?.slug || eventId}`,
            },
            { event_id: eventId, gig_posting_id: gigId, dj_id }
          );
        }
      }
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
      // Don't fail the request
    }

    // Emit outbox event
    await emitOutboxEvent("dj_gig_confirmed", {
      gig_posting_id: gigId,
      event_id: eventId,
      dj_id,
    });

    return NextResponse.json({
      success: true,
      response: confirmedResponse,
      message: "DJ selected and added to lineup",
    });
  } catch (error: any) {
    console.error("Error in POST /api/organizer/gigs/[gigId]/select-dj:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

