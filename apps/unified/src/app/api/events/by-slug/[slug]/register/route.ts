import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { generateQRPassToken } from "@crowdstack/shared/qr/generate";
import { emitOutboxEvent } from "@crowdstack/shared/outbox/emit";
import type { RegisterEventRequest } from "@crowdstack/shared";

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = createServiceRoleClient();
    const body: RegisterEventRequest = await request.json();
    const { searchParams } = new URL(request.url);
    const ref = searchParams.get("ref"); // referral promoter ID

    // Get event by slug
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("slug", params.slug)
      .eq("status", "published")
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Find or create attendee (dedupe by phone/email)
    let attendee;
    const { data: existingAttendee } = await supabase
      .from("attendees")
      .select("*")
      .or(
        body.phone
          ? `phone.eq.${body.phone}${body.email ? ",email.eq." + body.email : ""}`
          : `email.eq.${body.email}`
      )
      .single();

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

      const { data: updated, error: updateError } = await supabase
        .from("attendees")
        .update(updateData)
        .eq("id", existingAttendee.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }
      attendee = updated;
    } else {
      // Create new attendee (phone is required for new attendees)
      if (!body.phone && !body.whatsapp) {
        throw new Error("Phone number or WhatsApp is required");
      }
      if (!body.phone && body.whatsapp) {
        attendeeData.phone = body.whatsapp; // Use WhatsApp as phone if phone not provided
      }

      const { data: created, error: createError } = await supabase
        .from("attendees")
        .insert(attendeeData)
        .select()
        .single();

      if (createError) {
        throw createError;
      }
      attendee = created;
    }

    // Check if already registered
    const { data: existingRegistration } = await supabase
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
    const { data: registration, error: regError } = await supabase
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

        await supabase.from("event_answers").insert(answers);
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
      const { data: venueData } = await supabase
        .from("venues")
        .select("id, name")
        .eq("id", event.venue_id)
        .single();
      venue = venueData;
    }

    const { data: organizerData } = await supabase
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
    return NextResponse.json(
      { error: error.message || "Failed to register" },
      { status: 500 }
    );
  }
}

