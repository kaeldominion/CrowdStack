import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { getOrganizerDashboardStats, getOrganizerChartData } from "@/lib/data/dashboard-stats";
import { CACHE, getCacheControl } from "@/lib/cache";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = await getOrganizerDashboardStats();
    const chartData = await getOrganizerChartData();

    return NextResponse.json(
      { stats, chartData },
      {
        headers: {
          'Cache-Control': getCacheControl(CACHE.dashboardStats),
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}

