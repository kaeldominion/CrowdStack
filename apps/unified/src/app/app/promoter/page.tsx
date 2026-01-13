import { redirect } from "next/navigation";
import { createClient } from "@crowdstack/shared/supabase/server";
import { getUserRoles } from "@crowdstack/shared/auth/roles";
import { UnifiedDashboard } from "@/components/UnifiedDashboard";

export default async function PromoterDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const userRoles = await getUserRoles();

  if (!userRoles.includes("promoter")) {
    redirect("/me");
  }

  return <UnifiedDashboard userRoles={userRoles} />;
}
