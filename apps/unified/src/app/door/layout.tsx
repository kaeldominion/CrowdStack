import { redirect } from "next/navigation";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { DoorLayout } from "@/components/DoorLayout";

// Allowed roles for door scanner
const ALLOWED_ROLES = ["door_staff", "venue_admin", "event_organizer", "superadmin"];

export default async function DoorRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (!user || authError) {
    redirect("/login?redirect=/door");
  }

  // Get user roles using service role client
  const serviceClient = createServiceRoleClient();
  const { data: roles } = await serviceClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const userRoles = roles?.map((r) => r.role) || [];
  
  // Check if user has any of the allowed roles
  const hasAccess = userRoles.some((role) => ALLOWED_ROLES.includes(role));
  
  if (!hasAccess) {
    // Redirect to home if no access
    redirect("/me?error=no_door_access");
  }

  return (
    <DoorLayout userEmail={user.email} userId={user.id} userRoles={userRoles}>
      {children}
    </DoorLayout>
  );
}

