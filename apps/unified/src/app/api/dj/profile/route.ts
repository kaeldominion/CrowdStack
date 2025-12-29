import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserDJId } from "@/lib/data/get-user-entity";
import { normalizeInstagramUrl, normalizeWebsiteUrl, normalizeMixcloudUrl, normalizeSpotifyUrl, normalizeYoutubeUrl } from "@/lib/utils/url-normalization";

/**
 * GET /api/dj/profile
 * Get current user's DJ profile
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const djId = await getUserDJId();
    if (!djId) {
      return NextResponse.json({ error: "DJ profile not found" }, { status: 404 });
    }

    const serviceSupabase = createServiceRoleClient();

    const { data: dj, error: djError } = await serviceSupabase
      .from("djs")
      .select("*")
      .eq("id", djId)
      .single();

    if (djError || !dj) {
      return NextResponse.json({ error: "DJ profile not found" }, { status: 404 });
    }

    return NextResponse.json({ dj });
  } catch (error: any) {
    console.error("Error fetching DJ profile:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/dj/profile
 * Update current user's DJ profile
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const djId = await getUserDJId();
    if (!djId) {
      return NextResponse.json({ error: "DJ profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      handle,
      bio,
      location,
      genres,
      instagram_url,
      soundcloud_url,
      mixcloud_url,
      spotify_url,
      youtube_url,
      website_url,
    } = body;

    const serviceSupabase = createServiceRoleClient();

    // Validate handle uniqueness if changing
    if (handle) {
      const { data: existingDJ } = await serviceSupabase
        .from("djs")
        .select("handle")
        .eq("handle", handle)
        .neq("id", djId)
        .single();

      if (existingDJ) {
        return NextResponse.json(
          { error: "Handle is already taken" },
          { status: 400 }
        );
      }
    }

    // Normalize URLs
    const normalizedInstagram = instagram_url !== undefined ? normalizeInstagramUrl(instagram_url) : undefined;
    const normalizedWebsite = website_url !== undefined ? normalizeWebsiteUrl(website_url) : undefined;
    const normalizedMixcloud = mixcloud_url !== undefined ? normalizeMixcloudUrl(mixcloud_url) : undefined;
    const normalizedSpotify = spotify_url !== undefined ? normalizeSpotifyUrl(spotify_url) : undefined;
    const normalizedYoutube = youtube_url !== undefined ? normalizeYoutubeUrl(youtube_url) : undefined;

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name.trim();
    if (handle !== undefined) updateData.handle = handle.trim();
    if (bio !== undefined) updateData.bio = bio?.trim() || null;
    if (location !== undefined) updateData.location = location?.trim() || null;
    if (genres !== undefined) updateData.genres = genres && Array.isArray(genres) ? genres.filter((g: string) => g && g.trim()) : [];
    if (instagram_url !== undefined) updateData.instagram_url = normalizedInstagram;
    if (soundcloud_url !== undefined) updateData.soundcloud_url = soundcloud_url?.trim() || null;
    if (mixcloud_url !== undefined) updateData.mixcloud_url = normalizedMixcloud;
    if (spotify_url !== undefined) updateData.spotify_url = normalizedSpotify;
    if (youtube_url !== undefined) updateData.youtube_url = normalizedYoutube;
    if (website_url !== undefined) updateData.website_url = normalizedWebsite;

    const { data: updatedDJ, error: updateError } = await serviceSupabase
      .from("djs")
      .update(updateData)
      .eq("id", djId)
      .select()
      .single();

    if (updateError || !updatedDJ) {
      console.error("Error updating DJ profile:", updateError);
      return NextResponse.json(
        { error: "Failed to update DJ profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ dj: updatedDJ });
  } catch (error: any) {
    console.error("Error updating DJ profile:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

