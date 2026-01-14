import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { getOrganizerDashboardStats, getOrganizerChartData } from "@/lib/data/dashboard-stats";
import { getUserOrganizerId } from "@/lib/data/get-user-entity";
import { CACHE, getCacheControl } from "@/lib/cache";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get organizerId once and share between both functions to ensure consistency
    const organizerId = await getUserOrganizerId();

    // Fetch stats and chart data in parallel, passing the same organizerId to both
    const [stats, chartData] = await Promise.all([
      getOrganizerDashboardStats(organizerId),
      getOrganizerChartData(organizerId),
    ]);

    return NextResponse.json(
      { stats, chartData },
      {
        headers: {
          'Cache-Control': getCacheControl(CACHE.dashboardStats),
        },
      }
    );
  } catch (error: any) {
    console.error("[Organizer Dashboard Stats API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}

