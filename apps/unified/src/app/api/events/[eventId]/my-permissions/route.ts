import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/check-role";
import { getEventAccess, type EventAccessResult } from "@crowdstack/shared/auth/event-permissions";

/**
 * GET /api/events/[eventId]/my-permissions
 * Returns the current user's permissions for this event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getEventAccess(userId, params.eventId);

    // Return permissions in a format easy for the frontend to use
    const response = {
      hasAccess: access.hasAccess,
      isOwner: access.isOwner,
      isSuperadmin: access.isSuperadmin,
      accessSource: access.accessSource,
      // Flatten permissions for easy access
      permissions: {
        full_admin: access.isOwner || access.isSuperadmin || 
          access.accessSource === "organizer_creator" || 
          access.accessSource === "venue_creator" ||
          access.permissions.full_admin === true,
        // Core permissions
        edit_events: access.isOwner || access.isSuperadmin || 
          access.accessSource === "organizer_creator" || 
          access.accessSource === "venue_creator" ||
          access.permissions.full_admin === true ||
          (access.permissions as any).edit_events === true,
        manage_promoters: access.isOwner || access.isSuperadmin || 
          access.accessSource === "organizer_creator" || 
          access.accessSource === "venue_creator" ||
          access.permissions.full_admin === true ||
          (access.permissions as any).manage_promoters === true,
        view_reports: access.isOwner || access.isSuperadmin || 
          access.accessSource === "organizer_creator" || 
          access.accessSource === "venue_creator" ||
          access.permissions.full_admin === true ||
          (access.permissions as any).view_reports === true,
        // Event-specific permissions
        view_settings: access.isOwner || access.isSuperadmin || 
          access.accessSource === "organizer_creator" || 
          access.accessSource === "venue_creator" ||
          access.permissions.full_admin === true ||
          (access.permissions as any).view_settings === true,
        closeout_event: access.isOwner || access.isSuperadmin || 
          access.accessSource === "organizer_creator" || 
          access.accessSource === "venue_creator" ||
          access.permissions.full_admin === true ||
          (access.permissions as any).closeout_event === true,
        manage_door_staff: access.isOwner || access.isSuperadmin || 
          access.accessSource === "organizer_creator" || 
          access.accessSource === "venue_creator" ||
          access.permissions.full_admin === true ||
          (access.permissions as any).manage_door_staff === true,
        view_financials: access.isOwner || access.isSuperadmin || 
          access.accessSource === "organizer_creator" || 
          access.accessSource === "venue_creator" ||
          access.permissions.full_admin === true ||
          (access.permissions as any).view_financials === true,
        publish_photos: access.isOwner || access.isSuperadmin || 
          access.accessSource === "organizer_creator" || 
          access.accessSource === "venue_creator" ||
          access.permissions.full_admin === true ||
          (access.permissions as any).publish_photos === true,
        manage_payouts: access.isOwner || access.isSuperadmin || 
          access.accessSource === "organizer_creator" || 
          access.accessSource === "venue_creator" ||
          access.permissions.full_admin === true ||
          (access.permissions as any).manage_payouts === true,
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[my-permissions] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get permissions" },
      { status: 500 }
    );
  }
}

