import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRole } from "@crowdstack/shared/auth/roles";

/**
 * GET /api/photos/[photoId]/comments
 * List all non-deleted comments for a photo
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { photoId: string } }
) {
  try {
    const serviceSupabase = createServiceRoleClient();

    // Get comments (non-deleted, newest first)
    const { data: comments, error } = await serviceSupabase
      .from("photo_comments")
      .select(`
        id,
        user_id,
        user_name,
        user_avatar_url,
        content,
        created_at
      `)
      .eq("photo_id", params.photoId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      comments: comments || [],
      count: comments?.length || 0,
    });
  } catch (error: any) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/photos/[photoId]/comments
 * Add a new comment (logged-in users only)
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

    const body = await request.json();
    const content = body.content?.trim();

    if (!content) {
      return NextResponse.json({ error: "Comment content is required" }, { status: 400 });
    }

    if (content.length > 1000) {
      return NextResponse.json({ error: "Comment must be 1000 characters or less" }, { status: 400 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Verify photo exists
    const { data: photo } = await serviceSupabase
      .from("photos")
      .select("id")
      .eq("id", params.photoId)
      .single();

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Get user display info
    const userName = user.user_metadata?.name || user.email?.split("@")[0] || "User";
    const userAvatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.avatar || null;

    // Insert comment
    const { data: comment, error } = await serviceSupabase
      .from("photo_comments")
      .insert({
        photo_id: params.photoId,
        user_id: user.id,
        user_name: userName,
        user_avatar_url: userAvatarUrl,
        content,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      comment,
    });
  } catch (error: any) {
    console.error("Error adding comment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add comment" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/photos/[photoId]/comments?commentId=xxx
 * Soft-delete a comment (own comments or admin roles)
 */
export async function DELETE(
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

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get("commentId");

    if (!commentId) {
      return NextResponse.json({ error: "commentId is required" }, { status: 400 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get the comment
    const { data: comment } = await serviceSupabase
      .from("photo_comments")
      .select("id, user_id, photo_id")
      .eq("id", commentId)
      .eq("photo_id", params.photoId)
      .is("deleted_at", null)
      .single();

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Check permissions: own comment or admin
    const isSuperadmin = await userHasRole("superadmin");
    const isOwner = comment.user_id === user.id;

    // Check if user is organizer/venue admin for this photo's event
    let isEventAdmin = false;
    if (!isOwner && !isSuperadmin) {
      // Get the event for this photo
      const { data: photo } = await serviceSupabase
        .from("photos")
        .select(`
          album:photo_albums(
            event:events(
              organizer_id,
              venue_id
            )
          )
        `)
        .eq("id", params.photoId)
        .single();

      const event = (photo?.album as any)?.event;
      if (event) {
        // Check if organizer
        const { data: organizer } = await serviceSupabase
          .from("organizers")
          .select("id")
          .eq("created_by", user.id)
          .eq("id", event.organizer_id)
          .single();

        if (organizer) {
          isEventAdmin = true;
        }

        // Check if venue admin
        if (!isEventAdmin && event.venue_id) {
          const { data: venue } = await serviceSupabase
            .from("venues")
            .select("id")
            .eq("created_by", user.id)
            .eq("id", event.venue_id)
            .single();

          if (venue) {
            isEventAdmin = true;
          }
        }
      }
    }

    if (!isOwner && !isSuperadmin && !isEventAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Soft delete the comment
    const { error } = await serviceSupabase
      .from("photo_comments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", commentId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "Comment deleted",
    });
  } catch (error: any) {
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete comment" },
      { status: 500 }
    );
  }
}

