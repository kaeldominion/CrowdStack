import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserDJId } from "@/lib/data/get-user-entity";
import { cookies } from "next/headers";

/**
 * PATCH /api/dj/videos/[videoId]
 * Update video
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { videoId: string } }
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

    const serviceSupabase = createServiceRoleClient();
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    const roles = userRoles?.map((r) => r.role) || [];
    const isSuperadmin = roles.includes("superadmin");

    // Verify video exists and get DJ ID
    const { data: video, error: videoError } = await serviceSupabase
      .from("dj_videos")
      .select("dj_id, djs!inner(user_id)")
      .eq("id", params.videoId)
      .single();

    if (videoError || !video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const dj = Array.isArray(video.djs) ? video.djs[0] : video.djs;

    // Check permissions: must be superadmin or the DJ owner
    if (!isSuperadmin && dj.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { youtube_url, title, description, is_featured, display_order } = body;

    const updateData: any = {};
    if (youtube_url !== undefined) {
      // Validate YouTube URL if provided
      const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
      const match = youtube_url.match(youtubeRegex);
      
      if (!match) {
        return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
      }

      const videoId = match[1];
      updateData.youtube_url = youtube_url.trim();
      updateData.thumbnail_url = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

      // Fetch video metadata from YouTube if URL changed and title/description not provided
      if (!title && !description) {
        try {
          const { fetchYouTubeMetadata } = await import("@/lib/utils/youtube-metadata");
          const metadata = await fetchYouTubeMetadata(youtube_url.trim());
          
          if (metadata) {
            updateData.title = metadata.title || null;
            updateData.description = metadata.description || null;
          }
        } catch (metadataError) {
          console.error("Error fetching YouTube metadata:", metadataError);
          // Continue without metadata update
        }
      }
    }
    if (title !== undefined) updateData.title = title?.trim() || null;
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (is_featured !== undefined) {
      updateData.is_featured = is_featured;
      // If setting as featured, unset other featured videos
      if (is_featured) {
        await serviceSupabase
          .from("dj_videos")
          .update({ is_featured: false })
          .eq("dj_id", video.dj_id)
          .eq("is_featured", true)
          .neq("id", params.videoId);
      }
    }
    if (display_order !== undefined) updateData.display_order = display_order;

    const { data: updatedVideo, error: updateError } = await serviceSupabase
      .from("dj_videos")
      .update(updateData)
      .eq("id", params.videoId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Failed to update video" },
        { status: 500 }
      );
    }

    return NextResponse.json({ video: updatedVideo });
  } catch (error: any) {
    console.error("Error updating video:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/dj/videos/[videoId]
 * Delete video
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { videoId: string } }
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

    const serviceSupabase = createServiceRoleClient();
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    const roles = userRoles?.map((r) => r.role) || [];
    const isSuperadmin = roles.includes("superadmin");

    // Verify video exists and get DJ ID
    const { data: video, error: videoError } = await serviceSupabase
      .from("dj_videos")
      .select("dj_id, djs!inner(user_id)")
      .eq("id", params.videoId)
      .single();

    if (videoError || !video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const dj = Array.isArray(video.djs) ? video.djs[0] : video.djs;

    // Check permissions: must be superadmin or the DJ owner
    if (!isSuperadmin && dj.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete from database
    const { error: deleteError } = await serviceSupabase
      .from("dj_videos")
      .delete()
      .eq("id", params.videoId);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message || "Failed to delete video" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting video:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

