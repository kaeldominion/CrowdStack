import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserOrganizerId } from "@/lib/data/get-user-entity";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { sendTemplateEmail } from "@crowdstack/shared/email/template-renderer";

/**
 * GET /api/organizer/gigs
 * List all gig postings for the organizer
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

    // Get all gig postings for this organizer
    const { data: gigs, error } = await serviceSupabase
      .from("dj_gig_postings")
      .select(`
        *,
        events (
          id,
          name,
          slug,
          start_time,
          venue_id,
          venues (
            id,
            name
          )
        ),
        dj_gig_responses (
          id,
          status,
          dj_id
        )
      `)
      .eq("organizer_id", organizerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching gig postings:", error);
      return NextResponse.json(
        { error: "Failed to fetch gig postings" },
        { status: 500 }
      );
    }

    // Count responses by status
    const gigsWithCounts = (gigs || []).map((gig: any) => {
      const responses = gig.dj_gig_responses || [];
      return {
        ...gig,
        response_counts: {
          interested: responses.filter((r: any) => r.status === "interested").length,
          declined: responses.filter((r: any) => r.status === "declined").length,
          confirmed: responses.filter((r: any) => r.status === "confirmed").length,
          total: responses.length,
        },
        dj_gig_responses: undefined, // Remove detailed responses from list view
      };
    });

    return NextResponse.json({ gigs: gigsWithCounts });
  } catch (error: any) {
    console.error("Error in GET /api/organizer/gigs:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organizer/gigs
 * Create a new gig posting
 */
export async function POST(request: NextRequest) {
  try {
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
      event_id,
      title,
      description,
      requirements,
      payment_amount,
      payment_currency = "USD",
      show_payment = true,
      posting_type = "invite_only",
      deadline,
      dj_ids, // Array of DJ IDs to invite (optional)
    } = body;

    if (!event_id || !title) {
      return NextResponse.json(
        { error: "event_id and title are required" },
        { status: 400 }
      );
    }

    // Validate payment amount if show_payment is true
    if (show_payment && (!payment_amount || payment_amount <= 0)) {
      return NextResponse.json(
        { error: "payment_amount is required when show_payment is true" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Verify event belongs to organizer
    const { data: event, error: eventError } = await serviceSupabase
      .from("events")
      .select("id, organizer_id")
      .eq("id", event_id)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    if (event.organizer_id !== organizerId) {
      return NextResponse.json(
        { error: "Event does not belong to this organizer" },
        { status: 403 }
      );
    }

    // Create gig posting
    if (!organizerId) {
      console.error("[POST /api/organizer/gigs] organizerId is null/undefined before insert");
      return NextResponse.json(
        { error: "Organizer profile not found. Please ensure you have an organizer profile set up." },
        { status: 404 }
      );
    }

    const { data: gigPosting, error: createError } = await serviceSupabase
      .from("dj_gig_postings")
      .insert({
        event_id,
        organizer_id: organizerId, // Explicitly ensure it's defined
        created_by: user.id,
        title,
        description: description || null,
        requirements: requirements || null,
        payment_amount: show_payment ? payment_amount : null,
        payment_currency,
        show_payment,
        posting_type,
        status: "active",
        deadline: deadline || null,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating gig posting:", createError);
      console.error("Insert data:", {
        event_id,
        organizer_id: organizerId,
        created_by: user.id,
        title,
      });
      return NextResponse.json(
        { error: createError.message || "Failed to create gig posting" },
        { status: 500 }
      );
    }

    // If DJ IDs provided, create invitations
    if (dj_ids && Array.isArray(dj_ids) && dj_ids.length > 0) {
      const invitations = dj_ids.map((dj_id: string) => ({
        gig_posting_id: gigPosting.id,
        dj_id,
        invited_by: user.id,
      }));

      const { error: inviteError } = await serviceSupabase
        .from("dj_gig_invitations")
        .insert(invitations);

      if (inviteError) {
        console.error("Error creating invitations:", inviteError);
        // Don't fail the whole request, just log the error
      }

      // Send invitation emails to invited DJs
      for (const dj_id of dj_ids) {
        try {
          // Get DJ details
          const { data: dj } = await serviceSupabase
            .from("djs")
            .select("name, user_id, handle")
            .eq("id", dj_id)
            .single();

          if (dj?.user_id) {
            // Get user email
            const { data: userData } = await serviceSupabase.auth.admin.getUserById(dj.user_id);
            const djEmail = userData?.user?.email;

            if (djEmail) {
              // Get event and organizer details
              const { data: eventDetails } = await serviceSupabase
                .from("events")
                .select(`
                  name,
                  start_time,
                  venues(name)
                `)
                .eq("id", event_id)
                .single();

              const { data: organizerDetails } = await serviceSupabase
                .from("organizers")
                .select("name")
                .eq("id", organizerId)
                .single();

              // Supabase returns relations as arrays, so we need to access the first element
              const venue = eventDetails?.venues
                ? (Array.isArray(eventDetails.venues) 
                    ? eventDetails.venues[0] 
                    : eventDetails.venues)
                : null;

              await sendTemplateEmail(
                "dj_gig_invitation",
                djEmail,
                dj.user_id,
                {
                  dj_name: dj.name || dj.handle,
                  organizer_name: organizerDetails?.name || "An organizer",
                  gig_title: title,
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
                  payment_amount: show_payment && payment_amount ? payment_amount : null,
                  payment_currency: payment_currency,
                  gig_description: description || "",
                  deadline: deadline
                    ? new Date(deadline).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : null,
                  gig_url: `${process.env.NEXT_PUBLIC_WEB_URL || "https://crowdstack.app"}/app/dj/gigs/${gigPosting.id}`,
                },
                { event_id, gig_posting_id: gigPosting.id, dj_id }
              );
            }
          }
        } catch (emailError) {
          console.error(`Failed to send invitation email to DJ ${dj_id}:`, emailError);
          // Don't fail the whole request
        }
      }
    }

    return NextResponse.json({ gig: gigPosting });
  } catch (error: any) {
    console.error("Error in POST /api/organizer/gigs:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

