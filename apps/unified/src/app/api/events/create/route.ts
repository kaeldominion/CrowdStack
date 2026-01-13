import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { getUserOrganizerId } from "@/lib/data/get-user-entity";
import { emitOutboxEvent } from "@crowdstack/shared/outbox/emit";
import type { CreateEventRequest } from "@crowdstack/shared";
import { notifyVenueOfPendingEvent, notifyVenueOfAutoApprovedEvent } from "@crowdstack/shared/notifications/send";
import { trackEventCreated } from "@/lib/analytics/server";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let userId = user?.id;

    // If no user from Supabase client, try reading from localhost cookie
    if (!userId) {
      const { getUserId } = await import("@/lib/auth/check-role");
      userId = (await getUserId()) ?? undefined;
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify organizer role or superadmin
    if (!(await userHasRoleOrSuperadmin("event_organizer"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body: CreateEventRequest = await request.json();
    const serviceSupabase = createServiceRoleClient();

    // Get organizer ID - if superadmin, use first organizer or create one
    let organizer;
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    const roles = userRoles?.map((r) => r.role) || [];
    const isSuperadmin = roles.includes("superadmin");

    if (isSuperadmin) {
      // Superadmin can use any organizer or create one
      if (body.organizer_id) {
        const { data: org } = await serviceSupabase
          .from("organizers")
          .select("id")
          .eq("id", body.organizer_id)
          .single();
        organizer = org;
      } else {
        // Use first organizer or create a default one
        const { data: firstOrg } = await serviceSupabase
          .from("organizers")
          .select("id")
          .limit(1)
          .single();
        
        if (firstOrg) {
          organizer = firstOrg;
        } else {
          // Create a default organizer for superadmin
          const { data: newOrg } = await serviceSupabase
            .from("organizers")
            .insert({
              name: "Admin Organizer",
              created_by: userId,
            })
            .select()
            .single();
          organizer = newOrg;
        }
      }
    } else {
      // Regular organizer - get their organizer ID (checks organizer_users table first, then created_by)
      const organizerId = await getUserOrganizerId();
      
      if (!organizerId) {
        return NextResponse.json(
          { error: "Organizer profile not found" },
          { status: 400 }
        );
      }
      
      // Get organizer record
      const { data: org } = await serviceSupabase
        .from("organizers")
        .select("id")
        .eq("id", organizerId)
        .single();
      organizer = org;
    }

    if (!organizer) {
      return NextResponse.json(
        { error: "Organizer profile not found" },
        { status: 400 }
      );
    }

    // Determine venue approval status
    let venueApprovalStatus = "not_required";
    let autoApproved = false;
    
    // Check if user is a superadmin without organizer role (admin-created events)
    const isActingAsOrganizer = roles.includes("event_organizer");
    const isPureSuperadmin = isSuperadmin && !isActingAsOrganizer;
    
    if (body.venue_id) {
      // Check if there's a partnership that allows auto-approval
      const { data: partnership } = await serviceSupabase
        .from("venue_organizer_partnerships")
        .select("auto_approve")
        .eq("venue_id", body.venue_id)
        .eq("organizer_id", organizer.id)
        .single();

      if (partnership?.auto_approve) {
        // Pre-approved organizer
        venueApprovalStatus = "approved";
        autoApproved = true;
      } else if (isPureSuperadmin) {
        // Admin-created events are auto-approved
        venueApprovalStatus = "approved";
        autoApproved = true;
      } else {
        // Regular organizer (or superadmin+organizer) needs venue approval
        venueApprovalStatus = "pending";
      }
    }
    
    console.log("[Event Creation] Venue approval status:", {
      venue_id: body.venue_id,
      organizer_id: organizer.id,
      venueApprovalStatus,
      autoApproved,
      isSuperadmin,
      isActingAsOrganizer,
      isPureSuperadmin,
    });

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

    // Validate max_guestlist_size when guestlist is enabled
    const maxGuestlistSize = body.max_guestlist_size 
      ? (typeof body.max_guestlist_size === 'number' 
          ? body.max_guestlist_size 
          : parseInt(String(body.max_guestlist_size)))
      : null;
    if (body.has_guestlist !== false && !maxGuestlistSize) {
      return NextResponse.json(
        { error: "Max guestlist size is required when guestlist registration is enabled" },
        { status: 400 }
      );
    }

    // Create event
    const { data: event, error: eventError } = await serviceSupabase
      .from("events")
      .insert({
        slug: finalSlug,
        name: body.name,
        description: body.description || null,
        venue_id: body.venue_id || null,
        organizer_id: organizer.id,
        owner_user_id: userId, // User who creates the event is the owner
        start_time: body.start_time,
        end_time: body.end_time || null,
        max_guestlist_size: maxGuestlistSize,
        cover_image_url: body.cover_image_url || null,
        timezone: body.timezone || "America/New_York",
        status: "draft",
        promoter_access_type: body.promoter_access_type || "public",
        venue_approval_status: venueApprovalStatus,
        venue_approval_at: autoApproved ? new Date().toISOString() : null,
        show_photo_email_notice: body.show_photo_email_notice || false,
        has_guestlist: body.has_guestlist ?? true,
        ticket_sale_mode: body.ticket_sale_mode || "none",
        is_public: body.is_public ?? true,
        external_ticket_url: body.ticket_sale_mode === "external" ? (body.external_ticket_url || null) : null,
      })
      .select()
      .single();

    if (eventError) {
      throw eventError;
    }

    // Send notification to venue admins
    if (body.venue_id) {
      try {
        // Get organizer name for notification
        const { data: org } = await serviceSupabase
          .from("organizers")
          .select("name")
          .eq("id", organizer.id)
          .single();

        const organizerName = org?.name || "An organizer";

        if (venueApprovalStatus === "pending") {
          // Notify venue that approval is needed
          console.log("[Event Creation] Sending pending notification to venue:", body.venue_id);
          await notifyVenueOfPendingEvent(
            body.venue_id,
            event.id,
            body.name,
            organizerName
          );
        } else if (autoApproved && !isPureSuperadmin) {
          // Notify venue about auto-approved event (from pre-approved organizer)
          // Skip notification for admin-created events
          console.log("[Event Creation] Sending auto-approved notification to venue:", body.venue_id);
          await notifyVenueOfAutoApprovedEvent(
            body.venue_id,
            event.id,
            body.name,
            organizerName
          );
        }
      } catch (notifyError) {
        // Don't fail event creation if notification fails
        console.error("Failed to send venue notification:", notifyError);
      }
    }

    // Create event_promoters if provided
    if (body.promoters && body.promoters.length > 0) {
      const eventPromoters = body.promoters.map((p) => ({
        event_id: event.id,
        promoter_id: p.promoter_id,
        commission_type: p.commission_type,
        commission_config: p.commission_config,
      }));

      await serviceSupabase.from("event_promoters").insert(eventPromoters);
    }

    // Handle self-promotion (default to true)
    const selfPromote = body.self_promote !== undefined ? body.self_promote : true;
    if (selfPromote) {
      // Check if organizer has a promoter profile
      const { data: organizerPromoter } = await serviceSupabase
        .from("promoters")
        .select("id")
        .eq("created_by", userId)
        .single();

      if (organizerPromoter) {
        // Check if already assigned
        const { data: existing } = await serviceSupabase
          .from("event_promoters")
          .select("id")
          .eq("event_id", event.id)
          .eq("promoter_id", organizerPromoter.id)
          .single();

        if (!existing) {
          await serviceSupabase.from("event_promoters").insert({
            event_id: event.id,
            promoter_id: organizerPromoter.id,
            commission_type: "flat_per_head",
            commission_config: { amount_per_head: 0 },
          });
        }
      }
    }

    // Emit outbox event
    await emitOutboxEvent("event_created", {
      event_id: event.id,
      organizer_id: organizer.id,
    });

    // Track analytics event
    try {
      await trackEventCreated(
        event.id,
        event.name || "Unknown Event",
        organizer.id,
        request,
        event.venue_id || undefined
      );
    } catch (analyticsError) {
      console.warn("[Create Event API] Failed to track analytics event:", analyticsError);
    }

    return NextResponse.json({ event });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create event" },
      { status: 500 }
    );
  }
}

