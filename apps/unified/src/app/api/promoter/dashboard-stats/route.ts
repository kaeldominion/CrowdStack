import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getPromoterDashboardStats, getPromoterEarningsChartData } from "@/lib/data/dashboard-stats";
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

    const stats = await getPromoterDashboardStats();
    const earningsChartData = await getPromoterEarningsChartData();

    // Fetch promoter profile info for dashboard display
    const serviceSupabase = createServiceRoleClient();
    const { data: promoter } = await serviceSupabase
      .from("promoters")
      .select("id, name, slug, bio, profile_image_url, instagram_handle, is_public")
      .eq("created_by", user.id)
      .single();

    return NextResponse.json(
      { stats, earningsChartData, promoter },
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

