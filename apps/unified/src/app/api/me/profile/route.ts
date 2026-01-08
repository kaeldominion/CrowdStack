import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get attendee profile
    const { data: attendee } = await serviceSupabase
      .from("attendees")
      .select("*")
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({
      profile: {
        id: user.id,
        email: user.email,
        name: attendee?.name || user.user_metadata?.name || null,
        phone: attendee?.phone || null,
        attendee_id: attendee?.id || null,
      },
    });
  } catch (error: any) {
    console.error("Error getting profile:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, phone } = body;

    const serviceSupabase = createServiceRoleClient();

    // Check if attendee exists
    const { data: existingAttendee } = await serviceSupabase
      .from("attendees")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existingAttendee) {
      // Update existing attendee
      const { error } = await serviceSupabase
        .from("attendees")
        .update({
          name: name || null,
          email: email || null,
          phone: phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingAttendee.id);

      if (error) throw error;
    } else {
      // Create new attendee record
      const { error } = await serviceSupabase.from("attendees").insert({
        user_id: user.id,
        name: name || null,
        email: email || user.email || null,
        phone: phone || null,
      });

      if (error) throw error;
    }

    // Also update auth metadata for name
    if (name) {
      await supabase.auth.updateUser({
        data: { name },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update profile" },
      { status: 500 }
    );
  }
}

