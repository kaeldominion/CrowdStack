import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * GET /api/djs/search
 * Search DJs by name or handle (public endpoint for lineup management)
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ djs: [] });
    }

    const serviceSupabase = createServiceRoleClient();
    const searchTerm = `%${query.trim().toLowerCase()}%`;

    const { data: djs, error } = await serviceSupabase
      .from("djs")
      .select("id, handle, name, profile_image_url, genres, location")
      .or(`name.ilike.${searchTerm},handle.ilike.${searchTerm}`)
      .limit(20);

    if (error) {
      console.error("Error searching DJs:", error);
      return NextResponse.json({ error: "Failed to search DJs" }, { status: 500 });
    }

    return NextResponse.json({ djs: djs || [] });
  } catch (error: any) {
    console.error("Error searching DJs:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}



