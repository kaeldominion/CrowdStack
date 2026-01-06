import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRole } from "@crowdstack/shared/auth/roles";

/**
 * PATCH /api/admin/users/[userId]/update-name
 * Safely update a user's name in attendee profile and auth metadata
 * This endpoint:
 * 1. Checks user's relationships (promoter, attendee)
 * 2. Updates name in attendees table
 * 3. Updates name in auth.users user_metadata
 * 4. Updates promoter name if exists
 * 5. Preserves all relationships
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
    const { name, surname } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
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

    // Get user's relationships before updating
    const [promoterData, attendeeData] = await Promise.all([
      // Check if user has a promoter profile
      serviceSupabase
        .from("promoters")
        .select("id, name")
        .eq("user_id", userId)
        .maybeSingle(),
      // Check if user has an attendee profile
      serviceSupabase
        .from("attendees")
        .select("id, name, surname")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    const promoter = promoterData.data;
    const attendee = attendeeData.data;

    const updates: string[] = [];

    // Update or create attendee profile
    if (attendee) {
      const { error: attendeeError } = await serviceSupabase
        .from("attendees")
        .update({
          name: name.trim(),
          surname: surname?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", attendee.id);

      if (attendeeError) {
        console.error("[Update Name] Error updating attendee:", attendeeError);
        return NextResponse.json(
          { error: `Failed to update attendee: ${attendeeError.message}` },
          { status: 500 }
        );
      }
      updates.push("attendee profile");
    } else {
      // Create attendee record if it doesn't exist
      const { error: createError } = await serviceSupabase
        .from("attendees")
        .insert({
          user_id: userId,
          name: name.trim(),
          surname: surname?.trim() || null,
          email: authUser.user.email || null,
          phone: "", // Phone is required, set empty string
        });

      if (createError) {
        console.error("[Update Name] Error creating attendee:", createError);
        return NextResponse.json(
          { error: `Failed to create attendee: ${createError.message}` },
          { status: 500 }
        );
      }
      updates.push("attendee profile (created)");
    }

    // Update auth user metadata
    const { data: updatedUser, error: updateError } =
      await serviceSupabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...authUser.user.user_metadata,
          name: name.trim(),
        },
      });

    if (updateError) {
      console.error("[Update Name] Error updating auth user:", updateError);
      // Don't fail the whole operation, just log it
    } else {
      updates.push("auth metadata");
    }

    // Update promoter name if exists
    if (promoter) {
      const { error: promoterError } = await serviceSupabase
        .from("promoters")
        .update({ name: name.trim() })
        .eq("id", promoter.id);

      if (promoterError) {
        console.error("[Update Name] Error updating promoter:", promoterError);
        // Don't fail the whole operation, just log it
      } else {
        updates.push("promoter profile");
      }
    }

    return NextResponse.json({
      success: true,
      message: `Name updated successfully. Updated: ${updates.join(", ")}`,
      user: {
        id: updatedUser.user?.id || userId,
        name: name.trim(),
        surname: surname?.trim() || null,
        relationships: {
          hasPromoter: !!promoter,
          hadAttendee: !!attendee,
        },
      },
    });
  } catch (error: any) {
    console.error("[Update Name] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update name" },
      { status: 500 }
    );
  }
}

