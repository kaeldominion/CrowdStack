import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * GET /api/photos/[photoId]/likes
 * Get like count and current user's like status
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(
  request: NextRequest,
  { params }: { params: { photoId: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const serviceSupabase = createServiceRoleClient();

    // Get like count from cached counter
    const { data: photo } = await serviceSupabase
      .from("photos")
      .select("like_count")
      .eq("id", params.photoId)
      .single();

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Check if current user has liked (if logged in)
    let isLiked = false;
    if (user) {
      const { data: like } = await serviceSupabase
        .from("photo_likes")
        .select("id")
        .eq("photo_id", params.photoId)
        .eq("user_id", user.id)
        .single();

      isLiked = !!like;
    }

    return NextResponse.json({
      count: photo.like_count || 0,
      isLiked,
    });
  } catch (error: any) {
    console.error("Error fetching likes:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch likes" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/photos/[photoId]/likes
 * Toggle like for current user (add if not liked, remove if liked)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { photoId: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Verify photo exists
    const { data: photo } = await serviceSupabase
      .from("photos")
      .select("id, like_count")
      .eq("id", params.photoId)
      .single();

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Check if already liked
    const { data: existingLike } = await serviceSupabase
      .from("photo_likes")
      .select("id")
      .eq("photo_id", params.photoId)
      .eq("user_id", user.id)
      .single();

    if (existingLike) {
      // Unlike - delete the like
      const { error } = await serviceSupabase
        .from("photo_likes")
        .delete()
        .eq("id", existingLike.id);

      if (error) {
        throw error;
      }

      // Get updated count
      const { data: updatedPhoto } = await serviceSupabase
        .from("photos")
        .select("like_count")
        .eq("id", params.photoId)
        .single();

      return NextResponse.json({
        success: true,
        action: "unliked",
        isLiked: false,
        count: updatedPhoto?.like_count || 0,
      });
    } else {
      // Like - insert new like
      const { error } = await serviceSupabase
        .from("photo_likes")
        .insert({
          photo_id: params.photoId,
          user_id: user.id,
        });

      if (error) {
        // Handle unique constraint violation (shouldn't happen but be safe)
        if (error.code === "23505") {
          return NextResponse.json({
            success: true,
            action: "already_liked",
            isLiked: true,
            count: photo.like_count || 0,
          });
        }
        throw error;
      }

      // Get updated count
      const { data: updatedPhoto } = await serviceSupabase
        .from("photos")
        .select("like_count")
        .eq("id", params.photoId)
        .single();

      return NextResponse.json({
        success: true,
        action: "liked",
        isLiked: true,
        count: updatedPhoto?.like_count || 0,
      });
    }
  } catch (error: any) {
    console.error("Error toggling like:", error);
    return NextResponse.json(
      { error: error.message || "Failed to toggle like" },
      { status: 500 }
    );
  }
}

