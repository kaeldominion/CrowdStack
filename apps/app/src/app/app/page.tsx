import { redirect } from "next/navigation";
import { createClient } from "@crowdstack/shared/supabase/server";
import { getUserRoles } from "@crowdstack/shared/auth/roles";
import { UnifiedDashboard } from "@/components/UnifiedDashboard";

export default async function UnifiedHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const roles = await getUserRoles();

  // Filter to B2B roles only (exclude attendee and door_staff)
  // Superadmin is a B2B role and should have access
  const b2bRoles = roles.filter(
    (r) => r !== "attendee" && r !== "door_staff"
  );

  // Superadmin should always have access
  const hasSuperadmin = roles.includes("superadmin");
  
  if (b2bRoles.length === 0 && !hasSuperadmin) {
    redirect("/login");
  }

  // If superadmin with no other B2B roles, include superadmin in the list
  const effectiveRoles = b2bRoles.length > 0 ? b2bRoles : (hasSuperadmin ? ["superadmin" as const] : []);

  return <UnifiedDashboard userRoles={effectiveRoles} />;
}

