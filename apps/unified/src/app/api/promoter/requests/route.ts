import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId } from "@/lib/auth/check-role";
import { getUserPromoterId } from "@/lib/data/get-user-entity";

// GET - Fetch promoter's own requests
export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const promoterId = await getUserPromoterId();
    if (!promoterId) {
      return NextResponse.json({ error: "Not a promoter" }, { status: 403 });
    }

    const supabase = createServiceRoleClient();

    const { data: requests, error } = await supabase
      .from("promoter_requests")
      .select(`
        id,
        message,
        status,
        response_message,
        created_at,
        responded_at,
        event:events(
          id,
          name,
          slug,
          flier_url,
          start_time,
          end_time,
          venue:venues(id, name)
        )
      `)
      .eq("promoter_id", promoterId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Promoter Requests] Error fetching:", error);
      return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
    }

    return NextResponse.json({ requests });
  } catch (error: any) {
    console.error("[Promoter Requests] Error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}

// POST - Create a new request to promote an event
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const promoterId = await getUserPromoterId();
    if (!promoterId) {
      return NextResponse.json({ error: "Not a promoter" }, { status: 403 });
    }

    const body = await request.json();
    const { event_id, message } = body;

    if (!event_id) {
      return NextResponse.json({ error: "Event ID is required" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Check if event exists and is upcoming
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, name, start_time, status, organizer_id, venue_id")
      .eq("id", event_id)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if event is in the future
    if (new Date(event.start_time) < new Date()) {
      return NextResponse.json({ error: "Cannot request to promote past events" }, { status: 400 });
    }

    // Check if already a promoter for this event
    const { data: existingAssignment } = await supabase
      .from("event_promoters")
      .select("id")
      .eq("event_id", event_id)
      .eq("promoter_id", promoterId)
      .single();

    if (existingAssignment) {
      return NextResponse.json({ error: "You are already promoting this event" }, { status: 400 });
    }

    // Check for existing request (including declined/withdrawn)
    const { data: existingRequest } = await supabase
      .from("promoter_requests")
      .select("id, status")
      .eq("event_id", event_id)
      .eq("promoter_id", promoterId)
      .single();

    if (existingRequest) {
      if (existingRequest.status === "pending") {
        return NextResponse.json({ error: "You already have a pending request for this event" }, { status: 400 });
      }
      if (existingRequest.status === "declined") {
        return NextResponse.json({ error: "Your request for this event was declined" }, { status: 400 });
      }
      if (existingRequest.status === "withdrawn") {
        // Re-submit the request
        const { error: updateError } = await supabase
          .from("promoter_requests")
          .update({
            status: "pending",
            message: message || null,
            response_message: null,
            responded_at: null,
            responded_by: null,
          })
          .eq("id", existingRequest.id);

        if (updateError) {
          console.error("[Promoter Requests] Error re-submitting:", updateError);
          return NextResponse.json({ error: "Failed to submit request" }, { status: 500 });
        }

        return NextResponse.json({ success: true, resubmitted: true });
      }
    }

    // Create new request
    const { data: newRequest, error: createError } = await supabase
      .from("promoter_requests")
      .insert({
        event_id,
        promoter_id: promoterId,
        message: message || null,
      })
      .select()
      .single();

    if (createError) {
      console.error("[Promoter Requests] Error creating:", createError);
      return NextResponse.json({ error: "Failed to submit request" }, { status: 500 });
    }

    // Get promoter info for notification
    const { data: promoter } = await supabase
      .from("promoters")
      .select("name, email")
      .eq("id", promoterId)
      .single();

    // Send notification to organizer (if exists)
    if (event.organizer_id) {
      const { data: organizer } = await supabase
        .from("organizers")
        .select("created_by, name")
        .eq("id", event.organizer_id)
        .single();

      if (organizer?.created_by) {
        // Create in-app notification
        const { error: notifError } = await supabase
          .from("notifications")
          .insert({
            user_id: organizer.created_by,
            type: "promoter_request",
            title: "New Promoter Request",
            message: `${promoter?.name || "A promoter"} wants to promote "${event.name}"`,
            link: `/app/organizer/events/${event_id}?tab=promoters`,
            metadata: {
              event_id: event_id,
              event_name: event.name,
              promoter_id: promoterId,
              promoter_name: promoter?.name,
              request_id: newRequest.id,
            },
          });

        if (notifError) {
          console.error("[Promoter Requests] Failed to create notification:", notifError);
        } else {
          console.log(`[Promoter Requests] Notification created for organizer ${organizer.created_by}`);
        }
      }
    }

    // Also notify venue admin if event has a venue
    if (event.venue_id) {
      const { data: venue } = await supabase
        .from("venues")
        .select("created_by, name")
        .eq("id", event.venue_id)
        .single();

      if (venue?.created_by) {
        const { error: notifError } = await supabase
          .from("notifications")
          .insert({
            user_id: venue.created_by,
            type: "promoter_request",
            title: "New Promoter Request",
            message: `${promoter?.name || "A promoter"} wants to promote "${event.name}" at your venue`,
            link: `/app/venue/events/${event_id}?tab=promoters`,
            metadata: {
              event_id: event_id,
              event_name: event.name,
              promoter_id: promoterId,
              promoter_name: promoter?.name,
              request_id: newRequest.id,
            },
          });

        if (notifError) {
          console.error("[Promoter Requests] Failed to create venue notification:", notifError);
        }
      }
    }

    return NextResponse.json({ success: true, request: newRequest });
  } catch (error: any) {
    console.error("[Promoter Requests] Error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}

// PATCH - Withdraw a pending request
export async function PATCH(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const promoterId = await getUserPromoterId();
    if (!promoterId) {
      return NextResponse.json({ error: "Not a promoter" }, { status: 403 });
    }

    const body = await request.json();
    const { request_id, action } = body;

    if (!request_id || action !== "withdraw") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Verify ownership and status
    const { data: existingRequest } = await supabase
      .from("promoter_requests")
      .select("id, promoter_id, status")
      .eq("id", request_id)
      .single();

    if (!existingRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (existingRequest.promoter_id !== promoterId) {
      return NextResponse.json({ error: "Not your request" }, { status: 403 });
    }

    if (existingRequest.status !== "pending") {
      return NextResponse.json({ error: "Can only withdraw pending requests" }, { status: 400 });
    }

    // Withdraw the request
    const { error: updateError } = await supabase
      .from("promoter_requests")
      .update({ status: "withdrawn" })
      .eq("id", request_id);

    if (updateError) {
      console.error("[Promoter Requests] Error withdrawing:", updateError);
      return NextResponse.json({ error: "Failed to withdraw request" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Promoter Requests] Error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}


