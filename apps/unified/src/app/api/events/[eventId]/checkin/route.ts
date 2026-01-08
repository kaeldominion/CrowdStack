import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { verifyQRPassToken } from "@crowdstack/shared/qr/verify";
import { emitOutboxEvent } from "@crowdstack/shared/outbox/emit";
import { cookies } from "next/headers";
import { trackCheckIn } from "@/lib/analytics/server";
import { sendBonusProgressNotification } from "@crowdstack/shared/email/bonus-notifications";
import { logActivity } from "@crowdstack/shared/activity/log-activity";

/**
 * POST /api/events/[eventId]/checkin
 * Check in an attendee via QR token or registration ID
 * 
 * Allowed roles: superadmin, door_staff, venue_admin (for their venues), event_organizer (for their events)
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const startTime = Date.now();
  const eventId = params.eventId;
  
  console.log(`[Check-in API] Starting check-in for event ${eventId}`);

  try {
    const cookieStore = await cookies();
    const supabase = await createClient();
    const serviceSupabase = createServiceRoleClient();

    // Get user - support localhost dev mode
    const localhostUser = cookieStore.get("localhost_user_id")?.value;
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || localhostUser;

    if (!userId) {
      console.log("[Check-in API] No authenticated user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`[Check-in API] User ${userId} attempting check-in`);

    // Check user roles
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roles = userRoles?.map((r) => r.role) || [];
    console.log(`[Check-in API] User roles:`, roles);

    // Superadmin can check in anyone
    const isSuperadmin = roles.includes("superadmin");
    const isDoorStaff = roles.includes("door_staff");
    const isVenueAdmin = roles.includes("venue_admin");
    const isOrganizer = roles.includes("event_organizer");

    // Check if user has access to this event
    let hasAccess = isSuperadmin || isDoorStaff;

    if (!hasAccess && (isVenueAdmin || isOrganizer)) {
      // Check if user is associated with this event
      const { data: event } = await serviceSupabase
        .from("events")
        .select(`
          id,
          venue_id,
          organizer_id,
          venue:venues(created_by),
          organizer:organizers(created_by)
        `)
        .eq("id", eventId)
        .single();

      if (event) {
        // Check venue admin access
        if (isVenueAdmin && event.venue_id) {
          const { data: venueUser } = await serviceSupabase
            .from("venue_users")
            .select("id")
            .eq("venue_id", event.venue_id)
            .eq("user_id", userId)
            .single();

          const venue = Array.isArray(event.venue) ? event.venue[0] : event.venue;
          hasAccess = hasAccess || !!venueUser || venue?.created_by === userId;
        }

        // Check organizer access
        if (isOrganizer && event.organizer_id) {
          const { data: organizerUser } = await serviceSupabase
            .from("organizer_users")
            .select("id")
            .eq("organizer_id", event.organizer_id)
            .eq("user_id", userId)
            .single();

          const organizer = Array.isArray(event.organizer) ? event.organizer[0] : event.organizer;
          hasAccess = hasAccess || !!organizerUser || organizer?.created_by === userId;
        }
      }
    }

    // Also check door_staff assignments for this specific event
    if (!hasAccess) {
      const { data: doorStaffAssignment } = await serviceSupabase
        .from("event_door_staff")
        .select("id")
        .eq("event_id", eventId)
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      hasAccess = !!doorStaffAssignment;
    }

    if (!hasAccess) {
      console.log(`[Check-in API] User ${userId} does not have access to event ${eventId}`);
      return NextResponse.json({ error: "Forbidden: No access to this event" }, { status: 403 });
    }

    console.log(`[Check-in API] Access granted for user ${userId}`);

    const body = await request.json();
    const { qr_token, registration_id } = body;

    let registrationId: string;
    let tokenSource = "registration_id";

    if (qr_token) {
      console.log(`[Check-in API] Verifying QR token`);
      tokenSource = "qr_token";
      
      try {
        const payload = verifyQRPassToken(qr_token);
        console.log(`[Check-in API] QR token verified:`, {
          registration_id: payload.registration_id,
          event_id: payload.event_id,
          attendee_id: payload.attendee_id,
        });

        if (payload.event_id !== eventId) {
          console.log(`[Check-in API] QR token event mismatch: ${payload.event_id} !== ${eventId}`);
          return NextResponse.json(
            { error: "QR code is for a different event" },
            { status: 400 }
          );
        }
        registrationId = payload.registration_id;
      } catch (error: any) {
        console.error(`[Check-in API] QR token verification failed:`, error.message);
        return NextResponse.json(
          { error: `Invalid QR code: ${error.message}` },
          { status: 400 }
        );
      }
    } else if (registration_id) {
      registrationId = registration_id;
      console.log(`[Check-in API] Using registration ID: ${registrationId}`);
    } else {
      console.log(`[Check-in API] No token or registration ID provided`);
      return NextResponse.json(
        { error: "Either qr_token or registration_id is required" },
        { status: 400 }
      );
    }

    // Get registration with attendee info
    const { data: registration, error: regError } = await serviceSupabase
      .from("registrations")
      .select(`
        id,
        event_id,
        attendee_id,
        referral_promoter_id,
        attendee:attendees(id, name, email, phone)
      `)
      .eq("id", registrationId)
      .single();

    if (regError || !registration) {
      console.log(`[Check-in API] Registration not found: ${registrationId}`);
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 }
      );
    }

    if (registration.event_id !== eventId) {
      console.log(`[Check-in API] Registration event mismatch`);
      return NextResponse.json(
        { error: "Registration is for a different event" },
        { status: 400 }
      );
    }

    const attendee = Array.isArray(registration.attendee) ? registration.attendee[0] : registration.attendee;
    const attendeeName = attendee?.name || "Unknown Attendee";
    console.log(`[Check-in API] Found registration for attendee: ${attendeeName}`);

    // Check if already checked in (idempotent)
    // Use upsert to handle race conditions gracefully
    const { data: existingCheckin } = await serviceSupabase
      .from("checkins")
      .select("*")
      .eq("registration_id", registrationId)
      .single();

    let checkin;
    let isDuplicate = false;

    if (existingCheckin) {
      console.log(`[Check-in API] Attendee ${attendeeName} already checked in at ${existingCheckin.checked_in_at}`);
      checkin = existingCheckin;
      isDuplicate = true;
    } else {
      // Try to insert, but handle unique constraint violation (race condition)
      const { data: newCheckin, error: checkinError } = await serviceSupabase
        .from("checkins")
        .insert({
          registration_id: registrationId,
          checked_in_by: userId,
        })
        .select()
        .single();

      if (checkinError) {
        // Check if it's a unique constraint violation (race condition)
        if (checkinError.code === '23505' || checkinError.message?.includes('duplicate key') || checkinError.message?.includes('unique constraint')) {
          console.log(`[Check-in API] Race condition detected, fetching existing checkin for ${attendeeName}`);
          // Another request created the checkin, fetch it
          const { data: raceCheckin } = await serviceSupabase
            .from("checkins")
            .select("*")
            .eq("registration_id", registrationId)
            .single();
          
          if (raceCheckin) {
            checkin = raceCheckin;
            isDuplicate = true;
          } else {
            // This shouldn't happen, but handle it
            console.error(`[Check-in API] Unique constraint error but couldn't fetch checkin:`, checkinError);
            throw checkinError;
          }
        } else {
          console.error(`[Check-in API] Failed to create checkin:`, checkinError);
          throw checkinError;
        }
      } else {
        checkin = newCheckin;
      }
    }

    if (!checkin) {
      throw new Error("Failed to get or create checkin");
    }

    if (isDuplicate) {
      console.log(`[Check-in API] ✅ Duplicate check-in handled gracefully for ${attendeeName} (checkin ID: ${checkin.id})`);
    } else {
      console.log(`[Check-in API] ✅ Successfully checked in ${attendeeName} (checkin ID: ${checkin.id})`);

      // Log activity (only for new check-ins, not duplicates)
      const { data: attendeeRecord } = await serviceSupabase
        .from("attendees")
        .select("user_id")
        .eq("id", registration.attendee_id)
        .single();
      
      if (attendeeRecord?.user_id) {
        await logActivity(
          attendeeRecord.user_id,
          "checkin",
          "checkin",
          checkin.id,
          {
            event_id: eventId,
            registration_id: registrationId,
            checked_in_by: userId,
            attendee_name: attendeeName,
          }
        );
      }
    }

    // Award XP for check-in using new schema (user_id) - only for new check-ins
    if (!isDuplicate) {
      try {
        // Get the user_id from the attendee record
        const { data: attendeeRecord } = await serviceSupabase
          .from("attendees")
          .select("user_id")
          .eq("id", registration.attendee_id)
          .single();
        
        if (attendeeRecord?.user_id) {
          // Use the award_xp RPC function if available, otherwise direct insert
          const { error: xpError } = await serviceSupabase.rpc("award_xp", {
            p_user_id: attendeeRecord.user_id,
            p_amount: 100,
            p_source_type: "ATTENDED_EVENT",
            p_role_context: "attendee",
            p_event_id: eventId,
            p_description: "Checked in to event",
          });
          
          if (xpError) {
            console.warn(`[Check-in API] Failed to award XP via RPC:`, xpError);
            // Fallback to direct insert
            const { error: insertError } = await serviceSupabase
              .from("xp_ledger")
              .insert({
                user_id: attendeeRecord.user_id,
                event_id: eventId,
                amount: 100,
                source_type: "ATTENDED_EVENT",
                role_context: "attendee",
                description: "Checked in to event",
              });
            if (insertError) {
              console.warn(`[Check-in API] Failed to award XP via insert:`, insertError);
            } else {
              console.log(`[Check-in API] 🎉 Awarded 100 XP to user ${attendeeRecord.user_id}`);
            }
          } else {
            console.log(`[Check-in API] 🎉 Awarded 100 XP to user ${attendeeRecord.user_id} via RPC`);
          }
        } else {
          console.warn(`[Check-in API] No user_id found for attendee ${registration.attendee_id}`);
        }
      } catch (xpAwardError) {
        console.warn(`[Check-in API] XP award error:`, xpAwardError);
      }
    }

    // Check for bonus notifications (non-blocking) - only for new check-ins
    if (!isDuplicate && registration.referral_promoter_id) {
      try {
        // Get promoter details and event promoter contract
        const { data: promoter } = await serviceSupabase
          .from("promoters")
          .select("id, name, email, created_by")
          .eq("id", registration.referral_promoter_id)
          .single();

        if (promoter) {
          const { data: eventPromoter } = await serviceSupabase
            .from("event_promoters")
            .select("bonus_threshold, bonus_amount")
            .eq("event_id", eventId)
            .eq("promoter_id", registration.referral_promoter_id)
            .single();

          if (
            eventPromoter?.bonus_threshold &&
            eventPromoter?.bonus_amount
          ) {
            // Count current check-ins for this promoter
            const { data: promoterCheckins } = await serviceSupabase
              .from("checkins")
              .select(`
                registration_id,
                registrations!inner(
                  event_id,
                  referral_promoter_id
                )
              `)
              .eq("registrations.event_id", eventId)
              .eq("registrations.referral_promoter_id", registration.referral_promoter_id)
              .is("undo_at", null);

            const checkinsCount = promoterCheckins?.length || 0;

            // Get event currency
            const { data: eventData } = await serviceSupabase
              .from("events")
              .select("name, currency")
              .eq("id", eventId)
              .single();

            if (promoter.email && eventData) {
              await sendBonusProgressNotification(
                promoter.id,
                promoter.name,
                promoter.email,
                promoter.created_by,
                eventData.name || "Event",
                eventId,
                checkinsCount,
                eventPromoter.bonus_threshold,
                eventPromoter.bonus_amount,
                eventData.currency || "IDR"
              );
            }
          }
        }
      } catch (bonusError) {
        console.warn(`[Check-in API] Bonus notification error:`, bonusError);
      }
    }

    // Try to emit outbox event (non-blocking) - only for new check-ins
    if (!isDuplicate) {
      try {
        await emitOutboxEvent("attendee_checked_in", {
          checkin_id: checkin.id,
          registration_id: registrationId,
          event_id: eventId,
          attendee_name: attendeeName,
          checked_in_by: userId,
        });
      } catch (outboxError) {
        console.warn(`[Check-in API] Failed to emit outbox event:`, outboxError);
      }

      // Track analytics event
      try {
        // Get event name for tracking
        const { data: eventData } = await serviceSupabase
          .from("events")
          .select("name")
          .eq("id", eventId)
          .single();
        
        const method = body.qr_token ? "qr_code" : "manual";
        await trackCheckIn(
          eventId,
          eventData?.name || "Unknown Event",
          registration.attendee_id,
          registrationId,
          userId,
          method,
          request
        );
      } catch (analyticsError) {
        console.warn("[Check-in API] Failed to track analytics event:", analyticsError);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Check-in API] Request completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      duplicate: isDuplicate,
      checkin,
      attendee_name: attendeeName,
      attendee_id: registration.attendee_id,
      registration_id: registrationId,
      attendee: attendee,
      message: isDuplicate 
        ? `${attendeeName} was already checked in`
        : `${attendeeName} checked in successfully`,
    });
  } catch (error: any) {
    console.error(`[Check-in API] Error:`, error);
    return NextResponse.json(
      { error: error.message || "Failed to check in" },
      { status: 500 }
    );
  }
}
