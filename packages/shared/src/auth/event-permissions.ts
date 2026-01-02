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
  | "venue_host"  // Venue team member for an organizer's event (limited access)
  | "none";

export interface EventAccessResult {
  hasAccess: boolean;
  isOwner: boolean;
  isSuperadmin: boolean;
  accessSource: EventAccessSource;
  permissions: Partial<EventPermissions>;
  isOwningEntity: boolean; // True if user's entity owns this event
}

// Limited permissions for venue team when they're just hosting (not owning) an event
// They can view and approve/reject, but NOT access financials, settings, closeout, etc.
const VENUE_HOST_PERMISSIONS: Partial<VenuePermissions> = {
  approve_events: true,
  view_reports: false, // Can't see organizer's detailed reports
  edit_events: false, // Can't edit organizer's event
  manage_promoters: false,
  manage_guests: false,
  full_admin: false,
  closeout_event: false,
  view_settings: false,
  manage_door_staff: false,
  view_financials: false,
};

/**
 * Determine if the event is owned by the organizer entity or the venue entity
 * Returns: 'organizer' | 'venue' | 'unknown'
 */
async function determineOwningEntity(
  supabase: ReturnType<typeof createServiceRoleClient>,
  event: { owner_user_id: string | null; organizer_id: string | null; venue_id: string | null }
): Promise<"organizer" | "venue" | "unknown"> {
  if (!event.owner_user_id) {
    // Legacy event without owner - assume organizer if exists
    return event.organizer_id ? "organizer" : event.venue_id ? "venue" : "unknown";
  }

  // Check if owner is affiliated with the organizer
  if (event.organizer_id) {
    const { data: organizer } = await supabase
      .from("organizers")
      .select("created_by")
      .eq("id", event.organizer_id)
      .single();

    if (organizer?.created_by === event.owner_user_id) {
      return "organizer";
    }

    const { data: organizerUser } = await supabase
      .from("organizer_users")
      .select("id")
      .eq("organizer_id", event.organizer_id)
      .eq("user_id", event.owner_user_id)
      .single();

    if (organizerUser) {
      return "organizer";
    }
  }

  // Check if owner is affiliated with the venue
  if (event.venue_id) {
    const { data: venue } = await supabase
      .from("venues")
      .select("created_by")
      .eq("id", event.venue_id)
      .single();

    if (venue?.created_by === event.owner_user_id) {
      return "venue";
    }

    const { data: venueUser } = await supabase
      .from("venue_users")
      .select("id")
      .eq("venue_id", event.venue_id)
      .eq("user_id", event.owner_user_id)
      .single();

    if (venueUser) {
      return "venue";
    }
  }

  return "unknown";
}

/**
 * Get a user's access details for an event
 * This is the main function for determining what a user can do with an event
 * 
 * KEY LOGIC:
 * - Event owner always has full access
 * - Superadmin always has full access
 * - Owning entity's team inherits their team permissions
 * - Non-owning entity's team (e.g., venue hosting an organizer's event) gets LIMITED access
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
      isOwningEntity: false,
    };
  }

  // Check if superadmin or admin (both have full access)
  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  const roles = userRoles?.map((r) => r.role) || [];
  const isSuperadmin = roles.includes("superadmin");
  const isAdmin = roles.includes("admin");

  if (isSuperadmin || isAdmin) {
    return {
      hasAccess: true,
      isOwner: false,
      isSuperadmin: true, // Treat admin same as superadmin for permission purposes
      accessSource: "superadmin",
      permissions: { full_admin: true },
      isOwningEntity: true,
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
      isOwningEntity: true,
    };
  }

  // Determine which entity owns this event
  const owningEntity = await determineOwningEntity(supabase, event);

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
        isOwningEntity: owningEntity === "organizer",
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
        isOwningEntity: owningEntity === "organizer",
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

    // Determine if venue is the owning entity
    const venueOwnsEvent = owningEntity === "venue";

    if (venue?.created_by === userId) {
      // Venue creator - but only full access if venue owns the event
      if (venueOwnsEvent) {
        return {
          hasAccess: true,
          isOwner: false,
          isSuperadmin: false,
          accessSource: "venue_creator",
          permissions: FULL_ADMIN_VENUE_PERMISSIONS,
          isOwningEntity: true,
        };
      } else {
        // Venue is just hosting - limited access
        return {
          hasAccess: true,
          isOwner: false,
          isSuperadmin: false,
          accessSource: "venue_host",
          permissions: VENUE_HOST_PERMISSIONS,
          isOwningEntity: false,
        };
      }
    }

    // Check venue_users
    const { data: venueUser } = await supabase
      .from("venue_users")
      .select("permissions")
      .eq("venue_id", event.venue_id)
      .eq("user_id", userId)
      .single();

    if (venueUser?.permissions) {
      if (venueOwnsEvent) {
        // Venue owns the event - give full inherited permissions
        return {
          hasAccess: true,
          isOwner: false,
          isSuperadmin: false,
          accessSource: "venue_team",
          permissions: venueUser.permissions as VenuePermissions,
          isOwningEntity: true,
        };
      } else {
        // Venue is just hosting - LIMITED access only
        // Don't give them their venue permissions on organizer's event!
        return {
          hasAccess: true,
          isOwner: false,
          isSuperadmin: false,
          accessSource: "venue_host",
          permissions: VENUE_HOST_PERMISSIONS,
          isOwningEntity: false,
        };
      }
    }
  }

  // No access
  return {
    hasAccess: false,
    isOwner: false,
    isSuperadmin: false,
    accessSource: "none",
    permissions: {},
    isOwningEntity: false,
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

  // Owner, superadmin always have all permissions
  if (access.isOwner || access.isSuperadmin) {
    return true;
  }

  // Entity creators have full permissions only if their entity owns the event
  if (access.accessSource === "organizer_creator") {
    return true; // Organizer creator always has full access to organizer events
  }
  
  if (access.accessSource === "venue_creator" && access.isOwningEntity) {
    return true; // Venue creator only has full access if venue owns the event
  }

  // Venue host (venue team on organizer's event) has very limited permissions
  if (access.accessSource === "venue_host") {
    // Only allow approve_events for venue hosts
    return (permission as string) === "approve_events";
  }

  // Check if full_admin is true (only meaningful for owning entity)
  if (access.permissions.full_admin && access.isOwningEntity) {
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

