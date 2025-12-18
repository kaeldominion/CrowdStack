import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { verifyQRPassToken } from "@crowdstack/shared/qr/verify";
import { userHasRole } from "@crowdstack/shared/auth/roles";
import { emitOutboxEvent } from "@crowdstack/shared/outbox/emit";

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

    const body = await request.json();
    const { qr_token, registration_id } = body;

    let registrationId: string;

    if (qr_token) {
      // Verify QR token
      const payload = verifyQRPassToken(qr_token);
      if (payload.event_id !== params.eventId) {
        return NextResponse.json(
          { error: "QR token is for a different event" },
          { status: 400 }
        );
      }
      registrationId = payload.registration_id;
    } else if (registration_id) {
      registrationId = registration_id;
    } else {
      return NextResponse.json(
        { error: "Either qr_token or registration_id is required" },
        { status: 400 }
      );
    }

    // Check if already checked in (idempotent)
    const serviceSupabase = createServiceRoleClient();
    const { data: existingCheckin } = await serviceSupabase
      .from("checkins")
      .select("*")
      .eq("registration_id", registrationId)
      .single();

    if (existingCheckin) {
      return NextResponse.json({
        success: true,
        checkin: existingCheckin,
        message: "Already checked in",
      });
    }

    // Create checkin
    const { data: checkin, error: checkinError } = await serviceSupabase
      .from("checkins")
      .insert({
        registration_id: registrationId,
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
      action_type: "checkin_created",
      resource_type: "checkin",
      resource_id: checkin.id,
      metadata: {
        registration_id: registrationId,
        event_id: params.eventId,
      },
    });

    // Emit outbox event
    await emitOutboxEvent("attendee_checked_in", {
      checkin_id: checkin.id,
      registration_id: registrationId,
      event_id: params.eventId,
    });

    return NextResponse.json({
      success: true,
      checkin,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to check in" },
      { status: 500 }
    );
  }
}

