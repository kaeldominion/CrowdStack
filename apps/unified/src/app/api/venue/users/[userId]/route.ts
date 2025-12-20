import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { hasVenuePermission } from "@crowdstack/shared/auth/venue-permissions";
import type { VenuePermissions } from "@crowdstack/shared/types";

export async function PATCH(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    const body = await request.json();
    let { venueId, permissions } = body;

    if (!permissions) {
      return NextResponse.json(
        { error: "permissions are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // If no venueId provided, try to get user's venue
    if (!venueId) {
      const { getUserVenueId } = await import("@/lib/data/get-user-entity");
      venueId = await getUserVenueId();
      
      if (!venueId) {
        return NextResponse.json(
          { error: "No venue found. Please specify venueId or ensure you're assigned to a venue." },
          { status: 404 }
        );
      }
    }

    // Check if current user has permission to manage users
    const canManage = await hasVenuePermission(
      currentUser.id,
      venueId,
      "manage_users"
    );
    if (!canManage) {
      return NextResponse.json(
        { error: "You don't have permission to update users for this venue" },
        { status: 403 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Update user permissions
    const { data: updated, error } = await serviceSupabase
      .from("venue_users")
      .update({
        permissions: permissions as VenuePermissions,
        role: (permissions as VenuePermissions).full_admin ? "admin" : "staff",
      })
      .eq("user_id", userId)
      .eq("venue_id", venueId)
      .select()
      .single();

    if (error) {
      console.error("Error updating user permissions:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ user: updated });
  } catch (error: any) {
    console.error("Error in PATCH /api/venue/users/[userId]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    const { searchParams } = new URL(request.url);
    let finalVenueId = searchParams.get("venueId");

    // Also try to get from body if provided
    if (!finalVenueId) {
      try {
        const body = await request.json();
        finalVenueId = body.venueId;
      } catch {
        // No body or invalid JSON, continue
      }
    }

    // If still no venueId, try to get user's venue
    if (!finalVenueId) {
      const { getUserVenueId } = await import("@/lib/data/get-user-entity");
      finalVenueId = await getUserVenueId();
      
      if (!finalVenueId) {
        return NextResponse.json(
          { error: "No venue found. Please specify venueId or ensure you're assigned to a venue." },
          { status: 404 }
        );
      }
    }

    const supabase = await createClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if current user has permission to manage users
    const canManage = await hasVenuePermission(
      currentUser.id,
      finalVenueId,
      "manage_users"
    );
    if (!canManage) {
      return NextResponse.json(
        { error: "You don't have permission to remove users from this venue" },
        { status: 403 }
      );
    }

    // Don't allow removing yourself
    if (currentUser.id === userId) {
      return NextResponse.json(
        { error: "You cannot remove yourself" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Remove user from venue
    const { error } = await serviceSupabase
      .from("venue_users")
      .delete()
      .eq("user_id", userId)
      .eq("venue_id", finalVenueId);

    if (error) {
      console.error("Error removing user from venue:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/venue/users/[userId]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to remove user" },
      { status: 500 }
    );
  }
}

