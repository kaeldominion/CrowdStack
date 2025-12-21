import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { generateQRPassToken } from "@crowdstack/shared/qr/generate";

export async function GET(
  request: NextRequest,
  { params }: { params: { registrationId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get the registration and verify ownership
    const { data: registration, error } = await supabase
      .from("registrations")
      .select(`
        id,
        event_id,
        attendee_id,
        attendee:attendees(user_id)
      `)
      .eq("id", params.registrationId)
      .single();

    if (error || !registration) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 }
      );
    }

    // Verify the user owns this registration
    const attendee = Array.isArray(registration.attendee) 
      ? registration.attendee[0] 
      : registration.attendee;
    
    if (attendee?.user_id !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Generate the QR token
    const qrToken = generateQRPassToken(
      registration.id,
      registration.event_id,
      registration.attendee_id
    );

    return NextResponse.json({ qr_token: qrToken });
  } catch (error: any) {
    console.error("[QR Token API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate QR token" },
      { status: 500 }
    );
  }
}



