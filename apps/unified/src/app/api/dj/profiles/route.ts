import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserDJId, getUserDJProfiles } from "@/lib/data/get-user-entity";

/**
 * GET /api/dj/profiles
 * Get all DJ profiles for the current user with selection status
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const selectedDJId = await getUserDJId();
    const allProfiles = await getUserDJProfiles();

    // Mark which profile is selected
    const profiles = allProfiles.map(profile => ({
      ...profile,
      is_selected: profile.id === selectedDJId,
    }));

    return NextResponse.json({ profiles });
  } catch (error: any) {
    console.error("Error fetching DJ profiles:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
