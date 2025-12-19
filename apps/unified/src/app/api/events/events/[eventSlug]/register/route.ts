import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { generateQRPassToken } from "@crowdstack/shared/qr/generate";
import { emitOutboxEvent } from "@crowdstack/shared/outbox/emit";
import type { RegisterEventRequest } from "@crowdstack/shared";

export async function POST(
  request: NextRequest,
  { params }: { params: { eventSlug: string } }
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
      .eq("slug", params.eventSlug)
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

    if (existingAttendee) {
      // Update existing attendee
      const { data: updated, error: updateError } = await supabase
        .from("attendees")
        .update({
          name: body.name,
          email: body.email || existingAttendee.email,
          phone: body.phone,
        })
        .eq("id", existingAttendee.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }
      attendee = updated;
    } else {
      // Create new attendee
      const { data: created, error: createError } = await supabase
        .from("attendees")
        .insert({
          name: body.name,
          email: body.email || null,
          phone: body.phone,
        })
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

    return NextResponse.json({
      registration,
      qr_pass_token: qrToken,
      attendee,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to register" },
      { status: 500 }
    );
  }
}

