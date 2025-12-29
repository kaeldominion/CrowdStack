import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/browse/djs
 * Browse and search DJ profiles
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const genre = searchParams.get("genre");
    const city = searchParams.get("city");
    const limit = parseInt(searchParams.get("limit") || "12");
    const offset = parseInt(searchParams.get("offset") || "0");

    const supabase = createServiceRoleClient();

    let query = supabase
      .from("djs")
      .select("id, name, handle, bio, genres, location, profile_image_url, cover_image_url", { count: "exact" });

    // Search by name or bio
    if (search) {
      query = query.or(`name.ilike.%${search}%,bio.ilike.%${search}%,handle.ilike.%${search}%`);
    }

    // Filter by genre (genres is an array)
    if (genre) {
      query = query.contains("genres", [genre]);
    }

    // Filter by location/city
    if (city) {
      query = query.ilike("location", `%${city}%`);
    }

    // Order by name
    query = query.order("name", { ascending: true });

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data: djs, error, count } = await query;

    if (error) {
      console.error("[Browse DJs] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      djs: djs || [],
      count: djs?.length || 0,
      totalCount: count || 0,
      offset,
      limit,
    });
  } catch (error: any) {
    console.error("[Browse DJs] Unexpected error:", error);
    return NextResponse.json({ error: "Failed to fetch DJs" }, { status: 500 });
  }
}

