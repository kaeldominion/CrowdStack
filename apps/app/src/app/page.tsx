import { redirect } from "next/navigation";
import { createClient } from "@crowdstack/shared/supabase/server";
import { getUserRole } from "@crowdstack/shared/auth/roles";

/**
 * Root page - redirects based on user role
 */
export default async function DashboardHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = await getUserRole();

  switch (role) {
    case "venue_admin":
      redirect("/app/venue");
    case "event_organizer":
      redirect("/app/organizer");
    case "promoter":
      redirect("/app/promoter");
    case "door_staff":
      redirect("/door");
    default:
      // Default to admin page for any authenticated user
      redirect("/admin");
  }
}
