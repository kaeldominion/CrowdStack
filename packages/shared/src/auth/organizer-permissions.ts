import "server-only";

import { createServiceRoleClient } from "../supabase/server";
import type { OrganizerPermissions } from "../types";
import {
  DEFAULT_ORGANIZER_PERMISSIONS,
  FULL_ADMIN_ORGANIZER_PERMISSIONS,
} from "../constants/permissions";

// Re-export for backward compatibility
export {
  DEFAULT_ORGANIZER_PERMISSIONS,
  FULL_ADMIN_ORGANIZER_PERMISSIONS,
};

/**
 * Check if a user has a specific permission for an organizer
 */
export async function hasOrganizerPermission(
  userId: string,
  organizerId: string,
  permission: keyof OrganizerPermissions
): Promise<boolean> {
  const supabase = createServiceRoleClient();

  // Check if user is organizer creator (has all permissions)
  const { data: organizer } = await supabase
    .from("organizers")
    .select("created_by")
    .eq("id", organizerId)
    .single();

  if (organizer?.created_by === userId) {
    return true;
  }

  // Check user's permissions in organizer_users table
  const { data: organizerUser } = await supabase
    .from("organizer_users")
    .select("permissions")
    .eq("user_id", userId)
    .eq("organizer_id", organizerId)
    .single();

  if (!organizerUser?.permissions) {
    return false;
  }

  const permissions = organizerUser.permissions as OrganizerPermissions;

  // If full_admin is true, user has all permissions
  if (permissions.full_admin) {
    return true;
  }

  // Check specific permission
  return permissions[permission] === true;
}

/**
 * Get user's permissions for an organizer
 */
export async function getOrganizerPermissions(
  userId: string,
  organizerId: string
): Promise<OrganizerPermissions | null> {
  const supabase = createServiceRoleClient();

  // Check if user is organizer creator (has all permissions)
  const { data: organizer } = await supabase
    .from("organizers")
    .select("created_by")
    .eq("id", organizerId)
    .single();

  if (organizer?.created_by === userId) {
    return FULL_ADMIN_ORGANIZER_PERMISSIONS;
  }

  // Get user's permissions from organizer_users table
  const { data: organizerUser } = await supabase
    .from("organizer_users")
    .select("permissions")
    .eq("user_id", userId)
    .eq("organizer_id", organizerId)
    .single();

  if (!organizerUser?.permissions) {
    return null;
  }

  return organizerUser.permissions as OrganizerPermissions;
}

