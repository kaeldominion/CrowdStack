import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import jwt from "jsonwebtoken";

// Use the same secret as generation in packages/shared/src/qr/generate.ts
const DEV_SECRET = "crowdstack-dev-jwt-secret-do-not-use-in-production";
const JWT_SECRET = process.env.JWT_SECRET || DEV_SECRET;

interface QRTokenPayload {
  registration_id: string;
  event_id: string;
  attendee_id: string;
  iat: number;
  exp: number;
}

/**
 * POST /api/pass/validate
 * Validates a QR pass token and returns full pass details
 */
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Decode and verify the token
    let payload: QRTokenPayload;
    try {
      payload = jwt.verify(token, JWT_SECRET) as QRTokenPayload;
    } catch (err) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Fetch registration with attendee and event details
    const { data: registration, error: regError } = await serviceSupabase
      .from("registrations")
      .select(`
        id,
        status,
        attendee:attendees(id, name, surname, email),
        event:events(
          id,
          name,
          slug,
          start_time,
          end_time,
          flier_url,
          cover_image_url,
          venue:venues(id, name, slug)
        )
      `)
      .eq("id", payload.registration_id)
      .single();

    if (regError || !registration) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    const attendee = Array.isArray(registration.attendee)
      ? registration.attendee[0]
      : registration.attendee;
    
    const event = Array.isArray(registration.event)
      ? registration.event[0]
      : registration.event;

    const venue = event?.venue 
      ? (Array.isArray(event.venue) ? event.venue[0] : event.venue)
      : null;

    // Generate attendee display name (full name)
    const attendeeName = [attendee?.name, attendee?.surname].filter(Boolean).join(" ") || attendee?.email?.split("@")[0] || "Guest";

    return NextResponse.json({
      valid: true,
      registration: {
        id: registration.id,
        status: registration.status,
      },
      attendee: {
        id: attendee?.id,
        name: attendeeName,
      },
      event: event ? {
        id: event.id,
        name: event.name,
        slug: event.slug,
        start_time: event.start_time,
        end_time: event.end_time,
        flier_url: event.flier_url || event.cover_image_url,
        venue: venue ? {
          id: venue.id,
          name: venue.name,
          slug: venue.slug,
        } : null,
      } : null,
    });
  } catch (error: any) {
    console.error("[Pass Validate API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to validate pass" },
      { status: 500 }
    );
  }
}

