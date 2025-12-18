import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRole } from "@crowdstack/shared/auth/roles";
import type { QuickAddRequest } from "@crowdstack/shared";

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify door_staff role
    if (!(await userHasRole("door_staff"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body: QuickAddRequest = await request.json();
    const serviceSupabase = createServiceRoleClient();

    // Find or create attendee
    let attendee;
    const { data: existingAttendee } = await serviceSupabase
      .from("attendees")
      .select("*")
      .or(
        body.phone
          ? `phone.eq.${body.phone}${body.email ? ",email.eq." + body.email : ""}`
          : `email.eq.${body.email}`
      )
      .single();

    if (existingAttendee) {
      attendee = existingAttendee;
    } else {
      const { data: created, error: createError } = await serviceSupabase
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

    // Create registration
    const { data: registration, error: regError } = await serviceSupabase
      .from("registrations")
      .insert({
        attendee_id: attendee.id,
        event_id: params.eventId,
        referral_promoter_id: body.promoter_id || null,
      })
      .select()
      .single();

    if (regError) {
      throw regError;
    }

    // Create checkin immediately
    const { data: checkin, error: checkinError } = await serviceSupabase
      .from("checkins")
      .insert({
        registration_id: registration.id,
        checked_in_by: user.id,
      })
      .select()
      .single();

    if (checkinError) {
      throw checkinError;
    }

    // Log audit
    await serviceSupabase.from("audit_logs").insert({
      user_id: user.id,
      action_type: "quick_add_created",
      resource_type: "checkin",
      resource_id: checkin.id,
      metadata: {
        registration_id: registration.id,
        event_id: params.eventId,
        notes: body.notes,
      },
    });

    return NextResponse.json({
      attendee,
      registration,
      checkin,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to quick add" },
      { status: 500 }
    );
  }
}

