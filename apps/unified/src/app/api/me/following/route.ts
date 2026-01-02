import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserWithRetry } from "@crowdstack/shared/supabase/auth-helpers";

/**
 * GET /api/me/following
 * Get list of DJs the current user follows
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await getUserWithRetry(supabase);
    
    // Handle network errors gracefully
    if (authError && authError.message?.includes("fetch failed")) {
      console.error("[me/following] Network error fetching user:", authError);
      return NextResponse.json(
        { error: "Network error. Please try again." },
        { status: 503 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();

    const { data: follows, error } = await serviceSupabase
      .from("dj_follows")
      .select(`
        id,
        created_at,
        djs (
          id,
          handle,
          name,
          profile_image_url,
          bio,
          genres,
          location,
          soundcloud_url,
          instagram_url
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching followed DJs:", error);
      return NextResponse.json({ error: "Failed to fetch followed DJs" }, { status: 500 });
    }

    return NextResponse.json({ djs: follows?.map((f: any) => f.djs).filter(Boolean) || [] });
  } catch (error: any) {
    console.error("Error fetching followed DJs:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}



