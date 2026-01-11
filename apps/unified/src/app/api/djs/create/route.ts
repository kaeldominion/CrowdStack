import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId } from "@/lib/auth/check-role";
import { generateUniqueDJHandle } from "@/lib/utils/handle-generation";
import { normalizeInstagramUrl, normalizeWebsiteUrl, normalizeMixcloudUrl, normalizeSpotifyUrl, normalizeYoutubeUrl } from "@/lib/utils/url-normalization";

export const dynamic = 'force-dynamic';

/**
 * POST /api/djs/create
 * Create a DJ profile (for venue admins, organizers, and superadmins)
 * The DJ profile can be claimed by a user later
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Check if user has permission (venue_admin, organizer, or superadmin)
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roles = userRoles?.map((r) => r.role) || [];
    const hasPermission = roles.some(r =>
      ["superadmin", "venue_admin", "organizer"].includes(r)
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: "Only venue admins and organizers can create DJ profiles" },
        { status: 403 }
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

    // Check for potential duplicates by name (case-insensitive)
    const { data: potentialDuplicates } = await serviceSupabase
      .from("djs")
      .select("id, name, handle, location, profile_image_url")
      .ilike("name", `%${name.trim()}%`)
      .limit(5);

    // If duplicates found and not explicitly confirmed, return them for user review
    if (potentialDuplicates && potentialDuplicates.length > 0 && !body.confirmed) {
      return NextResponse.json({
        duplicates: potentialDuplicates,
        message: "Potential duplicate DJs found. Please confirm to create anyway.",
      }, { status: 409 }); // Conflict status
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

    // Create DJ profile (without user_id - can be claimed later)
    const { data: newDJ, error: createError } = await serviceSupabase
      .from("djs")
      .insert({
        user_id: null, // Can be claimed later
        handle,
        name: name.trim(),
        bio: bio?.trim() || null,
        location: location?.trim() || null,
        genres: genres && Array.isArray(genres) ? genres.filter((g: string) => g && g.trim()) : [],
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
        { error: createError?.message || "Failed to create DJ profile" },
        { status: 500 }
      );
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
