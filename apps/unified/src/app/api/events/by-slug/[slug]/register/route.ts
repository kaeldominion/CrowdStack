import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { generateQRPassToken } from "@crowdstack/shared/qr/generate";
import { emitOutboxEvent } from "@crowdstack/shared/outbox/emit";
import type { RegisterEventRequest } from "@crowdstack/shared";

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
    const ref = searchParams.get("ref"); // referral promoter ID

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
      // Preserve phone if not provided in update (phone is required)
      if (!body.phone && existingAttendee.phone) {
        updateData.phone = existingAttendee.phone;
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
      // Create new attendee (phone is required for new attendees)
      if (!body.phone && !body.whatsapp) {
        console.error("[Register API] Missing phone/whatsapp for new attendee");
        throw new Error("Phone number or WhatsApp is required");
      }
      if (!body.phone && body.whatsapp) {
        attendeeData.phone = body.whatsapp; // Use WhatsApp as phone if phone not provided
      }
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

    // Create registration
    const { data: registration, error: regError } = await serviceSupabase
      .from("registrations")
      .insert({
        attendee_id: attendee.id,
        event_id: event.id,
        referral_promoter_id: ref || null,
      })
      .select()
      .single();

    if (regError) {
      throw regError;
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
        venue: venue ? { id: venue.id, name: venue.name } : null,
        organizer: organizer ? { id: organizer.id, name: organizer.name } : null,
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

