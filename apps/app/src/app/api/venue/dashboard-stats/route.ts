import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { getVenueDashboardStats } from "@/lib/data/dashboard-stats";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = await getVenueDashboardStats();

    return NextResponse.json({ stats });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}

