import "server-only";

import { createServiceRoleClient } from "../supabase/server";
import type { VenuePermissions } from "../types";
import {
  DEFAULT_VENUE_PERMISSIONS,
  FULL_ADMIN_VENUE_PERMISSIONS,
} from "../constants/permissions";

// Re-export for backward compatibility
export { DEFAULT_VENUE_PERMISSIONS, FULL_ADMIN_VENUE_PERMISSIONS };

/**
 * Check if a user has a specific permission for a venue
 */
export async function hasVenuePermission(
  userId: string,
  venueId: string,
  permission: keyof VenuePermissions
): Promise<boolean> {
  const supabase = createServiceRoleClient();

  // Check if user is venue creator (has all permissions)
  const { data: venue } = await supabase
    .from("venues")
    .select("created_by")
    .eq("id", venueId)
    .single();

  if (venue?.created_by === userId) {
    return true;
  }

  // Check user's permissions in venue_users table
  const { data: venueUser } = await supabase
    .from("venue_users")
    .select("permissions")
    .eq("user_id", userId)
    .eq("venue_id", venueId)
    .single();

  if (!venueUser?.permissions) {
    return false;
  }

  const permissions = venueUser.permissions as VenuePermissions;

  // If full_admin is true, user has all permissions
  if (permissions.full_admin) {
    return true;
  }

  // Check specific permission
  return permissions[permission] === true;
}

/**
 * Get user's permissions for a venue
 */
export async function getVenuePermissions(
  userId: string,
  venueId: string
): Promise<VenuePermissions | null> {
  const supabase = createServiceRoleClient();

  // Check if user is venue creator (has all permissions)
  const { data: venue } = await supabase
    .from("venues")
    .select("created_by")
    .eq("id", venueId)
    .single();

  if (venue?.created_by === userId) {
    return FULL_ADMIN_VENUE_PERMISSIONS;
  }

  // Get user's permissions from venue_users table
  const { data: venueUser } = await supabase
    .from("venue_users")
    .select("permissions")
    .eq("user_id", userId)
    .eq("venue_id", venueId)
    .single();

  if (!venueUser?.permissions) {
    return null;
  }

  return venueUser.permissions as VenuePermissions;
}

