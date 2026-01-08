import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { assignUserRole } from "@crowdstack/shared/auth/roles";
import { generateUniqueDJHandle } from "@/lib/utils/handle-generation";
import { normalizeInstagramUrl, normalizeWebsiteUrl, normalizeMixcloudUrl, normalizeSpotifyUrl, normalizeYoutubeUrl } from "@/lib/utils/url-normalization";
import { cookies } from "next/headers";

/**
 * POST /api/admin/djs/create
 * Create a DJ profile and assign it to a user (admin only)
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let userId = user?.id;

    // If no user from Supabase client, try reading from localhost cookie
    if (!userId) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase/)?.[1] || "supabase";
      const authCookieName = `sb-${projectRef}-auth-token`;
      const authCookie = cookieStore.get(authCookieName);

      if (authCookie) {
        try {
          const cookieValue = decodeURIComponent(authCookie.value);
          const parsed = JSON.parse(cookieValue);
          if (parsed.user?.id) {
            userId = parsed.user.id;
          }
        } catch (e) {
          // Cookie parse error
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is superadmin
    const serviceSupabase = createServiceRoleClient();
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    const roles = userRoles?.map((r) => r.role) || [];
    const isSuperadmin = roles.includes("superadmin");

    if (!isSuperadmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      user_id, // User to assign the DJ profile to (optional)
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

    // If user_id is provided, check if user already has a DJ profile
    if (user_id) {
      const { data: existingDJ } = await serviceSupabase
        .from("djs")
        .select("id")
        .eq("user_id", user_id)
        .single();

      if (existingDJ) {
        return NextResponse.json(
          { error: "User already has a DJ profile" },
          { status: 400 }
        );
      }
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
            user_id: user_id || null,
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
        { error: createError?.message || "Failed to create DJ profile" },
        { status: 500 }
      );
    }

    // Assign DJ role to user (only if user_id is provided)
    if (user_id) {
      try {
        await assignUserRole(user_id, "dj");
      } catch (roleError: any) {
        console.error("Error assigning DJ role:", roleError);
        // Don't fail the request if role assignment fails - profile is created
        // Role can be assigned manually later if needed
      }
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

