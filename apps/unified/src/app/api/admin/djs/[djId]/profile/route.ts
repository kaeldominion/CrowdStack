import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { normalizeInstagramUrl, normalizeWebsiteUrl, normalizeMixcloudUrl, normalizeSpotifyUrl, normalizeYoutubeUrl } from "@/lib/utils/url-normalization";
import { cookies } from "next/headers";

/**
 * GET /api/admin/djs/[djId]/profile
 * Get DJ profile (admin only)
 */
export async function GET(
  request: Request,
  { params }: { params: { djId: string } }
) {
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
    
    const isSuperadmin = userRoles?.some((r) => r.role === "superadmin");
    if (!isSuperadmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { djId } = params;

    // Get DJ profile
    const { data: dj, error } = await serviceSupabase
      .from("djs")
      .select("*")
      .eq("id", djId)
      .single();

    if (error || !dj) {
      return NextResponse.json(
        { error: "DJ not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ dj });
  } catch (error) {
    console.error("Error fetching DJ profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch DJ profile" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/djs/[djId]/profile
 * Update DJ profile (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { djId: string } }
) {
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
    
    const isSuperadmin = userRoles?.some((r) => r.role === "superadmin");
    if (!isSuperadmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { djId } = params;
    const body = await request.json();

    // Normalize URLs
    const normalizedInstagram = normalizeInstagramUrl(body.instagram_url);
    const normalizedWebsite = normalizeWebsiteUrl(body.website_url);
    const normalizedMixcloud = normalizeMixcloudUrl(body.mixcloud_url);
    const normalizedSpotify = normalizeSpotifyUrl(body.spotify_url);
    const normalizedYoutube = normalizeYoutubeUrl(body.youtube_url);

    // Get current DJ to check if user_id is changing
    const { data: currentDj } = await serviceSupabase
      .from("djs")
      .select("user_id")
      .eq("id", djId)
      .single();

    const oldUserId = currentDj?.user_id;
    const newUserId = body.user_id !== undefined ? body.user_id : oldUserId;

    // Build update object
    const updateData: Record<string, any> = {
      name: body.name,
      handle: body.handle,
      bio: body.bio,
      location: body.location,
      genres: body.genres,
      instagram_url: normalizedInstagram,
      soundcloud_url: body.soundcloud_url,
      mixcloud_url: normalizedMixcloud,
      spotify_url: normalizedSpotify,
      youtube_url: normalizedYoutube,
      website_url: normalizedWebsite,
      updated_at: new Date().toISOString(),
    };

    // Only include user_id if it was explicitly provided
    if (body.user_id !== undefined) {
      updateData.user_id = body.user_id || null; // Allow unsetting with empty string
    }

    // Update DJ profile
    const { data: dj, error } = await serviceSupabase
      .from("djs")
      .update(updateData)
      .eq("id", djId)
      .select()
      .single();

    if (error) {
      console.error("Error updating DJ profile:", error);
      return NextResponse.json(
        { error: error.message || "Failed to update DJ profile" },
        { status: 400 }
      );
    }

    // Handle DJ role assignment
    if (body.user_id !== undefined && newUserId !== oldUserId) {
      // Remove DJ role from old user if they had one and no longer have any DJ profiles
      if (oldUserId) {
        const { data: otherDjProfiles } = await serviceSupabase
          .from("djs")
          .select("id")
          .eq("user_id", oldUserId)
          .neq("id", djId);
        
        if (!otherDjProfiles || otherDjProfiles.length === 0) {
          // Remove DJ role from old user
          await serviceSupabase
            .from("user_roles")
            .delete()
            .eq("user_id", oldUserId)
            .eq("role", "dj");
        }
      }

      // Add DJ role to new user if assigned
      if (newUserId) {
        // Check if user already has DJ role
        const { data: existingRole } = await serviceSupabase
          .from("user_roles")
          .select("id")
          .eq("user_id", newUserId)
          .eq("role", "dj")
          .single();

        if (!existingRole) {
          await serviceSupabase
            .from("user_roles")
            .insert({ user_id: newUserId, role: "dj" });
        }
      }
    }

    return NextResponse.json({ dj });
  } catch (error) {
    console.error("Error updating DJ profile:", error);
    return NextResponse.json(
      { error: "Failed to update DJ profile" },
      { status: 500 }
    );
  }
}



