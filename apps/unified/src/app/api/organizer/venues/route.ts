import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRoleOrSuperadmin, getUserId } from "@/lib/auth/check-role";

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify organizer role or superadmin
    if (!(await userHasRoleOrSuperadmin("event_organizer"))) {
      return NextResponse.json({ error: "Forbidden - Organizer or Superadmin role required" }, { status: 403 });
    }

    // Use service role client to bypass RLS and get all venues
    // Organizers need to see all venues to select one when creating events
    const serviceSupabase = createServiceRoleClient();
    const { data: venues, error } = await serviceSupabase
      .from("venues")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ venues: venues || [] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch venues" },
      { status: 500 }
    );
  }
}


