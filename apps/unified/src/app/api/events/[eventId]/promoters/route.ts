import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId, userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { getUserOrganizerId } from "@/lib/data/get-user-entity";
import { assignUserRole } from "@crowdstack/shared/auth/roles";

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
        currency,
        per_head_rate,
        per_head_min,
        per_head_max,
        bonus_threshold,
        bonus_amount,
        bonus_tiers,
        fixed_fee,
        minimum_guests,
        below_minimum_percent,
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
    const { 
      promoter_id, 
      user_id, 
      commission_type, 
      commission_config, 
      assigned_by,
      template_id, // Template to apply
      // Enhanced payout model fields (can override template)
      currency,
      per_head_rate,
      per_head_min,
      per_head_max,
      bonus_threshold,
      bonus_amount,
      bonus_tiers,
      fixed_fee,
      minimum_guests,
      below_minimum_percent,
    } = body;

    if (!promoter_id && !user_id) {
      return NextResponse.json(
        { error: "Either promoter_id or user_id is required" },
        { status: 400 }
      );
    }

    let promoter: { id: string; name: string; email?: string | null; created_by: string | null } | null = null;

    // If user_id is provided, create or find promoter profile for that user
    if (user_id) {
      // Check if user already has a promoter profile
      const { data: existingPromoter } = await serviceSupabase
        .from("promoters")
        .select("id, name, created_by")
        .eq("created_by", user_id)
        .maybeSingle();

      if (existingPromoter) {
        promoter = existingPromoter;
      } else {
        // Get user details to create promoter profile
        // Use getUserById for direct lookup instead of paginated listUsers
        const { data: userData, error: userError } = await serviceSupabase.auth.admin.getUserById(user_id);
        
        if (userError || !userData?.user) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }
        
        const user = userData.user;

        // Get attendee name if available
        const { data: attendee } = await serviceSupabase
          .from("attendees")
          .select("name")
          .eq("user_id", user_id)
          .maybeSingle();

        const promoterName = attendee?.name || 
                            user.user_metadata?.full_name || 
                            user.email?.split("@")[0] || 
                            "Unknown";

        // Create promoter profile
        const { data: newPromoter, error: createError } = await serviceSupabase
          .from("promoters")
          .insert({
            name: promoterName,
            email: user.email || null,
            created_by: user_id,
          })
          .select("id, name, created_by")
          .single();

        if (createError || !newPromoter) {
          return NextResponse.json(
            { error: "Failed to create promoter profile" },
            { status: 500 }
          );
        }

        promoter = newPromoter;
      }
    } else {
      // promoter_id was provided, fetch the promoter
      const { data: fetchedPromoter, error: promoterError } = await serviceSupabase
        .from("promoters")
        .select("id, name, email, created_by")
        .eq("id", promoter_id)
        .single();

      if (promoterError || !fetchedPromoter) {
        return NextResponse.json(
          { error: "Promoter not found" },
          { status: 404 }
        );
      }

      promoter = fetchedPromoter;
      
      // If promoter has email but no linked user, try to find and link the user
      if (!fetchedPromoter.created_by && fetchedPromoter.email) {
        // Use RPC function for scalable email lookup, fallback to listUsers
        let matchingUserId: string | null = null;
        
        const { data: rpcResults } = await serviceSupabase.rpc(
          'search_users_by_email',
          { search_term: fetchedPromoter.email.toLowerCase() }
        ).limit(1);
        
        if (rpcResults && rpcResults.length > 0) {
          // RPC found the user
          matchingUserId = rpcResults[0].id;
        } else {
          // Fallback: try listUsers with higher limit
          const { data: authUsers } = await serviceSupabase.auth.admin.listUsers({
            page: 1,
            perPage: 1000,
          });
          const matchingUser = authUsers?.users?.find(
            (u) => u.email?.toLowerCase() === fetchedPromoter.email?.toLowerCase()
          );
          if (matchingUser) {
            matchingUserId = matchingUser.id;
          }
        }
        
        if (matchingUserId) {
          // Link the promoter to the user account
          await serviceSupabase
            .from("promoters")
            .update({ created_by: matchingUserId })
            .eq("id", fetchedPromoter.id);
          
          // Update local reference for role assignment
          promoter = { ...fetchedPromoter, created_by: matchingUserId };
          
          console.log(`[Promoters API] Linked promoter ${promoter.id} to user ${matchingUserId}`);
        }
      }
    }

    // Auto-upgrade user to promoter role if they have a user account but don't have the role yet
    if (promoter.created_by) {
      const { data: existingRoles } = await serviceSupabase
        .from("user_roles")
        .select("role")
        .eq("user_id", promoter.created_by)
        .eq("role", "promoter");

      if (!existingRoles || existingRoles.length === 0) {
        // User doesn't have promoter role, assign it
        try {
          await assignUserRole(promoter.created_by, "promoter", {
            assigned_by: userId,
            assigned_via: "event_assignment",
            promoter_id: promoter.id,
          });
        } catch (roleError: any) {
          // Log but don't fail the request - promoter can still be added to event
          console.warn("Failed to assign promoter role to user:", roleError.message);
        }
      }
    }

    // Check if already assigned
    const { data: existing } = await serviceSupabase
      .from("event_promoters")
      .select("id")
      .eq("event_id", eventId)
      .eq("promoter_id", promoter.id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Promoter is already assigned to this event" },
        { status: 400 }
      );
    }

    // If template_id is provided, fetch the template and use its values as defaults
    let templateValues: any = {};
    if (template_id) {
      // Get organizer ID to verify template ownership
      const organizerId = await getUserOrganizerId();
      if (organizerId) {
        const { data: template } = await serviceSupabase
          .from("promoter_payout_templates")
          .select("*")
          .eq("id", template_id)
          .eq("organizer_id", organizerId)
          .single();

        if (template) {
          // Use template values as defaults (will be overridden by explicit body fields)
          templateValues = {
            currency: template.currency,
            per_head_rate: template.per_head_rate,
            per_head_min: template.per_head_min,
            per_head_max: template.per_head_max,
            fixed_fee: template.fixed_fee,
            minimum_guests: template.minimum_guests,
            below_minimum_percent: template.below_minimum_percent,
            bonus_threshold: template.bonus_threshold,
            bonus_amount: template.bonus_amount,
            bonus_tiers: template.bonus_tiers,
          };
        }
      }
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

    // Merge template values with explicit body values (body values take precedence)
    const finalCurrency = currency !== undefined ? currency : templateValues.currency;
    const finalPerHeadRate = per_head_rate !== undefined ? per_head_rate : templateValues.per_head_rate;
    const finalPerHeadMin = per_head_min !== undefined ? per_head_min : templateValues.per_head_min;
    const finalPerHeadMax = per_head_max !== undefined ? per_head_max : templateValues.per_head_max;
    const finalFixedFee = fixed_fee !== undefined ? fixed_fee : templateValues.fixed_fee;
    const finalMinimumGuests = minimum_guests !== undefined ? minimum_guests : templateValues.minimum_guests;
    const finalBelowMinimumPercent = below_minimum_percent !== undefined ? below_minimum_percent : templateValues.below_minimum_percent;
    const finalBonusThreshold = bonus_threshold !== undefined ? bonus_threshold : templateValues.bonus_threshold;
    const finalBonusAmount = bonus_amount !== undefined ? bonus_amount : templateValues.bonus_amount;
    const finalBonusTiers = bonus_tiers !== undefined ? bonus_tiers : templateValues.bonus_tiers;

    // Determine commission_type based on what fields are provided
    // If any enhanced fields are provided, use "enhanced", otherwise use legacy "flat_per_head"
    const hasEnhancedFields = 
      finalPerHeadRate !== undefined && finalPerHeadRate !== null || 
      finalFixedFee !== undefined && finalFixedFee !== null || 
      finalBonusThreshold !== undefined && finalBonusThreshold !== null || 
      finalBonusTiers !== undefined && finalBonusTiers !== null ||
      finalMinimumGuests !== undefined && finalMinimumGuests !== null;
    
    const finalCommissionType = hasEnhancedFields ? "enhanced" : (commission_type || "flat_per_head");
    const finalCommissionConfig = commission_config || (finalCommissionType === "flat_per_head" ? { amount_per_head: 0 } : {});

    // Add promoter to event
    const { data: eventPromoter, error } = await serviceSupabase
      .from("event_promoters")
      .insert({
        event_id: eventId,
        promoter_id: promoter.id,
        commission_type: finalCommissionType,
        commission_config: finalCommissionConfig,
        assigned_by: finalAssignedBy || "organizer",
        // Enhanced payout model fields (using merged template + body values)
        currency: finalCurrency || null,
        per_head_rate: finalPerHeadRate !== undefined && finalPerHeadRate !== null && finalPerHeadRate !== "" ? parseFloat(finalPerHeadRate) : null,
        per_head_min: finalPerHeadMin !== undefined && finalPerHeadMin !== null && finalPerHeadMin !== "" ? parseInt(finalPerHeadMin) : null,
        per_head_max: finalPerHeadMax !== undefined && finalPerHeadMax !== null && finalPerHeadMax !== "" ? parseInt(finalPerHeadMax) : null,
        bonus_threshold: finalBonusThreshold !== undefined && finalBonusThreshold !== null && finalBonusThreshold !== "" ? parseInt(finalBonusThreshold) : null,
        bonus_amount: finalBonusAmount !== undefined && finalBonusAmount !== null && finalBonusAmount !== "" ? parseFloat(finalBonusAmount) : null,
        bonus_tiers: finalBonusTiers && Array.isArray(finalBonusTiers) && finalBonusTiers.length > 0 ? finalBonusTiers : null,
        fixed_fee: finalFixedFee !== undefined && finalFixedFee !== null && finalFixedFee !== "" ? parseFloat(finalFixedFee) : null,
        minimum_guests: finalMinimumGuests !== undefined && finalMinimumGuests !== null && finalMinimumGuests !== "" ? parseInt(finalMinimumGuests) : null,
        below_minimum_percent: finalBelowMinimumPercent !== undefined && finalBelowMinimumPercent !== null && finalBelowMinimumPercent !== "" ? parseFloat(finalBelowMinimumPercent) : null,
      })
      .select(`
        id,
        commission_type,
        commission_config,
        currency,
        per_head_rate,
        per_head_min,
        per_head_max,
        bonus_threshold,
        bonus_amount,
        bonus_tiers,
        fixed_fee,
        minimum_guests,
        below_minimum_percent,
        created_at,
        promoter:promoters(id, name, email, phone, created_by)
      `)
      .single();

    if (error) {
      throw error;
    }

    // Send event assignment email (non-blocking)
    try {
      const promoter = Array.isArray(eventPromoter.promoter) 
        ? eventPromoter.promoter[0] 
        : eventPromoter.promoter;

      if (promoter?.email) {
        // Get event details with venue and flier
        const { data: event } = await serviceSupabase
          .from("events")
          .select(`
            name,
            slug,
            start_time,
            end_time,
            description,
            currency,
            flier_url,
            cover_image_url,
            venue:venues(id, name, address, city, state)
          `)
          .eq("id", eventId)
          .single();

        if (event) {
          const { sendEventAssignmentEmail } = await import("@crowdstack/shared/email/promoter-emails");
          const { sendPromoterWelcomeEmail } = await import("@crowdstack/shared/email/promoter-emails");

          // Check if this is promoter's first event (send welcome)
          const { data: otherEvents } = await serviceSupabase
            .from("event_promoters")
            .select("id")
            .eq("promoter_id", promoter.id)
            .neq("event_id", eventId)
            .limit(1);

          if (!otherEvents || otherEvents.length === 0) {
            // First event - send welcome email
            await sendPromoterWelcomeEmail(
              promoter.id,
              promoter.name,
              promoter.email,
              promoter.created_by || null
            );
          }

          // Build referral link
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crowdstack.app";
          const referralLink = `${baseUrl}/e/${event.slug}?ref=${promoter.id}`;

          // Send assignment email
          await sendEventAssignmentEmail(
            promoter.id,
            promoter.name,
            promoter.email,
            (promoter as any).created_by || null,
            {
              eventId,
              eventName: event.name,
              eventSlug: event.slug,
              eventDate: event.start_time,
              eventEndDate: event.end_time,
              eventDescription: event.description,
              venueName: (event.venue as any)?.name || null,
              venueAddress: (event.venue as any)?.address || null,
              venueCity: (event.venue as any)?.city || null,
              venueState: (event.venue as any)?.state || null,
              flierUrl: event.flier_url || event.cover_image_url || null,
              referralLink,
            },
            {
              currency: (eventPromoter as any).currency,
              per_head_rate: (eventPromoter as any).per_head_rate,
              per_head_min: (eventPromoter as any).per_head_min,
              per_head_max: (eventPromoter as any).per_head_max,
              bonus_threshold: (eventPromoter as any).bonus_threshold,
              bonus_amount: (eventPromoter as any).bonus_amount,
              bonus_tiers: (eventPromoter as any).bonus_tiers,
              fixed_fee: (eventPromoter as any).fixed_fee,
              minimum_guests: (eventPromoter as any).minimum_guests,
              below_minimum_percent: (eventPromoter as any).below_minimum_percent,
            },
            event.currency || "IDR"
          );
        }
      }
    } catch (emailError) {
      console.warn("[Promoters API] Failed to send assignment email:", emailError);
      // Don't fail the request if email fails
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

    // Support both query params and body
    const { searchParams } = new URL(request.url);
    let eventPromoterId = searchParams.get("event_promoter_id");

    // If not in query params, try body
    if (!eventPromoterId) {
      try {
        const body = await request.json();
        eventPromoterId = body.eventPromoterId || body.event_promoter_id;
      } catch {
        // Body might not be JSON or might be empty
      }
    }

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

