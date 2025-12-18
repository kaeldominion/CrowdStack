import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserVenueId } from "@/lib/data/get-user-entity";
import { userHasRoleOrSuperadmin, getUserId } from "@/lib/auth/check-role";

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await userHasRoleOrSuperadmin("venue_admin"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const serviceSupabase = createServiceRoleClient();
    
    // Check if superadmin - if so, allow selecting any venue
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    const roles = userRoles?.map((r) => r.role) || [];
    const isSuperadmin = roles.includes("superadmin");

    let venueId: string | null = null;

    if (isSuperadmin) {
      // Superadmin can use venue_id from body or first venue
      const body = await request.json();
      if (body.venue_id) {
        venueId = body.venue_id;
      } else {
        const { data: firstVenue } = await serviceSupabase
          .from("venues")
          .select("id")
          .limit(1)
          .single();
        venueId = firstVenue?.id || null;
      }
    } else {
      venueId = await getUserVenueId();
    }

    if (!venueId) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    const body = await request.json();

    // Get or create organizer
    let organizerId: string;

    if (body.create_new_organizer && body.new_organizer_name) {
      // Create new organizer
      const { data: newOrganizer, error: orgError } = await serviceSupabase
        .from("organizers")
        .insert({
          name: body.new_organizer_name,
          created_by: userId,
        })
        .select()
        .single();

      if (orgError) {
        throw orgError;
      }
      organizerId = newOrganizer.id;
    } else if (body.organizer_id) {
      organizerId = body.organizer_id;
    } else {
      return NextResponse.json(
        { error: "Organizer is required" },
        { status: 400 }
      );
    }

    // Create event
    const { data: event, error: eventError } = await serviceSupabase
      .from("events")
      .insert({
        slug: body.slug,
        name: body.name,
        description: body.description || null,
        venue_id: venueId,
        organizer_id: organizerId,
        start_time: body.start_time,
        end_time: body.end_time || null,
        capacity: body.capacity || null,
        status: "draft",
        promoter_access_type: "public", // Default for venue-created events
      })
      .select()
      .single();

    if (eventError) {
      throw eventError;
    }

    // Add promoters if provided
    if (body.promoters && body.promoters.length > 0) {
      const eventPromoters = body.promoters.map((p: any) => ({
        event_id: event.id,
        promoter_id: p.promoter_id,
        commission_type: p.commission_type || "flat_per_head",
        commission_config: p.commission_config || { amount_per_head: 0 },
      }));

      await serviceSupabase.from("event_promoters").insert(eventPromoters);
    }

    return NextResponse.json({ event });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create event" },
      { status: 500 }
    );
  }
}

