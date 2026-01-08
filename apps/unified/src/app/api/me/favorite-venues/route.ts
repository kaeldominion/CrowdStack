import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * GET /api/me/favorite-venues
 * Get user's favorite venues
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

    const serviceSupabase = createServiceRoleClient();

    // Get favorite venues with venue details
    const { data: favorites, error: favoritesError } = await serviceSupabase
      .from("venue_favorites")
      .select(`
        id,
        created_at,
        venue:venues(
          id,
          name,
          slug,
          tagline,
          description,
          logo_url,
          cover_image_url,
          city,
          state,
          country
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (favoritesError) {
      console.error("Error fetching favorite venues:", favoritesError);
      return NextResponse.json(
        { error: "Failed to fetch favorite venues" },
        { status: 500 }
      );
    }

    // Filter out any null venues and map to clean structure
    const venues = (favorites || [])
      .filter((f: any) => f.venue)
      .map((f: any) => ({
        id: f.venue.id,
        name: f.venue.name,
        slug: f.venue.slug,
        tagline: f.venue.tagline,
        description: f.venue.description,
        logo_url: f.venue.logo_url,
        cover_image_url: f.venue.cover_image_url,
        city: f.venue.city,
        state: f.venue.state,
        country: f.venue.country,
        favorited_at: f.created_at,
      }));

    return NextResponse.json({ venues });
  } catch (error: any) {
    console.error("Error fetching favorite venues:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch favorite venues" },
      { status: 500 }
    );
  }
}

