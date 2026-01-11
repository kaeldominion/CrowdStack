import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserVenueId } from "@/lib/data/get-user-entity";
import { userHasRoleOrSuperadmin, getUserId } from "@/lib/auth/check-role";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
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
    // If no organizer specified, use the venue's house organizer (create if needed)
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
      // No organizer specified - use venue's house organizer or create one
      // First, get the venue to use its name
      const { data: venue } = await serviceSupabase
        .from("venues")
        .select("id, name")
        .eq("id", venueId)
        .single();

      if (!venue) {
        return NextResponse.json({ error: "Venue not found" }, { status: 404 });
      }

      // Check if venue already has a house organizer (organizer with same name and created_by matching venue's created_by)
      const { data: existingOrganizer } = await serviceSupabase
        .from("organizers")
        .select("id")
        .eq("name", venue.name)
        .limit(1)
        .single();

      if (existingOrganizer) {
        organizerId = existingOrganizer.id;
      } else {
        // Create house organizer for the venue
        const { data: newOrganizer, error: orgError } = await serviceSupabase
          .from("organizers")
          .insert({
            name: venue.name,
            created_by: userId,
          })
          .select()
          .single();

        if (orgError) {
          throw orgError;
        }
        organizerId = newOrganizer.id;
      }
    }

    // Ensure slug is unique - generate unique slug if needed
    let finalSlug = body.slug;
    if (finalSlug) {
      const { data: existingEvent } = await serviceSupabase
        .from("events")
        .select("id")
        .eq("slug", finalSlug)
        .single();

      if (existingEvent) {
        // Slug exists, generate a unique one
        let counter = 2;
        let candidateSlug = `${finalSlug}-${counter}`;
        while (true) {
          const { data: existingWithNumber } = await serviceSupabase
            .from("events")
            .select("id")
            .eq("slug", candidateSlug)
            .single();

          if (!existingWithNumber) {
            finalSlug = candidateSlug;
            break;
          }

          counter++;
          candidateSlug = `${finalSlug}-${counter}`;

          // Safety check
          if (counter > 1000) {
            finalSlug = `${finalSlug}-${Date.now()}`;
            break;
          }
        }
      }
    } else {
      // Generate slug from name if not provided
      finalSlug = body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      // Ensure it's unique
      const { data: existingEvent } = await serviceSupabase
        .from("events")
        .select("id")
        .eq("slug", finalSlug)
        .single();

      if (existingEvent) {
        let counter = 2;
        let candidateSlug = `${finalSlug}-${counter}`;
        while (true) {
          const { data: existingWithNumber } = await serviceSupabase
            .from("events")
            .select("id")
            .eq("slug", candidateSlug)
            .single();

          if (!existingWithNumber) {
            finalSlug = candidateSlug;
            break;
          }

          counter++;
          candidateSlug = `${finalSlug}-${counter}`;

          if (counter > 1000) {
            finalSlug = `${finalSlug}-${Date.now()}`;
            break;
          }
        }
      }
    }

    // Create event
    const { data: event, error: eventError } = await serviceSupabase
      .from("events")
      .insert({
        slug: finalSlug,
        name: body.name,
        description: body.description || null,
        venue_id: venueId,
        organizer_id: organizerId,
        owner_user_id: userId, // User who creates the event is the owner
        start_time: body.start_time,
        end_time: body.end_time || null,
        capacity: body.capacity || null,
        timezone: body.timezone || "America/New_York",
        status: "draft",
        promoter_access_type: "public", // Default for venue-created events
        show_photo_email_notice: body.show_photo_email_notice || false,
        registration_type: body.registration_type || "guestlist",
        external_ticket_url: body.external_ticket_url || null,
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

