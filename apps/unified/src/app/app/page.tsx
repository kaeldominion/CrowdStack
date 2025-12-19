import { getUserRoles } from "@crowdstack/shared/auth/roles";
import { UnifiedDashboard } from "@/components/UnifiedDashboard";

/**
 * Unified Dashboard Home Page
 * 
 * Note: Auth is handled by the layout (app/layout.tsx)
 * This page just renders the dashboard with the user's roles
 */
export default async function UnifiedHomePage() {
  console.log("[UnifiedHomePage] Starting page render");
  
  // Get roles (layout already verified auth)
  console.log("[UnifiedHomePage] Calling getUserRoles()");
  const roles = await getUserRoles();
  console.log("[UnifiedHomePage] Roles received:", {
    roles,
    rolesCount: roles.length,
    hasSuperadmin: roles.includes("superadmin"),
  });

  // Filter to B2B roles only (exclude attendee and door_staff)
  // Superadmin is a B2B role and should have access
  const b2bRoles = roles.filter(
    (r) => r !== "attendee" && r !== "door_staff"
  );

  // Superadmin should always have access
  const hasSuperadmin = roles.includes("superadmin");

  // If superadmin with no other B2B roles, include superadmin in the list
  const effectiveRoles = b2bRoles.length > 0 ? b2bRoles : (hasSuperadmin ? ["superadmin" as const] : []);
  
  console.log("[UnifiedHomePage] Rendering UnifiedDashboard with roles:", effectiveRoles);

  return <UnifiedDashboard userRoles={effectiveRoles} />;
}

