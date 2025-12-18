import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRole } from "@crowdstack/shared/auth/roles";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await userHasRole("superadmin"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const serviceSupabase = createServiceRoleClient();

    const { data: promoters, error } = await serviceSupabase
      .from("promoters")
      .select(`
        *,
        parent:promoters!parent_promoter_id(name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Get counts for each promoter
    const promotersWithCounts = await Promise.all(
      (promoters || []).map(async (promoter: any) => {
        const { count: eventsCount } = await serviceSupabase
          .from("event_promoters")
          .select("*", { count: "exact", head: true })
          .eq("promoter_id", promoter.id);

        const { count: referralsCount } = await serviceSupabase
          .from("registrations")
          .select("*", { count: "exact", head: true })
          .eq("referral_promoter_id", promoter.id);

        return {
          ...promoter,
          parent: promoter.parent,
          events_count: eventsCount || 0,
          total_referrals: referralsCount || 0,
        };
      })
    );

    return NextResponse.json({ promoters: promotersWithCounts });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch promoters" },
      { status: 500 }
    );
  }
}

