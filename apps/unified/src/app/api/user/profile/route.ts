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
 * Also returns:
 * - profileComplete: has all required fields for table booking (includes whatsapp, instagram)
 * - basicProfileComplete: has minimum required fields (name, surname, DOB, gender)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ profile: null, profileComplete: false, basicProfileComplete: false });
    }

    // Try to get attendee record for more complete profile
    const { data: attendee } = await supabase
      .from("attendees")
      .select("id, name, surname, email, phone, whatsapp, date_of_birth, gender, instagram_handle")
      .eq("user_id", user.id)
      .single();

    // Build profile from auth user and attendee data
    const profile = {
      name: attendee?.name || user.user_metadata?.full_name?.split(" ")[0] || user.user_metadata?.name || "",
      surname: attendee?.surname || user.user_metadata?.full_name?.split(" ").slice(1).join(" ") || "",
      email: attendee?.email || user.email || "",
      phone: attendee?.phone || user.user_metadata?.phone || user.phone || "",
      whatsapp: attendee?.whatsapp || attendee?.phone || "",
      date_of_birth: attendee?.date_of_birth || null,
      gender: attendee?.gender || null,
      instagram_handle: attendee?.instagram_handle || "",
    };

    // Check BASIC profile completeness (required at signup)
    // These are the minimum fields needed to get on a guest list
    const basicRequiredFields = [
      profile.name,
      profile.surname,
      profile.date_of_birth,
      profile.gender,
    ];
    const basicProfileComplete = basicRequiredFields.every((field) => !!field);

    // Check FULL profile completeness (required for table booking)
    const fullRequiredFields = [
      ...basicRequiredFields,
      profile.whatsapp,
      profile.instagram_handle,
    ];
    const profileComplete = fullRequiredFields.every((field) => !!field);

    // List missing fields for UI feedback
    const missingFields: string[] = [];
    if (!profile.name) missingFields.push("name");
    if (!profile.surname) missingFields.push("surname");
    if (!profile.date_of_birth) missingFields.push("date_of_birth");
    if (!profile.gender) missingFields.push("gender");
    if (!profile.whatsapp) missingFields.push("whatsapp");
    if (!profile.instagram_handle) missingFields.push("instagram_handle");

    return NextResponse.json({
      profile,
      profileComplete,
      basicProfileComplete,
      missingFields,
      attendeeId: attendee?.id || null,
    });
  } catch (error: any) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json({ profile: null, profileComplete: false, basicProfileComplete: false, missingFields: [] });
  }
}

/**
 * PUT /api/user/profile
 * Update the current user's profile fields
 *
 * Body: { name?, surname?, whatsapp?, date_of_birth?, gender?, instagram_handle? }
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
    const { name, surname, whatsapp, date_of_birth, gender, instagram_handle } = body;

    // Validate gender if provided
    if (gender && !["male", "female"].includes(gender)) {
      return NextResponse.json(
        { error: "Gender must be 'male' or 'female'" },
        { status: 400 }
      );
    }

    // Validate age if DOB provided (must be 18+)
    if (date_of_birth) {
      const dob = new Date(date_of_birth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      if (age < 18) {
        return NextResponse.json(
          { error: "You must be at least 18 years old" },
          { status: 400 }
        );
      }
    }

    // Check if attendee record exists
    const { data: existingAttendee } = await supabase
      .from("attendees")
      .select("id")
      .eq("user_id", user.id)
      .single();

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (surname !== undefined) updateData.surname = surname.trim();
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
          name: name?.trim() || user.user_metadata?.full_name?.split(" ")[0] || "",
          surname: surname?.trim() || user.user_metadata?.full_name?.split(" ").slice(1).join(" ") || "",
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
