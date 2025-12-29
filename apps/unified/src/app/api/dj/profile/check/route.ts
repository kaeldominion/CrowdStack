import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { getUserDJId } from "@/lib/data/get-user-entity";

/**
 * GET /api/dj/profile/check
 * Check if the current user has a DJ profile
 * Returns 200 if exists, 404 if not
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const djId = await getUserDJId();

    if (djId) {
      return NextResponse.json({ hasProfile: true, djId });
    }

    return NextResponse.json({ hasProfile: false });
  } catch (error: any) {
    console.error("Error checking DJ profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

