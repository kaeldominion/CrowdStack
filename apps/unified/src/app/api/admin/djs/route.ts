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
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const search = searchParams.get("search") || "";

    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);
    const offset = (safePage - 1) * safeLimit;

    const cookieStore = await cookies();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let userId = user?.id;

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
    if (!roles.includes("superadmin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build query with optional search
    let query = serviceSupabase
      .from("djs")
      .select("*", { count: "exact" });

    if (search) {
      query = query.or(`name.ilike.%${search}%,handle.ilike.%${search}%,location.ilike.%${search}%`);
    }

    const { data: djs, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + safeLimit - 1);

    if (error) throw error;

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / safeLimit);
    const hasMore = safePage < totalPages;

    // Batch fetch counts and emails
    const djIds = (djs || []).map((d: any) => d.id);
    const userIds = (djs || []).map((d: any) => d.user_id);
    const mixCountMap = new Map<string, number>();
    const followerCountMap = new Map<string, number>();
    const emailMap = new Map<string, string>();

    if (djIds.length > 0) {
      const { data: mixes } = await serviceSupabase
        .from("mixes")
        .select("dj_id")
        .in("dj_id", djIds);

      (mixes || []).forEach((m: any) => {
        mixCountMap.set(m.dj_id, (mixCountMap.get(m.dj_id) || 0) + 1);
      });

      const { data: follows } = await serviceSupabase
        .from("dj_follows")
        .select("dj_id")
        .in("dj_id", djIds);

      (follows || []).forEach((f: any) => {
        followerCountMap.set(f.dj_id, (followerCountMap.get(f.dj_id) || 0) + 1);
      });
    }

    // Batch fetch emails (limited to avoid too many auth calls)
    for (const uid of userIds.slice(0, 50)) {
      try {
        const { data: userData } = await serviceSupabase.auth.admin.getUserById(uid);
        if (userData?.user?.email) {
          emailMap.set(uid, userData.user.email);
        }
      } catch (e) {
        // Continue without email
      }
    }

    const djsWithCounts = (djs || []).map((dj: any) => ({
      ...dj,
      email: emailMap.get(dj.user_id) || null,
      mixes_count: mixCountMap.get(dj.id) || 0,
      follower_count: followerCountMap.get(dj.id) || 0,
    }));

    return NextResponse.json({
      djs: djsWithCounts,
      pagination: { page: safePage, limit: safeLimit, total: totalCount, totalPages, hasMore }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch DJs" },
      { status: 500 }
    );
  }
}

