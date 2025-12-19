import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRoleOrSuperadmin, getUserId } from "@/lib/auth/check-role";

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await userHasRoleOrSuperadmin("venue_admin"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Use service role client to bypass RLS and get all promoters
    const serviceSupabase = createServiceRoleClient();
    const { data: promoters, error } = await serviceSupabase
      .from("promoters")
      .select("id, name, email")
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ promoters: promoters || [] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch promoters" },
      { status: 500 }
    );
  }
}


