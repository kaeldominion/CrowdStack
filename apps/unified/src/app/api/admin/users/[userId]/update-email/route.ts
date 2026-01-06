import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRole } from "@crowdstack/shared/auth/roles";

/**
 * PATCH /api/admin/users/[userId]/update-email
 * Safely update a user's email in auth.users and related records
 * This endpoint:
 * 1. Checks user's relationships (organizer, promoter, attendee)
 * 2. Updates email in auth.users
 * 3. Updates email in related records (promoters, attendees) if they exist
 * 4. Preserves all relationships
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user: adminUser },
    } = await supabase.auth.getUser();

    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await userHasRole("superadmin"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { email } = body;

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();
    const userId = params.userId;

    // First, get the current user and their relationships
    const { data: authUser, error: getUserError } =
      await serviceSupabase.auth.admin.getUserById(userId);

    if (getUserError || !authUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if email is already taken by another user
    const { data: existingUsers } = await serviceSupabase.auth.admin.listUsers();
    const emailTaken = existingUsers?.users.some(
      (u) => u.id !== userId && u.email?.toLowerCase() === email.trim().toLowerCase()
    );

    if (emailTaken) {
      return NextResponse.json(
        { error: "Email is already in use by another user" },
        { status: 409 }
      );
    }

    // Get user's relationships before updating
    const [promoterData, attendeeData, ownedOrganizersData, assignedOrganizersData] = await Promise.all([
      // Check if user has a promoter profile
      serviceSupabase
        .from("promoters")
        .select("id, name, email")
        .eq("user_id", userId)
        .maybeSingle(),
      // Check if user has an attendee profile
      serviceSupabase
        .from("attendees")
        .select("id, name, email")
        .eq("user_id", userId)
        .maybeSingle(),
      // Check if user owns any organizers
      serviceSupabase
        .from("organizers")
        .select("id, name, email")
        .eq("created_by", userId),
      // Check if user is assigned to any organizers
      serviceSupabase
        .from("organizer_users")
        .select("organizer_id, organizers(id, name)")
        .eq("user_id", userId),
    ]);

    const promoter = promoterData.data;
    const attendee = attendeeData.data;
    const ownedOrganizers = ownedOrganizersData.data || [];
    const assignedOrganizers = assignedOrganizersData.data || [];

    // Update email in auth.users
    const { data: updatedUser, error: updateError } =
      await serviceSupabase.auth.admin.updateUserById(userId, {
        email: email.trim(),
        email_confirm: true, // Auto-confirm to avoid issues
      });

    if (updateError) {
      console.error("[Update Email] Error updating auth user:", updateError);
      return NextResponse.json(
        { error: `Failed to update email: ${updateError.message}` },
        { status: 500 }
      );
    }

    // Update related records
    const updates: string[] = [];

    // Update promoter email if exists
    if (promoter) {
      const { error: promoterError } = await serviceSupabase
        .from("promoters")
        .update({ email: email.trim() })
        .eq("id", promoter.id);

      if (promoterError) {
        console.error("[Update Email] Error updating promoter:", promoterError);
        // Don't fail the whole operation, just log it
      } else {
        updates.push("promoter profile");
      }
    }

    // Update attendee email if exists
    if (attendee) {
      const { error: attendeeError } = await serviceSupabase
        .from("attendees")
        .update({ email: email.trim() })
        .eq("id", attendee.id);

      if (attendeeError) {
        console.error("[Update Email] Error updating attendee:", attendeeError);
        // Don't fail the whole operation, just log it
      } else {
        updates.push("attendee profile");
      }
    }

    // Note: We don't update organizer emails automatically as they might be different
    // (e.g., business email vs personal email)

    return NextResponse.json({
      success: true,
      message: `Email updated successfully. Updated: ${updates.join(", ") || "auth user only"}`,
      user: {
        id: updatedUser.user.id,
        email: updatedUser.user.email,
        relationships: {
          hasPromoter: !!promoter,
          hasAttendee: !!attendee,
          ownsOrganizers: ownedOrganizers.length,
          assignedToOrganizers: assignedOrganizers.length,
        },
      },
    });
  } catch (error: any) {
    console.error("[Update Email] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update email" },
      { status: 500 }
    );
  }
}

