import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId, userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { getUserOrganizerId } from "@/lib/data/get-user-entity";
import { assignUserRole } from "@crowdstack/shared/auth/roles";
import { logActivity } from "@crowdstack/shared/activity/log-activity";
import type { Venue, Promoter } from "@crowdstack/shared/types";
import { ApiError } from "@/lib/api/error-response";

// Helper type for Supabase nested queries (can be array or single object)
type SupabaseRelation<T> = T | T[] | null;

// Type for event with venue relation
interface EventWithVenue {
  id: string;
  name: string;
  slug: string;
  start_time: string;
  end_time: string | null;
  description: string | null;
  flier_url: string | null;
  cover_image_url: string | null;
  venue: SupabaseRelation<Pick<Venue, "id" | "name" | "address" | "city" | "state">>;
}

// Type for event promoter commission config
interface EventPromoterCommission {
  currency?: string | null;
  per_head_rate?: number | null;
  per_head_min?: number | null;
  per_head_max?: number | null;
  bonus_threshold?: number | null;
  bonus_amount?: number | null;
  bonus_tiers?: unknown[] | null;
  fixed_fee?: number | null;
  minimum_guests?: number | null;
  below_minimum_percent?: number | null;
}

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
      return ApiError.forbidden();
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
    // Log to Sentry in production, console in development
    if (process.env.NODE_ENV === "production") {
      const Sentry = await import("@sentry/nextjs");
      Sentry.captureException(error);
    } else {
      console.error("Error loading event promoters:", error);
    }
    return ApiError.fromError(error, "Failed to load promoters");
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
      return ApiError.badRequest("Either promoter_id or user_id is required");
    }

    let promoter: { id: string; name: string; email?: string | null; created_by: string | null } | null = null;

    // If user_id is provided, create or find promoter profile for that user
    if (user_id) {
      // Check if user already has a promoter profile (check both user_id and created_by for legacy support)
      const { data: existingPromoter } = await serviceSupabase
        .from("promoters")
        .select("id, name, created_by, user_id")
        .or(`user_id.eq.${user_id},created_by.eq.${user_id}`)
        .maybeSingle();

      if (existingPromoter) {
        promoter = existingPromoter;
      } else {
        // Get user details to create promoter profile
        // Use getUserById for direct lookup instead of paginated listUsers
        const { data: userData, error: userError } = await serviceSupabase.auth.admin.getUserById(user_id);
        
        if (userError || !userData?.user) {
          return ApiError.notFound("User not found");
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
            user_id: user_id,
            created_by: user_id,
          })
          .select("id, name, created_by, user_id")
          .single();

        if (createError || !newPromoter || !newPromoter.id) {
          return ApiError.internal("Failed to create promoter profile");
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
        return ApiError.notFound("Promoter not found");
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
          
          if (process.env.NODE_ENV === "development") {
            console.log(`[Promoters API] Linked promoter ${promoter.id} to user ${matchingUserId}`);
          }
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
          if (process.env.NODE_ENV === "development") {
            console.warn("Failed to assign promoter role to user:", roleError.message);
          }
        }
      }
    }

    // Check if already assigned
    const { data: existing, error: existingError } = await serviceSupabase
      .from("event_promoters")
      .select("id")
      .eq("event_id", eventId)
      .eq("promoter_id", promoter.id)
      .maybeSingle();

    // If error is not "not found", it's a real error
    if (existingError && existingError.code !== "PGRST116") {
      if (process.env.NODE_ENV === "development") {
        console.error("[Promoters API] Error checking existing assignment:", existingError);
      }
      return ApiError.internal("Failed to check existing assignment");
    }

    if (existing && existing.id) {
      return ApiError.conflict("Promoter is already assigned to this event");
    }

    // If template_id is provided, fetch the template and use its values as defaults
    let templateValues: any = {};
    if (template_id) {
      // Get organizer ID to verify template ownership
      const organizerId = await getUserOrganizerId();
      if (organizerId) {
        const { data: template, error: templateError } = await serviceSupabase
          .from("promoter_payout_templates")
          .select("*")
          .eq("id", template_id)
          .eq("organizer_id", organizerId)
          .maybeSingle();

        if (templateError && templateError.code !== "PGRST116") {
          if (process.env.NODE_ENV === "development") {
            console.error("[Promoters API] Error fetching template:", templateError);
          }
          // Continue without template if there's an error
        } else if (template && template.id) {
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
          const { data: event, error: eventCheckError } = await serviceSupabase
            .from("events")
            .select("organizer_id")
            .eq("id", eventId)
            .maybeSingle();
          
          if (eventCheckError && eventCheckError.code !== "PGRST116") {
            if (process.env.NODE_ENV === "development") {
              console.error("[Promoters API] Error checking event organizer:", eventCheckError);
            }
            // Continue with default assigned_by if there's an error
          } else if (event && event.organizer_id === organizerId) {
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
      if (process.env.NODE_ENV === "development") {
        console.error("[Promoters API] Failed to insert event_promoter:", error);
      }
      throw error;
    }

    // Verify the insert actually worked by fetching it back
    if (!eventPromoter || !eventPromoter.id) {
      if (process.env.NODE_ENV === "development") {
        console.error("[Promoters API] Insert succeeded but no data returned");
      }
      return ApiError.internal("Failed to add promoter - insert returned no data");
    }

    // Validate promoter data exists
    if (!promoter || !promoter.id) {
      return ApiError.internal("Invalid promoter data");
    }

    // Log activity
    await logActivity(
      userId,
      "promoter_assign",
      "promoter",
      promoter.id,
      {
        event_id: eventId,
        promoter_name: promoter.name,
        commission_type: finalCommissionType,
        assigned_by: finalAssignedBy,
      }
    );

    // Send event assignment email (non-blocking)
    try {
      const promoter = Array.isArray(eventPromoter.promoter) 
        ? eventPromoter.promoter[0] 
        : eventPromoter.promoter;

      if (process.env.NODE_ENV === "development") {
        console.log("[Promoters API] Email flow - promoter data:", {
          promoterId: promoter?.id,
          promoterName: promoter?.name,
          promoterEmail: promoter?.email,
          promoterCreatedBy: promoter?.created_by,
          hasPromoter: !!promoter,
        });
      }

      if (!promoter) {
        if (process.env.NODE_ENV === "development") {
          console.error("[Promoters API] ERROR: Promoter object is null/undefined in response");
        }
      } else if (!promoter.email) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[Promoters API] WARNING: Promoter has no email address, skipping email. Promoter ID:", promoter.id);
        }
      } else {
        // Get event details with venue and flier
        const { data: event, error: eventError } = await serviceSupabase
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

        if (eventError) {
          if (process.env.NODE_ENV === "development") {
            console.error("[Promoters API] ERROR: Failed to fetch event for email:", eventError);
          }
        } else if (!event) {
          if (process.env.NODE_ENV === "development") {
            console.error("[Promoters API] ERROR: Event not found for email. EventId:", eventId);
          }
        } else {
          // Helper to extract venue from Supabase relation (array or single object)
          const getVenue = (venue: SupabaseRelation<Pick<Venue, "id" | "name" | "address" | "city" | "state">>): Pick<Venue, "id" | "name" | "address" | "city" | "state"> | null => {
            if (!venue) return null;
            return Array.isArray(venue) ? venue[0] : venue;
          };
          
          const eventVenue = getVenue((event as unknown as EventWithVenue).venue);
          
          if (process.env.NODE_ENV === "development") {
            console.log("[Promoters API] Fetched event for email:", {
              eventName: event.name,
              eventSlug: event.slug,
              venueName: eventVenue?.name,
            });
          }

          const { sendEventAssignmentEmail } = await import("@crowdstack/shared/email/promoter-emails");
          const { sendPromoterWelcomeEmail } = await import("@crowdstack/shared/email/promoter-emails");

          // Check if this is promoter's first event (send welcome)
          const { data: otherEvents } = await serviceSupabase
            .from("event_promoters")
            .select("id")
            .eq("promoter_id", promoter.id)
            .neq("event_id", eventId)
            .limit(1);

          const isFirstEvent = !otherEvents || otherEvents.length === 0;
          if (process.env.NODE_ENV === "development") {
            console.log("[Promoters API] Is first event for promoter?", isFirstEvent);
          }

          if (isFirstEvent) {
            // First event - send welcome email with event_id for tracking
            if (process.env.NODE_ENV === "development") {
              console.log("[Promoters API] Sending welcome email to:", promoter.email);
            }
            const welcomeResult = await sendPromoterWelcomeEmail(
              promoter.id,
              promoter.name,
              promoter.email,
              promoter.created_by || null,
              eventId
            );
            if (process.env.NODE_ENV === "development") {
              console.log("[Promoters API] Welcome email result:", welcomeResult);
            }
          }

          // Build referral link
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crowdstack.app";
          const referralLink = `${baseUrl}/e/${event.slug}?ref=${promoter.id}`;

          // Send assignment email
          if (process.env.NODE_ENV === "development") {
            console.log("[Promoters API] Sending assignment email to:", promoter.email);
          }
          const assignmentVenue = getVenue((event as unknown as EventWithVenue).venue);
          const commission = eventPromoter as EventPromoterCommission;
          
          const assignmentResult = await sendEventAssignmentEmail(
            promoter.id,
            promoter.name,
            promoter.email,
            (promoter as Promoter).created_by || null,
            {
              eventId,
              eventName: event.name,
              eventSlug: event.slug,
              eventDate: event.start_time,
              eventEndDate: event.end_time,
              eventDescription: event.description,
              venueName: assignmentVenue?.name || null,
              venueAddress: assignmentVenue?.address || null,
              venueCity: assignmentVenue?.city || null,
              venueState: assignmentVenue?.state || null,
              flierUrl: event.flier_url || event.cover_image_url || null,
              referralLink,
            },
            {
              currency: commission.currency || null,
              per_head_rate: commission.per_head_rate || null,
              per_head_min: commission.per_head_min || null,
              per_head_max: commission.per_head_max || null,
              bonus_threshold: commission.bonus_threshold || null,
              bonus_amount: commission.bonus_amount || null,
              bonus_tiers: (Array.isArray(commission.bonus_tiers) ? commission.bonus_tiers : null) as unknown as { threshold: number; amount: number; repeatable: boolean; label?: string }[] | null | undefined,
              fixed_fee: commission.fixed_fee || null,
              minimum_guests: commission.minimum_guests || null,
              below_minimum_percent: commission.below_minimum_percent || null,
            },
            event.currency || "IDR"
          );
          console.log("[Promoters API] Assignment email result:", assignmentResult);
          
          if (assignmentResult.success) {
            console.log("[Promoters API] ✓ Email sent successfully to:", promoter.email);
          } else {
            console.error("[Promoters API] ✗ Email failed:", assignmentResult);
          }
        }
      }
    } catch (emailError) {
      if (process.env.NODE_ENV === "development") {
        console.error("[Promoters API] EXCEPTION in email flow:", emailError);
      }
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
    // Log to Sentry in production, console in development
    if (process.env.NODE_ENV === "production") {
      const Sentry = await import("@sentry/nextjs");
      Sentry.captureException(error);
    } else {
      console.error("Error adding promoter to event:", error);
    }
    return ApiError.fromError(error, "Failed to add promoter");
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
      return ApiError.forbidden();
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
      return ApiError.badRequest("Event promoter ID is required");
    }

    // Verify this event_promoter belongs to this event
    const { data: eventPromoter, error: eventPromoterError } = await serviceSupabase
      .from("event_promoters")
      .select("id, event_id")
      .eq("id", eventPromoterId)
      .maybeSingle();

    if (eventPromoterError && eventPromoterError.code !== "PGRST116") {
      if (process.env.NODE_ENV === "development") {
        console.error("[Promoters API] Error fetching event promoter:", eventPromoterError);
      }
      return ApiError.internal("Failed to fetch promoter assignment");
    }

    if (!eventPromoter || !eventPromoter.id || eventPromoter.event_id !== eventId) {
      return ApiError.notFound("Promoter assignment not found");
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
    // Log to Sentry in production, console in development
    if (process.env.NODE_ENV === "production") {
      const Sentry = await import("@sentry/nextjs");
      Sentry.captureException(error);
    } else {
      console.error("Error removing promoter from event:", error);
    }
    return ApiError.fromError(error, "Failed to remove promoter");
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

