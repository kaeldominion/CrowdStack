import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { getVenueDashboardStats } from "@/lib/data/dashboard-stats";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Try reading from localhost cookie as fallback
      const { getUserId } = await import("@/lib/auth/check-role");
      const userId = await getUserId();
      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Check if user has venue_admin role or is superadmin (or impersonating)
    // Allow superadmin to access venue stats (they can impersonate venues)
    const hasAccess = await userHasRoleOrSuperadmin("venue_admin");
    
    // Also check if impersonating as venue_admin
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const roleCookie = cookieStore.get("cs-impersonate-role");
    const entityCookie = cookieStore.get("cs-impersonate-entity-id");
    
    const isImpersonating = roleCookie?.value === "venue_admin" && entityCookie?.value;
    
    if (!hasAccess && !isImpersonating) {
      console.log("[Venue Dashboard Stats] Access denied. hasAccess:", hasAccess, "isImpersonating:", isImpersonating, "roleCookie:", roleCookie?.value, "entityCookie:", entityCookie?.value);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log("[Venue Dashboard Stats] Access granted. hasAccess:", hasAccess, "isImpersonating:", isImpersonating);
    const stats = await getVenueDashboardStats();

    return NextResponse.json({ stats });
  } catch (error: any) {
    console.error("[Venue Dashboard Stats] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}

