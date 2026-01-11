import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { cookies } from "next/headers";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
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

    // Get user email if user_id exists
    let email = null;
    if (dj.user_id) {
      try {
        const { data: user } = await serviceSupabase.auth.admin.getUserById(dj.user_id);
        email = user?.user?.email || null;
      } catch (e) {
        // User might not exist, continue without email
      }
    }

    // Get related counts
    const { count: lineupCount } = await serviceSupabase
      .from("event_lineups")
      .select("*", { count: "exact", head: true })
      .eq("dj_id", djId);

    const { count: followerCount } = await serviceSupabase
      .from("dj_follows")
      .select("*", { count: "exact", head: true })
      .eq("dj_id", djId);

    return NextResponse.json({
      dj: {
        ...dj,
        email,
        lineup_count: lineupCount || 0,
        follower_count: followerCount || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching DJ:", error);
    return NextResponse.json(
      { error: "Failed to fetch DJ" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/djs/[djId]
 * Delete a DJ profile
 * Query params:
 *   - force=true: Delete even if DJ has lineups/followers (will cascade delete)
 */
export async function DELETE(
  request: Request,
  { params }: { params: { djId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is superadmin
    const serviceSupabase = createServiceRoleClient();
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isSuperadmin = userRoles?.some((r) => r.role === "superadmin");
    if (!isSuperadmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { djId } = params;
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";

    // Get DJ info for audit log
    const { data: dj, error: djError } = await serviceSupabase
      .from("djs")
      .select("id, name, handle, user_id")
      .eq("id", djId)
      .single();

    if (djError || !dj) {
      return NextResponse.json({ error: "DJ not found" }, { status: 404 });
    }

    // Check for related data
    const { count: lineupCount } = await serviceSupabase
      .from("event_lineups")
      .select("*", { count: "exact", head: true })
      .eq("dj_id", djId);

    const { count: followerCount } = await serviceSupabase
      .from("dj_follows")
      .select("*", { count: "exact", head: true })
      .eq("dj_id", djId);

    const hasRelatedData = (lineupCount || 0) > 0 || (followerCount || 0) > 0;

    if (hasRelatedData && !force) {
      return NextResponse.json({
        error: "DJ has related data. Use force=true to delete anyway.",
        details: {
          lineupCount: lineupCount || 0,
          followerCount: followerCount || 0,
        },
        requiresForce: true,
      }, { status: 409 });
    }

    // Delete related data first (cascade)
    if (hasRelatedData) {
      // Delete lineups
      await serviceSupabase
        .from("event_lineups")
        .delete()
        .eq("dj_id", djId);

      // Delete follows
      await serviceSupabase
        .from("dj_follows")
        .delete()
        .eq("dj_id", djId);

      // Delete gig applications
      await serviceSupabase
        .from("gig_applications")
        .delete()
        .eq("dj_id", djId);

      // Delete mixes
      await serviceSupabase
        .from("dj_mixes")
        .delete()
        .eq("dj_id", djId);
    }

    // Delete the DJ profile
    const { error: deleteError } = await serviceSupabase
      .from("djs")
      .delete()
      .eq("id", djId);

    if (deleteError) {
      console.error("Error deleting DJ:", deleteError);
      return NextResponse.json(
        { error: deleteError.message || "Failed to delete DJ" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Deleted DJ: ${dj.name}`,
      deletedDj: dj,
    });
  } catch (error: any) {
    console.error("Error deleting DJ:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete DJ" },
      { status: 500 }
    );
  }
}
