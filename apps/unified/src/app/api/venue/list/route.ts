import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { getUserVenues } from "@/lib/data/get-user-entity";

/**
 * GET /api/venue/list
 * Get all venues the current user has access to
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const venues = await getUserVenues();

    return NextResponse.json({ venues });
  } catch (error: any) {
    console.error("Error fetching user venues:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch venues" },
      { status: 500 }
    );
  }
}

