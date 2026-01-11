import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRole } from "@crowdstack/shared/auth/roles";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const searchQuery = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  // Ensure reasonable limits
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const safePage = Math.max(page, 1);

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await userHasRole("superadmin"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get auth users with pagination
    const { data: authUsersData, error: authError } = await serviceSupabase.auth.admin.listUsers({
      page: safePage,
      perPage: safeLimit,
    });

    if (authError) {
      console.error("[Admin Users] Error listing users:", authError);
      throw authError;
    }

    let authUsers = authUsersData?.users || [];
    const totalFromAuth = (authUsersData as any)?.total || authUsers.length;

    // Filter by search query if provided (client-side filter since Supabase auth doesn't support server-side search)
    if (searchQuery && searchQuery.trim().length > 0) {
      const searchLower = searchQuery.toLowerCase();
      authUsers = authUsers.filter((u) => u.email?.toLowerCase().includes(searchLower));
    }

    if (authUsers.length === 0) {
      return NextResponse.json({
        users: [],
        pagination: {
          page: safePage,
          limit: safeLimit,
          total: totalFromAuth,
          totalPages: Math.ceil(totalFromAuth / safeLimit),
          hasMore: false,
        },
      });
    }

    // BATCH QUERY OPTIMIZATION: Fetch all related data in bulk
    const userIds = authUsers.map((u) => u.id);

    // 1. Batch fetch all roles
    const { data: allRoles } = await serviceSupabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", userIds);

    const rolesByUser = new Map<string, string[]>();
    (allRoles || []).forEach((r) => {
      if (!rolesByUser.has(r.user_id)) {
        rolesByUser.set(r.user_id, []);
      }
      rolesByUser.get(r.user_id)!.push(r.role);
    });

    // 2. Batch fetch all attendee profiles
    const { data: allAttendees } = await serviceSupabase
      .from("attendees")
      .select("user_id, id, name, surname, email, phone, whatsapp, avatar_url, instagram_handle, tiktok_handle, date_of_birth, bio")
      .in("user_id", userIds);

    const profileByUser = new Map<string, any>();
    (allAttendees || []).forEach((a) => {
      if (a.user_id) {
        profileByUser.set(a.user_id, a);
      }
    });

    // 3. Batch fetch venue assignments
    const { data: allVenueAssignments } = await serviceSupabase
      .from("venue_users")
      .select("user_id, venue:venues(id, name)")
      .in("user_id", userIds);

    const venuesByUser = new Map<string, any[]>();
    (allVenueAssignments || []).forEach((v: any) => {
      if (!venuesByUser.has(v.user_id)) {
        venuesByUser.set(v.user_id, []);
      }
      const venue = Array.isArray(v.venue) ? v.venue[0] : v.venue;
      if (venue) venuesByUser.get(v.user_id)!.push(venue);
    });

    // 4. Batch fetch organizer assignments
    const { data: allOrgAssignments } = await serviceSupabase
      .from("organizer_users")
      .select("user_id, organizer:organizers(id, name)")
      .in("user_id", userIds);

    const orgsByUser = new Map<string, any[]>();
    (allOrgAssignments || []).forEach((o: any) => {
      if (!orgsByUser.has(o.user_id)) {
        orgsByUser.set(o.user_id, []);
      }
      const org = Array.isArray(o.organizer) ? o.organizer[0] : o.organizer;
      if (org) orgsByUser.get(o.user_id)!.push(org);
    });

    // 5. Batch fetch DJ profiles
    const { data: allDJs } = await serviceSupabase
      .from("djs")
      .select("user_id, id, name, handle")
      .in("user_id", userIds);

    const djsByUser = new Map<string, any[]>();
    (allDJs || []).forEach((dj: any) => {
      if (dj.user_id) {
        if (!djsByUser.has(dj.user_id)) {
          djsByUser.set(dj.user_id, []);
        }
        djsByUser.get(dj.user_id)!.push(dj);
      }
    });

    // 6. Batch fetch promoter profiles
    const { data: allPromoters } = await serviceSupabase
      .from("promoters")
      .select("user_id, id, name, slug")
      .in("user_id", userIds);

    const promotersByUser = new Map<string, any[]>();
    (allPromoters || []).forEach((p: any) => {
      if (p.user_id) {
        if (!promotersByUser.has(p.user_id)) {
          promotersByUser.set(p.user_id, []);
        }
        promotersByUser.get(p.user_id)!.push(p);
      }
    });

    // Build response using pre-fetched data (no additional queries)
    const usersWithRoles = authUsers.map((authUser) => ({
      id: authUser.id,
      email: authUser.email,
      created_at: authUser.created_at,
      last_sign_in_at: authUser.last_sign_in_at,
      roles: rolesByUser.get(authUser.id) || [],
      profile: profileByUser.get(authUser.id) || null,
      venues: venuesByUser.get(authUser.id) || [],
      organizers: orgsByUser.get(authUser.id) || [],
      djs: djsByUser.get(authUser.id) || [],
      promoters: promotersByUser.get(authUser.id) || [],
    }));

    const totalPages = Math.ceil(totalFromAuth / safeLimit);
    const hasMore = safePage < totalPages;

    return NextResponse.json({
      users: usersWithRoles,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total: totalFromAuth,
        totalPages,
        hasMore,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch users" },
      { status: 500 }
    );
  }
}

