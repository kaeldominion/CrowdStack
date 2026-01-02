import "server-only";

import { createServiceRoleClient } from "../supabase/server";
import type { VenuePermissions, OrganizerPermissions } from "../types";
import {
  FULL_ADMIN_VENUE_PERMISSIONS,
  FULL_ADMIN_ORGANIZER_PERMISSIONS,
} from "../constants/permissions";

// Combined permissions type for events
export type EventPermissions = VenuePermissions | OrganizerPermissions;

export type EventAccessSource = 
  | "owner" 
  | "superadmin" 
  | "organizer_creator" 
  | "organizer_team" 
  | "venue_creator" 
  | "venue_team" 
  | "none";

export interface EventAccessResult {
  hasAccess: boolean;
  isOwner: boolean;
  isSuperadmin: boolean;
  accessSource: EventAccessSource;
  permissions: Partial<EventPermissions>;
}

/**
 * Get a user's access details for an event
 * This is the main function for determining what a user can do with an event
 */
export async function getEventAccess(
  userId: string,
  eventId: string
): Promise<EventAccessResult> {
  const supabase = createServiceRoleClient();

  // Get event details
  const { data: event } = await supabase
    .from("events")
    .select("owner_user_id, organizer_id, venue_id")
    .eq("id", eventId)
    .single();

  if (!event) {
    return {
      hasAccess: false,
      isOwner: false,
      isSuperadmin: false,
      accessSource: "none",
      permissions: {},
    };
  }

  // Check if superadmin
  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  const roles = userRoles?.map((r) => r.role) || [];
  const isSuperadmin = roles.includes("superadmin");

  if (isSuperadmin) {
    return {
      hasAccess: true,
      isOwner: false,
      isSuperadmin: true,
      accessSource: "superadmin",
      permissions: { full_admin: true },
    };
  }

  // Check if event owner
  if (event.owner_user_id === userId) {
    return {
      hasAccess: true,
      isOwner: true,
      isSuperadmin: false,
      accessSource: "owner",
      permissions: { full_admin: true },
    };
  }

  // Check organizer team access
  if (event.organizer_id) {
    // Check if user is organizer creator
    const { data: organizer } = await supabase
      .from("organizers")
      .select("created_by")
      .eq("id", event.organizer_id)
      .single();

    if (organizer?.created_by === userId) {
      return {
        hasAccess: true,
        isOwner: false,
        isSuperadmin: false,
        accessSource: "organizer_creator",
        permissions: FULL_ADMIN_ORGANIZER_PERMISSIONS,
      };
    }

    // Check organizer_users
    const { data: organizerUser } = await supabase
      .from("organizer_users")
      .select("permissions")
      .eq("organizer_id", event.organizer_id)
      .eq("user_id", userId)
      .single();

    if (organizerUser?.permissions) {
      return {
        hasAccess: true,
        isOwner: false,
        isSuperadmin: false,
        accessSource: "organizer_team",
        permissions: organizerUser.permissions as OrganizerPermissions,
      };
    }
  }

  // Check venue team access
  if (event.venue_id) {
    // Check if user is venue creator
    const { data: venue } = await supabase
      .from("venues")
      .select("created_by")
      .eq("id", event.venue_id)
      .single();

    if (venue?.created_by === userId) {
      return {
        hasAccess: true,
        isOwner: false,
        isSuperadmin: false,
        accessSource: "venue_creator",
        permissions: FULL_ADMIN_VENUE_PERMISSIONS,
      };
    }

    // Check venue_users
    const { data: venueUser } = await supabase
      .from("venue_users")
      .select("permissions")
      .eq("venue_id", event.venue_id)
      .eq("user_id", userId)
      .single();

    if (venueUser?.permissions) {
      return {
        hasAccess: true,
        isOwner: false,
        isSuperadmin: false,
        accessSource: "venue_team",
        permissions: venueUser.permissions as VenuePermissions,
      };
    }
  }

  // No access
  return {
    hasAccess: false,
    isOwner: false,
    isSuperadmin: false,
    accessSource: "none",
    permissions: {},
  };
}

/**
 * Check if a user has a specific permission for an event
 */
export async function hasEventPermission(
  userId: string,
  eventId: string,
  permission: keyof EventPermissions
): Promise<boolean> {
  const access = await getEventAccess(userId, eventId);

  // No access at all
  if (!access.hasAccess) {
    return false;
  }

  // Owner, superadmin, or entity creator has all permissions
  if (
    access.isOwner ||
    access.isSuperadmin ||
    access.accessSource === "organizer_creator" ||
    access.accessSource === "venue_creator"
  ) {
    return true;
  }

  // Check if full_admin is true
  if (access.permissions.full_admin) {
    return true;
  }

  // Check specific permission
  return (access.permissions as any)[permission] === true;
}

/**
 * Check if user can access event settings
 */
export async function canAccessEventSettings(
  userId: string,
  eventId: string
): Promise<boolean> {
  return hasEventPermission(userId, eventId, "view_settings");
}

/**
 * Check if user can closeout an event
 */
export async function canCloseoutEvent(
  userId: string,
  eventId: string
): Promise<boolean> {
  return hasEventPermission(userId, eventId, "closeout_event");
}

/**
 * Check if user can manage door staff for an event
 */
export async function canManageDoorStaff(
  userId: string,
  eventId: string
): Promise<boolean> {
  return hasEventPermission(userId, eventId, "manage_door_staff");
}

/**
 * Check if user can view event financials
 */
export async function canViewFinancials(
  userId: string,
  eventId: string
): Promise<boolean> {
  return hasEventPermission(userId, eventId, "view_financials");
}

/**
 * Check if user can edit an event
 */
export async function canEditEvent(
  userId: string,
  eventId: string
): Promise<boolean> {
  return hasEventPermission(userId, eventId, "edit_events");
}

/**
 * Check if user can manage promoters for an event
 */
export async function canManageEventPromoters(
  userId: string,
  eventId: string
): Promise<boolean> {
  return hasEventPermission(userId, eventId, "manage_promoters");
}

/**
 * Check if user is the event owner (can transfer ownership)
 */
export async function isEventOwner(
  userId: string,
  eventId: string
): Promise<boolean> {
  const access = await getEventAccess(userId, eventId);
  return access.isOwner || access.isSuperadmin;
}

