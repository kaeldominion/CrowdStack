import { redirect } from "next/navigation";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserRolesById } from "@crowdstack/shared/auth/roles";
import { AppLayout } from "@/components/AppLayout";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Use standard Supabase server client (middleware already verified auth)
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (!user || authError) {
    if (process.env.NODE_ENV === "development") {
      console.log("[Admin Layout] No user found, redirecting to login", authError?.message);
    }
    redirect("/login");
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[Admin Layout] User found:", user.email, user.id);
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

