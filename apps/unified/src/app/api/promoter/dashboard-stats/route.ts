import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { getPromoterDashboardStats, getPromoterEarningsChartData } from "@/lib/data/dashboard-stats";
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

    const stats = await getPromoterDashboardStats();
    const earningsChartData = await getPromoterEarningsChartData();

    return NextResponse.json(
      { stats, earningsChartData },
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

