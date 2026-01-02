import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/check-role";
import { getEventAccess } from "@crowdstack/shared/auth/event-permissions";

/**
 * GET /api/events/[eventId]/my-permissions
 * Returns the current user's permissions for this event
 * 
 * KEY LOGIC:
 * - Owner & superadmin always have full access
 * - Organizer team inherits their organizer permissions
 * - Venue team ONLY inherits permissions if venue owns the event
 * - Venue host (venue team on organizer's event) has very limited access
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

    // Helper to check if user has a specific permission
    const hasPermission = (permName: string): boolean => {
      // No access at all
      if (!access.hasAccess) return false;

      // Owner & superadmin have all permissions
      if (access.isOwner || access.isSuperadmin) return true;

      // Organizer creator always has full permissions for their events
      if (access.accessSource === "organizer_creator") return true;

      // Venue creator/team only has full permissions if venue OWNS the event
      if (access.accessSource === "venue_creator" && access.isOwningEntity) return true;

      // Venue host (venue team on organizer's event) - very limited
      if (access.accessSource === "venue_host") {
        // Venue hosts can only approve/reject events
        return permName === "approve_events";
      }

      // Check full_admin only for owning entity
      if (access.permissions.full_admin && access.isOwningEntity) return true;

      // Check specific permission from the permissions object
      return (access.permissions as any)[permName] === true;
    };

    // Return permissions in a format easy for the frontend to use
    const response = {
      hasAccess: access.hasAccess,
      isOwner: access.isOwner,
      isSuperadmin: access.isSuperadmin,
      accessSource: access.accessSource,
      isOwningEntity: access.isOwningEntity,
      // Flatten permissions for easy access
      permissions: {
        full_admin: hasPermission("full_admin"),
        // Core permissions
        edit_events: hasPermission("edit_events"),
        manage_promoters: hasPermission("manage_promoters"),
        view_reports: hasPermission("view_reports"),
        approve_events: hasPermission("approve_events"),
        // Event-specific permissions
        view_settings: hasPermission("view_settings"),
        closeout_event: hasPermission("closeout_event"),
        manage_door_staff: hasPermission("manage_door_staff"),
        view_financials: hasPermission("view_financials"),
        publish_photos: hasPermission("publish_photos"),
        manage_payouts: hasPermission("manage_payouts"),
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

