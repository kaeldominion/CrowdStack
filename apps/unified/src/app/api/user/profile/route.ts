import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/profile
 * Get the current user's profile for pre-filling forms and checking completeness
 *
 * Returns user info from:
 * 1. Auth user metadata
 * 2. Attendee record (if exists)
 *
 * Also returns profileComplete boolean indicating if required fields are filled
 * Required for table booking: email, whatsapp, date_of_birth, gender, instagram_handle
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ profile: null, profileComplete: false });
    }

    // Try to get attendee record for more complete profile
    const { data: attendee } = await supabase
      .from("attendees")
      .select("id, name, email, phone, whatsapp, date_of_birth, gender, instagram_handle")
      .eq("user_id", user.id)
      .single();

    // Build profile from auth user and attendee data
    const profile = {
      name: attendee?.name || user.user_metadata?.full_name || user.user_metadata?.name || "",
      email: attendee?.email || user.email || "",
      phone: attendee?.phone || user.user_metadata?.phone || user.phone || "",
      whatsapp: attendee?.whatsapp || attendee?.phone || "",
      date_of_birth: attendee?.date_of_birth || null,
      gender: attendee?.gender || null,
      instagram_handle: attendee?.instagram_handle || "",
    };

    // Check if profile has all required fields for table booking
    const requiredFields = [
      profile.email,
      profile.whatsapp,
      profile.date_of_birth,
      profile.gender,
      profile.instagram_handle,
    ];
    const profileComplete = requiredFields.every((field) => !!field);

    // List missing fields for UI feedback
    const missingFields: string[] = [];
    if (!profile.whatsapp) missingFields.push("whatsapp");
    if (!profile.date_of_birth) missingFields.push("date_of_birth");
    if (!profile.gender) missingFields.push("gender");
    if (!profile.instagram_handle) missingFields.push("instagram_handle");

    return NextResponse.json({
      profile,
      profileComplete,
      missingFields,
      attendeeId: attendee?.id || null,
    });
  } catch (error: any) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json({ profile: null, profileComplete: false, missingFields: [] });
  }
}

/**
 * PUT /api/user/profile
 * Update the current user's profile fields
 *
 * Body: { whatsapp?, date_of_birth?, gender?, instagram_handle? }
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { whatsapp, date_of_birth, gender, instagram_handle } = body;

    // Validate gender if provided
    if (gender && !["male", "female"].includes(gender)) {
      return NextResponse.json(
        { error: "Gender must be 'male' or 'female'" },
        { status: 400 }
      );
    }

    // Check if attendee record exists
    const { data: existingAttendee } = await supabase
      .from("attendees")
      .select("id")
      .eq("user_id", user.id)
      .single();

    const updateData: Record<string, any> = {};
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp;
    if (date_of_birth !== undefined) updateData.date_of_birth = date_of_birth;
    if (gender !== undefined) updateData.gender = gender;
    if (instagram_handle !== undefined) updateData.instagram_handle = instagram_handle;

    if (existingAttendee) {
      // Update existing attendee
      const { error } = await supabase
        .from("attendees")
        .update(updateData)
        .eq("id", existingAttendee.id);

      if (error) {
        console.error("Error updating attendee:", error);
        return NextResponse.json(
          { error: "Failed to update profile" },
          { status: 500 }
        );
      }
    } else {
      // Create new attendee record
      const { error } = await supabase
        .from("attendees")
        .insert({
          user_id: user.id,
          name: user.user_metadata?.full_name || user.user_metadata?.name || "",
          email: user.email || "",
          ...updateData,
        });

      if (error) {
        console.error("Error creating attendee:", error);
        return NextResponse.json(
          { error: "Failed to create profile" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
