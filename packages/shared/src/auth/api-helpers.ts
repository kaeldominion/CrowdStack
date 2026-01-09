/**
 * API Authentication & Authorization Helpers
 *
 * This module provides reusable utilities for common authentication and
 * authorization patterns in API routes, reducing code duplication.
 */

import { createClient, createServiceRoleClient } from "../supabase/server";
import type { UserRole } from "../types";

export interface AuthenticatedUser {
  userId: string;
  roles: UserRole[];
  isSuperadmin: boolean;
}

export interface AuthenticationResult {
  success: true;
  user: AuthenticatedUser;
}

export interface AuthenticationError {
  success: false;
  error: string;
  status: 401 | 403;
}

/**
 * Authenticate an API request and return the user with their roles.
 * Handles the common pattern of checking auth and fetching user roles.
 *
 * @returns Either the authenticated user with roles, or an error object
 */
export async function authenticateApiRequest(): Promise<
  AuthenticationResult | AuthenticationError
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return {
        success: false,
        error: "Unauthorized",
        status: 401,
      };
    }

    // Fetch user roles using service client to bypass RLS
    const serviceSupabase = createServiceRoleClient();
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const roles = (userRoles?.map((r) => r.role) || []) as UserRole[];
    const isSuperadmin = roles.includes("superadmin" as UserRole);

    return {
      success: true,
      user: {
        userId: user.id,
        roles,
        isSuperadmin,
      },
    };
  } catch (error) {
    console.error("[authenticateApiRequest] Error:", error);
    return {
      success: false,
      error: "Authentication failed",
      status: 401,
    };
  }
}

/**
 * Check if the authenticated user has any of the required roles.
 *
 * @param user - The authenticated user
 * @param requiredRoles - Array of roles, any of which grants access
 * @returns true if user has at least one of the required roles
 */
export function hasAnyRole(
  user: AuthenticatedUser,
  requiredRoles: UserRole[]
): boolean {
  if (user.isSuperadmin) return true;
  return requiredRoles.some((role) => user.roles.includes(role));
}

/**
 * Check if the authenticated user has all of the required roles.
 *
 * @param user - The authenticated user
 * @param requiredRoles - Array of roles, all of which are required
 * @returns true if user has all of the required roles
 */
export function hasAllRoles(
  user: AuthenticatedUser,
  requiredRoles: UserRole[]
): boolean {
  if (user.isSuperadmin) return true;
  return requiredRoles.every((role) => user.roles.includes(role));
}

/**
 * Require that the user is a superadmin.
 * Returns an error object if not authorized.
 */
export function requireSuperadmin(
  user: AuthenticatedUser
): AuthenticationError | null {
  if (user.isSuperadmin) return null;
  return {
    success: false,
    error: "Forbidden - Superadmin role required",
    status: 403,
  };
}

/**
 * Require that the user has at least one of the specified roles.
 * Returns an error object if not authorized.
 */
export function requireAnyRole(
  user: AuthenticatedUser,
  requiredRoles: UserRole[]
): AuthenticationError | null {
  if (hasAnyRole(user, requiredRoles)) return null;
  return {
    success: false,
    error: `Forbidden - Requires one of: ${requiredRoles.join(", ")}`,
    status: 403,
  };
}

export interface VenueAccess {
  venueId: string;
  isCreator: boolean;
  isTeamMember: boolean;
}

/**
 * Get the venue associated with the user (if they have venue_admin role).
 * Returns the venue ID and access details.
 */
export async function getVenueAccess(
  userId: string
): Promise<VenueAccess | null> {
  const serviceSupabase = createServiceRoleClient();

  // Check if user created any venues
  const { data: createdVenue } = await serviceSupabase
    .from("venues")
    .select("id")
    .eq("created_by", userId)
    .limit(1)
    .single();

  if (createdVenue) {
    return {
      venueId: createdVenue.id,
      isCreator: true,
      isTeamMember: true,
    };
  }

  // Check if user is a team member of any venue
  const { data: venueUser } = await serviceSupabase
    .from("venue_users")
    .select("venue_id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (venueUser) {
    return {
      venueId: venueUser.venue_id,
      isCreator: false,
      isTeamMember: true,
    };
  }

  return null;
}

export interface OrganizerAccess {
  organizerId: string;
  isCreator: boolean;
  isTeamMember: boolean;
}

/**
 * Get the organizer associated with the user (if they have event_organizer role).
 * Returns the organizer ID and access details.
 */
export async function getOrganizerAccess(
  userId: string
): Promise<OrganizerAccess | null> {
  const serviceSupabase = createServiceRoleClient();

  // Check if user created any organizers
  const { data: createdOrganizer } = await serviceSupabase
    .from("organizers")
    .select("id")
    .eq("created_by", userId)
    .limit(1)
    .single();

  if (createdOrganizer) {
    return {
      organizerId: createdOrganizer.id,
      isCreator: true,
      isTeamMember: true,
    };
  }

  // Check if user is a team member of any organizer
  const { data: organizerUser } = await serviceSupabase
    .from("organizer_users")
    .select("organizer_id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (organizerUser) {
    return {
      organizerId: organizerUser.organizer_id,
      isCreator: false,
      isTeamMember: true,
    };
  }

  return null;
}

/**
 * Get the promoter ID associated with the user (if they have promoter role).
 */
export async function getPromoterAccess(
  userId: string
): Promise<{ promoterId: string } | null> {
  const serviceSupabase = createServiceRoleClient();

  const { data: promoter } = await serviceSupabase
    .from("promoters")
    .select("id")
    .eq("created_by", userId)
    .limit(1)
    .single();

  if (promoter) {
    return { promoterId: promoter.id };
  }

  return null;
}
