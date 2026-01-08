import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { assignUserRole } from "@crowdstack/shared/auth/roles";
import { generateUniqueDJHandle } from "@/lib/utils/handle-generation";
import { normalizeInstagramUrl, normalizeWebsiteUrl, normalizeMixcloudUrl, normalizeSpotifyUrl, normalizeYoutubeUrl } from "@/lib/utils/url-normalization";

/**
 * POST /api/dj/create
 * Create a DJ profile for the current user
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Check if user already has a DJ profile
    const { data: existingDJ } = await serviceSupabase
      .from("djs")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existingDJ) {
      return NextResponse.json(
        { error: "User already has a DJ profile" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      name,
      handle: providedHandle,
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

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Generate handle if not provided
    let handle = providedHandle?.trim();
    if (!handle) {
      handle = await generateUniqueDJHandle(name);
    } else {
      // Validate handle format
      const handleRegex = /^[a-z0-9-]+$/;
      if (!handleRegex.test(handle)) {
        return NextResponse.json(
          { error: "Handle must contain only lowercase letters, numbers, and hyphens" },
          { status: 400 }
        );
      }

      // Check handle uniqueness
      const { data: existingHandle } = await serviceSupabase
        .from("djs")
        .select("handle")
        .eq("handle", handle)
        .single();

      if (existingHandle) {
        return NextResponse.json(
          { error: "Handle is already taken" },
          { status: 400 }
        );
      }

      // Prepend "dj-" if not already present
      if (!handle.startsWith("dj-")) {
        handle = `dj-${handle}`;
      }
    }

    // Normalize URLs
    const normalizedInstagram = normalizeInstagramUrl(instagram_url);
    const normalizedWebsite = normalizeWebsiteUrl(website_url);
    const normalizedMixcloud = normalizeMixcloudUrl(mixcloud_url);
    const normalizedSpotify = normalizeSpotifyUrl(spotify_url);
    const normalizedYoutube = normalizeYoutubeUrl(youtube_url);

    // Create DJ profile
    const { data: newDJ, error: createError } = await serviceSupabase
      .from("djs")
      .insert({
        user_id: user.id,
        handle,
        name: name.trim(),
        bio: bio?.trim() || null,
        location: location?.trim() || null,
        genres: genres && Array.isArray(genres) ? genres.filter(g => g && g.trim()) : [],
        instagram_url: normalizedInstagram,
        soundcloud_url: soundcloud_url?.trim() || null,
        mixcloud_url: normalizedMixcloud,
        spotify_url: normalizedSpotify,
        youtube_url: normalizedYoutube,
        website_url: normalizedWebsite,
      })
      .select()
      .single();

    if (createError || !newDJ) {
      console.error("Error creating DJ profile:", createError);
      return NextResponse.json(
        { error: "Failed to create DJ profile" },
        { status: 500 }
      );
    }

    // Assign DJ role to user
    try {
      await assignUserRole(user.id, "dj");
    } catch (roleError: any) {
      console.error("Error assigning DJ role:", roleError);
      // Don't fail the request if role assignment fails - profile is created
      // Role can be assigned manually later if needed
    }

    return NextResponse.json({
      dj: newDJ,
      message: "DJ profile created successfully",
    });
  } catch (error: any) {
    console.error("Error creating DJ profile:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

