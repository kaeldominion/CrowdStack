import "server-only";

import { createClient } from "../supabase/server";
import { createServiceRoleClient } from "../supabase/server";
import type { UserRole, UserRoleRecord } from "../types";

/**
 * Get all roles for the current authenticated user
 */
export async function getUserRoles(): Promise<UserRole[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (error || !data) {
    return [];
  }

  return data.map((r) => r.role as UserRole);
}

/**
 * Get the primary role for the current authenticated user
 * Returns the first role found, or null if no roles
 */
export async function getUserRole(): Promise<UserRole | null> {
  const roles = await getUserRoles();
  return roles.length > 0 ? roles[0] : null;
}

/**
 * Check if the current user has a specific role
 */
export async function userHasRole(role: UserRole): Promise<boolean> {
  const roles = await getUserRoles();
  return roles.includes(role);
}

/**
 * Check if the current user has any of the specified roles
 */
export async function userHasAnyRole(roles: UserRole[]): Promise<boolean> {
  const userRoles = await getUserRoles();
  return roles.some((role) => userRoles.includes(role));
}

/**
 * Get user roles for a specific user ID (service role only)
 */
export async function getUserRolesById(userId: string): Promise<UserRole[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error || !data) {
    return [];
  }

  return data.map((r) => r.role as UserRole);
}

/**
 * Assign a role to a user (service role only)
 */
export async function assignUserRole(
  userId: string,
  role: UserRole,
  metadata: Record<string, any> = {}
): Promise<void> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase.from("user_roles").upsert({
    user_id: userId,
    role,
    metadata,
  });

  if (error) {
    throw new Error(`Failed to assign role: ${error.message}`);
  }
}

/**
 * Remove a role from a user (service role only)
 */
export async function removeUserRole(
  userId: string,
  role: UserRole
): Promise<void> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role", role);

  if (error) {
    throw new Error(`Failed to remove role: ${error.message}`);
  }
}

