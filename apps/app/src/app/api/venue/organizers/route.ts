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

    // Use service role client to bypass RLS and get all organizers
    const serviceSupabase = createServiceRoleClient();
    const { data: organizers, error } = await serviceSupabase
      .from("organizers")
      .select("id, name, email")
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ organizers: organizers || [] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch organizers" },
      { status: 500 }
    );
  }
}


