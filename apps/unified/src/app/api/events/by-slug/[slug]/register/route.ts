import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { generateQRPassToken } from "@crowdstack/shared/qr/generate";
import { emitOutboxEvent } from "@crowdstack/shared/outbox/emit";
import { sendTemplateEmail } from "@crowdstack/shared/email/template-renderer";
import type { RegisterEventRequest } from "@crowdstack/shared";
import { trackEventRegistration } from "@/lib/analytics/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  console.log("[Register API] POST request for slug:", params.slug);
  
  try {
    // Check if user is authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    console.log("[Register API] User:", user?.email || "not authenticated");
    
    const serviceSupabase = createServiceRoleClient();
    const body: RegisterEventRequest = await request.json();
    console.log("[Register API] Request body:", JSON.stringify(body, null, 2));
    
    const { searchParams } = new URL(request.url);
    const ref = searchParams.get("ref"); // referral user ID, promoter ID, or invite code
    console.log("[Register API] Referral ref parameter:", ref);
    
    // Track referral attribution - can be any user ID (not just promoter)
    let referredByUserId: string | null = null;
    let referralPromoterId: string | null = null;
    
    if (ref) {
      console.log("[Register API] Processing referral ref:", ref);
      // Check if ref is a valid UUID format (could be user ID or promoter ID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(ref)) {
        // First check if it's a promoter ID
        const { data: promoter } = await serviceSupabase
          .from("promoters")
          .select("id")
          .eq("id", ref)
          .single();
        
        if (promoter) {
          // It's a promoter ID
          referralPromoterId = ref;
          // Also set as user referral (promoters are users too)
          const { data: promoterUser } = await serviceSupabase
            .from("promoters")
            .select("created_by")
            .eq("id", ref)
            .single();
          if (promoterUser?.created_by) {
            referredByUserId = promoterUser.created_by;
          }
        } else {
          // It's likely a user ID - verify it exists
          console.log("[Register API] Checking if ref is a user ID:", ref);
          const { data: refUser, error: refUserError } = await serviceSupabase.auth.admin.getUserById(ref).catch((err) => ({ data: { user: null }, error: err }));
          console.log("[Register API] User lookup result:", { found: !!refUser?.user, error: refUserError?.message });
          if (refUser?.user) {
            referredByUserId = ref;
            console.log("[Register API] Set referredByUserId:", referredByUserId);
            // Check if this user is also a promoter
            const { data: userPromoter } = await serviceSupabase
              .from("promoters")
              .select("id")
              .eq("created_by", ref)
              .single();
            if (userPromoter) {
              referralPromoterId = userPromoter.id;
              console.log("[Register API] User is also a promoter:", referralPromoterId);
            }
          } else {
            console.log("[Register API] Ref is not a valid user or promoter ID:", ref);
          }
        }
      } else if (ref.startsWith("venue_") || ref.startsWith("organizer_")) {
        // Ignore venue/organizer refs - they're not promoter IDs
        console.log("[Register API] Ignoring non-promoter ref:", ref);
      } else if (ref.startsWith("INV-")) {
        // This is an invite code - look up the associated promoter
        console.log("[Register API] Looking up invite code:", ref);
        const { data: inviteQR } = await serviceSupabase
          .from("invite_qr_codes")
          .select("promoter_id, creator_role, created_by")
          .eq("invite_code", ref)
          .single();

        if (inviteQR) {
          // If promoter_id is set, use that (organizer created code for specific promoter)
          if (inviteQR.promoter_id) {
            referralPromoterId = inviteQR.promoter_id;
            console.log("[Register API] Found promoter from invite code promoter_id:", referralPromoterId);
            // Also set user referral
            const { data: promoterUser } = await serviceSupabase
              .from("promoters")
              .select("created_by")
              .eq("id", referralPromoterId)
              .single();
            if (promoterUser?.created_by) {
              referredByUserId = promoterUser.created_by;
            }
          } 
          // Otherwise, if creator is a promoter, get their promoter ID
          else if (inviteQR.creator_role === "promoter") {
            const { data: promoter } = await serviceSupabase
              .from("promoters")
              .select("id")
              .eq("created_by", inviteQR.created_by)
              .single();
            
            if (promoter) {
              referralPromoterId = promoter.id;
              referredByUserId = inviteQR.created_by;
              console.log("[Register API] Found promoter from invite code creator:", referralPromoterId);
            }
          } else if (inviteQR.created_by) {
            // Creator is not a promoter, but still track as user referral
            referredByUserId = inviteQR.created_by;
          }
        } else {
          console.warn("[Register API] Invite code not found:", ref);
        }
      } else {
        // Try to extract UUID if there's a prefix
        const uuidMatch = ref.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        if (uuidMatch) {
          const extractedId = uuidMatch[0];
          // Check if it's a promoter or user ID (same logic as above)
          const { data: promoter } = await serviceSupabase
            .from("promoters")
            .select("id, created_by")
            .eq("id", extractedId)
            .single();
          
          if (promoter) {
            referralPromoterId = extractedId;
            if (promoter.created_by) {
              referredByUserId = promoter.created_by;
            }
          } else {
            const { data: refUser } = await serviceSupabase.auth.admin.getUserById(extractedId).catch(() => ({ data: { user: null } }));
            if (refUser?.user) {
              referredByUserId = extractedId;
            }
          }
        } else {
          console.warn("[Register API] Invalid ref format, ignoring:", ref);
        }
      }
    }

    // Get event by slug
    console.log("[Register API] Looking for event:", params.slug);
    const { data: event, error: eventError } = await serviceSupabase
      .from("events")
      .select("*")
      .eq("slug", params.slug)
      .eq("status", "published")
      .single();

    if (eventError) {
      console.error("[Register API] Event error:", eventError);
      return NextResponse.json(
        { error: `Event not found: ${eventError.message}` },
        { status: 404 }
      );
    }
    
    if (!event) {
      console.error("[Register API] Event not found for slug:", params.slug);
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }
    
    console.log("[Register API] Found event:", event.id, event.name);

    // Find or create attendee (dedupe by phone/email or user_id if authenticated)
    let attendee;
    let existingAttendee = null;
    
    // If user is authenticated, try to find attendee by user_id first
    if (user?.id) {
      console.log("[Register API] Looking for attendee by user_id:", user.id);
      const { data: userAttendee, error: userAttendeeError } = await serviceSupabase
        .from("attendees")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (userAttendeeError && userAttendeeError.code !== "PGRST116") {
        console.error("[Register API] Error finding attendee by user_id:", userAttendeeError);
      }
      existingAttendee = userAttendee;
      console.log("[Register API] Found attendee by user_id:", !!existingAttendee);
    }
    
    // If not found by user_id, try by phone/email (only if we have valid values)
    if (!existingAttendee && (body.phone || body.email)) {
      console.log("[Register API] Looking for attendee by phone/email:", body.phone, body.email);
      
      let orQuery = "";
      if (body.phone && body.email) {
        orQuery = `phone.eq.${body.phone},email.eq.${body.email}`;
      } else if (body.phone) {
        orQuery = `phone.eq.${body.phone}`;
      } else if (body.email) {
        orQuery = `email.eq.${body.email}`;
      }
      
      if (orQuery) {
        const { data: phoneEmailAttendee, error: phoneEmailError } = await serviceSupabase
          .from("attendees")
          .select("*")
          .or(orQuery)
          .single();
        
        if (phoneEmailError && phoneEmailError.code !== "PGRST116") {
          console.error("[Register API] Error finding attendee by phone/email:", phoneEmailError);
        }
        existingAttendee = phoneEmailAttendee;
        console.log("[Register API] Found attendee by phone/email:", !!existingAttendee);
      }
    }

    // Prepare attendee data (only include fields that are provided)
    const attendeeData: any = {
      name: body.name,
    };

    if (body.surname) attendeeData.surname = body.surname;
    if (body.email) attendeeData.email = body.email;
    if (body.phone) attendeeData.phone = body.phone;
    if (body.whatsapp) attendeeData.whatsapp = body.whatsapp;
    if (body.date_of_birth) attendeeData.date_of_birth = body.date_of_birth;
    if (body.gender) attendeeData.gender = body.gender;
    if (body.instagram_handle) attendeeData.instagram_handle = body.instagram_handle.replace("@", "");
    if (body.tiktok_handle) attendeeData.tiktok_handle = body.tiktok_handle.replace("@", "");

    console.log("[Register API] Existing attendee:", existingAttendee?.id);
    console.log("[Register API] Attendee data to save:", attendeeData);

    if (existingAttendee) {
      // Update existing attendee (only update provided fields)
      const updateData: any = { ...attendeeData };
      // Preserve email if not provided in update
      if (!body.email && existingAttendee.email) {
        updateData.email = existingAttendee.email;
      }
      // Preserve phone if not provided in update (preserve existing value)
      if (!body.phone && !body.whatsapp && existingAttendee.phone) {
        updateData.phone = existingAttendee.phone;
      }
      // If WhatsApp is provided, update phone as well
      if (body.whatsapp && body.whatsapp.trim()) {
        updateData.phone = body.whatsapp;
      }
      // Link to user if authenticated and not already linked
      if (user?.id && !existingAttendee.user_id) {
        updateData.user_id = user.id;
      }

      console.log("[Register API] Updating attendee with:", updateData);
      const { data: updated, error: updateError } = await serviceSupabase
        .from("attendees")
        .update(updateData)
        .eq("id", existingAttendee.id)
        .select()
        .single();

      if (updateError) {
        console.error("[Register API] Error updating attendee:", updateError);
        throw new Error(`Failed to update attendee: ${updateError.message}`);
      }
      attendee = updated;
      console.log("[Register API] Updated attendee:", attendee.id);
    } else {
      // Create new attendee - phone/WhatsApp is optional (allowed on first registration)
      // If WhatsApp is provided, use it as phone
      if (body.whatsapp && body.whatsapp.trim()) {
        attendeeData.phone = body.whatsapp;
        attendeeData.whatsapp = body.whatsapp;
      } else if (body.phone && body.phone.trim()) {
        attendeeData.phone = body.phone;
      }
      // If neither phone nor WhatsApp is provided, phone will be null (allowed per schema)
      
      // Link to user if authenticated
      if (user?.id) {
        attendeeData.user_id = user.id;
      }
      // Ensure email is set if we have it
      if (!attendeeData.email && body.email) {
        attendeeData.email = body.email;
      }

      console.log("[Register API] Creating new attendee with:", attendeeData);
      const { data: created, error: createError } = await serviceSupabase
        .from("attendees")
        .insert(attendeeData)
        .select()
        .single();

      if (createError) {
        console.error("[Register API] Error creating attendee:", createError);
        throw new Error(`Failed to create attendee: ${createError.message}`);
      }
      attendee = created;
      console.log("[Register API] Created attendee:", attendee.id);
    }

    // Check if already registered
    const { data: existingRegistration } = await serviceSupabase
      .from("registrations")
      .select("*")
      .eq("attendee_id", attendee.id)
      .eq("event_id", event.id)
      .single();

    if (existingRegistration) {
      // Generate QR pass for existing registration
      const qrToken = generateQRPassToken(
        existingRegistration.id,
        event.id,
        attendee.id
      );

      return NextResponse.json({
        registration: existingRegistration,
        qr_pass_token: qrToken,
        attendee,
      });
    }

    // Determine default attribution if no referral promoter ID provided
    let defaultPromoterId: string | null = referralPromoterId;
    
    if (!defaultPromoterId) {
      // Try to attribute to organizer's promoter profile first
      const { data: organizer } = await serviceSupabase
        .from("organizers")
        .select("created_by")
        .eq("id", event.organizer_id)
        .single();
      
      if (organizer?.created_by) {
        // Check if organizer has a promoter profile
        const { data: organizerPromoter } = await serviceSupabase
          .from("promoters")
          .select("id")
          .eq("created_by", organizer.created_by)
          .single();
        
        if (organizerPromoter) {
          defaultPromoterId = organizerPromoter.id;
        }
      }
      
      // If no organizer promoter, try venue promoter
      if (!defaultPromoterId && event.venue_id) {
        const { data: venue } = await serviceSupabase
          .from("venues")
          .select("created_by")
          .eq("id", event.venue_id)
          .single();
        
        if (venue?.created_by) {
          // Check if venue has a promoter profile
          const { data: venuePromoter } = await serviceSupabase
            .from("promoters")
            .select("id")
            .eq("created_by", venue.created_by)
            .single();
          
          if (venuePromoter) {
            defaultPromoterId = venuePromoter.id;
          }
        }
      }
    }

    // Create registration with both referral fields
    console.log("[Register API] Creating registration with referral data:", {
      referral_promoter_id: defaultPromoterId || referralPromoterId,
      referred_by_user_id: referredByUserId,
    });
    
    const { data: registration, error: regError } = await serviceSupabase
      .from("registrations")
      .insert({
        attendee_id: attendee.id,
        event_id: event.id,
        referral_promoter_id: defaultPromoterId || referralPromoterId,
        referred_by_user_id: referredByUserId,
      })
      .select()
      .single();

    if (regError) {
      throw regError;
    }
    
    console.log("[Register API] Registration created:", {
      id: registration.id,
      referred_by_user_id: registration.referred_by_user_id,
    });

    // Update referral_clicks to mark as converted if we have a matching click
    if (referredByUserId) {
      // Find the most recent click from this referrer for this event that hasn't been converted
      const { data: recentClick } = await serviceSupabase
        .from("referral_clicks")
        .select("id")
        .eq("event_id", event.id)
        .eq("referrer_user_id", referredByUserId)
        .is("converted_at", null)
        .order("clicked_at", { ascending: false })
        .limit(1)
        .single();

      if (recentClick) {
        // Mark this click as converted
        await serviceSupabase
          .from("referral_clicks")
          .update({
            converted_at: new Date().toISOString(),
            registration_id: registration.id,
          })
          .eq("id", recentClick.id);
        
        // Track referral conversion if we have a promoter ID
        if (referralPromoterId) {
          try {
            const { trackReferralConversion } = await import("@/lib/analytics/server");
            await trackReferralConversion(
              event.id,
              referralPromoterId,
              attendee.id,
              registration.id,
              request
            );
          } catch (analyticsError) {
            console.warn("[Register API] Failed to track referral conversion:", analyticsError);
          }
        }
      }
    }

    // Save answers if provided
    if (body.answers) {
      // Get event questions
      const { data: questions } = await supabase
        .from("event_questions")
        .select("*")
        .eq("event_id", event.id);

      if (questions) {
        const answers = Object.entries(body.answers).map(([questionId, answer]) => ({
          registration_id: registration.id,
          question_id: questionId,
          answer_text: typeof answer === "string" ? answer : null,
          answer_json: typeof answer === "object" ? answer : null,
        }));

        await serviceSupabase.from("event_answers").insert(answers);
      }
    }

    // Generate QR pass
    const qrToken = generateQRPassToken(
      registration.id,
      event.id,
      attendee.id
    );

    // Emit outbox event
    await emitOutboxEvent("registration_created", {
      registration_id: registration.id,
      event_id: event.id,
      attendee_id: attendee.id,
    });

    // Track analytics event
    try {
      await trackEventRegistration(
        event.id,
        event.name || "Unknown Event",
        attendee.id,
        !!referralPromoterId || !!referredByUserId,
        request,
        referralPromoterId || undefined
      );
    } catch (analyticsError) {
      console.warn("[Register API] Failed to track analytics event:", analyticsError);
    }

    // Send registration confirmation email
    try {
      if (attendee.email) {
        // Get venue details
        let venueName = "Venue TBA";
        let venueAddress: string | null = null;
        let venueFullAddress: string | null = null;
        
        if (event.venue_id) {
          const { data: venue } = await serviceSupabase
            .from("venues")
            .select("name, address, city, state, country")
            .eq("id", event.venue_id)
            .single();
          
          if (venue) {
            venueName = venue.name;
            if (venue.address) {
              const addressParts = [venue.address, venue.city, venue.state, venue.country].filter(Boolean);
              venueAddress = addressParts.join(", ");
              venueFullAddress = addressParts.join(", ");
            }
          }
        }

        // Format date/time using the event's timezone
        const startTime = event.start_time ? new Date(event.start_time) : null;
        const eventTimezone = event.timezone || "UTC";
        
        const eventDate = startTime
          ? startTime.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              timeZone: eventTimezone,
            })
          : "TBA";
        const eventTime = startTime
          ? startTime.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              timeZone: eventTimezone,
            })
          : "TBA";

        // Build Google Maps URL
        const googleMapsUrl = venueFullAddress 
          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueFullAddress)}`
          : null;

        // Build venue address HTML (only if address exists)
        const venueAddressHtml = venueAddress
          ? `<p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 8px 0;"><strong>Address:</strong> ${googleMapsUrl ? `<a href="${googleMapsUrl}" style="color: rgba(255,255,255,0.9); text-decoration: underline;">${venueAddress}</a>` : venueAddress}</p>`
          : "";

        // Build important info HTML (only if exists)
        const importantInfoHtml = event.important_info
          ? `<div style="background: rgba(251, 191, 36, 0.1); padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FFC107;">
              <h3 style="color: #FFC107; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">⚠️ Important Info</h3>
              <p style="color: #E5E7EB; font-size: 14px; margin: 0; line-height: 1.5;">${event.important_info}</p>
            </div>`
          : "";

        // Build flier HTML (only if exists)
        const flierHtml = event.flier_url
          ? `<div style="text-align: center; margin: 20px 0;">
              <img src="${event.flier_url}" alt="${event.name}" style="max-width: 100%; max-height: 300px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);" />
            </div>`
          : "";

        await sendTemplateEmail(
          "registration_confirmation",
          attendee.email,
          attendee.user_id,
          {
            attendee_name: attendee.name || "there",
            event_name: event.name,
            event_date: eventDate,
            event_time: eventTime,
            venue_name: venueName,
            venue_address_html: venueAddressHtml,
            venue_address_text: venueAddress ? `Address: ${venueAddress}` : "",
            google_maps_url: googleMapsUrl || "",
            event_url: `${process.env.NEXT_PUBLIC_WEB_URL || "https://crowdstack.app"}/e/${event.slug}`,
            flier_html: flierHtml,
            important_info_html: importantInfoHtml,
            important_info_text: event.important_info ? `Important: ${event.important_info}` : "",
          },
          { event_id: event.id, registration_id: registration.id, attendee_id: attendee.id }
        );
      }
    } catch (emailError) {
      console.error("[Register API] Failed to send registration confirmation email:", emailError);
      // Don't fail the registration if email fails
    }

    // Get venue and organizer details for success screen
    let venue = null;
    let organizer = null;
    
    if (event.venue_id) {
      const { data: venueData } = await serviceSupabase
        .from("venues")
        .select("id, name")
        .eq("id", event.venue_id)
        .single();
      venue = venueData;
    }

    const { data: organizerData } = await serviceSupabase
      .from("organizers")
      .select("id, name")
      .eq("id", event.organizer_id)
      .single();
    organizer = organizerData;

    return NextResponse.json({
      registration,
      qr_pass_token: qrToken,
      attendee,
      event: {
        id: event.id,
        name: event.name,
        slug: event.slug,
        start_time: event.start_time,
        flier_url: event.flier_url,
        venue: venue ? { id: venue.id, name: venue.name } : null,
        organizer: organizer ? { id: organizer.id, name: organizer.name } : null,
        show_photo_email_notice: event.show_photo_email_notice || false,
      },
    });
  } catch (error: any) {
    console.error("[Register API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to register", details: error.toString() },
      { status: 500 }
    );
  }
}

