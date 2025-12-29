import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserDJId } from "@/lib/data/get-user-entity";
import { cookies } from "next/headers";

/**
 * GET /api/dj/mixes
 * Get all mixes for the current DJ (both draft and published)
 * Query params: ?djId=xxx (optional, for admin/public access)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const djIdParam = searchParams.get("djId");
    
    const serviceSupabase = createServiceRoleClient();
    
    let djId: string | null = null;

    if (djIdParam) {
      // Allow public access if djId is provided
      djId = djIdParam;
    } else {
      // Get current user's DJ ID (for authenticated requests)
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      djId = await getUserDJId();
      if (!djId) {
        return NextResponse.json({ error: "DJ profile not found" }, { status: 404 });
      }
    }

    const { data: mixes, error } = await serviceSupabase
      .from("mixes")
      .select("*")
      .eq("dj_id", djId)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching mixes:", error);
      return NextResponse.json({ error: "Failed to fetch mixes" }, { status: 500 });
    }

    return NextResponse.json({ mixes: mixes || [] });
  } catch (error: any) {
    console.error("Error fetching mixes:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dj/mixes
 * Create a new mix
 * Query params: ?djId=xxx (optional, for admin access)
 */
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

    const serviceSupabase = createServiceRoleClient();
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    const roles = userRoles?.map((r) => r.role) || [];
    const isSuperadmin = roles.includes("superadmin");

    const { searchParams } = new URL(request.url);
    const djIdParam = searchParams.get("djId");
    
    let djId: string | null = null;
    
    if (djIdParam && isSuperadmin) {
      djId = djIdParam;
    } else {
      djId = await getUserDJId();
      if (!djId) {
        return NextResponse.json({ error: "DJ profile not found" }, { status: 404 });
      }
    }

    const body = await request.json();
    const {
      title,
      description,
      soundcloud_url,
      cover_image_url,
      status = "draft",
      is_featured = false,
    } = body;

    if (!soundcloud_url || !soundcloud_url.trim()) {
      return NextResponse.json({ error: "SoundCloud URL is required" }, { status: 400 });
    }

    // Normalize the SoundCloud URL (resolves shortlinks to full URLs)
    let normalizedSoundcloudUrl = soundcloud_url.trim();
    try {
      const { normalizeSoundCloudUrl } = await import("@/lib/utils/soundcloud-metadata");
      const normalized = await normalizeSoundCloudUrl(soundcloud_url.trim());
      if (normalized) {
        normalizedSoundcloudUrl = normalized;
      } else {
        return NextResponse.json({ error: "Invalid SoundCloud URL. Please use a full SoundCloud track URL." }, { status: 400 });
      }
    } catch (normalizeError) {
      console.error("Error normalizing SoundCloud URL:", normalizeError);
      return NextResponse.json({ error: "Failed to validate SoundCloud URL. Please check the URL and try again." }, { status: 400 });
    }

    // Fetch video metadata from SoundCloud if title/description not provided
    let finalTitle = title?.trim() || null;
    let finalDescription = description?.trim() || null;

    if (!finalTitle || !finalDescription) {
      try {
        const { fetchSoundCloudMetadata } = await import("@/lib/utils/soundcloud-metadata");
        const metadata = await fetchSoundCloudMetadata(normalizedSoundcloudUrl);
        
        if (metadata) {
          finalTitle = finalTitle || metadata.title || null;
          finalDescription = finalDescription || metadata.description || null;
        }
      } catch (metadataError) {
        console.error("Error fetching SoundCloud metadata:", metadataError);
        // Continue without metadata - user can edit later
      }
    }

    // Title is required - use "Untitled Mix" if we couldn't fetch it
    if (!finalTitle) {
      finalTitle = "Untitled Mix";
    }

    // Generate SoundCloud embed URL (use normalized URL)
    // Format: https://w.soundcloud.com/player/?url={soundcloud_url}&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&visual=true
    const soundcloudEmbedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(normalizedSoundcloudUrl)}&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&visual=true`;

    // Get the next display order
    const { data: existingMixes } = await serviceSupabase
      .from("mixes")
      .select("display_order")
      .eq("dj_id", djId)
      .order("display_order", { ascending: false })
      .limit(1);

    const nextDisplayOrder = existingMixes && existingMixes.length > 0
      ? (existingMixes[0].display_order || 0) + 1
      : 0;

    // If this mix is being featured, unfeatured any other featured mixes for this DJ
    if (is_featured === true) {
      await serviceSupabase
        .from("mixes")
        .update({ is_featured: false })
        .eq("dj_id", djId);
    }

    const mixData: any = {
      dj_id: djId,
      title: finalTitle,
      description: finalDescription,
      soundcloud_url: normalizedSoundcloudUrl,
      soundcloud_embed_url: soundcloudEmbedUrl,
      cover_image_url: cover_image_url?.trim() || null,
      status: status === "published" ? "published" : "draft",
      display_order: nextDisplayOrder,
      is_featured: is_featured === true,
      plays_count: 0,
      published_at: status === "published" ? new Date().toISOString() : null,
    };

    const { data: newMix, error: createError } = await serviceSupabase
      .from("mixes")
      .insert(mixData)
      .select()
      .single();

    if (createError || !newMix) {
      console.error("Error creating mix:", createError);
      return NextResponse.json({ error: "Failed to create mix" }, { status: 500 });
    }

    return NextResponse.json({ mix: newMix });
  } catch (error: any) {
    console.error("Error creating mix:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

