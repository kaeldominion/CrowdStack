import { redirect } from "next/navigation";
import { createClient } from "@crowdstack/shared/supabase/server";

/**
 * Browse feature is hidden for now - focusing on Ops platform
 * Redirect to /me if authenticated, /login if not
 */
export default async function BrowseEventsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/me");
  } else {
    redirect("/login");
  }
}
