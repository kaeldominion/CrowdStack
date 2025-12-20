import { redirect } from "next/navigation";
import { createClient } from "@crowdstack/shared/supabase/server";
import { getUserRoles } from "@crowdstack/shared/auth/roles";
import { AppLayout } from "@/components/AppLayout";
import { cookies } from "next/headers";
import type { UserRole } from "@crowdstack/shared";

/**
 * Extract user from localhost custom cookie (same approach as middleware)
 */
function getUserFromLocalhostCookie(cookieStore: Awaited<ReturnType<typeof cookies>>, supabaseUrl: string) {
  try {
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase/)?.[1] || "supabase";
    const authCookieName = `sb-${projectRef}-auth-token`;
    const authCookie = cookieStore.get(authCookieName);
    
    if (!authCookie) {
      return null;
    }

    const cookieValue = decodeURIComponent(authCookie.value);
    const parsed = JSON.parse(cookieValue);
    
    if (parsed.access_token && parsed.user) {
      const now = Math.floor(Date.now() / 1000);
      if (parsed.expires_at && parsed.expires_at > now) {
        return parsed.user;
      }
    }
  } catch (e) {
    // Not our custom cookie format
  }
  return null;
}

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV === "development") {
    console.log("[App Layout] Starting authentication check");
  }
  
  // Call cookies() ONCE at the top - Next.js 14 requires this
  // Passing it to createClient() prevents double-calling cookies()
  const cookieStore = await cookies();
  
  const supabase = await createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (process.env.NODE_ENV === "development") {
    console.log("[App Layout] User from Supabase:", user?.email || "none");
  }

  let authenticatedUser = user;

  // If no user from Supabase client, try reading from localhost cookie (middleware already verified auth)
  // NOTE: This is primarily for localhost development. In production, Supabase SSR should work correctly.
  if (!authenticatedUser) {
    // Only try custom cookie parsing on localhost (production uses standard Supabase cookies)
    const isLocalhost = process.env.NODE_ENV === "development";
    if (isLocalhost) {
      if (process.env.NODE_ENV === "development") {
        console.log("[App Layout] No user from Supabase, checking localhost cookie");
      }
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      authenticatedUser = getUserFromLocalhostCookie(cookieStore, supabaseUrl);
      if (process.env.NODE_ENV === "development") {
        console.log("[App Layout] User from localhost cookie:", authenticatedUser?.email || "none");
      }
    } else {
      console.log("[App Layout] ⚠️ No user from Supabase in production - this should not happen normally");
    }
  }

  if (!authenticatedUser) {
    if (process.env.NODE_ENV === "development") {
      console.log("[App Layout] No authenticated user found, redirecting to login");
    }
    redirect("/login");
  }

  // Check for impersonation cookies (reuse the same cookieStore)
  const roleCookie = cookieStore.get("cs-impersonate-role");
  const entityCookie = cookieStore.get("cs-impersonate-entity-id");
  if (process.env.NODE_ENV === "development") {
    console.log("[App Layout] Impersonation cookies:", { 
      roleCookie: roleCookie?.value, 
      entityCookie: entityCookie?.value 
    });
  }

  // Get user roles
  console.log("[App Layout] Calling getUserRoles() for user:", authenticatedUser.id);
  const roles = await getUserRoles();
  console.log("[App Layout] User roles from DB:", {
    roles,
    rolesCount: roles.length,
    hasSuperadmin: roles.includes("superadmin"),
    userId: authenticatedUser.id,
    userEmail: authenticatedUser.email,
  });

  // Check if user is superadmin (needed for impersonation)
  const isSuperadmin = roles.includes("superadmin");

  // If impersonating, include the impersonated role in allowed roles
  let effectiveRoles = [...roles];
  if (roleCookie?.value && roleCookie.value !== "all" && isSuperadmin) {
    const impersonatedRole = roleCookie.value as UserRole;
    if (process.env.NODE_ENV === "development") {
      console.log("[App Layout] Superadmin impersonating role:", impersonatedRole);
    }
    // Add impersonated role to effective roles if not already present
    if (!effectiveRoles.includes(impersonatedRole)) {
      effectiveRoles.push(impersonatedRole);
    }
  }

  // If user only has door_staff role, redirect to door scanner
  if (effectiveRoles.length === 1 && effectiveRoles[0] === "door_staff") {
    if (process.env.NODE_ENV === "development") {
      console.log("[App Layout] Only door_staff role, redirecting to /door");
    }
    redirect("/door");
  }

  // If user has no roles or only attendee role, redirect to login
  const b2bRoles = effectiveRoles.filter(
    (r) => r !== "attendee" && r !== "door_staff"
  );
  if (process.env.NODE_ENV === "development") {
    console.log("[App Layout] Effective B2B roles (including impersonation):", b2bRoles);
  }
  
  // Superadmin should always have access, even if they have no other B2B roles
  const hasSuperadmin = effectiveRoles.includes("superadmin");
  
  if (b2bRoles.length === 0 && !hasSuperadmin) {
    if (process.env.NODE_ENV === "development") {
      console.log("[App Layout] No B2B roles and not superadmin, redirecting to login");
    }
    redirect("/login");
  }
  
  // If superadmin with no other B2B roles, ensure superadmin is in the list
  const finalRoles = b2bRoles.length > 0 ? b2bRoles : (hasSuperadmin ? ["superadmin" as const] : []);

  // Get user email
  const userEmail = authenticatedUser.email || undefined;
  if (process.env.NODE_ENV === "development") {
    console.log("[App Layout] Rendering layout with:", { 
      roles: b2bRoles, 
      userEmail, 
      userId: authenticatedUser.id,
      impersonating: { role: roleCookie?.value, entityId: entityCookie?.value }
    });
  }

  return (
    <AppLayout roles={finalRoles} userEmail={userEmail} userId={authenticatedUser.id}>
      {children}
    </AppLayout>
  );
}

