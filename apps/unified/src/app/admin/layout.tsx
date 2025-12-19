import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserRolesById } from "@crowdstack/shared/auth/roles";
import { AppLayout } from "@/components/AppLayout";

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

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  
  // On localhost, read user directly from cookie (middleware already verified auth)
  // On production, we'd use standard Supabase client, but for now use cookie approach
  const isLocalhost = typeof window === "undefined" && process.env.NODE_ENV === "development";
  
  let user: any = null;
  
  if (isLocalhost || true) { // Always try cookie first for localhost compatibility
    user = getUserFromLocalhostCookie(cookieStore, supabaseUrl);
  }

  if (!user) {
    if (process.env.NODE_ENV === "development") {
      console.log("[Admin Layout] No user found in cookie, redirecting to login");
    }
    redirect("/login");
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[Admin Layout] User found from cookie:", user.email, user.id);
  }

  // Get user roles using service role client (bypasses RLS)
  // Middleware already verified authentication, so we can trust the user ID
  const roles = await getUserRolesById(user.id);
  
  if (process.env.NODE_ENV === "development") {
    console.log("[Admin Layout] User roles:", roles);
  }

  // Check if user has superadmin role
  if (!roles || !Array.isArray(roles) || !roles.includes("superadmin")) {
    // If they have other B2B roles, redirect to unified app
    const b2bRoles = roles?.filter(
      (r) => r !== "attendee" && r !== "door_staff"
    ) || [];
    if (b2bRoles.length > 0) {
      if (process.env.NODE_ENV === "development") {
        console.log("[Admin Layout] No superadmin role found. User has:", b2bRoles, "- redirecting to /app");
      }
      redirect("/app");
    }
    // Otherwise redirect to login
    if (process.env.NODE_ENV === "development") {
      console.log("[Admin Layout] No valid roles found, redirecting to login");
    }
    redirect("/login");
  }
  
  if (process.env.NODE_ENV === "development") {
    console.log("[Admin Layout] Superadmin confirmed, rendering admin layout");
  }

  // Get user email
  const userEmail = user.email || undefined;

  // Include superadmin in the roles array for navigation
  const allRoles = roles.filter(
    (r) => r !== "attendee" && r !== "door_staff"
  );

  return (
    <AppLayout roles={allRoles} userEmail={userEmail} userId={user.id}>
      {children}
    </AppLayout>
  );
}

