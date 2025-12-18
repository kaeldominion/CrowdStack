import { redirect } from "next/navigation";
import { createClient } from "@crowdstack/shared/supabase/server";
import { getUserRoles } from "@crowdstack/shared/auth/roles";

/**
 * Root page - redirects based on user roles
 * Unified redirect logic for all authenticated users
 */
export default async function DashboardHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const roles = await getUserRoles();

  // If user only has door_staff role, redirect to door scanner
  if (roles.length === 1 && roles[0] === "door_staff") {
    redirect("/door");
  }

  // Filter to B2B roles (exclude attendee and door_staff)
  const b2bRoles = roles.filter(
    (r) => r !== "attendee" && r !== "door_staff"
  );

  // If user has any B2B role, redirect to unified app dashboard
  if (b2bRoles.length > 0) {
    redirect("/app");
  }

  // If user has superadmin role, they can access both /app and /admin
  // Redirect to unified app dashboard (they can navigate to admin from there)
  if (roles.includes("superadmin") && b2bRoles.length === 1) {
    // If only superadmin, still go to /app where they'll see admin nav
    redirect("/app");
  }

  // Default fallback to login if no valid roles
  redirect("/login");
}
