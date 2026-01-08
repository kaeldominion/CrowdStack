import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { cookies } from "next/headers";

/**
 * GET /api/admin/djs
 * Get all DJs (superadmin only)
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
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
          // Cookie parse error - continue without userId
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized - no user ID found" }, { status: 401 });
    }

    // Check role using service role to bypass RLS
    const serviceSupabase = createServiceRoleClient();
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    const roles = userRoles?.map((r) => r.role) || [];
    const isSuperadmin = roles.includes("superadmin");

    if (!isSuperadmin) {
      return NextResponse.json({ 
        error: "Forbidden - Superadmin role required",
        yourRoles: roles 
      }, { status: 403 });
    }

    // Get all DJs
    const { data: djs, error } = await serviceSupabase
      .from("djs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching DJs:", error);
      return NextResponse.json({ error: "Failed to fetch DJs" }, { status: 500 });
    }

    // Get mix counts and follower counts for each DJ
    const djsWithCounts = await Promise.all(
      (djs || []).map(async (dj) => {
        // Get user email using admin API
        let email: string | null = null;
        try {
          const { data: userData } = await serviceSupabase.auth.admin.getUserById(dj.user_id);
          email = userData?.user?.email || null;
        } catch (authError) {
          console.error(`Error fetching email for user ${dj.user_id}:`, authError);
          // Continue without email
        }

        // Get mix count
        const { count: mixesCount } = await serviceSupabase
          .from("mixes")
          .select("*", { count: "exact", head: true })
          .eq("dj_id", dj.id);

        // Get follower count
        const { count: followerCount } = await serviceSupabase
          .from("dj_follows")
          .select("*", { count: "exact", head: true })
          .eq("dj_id", dj.id);

        return {
          ...dj,
          email,
          mixes_count: mixesCount || 0,
          follower_count: followerCount || 0,
        };
      })
    );

    return NextResponse.json({ djs: djsWithCounts });
  } catch (error: any) {
    console.error("Error fetching DJs:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

