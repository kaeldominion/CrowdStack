import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId, userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { getUserOrganizerId } from "@/lib/data/get-user-entity";

// GET - List all promoters for an event
export async function GET(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();
    const { eventId } = params;

    // Verify user has access to this event
    const hasAccess = await checkEventAccess(eventId, userId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get promoters for this event with their stats
    const { data: eventPromoters, error } = await serviceSupabase
      .from("event_promoters")
      .select(`
        id,
        commission_type,
        commission_config,
        created_at,
        promoter:promoters(id, name, email, phone)
      `)
      .eq("event_id", eventId);

    if (error) {
      throw error;
    }

    // Get registration counts per promoter
    const { data: registrationCounts } = await serviceSupabase
      .from("registrations")
      .select("referral_promoter_id")
      .eq("event_id", eventId)
      .not("referral_promoter_id", "is", null);

    const countsByPromoter: Record<string, number> = {};
    registrationCounts?.forEach((reg) => {
      const pid = reg.referral_promoter_id;
      countsByPromoter[pid] = (countsByPromoter[pid] || 0) + 1;
    });

    const promotersWithStats = eventPromoters?.map((ep) => {
      const promoter = Array.isArray(ep.promoter) ? ep.promoter[0] : ep.promoter;
      return {
        ...ep,
        promoter,
        registrations: countsByPromoter[promoter?.id] || 0,
      };
    });

    return NextResponse.json({ promoters: promotersWithStats || [] });
  } catch (error: any) {
    console.error("Error loading event promoters:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load promoters" },
      { status: 500 }
    );
  }
}

// POST - Add a promoter to the event
export async function POST(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();
    const { eventId } = params;

    // Verify user has access to manage this event
    const hasAccess = await checkEventAccess(eventId, userId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { promoter_id, commission_type, commission_config, assigned_by } = body;

    if (!promoter_id) {
      return NextResponse.json(
        { error: "Promoter ID is required" },
        { status: 400 }
      );
    }

    // Check if promoter exists
    const { data: promoter, error: promoterError } = await serviceSupabase
      .from("promoters")
      .select("id, name")
      .eq("id", promoter_id)
      .single();

    if (promoterError || !promoter) {
      return NextResponse.json(
        { error: "Promoter not found" },
        { status: 404 }
      );
    }

    // Check if already assigned
    const { data: existing } = await serviceSupabase
      .from("event_promoters")
      .select("id")
      .eq("event_id", eventId)
      .eq("promoter_id", promoter_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Promoter is already assigned to this event" },
        { status: 400 }
      );
    }

    // Determine assigned_by if not provided
    let finalAssignedBy = assigned_by;
    if (!finalAssignedBy) {
      // Check if user is venue admin first
      const userIsVenueAdmin = await isVenueAdmin(eventId, userId);
      if (userIsVenueAdmin) {
        finalAssignedBy = "venue";
      } else {
        // Otherwise, check if user is organizer
        const organizerId = await getUserOrganizerId();
        if (organizerId) {
          const { data: event } = await serviceSupabase
            .from("events")
            .select("organizer_id")
            .eq("id", eventId)
            .single();
          
          if (event?.organizer_id === organizerId) {
            finalAssignedBy = "organizer";
          }
        }
      }
    }

    // Add promoter to event
    const { data: eventPromoter, error } = await serviceSupabase
      .from("event_promoters")
      .insert({
        event_id: eventId,
        promoter_id,
        commission_type: commission_type || "flat_per_head",
        commission_config: commission_config || { amount_per_head: 5 },
        assigned_by: finalAssignedBy || "organizer",
      })
      .select(`
        id,
        commission_type,
        commission_config,
        created_at,
        promoter:promoters(id, name, email, phone)
      `)
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ 
      success: true, 
      eventPromoter: {
        ...eventPromoter,
        promoter: Array.isArray(eventPromoter.promoter) 
          ? eventPromoter.promoter[0] 
          : eventPromoter.promoter,
      }
    });
  } catch (error: any) {
    console.error("Error adding promoter to event:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add promoter" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a promoter from the event
export async function DELETE(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();
    const { eventId } = params;

    // Verify user has access to manage this event
    const hasAccess = await checkEventAccess(eventId, userId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const eventPromoterId = searchParams.get("event_promoter_id");

    if (!eventPromoterId) {
      return NextResponse.json(
        { error: "Event promoter ID is required" },
        { status: 400 }
      );
    }

    // Verify this event_promoter belongs to this event
    const { data: eventPromoter } = await serviceSupabase
      .from("event_promoters")
      .select("id")
      .eq("id", eventPromoterId)
      .eq("event_id", eventId)
      .single();

    if (!eventPromoter) {
      return NextResponse.json(
        { error: "Promoter assignment not found" },
        { status: 404 }
      );
    }

    const { error } = await serviceSupabase
      .from("event_promoters")
      .delete()
      .eq("id", eventPromoterId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error removing promoter from event:", error);
    return NextResponse.json(
      { error: error.message || "Failed to remove promoter" },
      { status: 500 }
    );
  }
}

// Helper to check if user can manage this event
async function checkEventAccess(eventId: string, userId: string): Promise<boolean> {
  const isSuperadmin = await userHasRoleOrSuperadmin("superadmin");
  if (isSuperadmin) return true;

  const serviceSupabase = createServiceRoleClient();

  // Check if user is the organizer
  const organizerId = await getUserOrganizerId();
  if (organizerId) {
    const { data: event } = await serviceSupabase
      .from("events")
      .select("organizer_id")
      .eq("id", eventId)
      .single();

    if (event?.organizer_id === organizerId) {
      return true;
    }
  }

  // Check if user is venue admin for the event's venue
  const { data: event } = await serviceSupabase
    .from("events")
    .select("venue_id, venue:venues(created_by)")
    .eq("id", eventId)
    .single();

  if (event?.venue_id) {
    const venue = Array.isArray(event.venue) ? event.venue[0] : event.venue;
    if (venue?.created_by === userId) {
      return true;
    }

    const { data: venueUser } = await serviceSupabase
      .from("venue_users")
      .select("id")
      .eq("venue_id", event.venue_id)
      .eq("user_id", userId)
      .single();

    if (venueUser) {
      return true;
    }
  }

  return false;
}

// Helper to check if user is venue admin (not just creator)
async function isVenueAdmin(eventId: string, userId: string): Promise<boolean> {
  const serviceSupabase = createServiceRoleClient();
  
  const { data: event } = await serviceSupabase
    .from("events")
    .select("venue_id, venue:venues(created_by)")
    .eq("id", eventId)
    .single();

  if (!event?.venue_id) {
    return false;
  }

  const venue = Array.isArray(event.venue) ? event.venue[0] : event.venue;
  
  // Check if user is venue creator
  if (venue?.created_by === userId) {
    return true;
  }

  // Check if user is in venue_users table
  const { data: venueUser } = await serviceSupabase
    .from("venue_users")
    .select("id")
    .eq("venue_id", event.venue_id)
    .eq("user_id", userId)
    .single();

  return !!venueUser;
}

