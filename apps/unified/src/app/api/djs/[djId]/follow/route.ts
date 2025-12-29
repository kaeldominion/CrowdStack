import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * GET /api/djs/[djId]/follow
 * Check if current user is following this DJ
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { djId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ isFollowing: false, followerCount: 0 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Check if user is following
    const { data: follow } = await serviceSupabase
      .from("dj_follows")
      .select("id")
      .eq("user_id", user.id)
      .eq("dj_id", params.djId)
      .single();

    // Get follower count
    const { data: follows } = await serviceSupabase
      .from("dj_follows")
      .select("id")
      .eq("dj_id", params.djId);

    return NextResponse.json({
      isFollowing: !!follow,
      followerCount: follows?.length || 0,
    });
  } catch (error: any) {
    console.error("Error checking follow status:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/djs/[djId]/follow
 * Follow a DJ
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { djId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Verify DJ exists
    const { data: dj } = await serviceSupabase
      .from("djs")
      .select("id")
      .eq("id", params.djId)
      .single();

    if (!dj) {
      return NextResponse.json({ error: "DJ not found" }, { status: 404 });
    }

    // Check if already following
    const { data: existingFollow } = await serviceSupabase
      .from("dj_follows")
      .select("id")
      .eq("user_id", user.id)
      .eq("dj_id", params.djId)
      .single();

    if (existingFollow) {
      return NextResponse.json({ success: true, alreadyFollowing: true });
    }

    // Create follow
    const { error: followError } = await serviceSupabase
      .from("dj_follows")
      .insert({
        user_id: user.id,
        dj_id: params.djId,
      });

    if (followError) {
      console.error("Error creating follow:", followError);
      return NextResponse.json({ error: "Failed to follow DJ" }, { status: 500 });
    }

    // Get updated follower count
    const { data: follows } = await serviceSupabase
      .from("dj_follows")
      .select("id")
      .eq("dj_id", params.djId);

    return NextResponse.json({
      success: true,
      followerCount: follows?.length || 0,
    });
  } catch (error: any) {
    console.error("Error following DJ:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/djs/[djId]/follow
 * Unfollow a DJ
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { djId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Delete follow
    const { error: deleteError } = await serviceSupabase
      .from("dj_follows")
      .delete()
      .eq("user_id", user.id)
      .eq("dj_id", params.djId);

    if (deleteError) {
      console.error("Error deleting follow:", deleteError);
      return NextResponse.json({ error: "Failed to unfollow DJ" }, { status: 500 });
    }

    // Get updated follower count
    const { data: follows } = await serviceSupabase
      .from("dj_follows")
      .select("id")
      .eq("dj_id", params.djId);

    return NextResponse.json({
      success: true,
      followerCount: follows?.length || 0,
    });
  } catch (error: any) {
    console.error("Error unfollowing DJ:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}



