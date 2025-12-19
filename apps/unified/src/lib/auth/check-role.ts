import "server-only";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { cookies } from "next/headers";

/**
 * Get user ID from Supabase client or localhost cookie
 */
export async function getUserId(): Promise<string | null> {
  const { createClient } = await import("@crowdstack/shared/supabase/server");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id) {
    return user.id;
  }

  // Try reading from localhost cookie
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase/)?.[1] || "supabase";
  const authCookieName = `sb-${projectRef}-auth-token`;
  const authCookie = cookieStore.get(authCookieName);

  if (authCookie) {
    try {
      const cookieValue = decodeURIComponent(authCookie.value);
      const parsed = JSON.parse(cookieValue);
      if (parsed.user?.id) {
        return parsed.user.id;
      }
    } catch (e) {
      // Cookie parse error
    }
  }

  return null;
}

/**
 * Check if user has any of the specified roles OR is superadmin
 */
export async function userHasAnyRoleOrSuperadmin(roles: string[]): Promise<boolean> {
  const userId = await getUserId();
  if (!userId) {
    return false;
  }

  const serviceSupabase = createServiceRoleClient();
  const { data: userRoles } = await serviceSupabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  const userRoleNames = userRoles?.map((r) => r.role) || [];
  
  // Superadmin has access to everything
  if (userRoleNames.includes("superadmin")) {
    return true;
  }

  // Check if user has any of the required roles
  return roles.some((role) => userRoleNames.includes(role));
}

/**
 * Check if user has a specific role OR is superadmin
 */
export async function userHasRoleOrSuperadmin(role: string): Promise<boolean> {
  return userHasAnyRoleOrSuperadmin([role]);
}

