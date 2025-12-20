import "server-only";

import { createClient } from "../supabase/server";
import { createServiceRoleClient } from "../supabase/server";
import type { UserRole, UserRoleRecord } from "../types";

/**
 * Get all roles for the current authenticated user
 */
export async function getUserRoles(): Promise<UserRole[]> {
  const supabase = await createClient();
  let user = null;

  // First try standard Supabase auth
  const { data: { user: supabaseUser }, error: getUserError } = await supabase.auth.getUser();
  user = supabaseUser;
  
  if (process.env.NODE_ENV === "development") {
    console.log("[getUserRoles] Standard Supabase auth result:", {
      hasUser: !!user,
      userEmail: user?.email,
      userId: user?.id,
      error: getUserError?.message || null,
    });
  }

  // If that fails, try getting user from custom localhost cookie
  if (!user) {
    try {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase/)?.[1] || "supabase";
      const authCookieName = `sb-${projectRef}-auth-token`;
      const authCookie = cookieStore.get(authCookieName);

      if (authCookie) {
        const cookieValue = decodeURIComponent(authCookie.value);
        const parsed = JSON.parse(cookieValue);
        if (parsed.user && parsed.expires_at) {
          const now = Math.floor(Date.now() / 1000);
          if (parsed.expires_at > now) {
            user = parsed.user;
            if (process.env.NODE_ENV === "development") {
              console.log("[getUserRoles] Got user from custom cookie:", user.email);
            }
          }
        }
      }
    } catch (e) {
      // Custom cookie parsing failed
      if (process.env.NODE_ENV === "development") {
        console.log("[getUserRoles] Custom cookie parsing failed:", e);
      }
    }
  }

  if (!user) {
    console.log("[getUserRoles] No user found, returning empty roles");
    return [];
  }

  console.log("[getUserRoles] Looking up roles for user:", {
    userId: user.id,
    email: user.email,
  });

  // Use service role client to get roles (bypasses RLS issues)
  try {
    const serviceSupabase = createServiceRoleClient();
    console.log("[getUserRoles] Querying user_roles table for user_id:", user.id);
    
    const { data, error } = await serviceSupabase
      .from("user_roles")
      .select("role, user_id")
      .eq("user_id", user.id);

    console.log("[getUserRoles] Query result:", {
      dataCount: data?.length || 0,
      data: data,
      error: error?.message || null,
      errorCode: error?.code || null,
    });

    if (error) {
      console.error("[getUserRoles] Failed to get roles:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return [];
    }

    const roles = data?.map((r) => r.role as UserRole) || [];
    console.log("[getUserRoles] Returning roles:", roles);
    return roles;
  } catch (serviceError: any) {
    console.error("[getUserRoles] Service role query failed:", {
      error: serviceError?.message,
      stack: serviceError?.stack,
    });
    return [];
  }
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

  // Upsert with explicit conflict resolution on (user_id, role) unique constraint
  const { error } = await supabase
    .from("user_roles")
    .upsert(
      {
        user_id: userId,
        role,
        metadata,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,role",
      }
    );

  if (error) {
    console.error("assignUserRole error:", {
      userId,
      role,
      error: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
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

