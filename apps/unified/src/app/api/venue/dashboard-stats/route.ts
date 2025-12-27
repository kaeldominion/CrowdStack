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

    // Check if user has venue_admin role or is superadmin
    const hasAccess = await userHasRoleOrSuperadmin("venue_admin");
    
    if (!hasAccess) {
      console.log("[Venue Dashboard Stats] Access denied. hasAccess:", hasAccess);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await getVenueDashboardStats();

    // Extract venue from stats and return separately
    const { venue, ...stats } = result as any;

    return NextResponse.json({ stats, venue });
  } catch (error: any) {
    console.error("[Venue Dashboard Stats] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}

