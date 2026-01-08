import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserDJId } from "@/lib/data/get-user-entity";
import { cookies } from "next/headers";

/**
 * GET /api/dj/videos
 * List videos for DJ
 * Query params: ?djId=xxx (optional, for admin/public access)
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const djIdParam = searchParams.get("djId");
    
    const serviceSupabase = createServiceRoleClient();
    
    let djId: string | null = null;

    if (djIdParam) {
      djId = djIdParam;
    } else {
      // Get current user's DJ ID (for authenticated requests)
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        djId = await getUserDJId();
      }
    }

    if (!djId) {
      return NextResponse.json({ error: "DJ ID required" }, { status: 400 });
    }

    const { data: videos, error } = await serviceSupabase
      .from("dj_videos")
      .select("*")
      .eq("dj_id", djId)
      .order("is_featured", { ascending: false })
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching videos:", error);
      return NextResponse.json({ error: "Failed to fetch videos" }, { status: 500 });
    }

    return NextResponse.json({ videos: videos || [] });
  } catch (error: any) {
    console.error("Error fetching videos:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dj/videos
 * Add new video
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
    const { youtube_url, title, description, is_featured } = body;

    if (!youtube_url || !youtube_url.trim()) {
      return NextResponse.json({ error: "YouTube URL is required" }, { status: 400 });
    }

    // Extract YouTube video ID and validate URL
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = youtube_url.match(youtubeRegex);
    
    if (!match) {
      return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
    }

    const videoId = match[1];
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    // Fetch video metadata from YouTube if title/description not provided
    let finalTitle = title?.trim() || null;
    let finalDescription = description?.trim() || null;

    if (!finalTitle || !finalDescription) {
      try {
        const { fetchYouTubeMetadata } = await import("@/lib/utils/youtube-metadata");
        const metadata = await fetchYouTubeMetadata(youtube_url.trim());
        
        if (metadata) {
          finalTitle = finalTitle || metadata.title || null;
          finalDescription = finalDescription || metadata.description || null;
        }
      } catch (metadataError) {
        console.error("Error fetching YouTube metadata:", metadataError);
        // Continue without metadata - user can edit later
      }
    }

    // If setting as featured, unset other featured videos
    if (is_featured) {
      await serviceSupabase
        .from("dj_videos")
        .update({ is_featured: false })
        .eq("dj_id", djId)
        .eq("is_featured", true);
    }

    // Get max display_order to append at end
    const { data: lastVideo } = await serviceSupabase
      .from("dj_videos")
      .select("display_order")
      .eq("dj_id", djId)
      .order("display_order", { ascending: false })
      .limit(1)
      .single();

    const displayOrder = lastVideo?.display_order ? lastVideo.display_order + 1 : 0;

    // Insert video record
    const { data: video, error: insertError } = await serviceSupabase
      .from("dj_videos")
      .insert({
        dj_id: djId,
        youtube_url: youtube_url.trim(),
        title: finalTitle,
        description: finalDescription,
        thumbnail_url: thumbnailUrl,
        is_featured: is_featured || false,
        display_order: displayOrder,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating video:", insertError);
      return NextResponse.json(
        { error: insertError.message || "Failed to create video" },
        { status: 500 }
      );
    }

    return NextResponse.json({ video });
  } catch (error: any) {
    console.error("Error creating video:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

