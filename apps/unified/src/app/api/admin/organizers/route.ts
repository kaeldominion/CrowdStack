import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

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

    // Get all organizers
    const { data: organizers, error } = await serviceSupabase
      .from("organizers")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    // Get event counts for each organizer
    const organizersWithCounts = await Promise.all(
      (organizers || []).map(async (organizer: any) => {
        const { count } = await serviceSupabase
          .from("events")
          .select("*", { count: "exact", head: true })
          .eq("organizer_id", organizer.id);

        return {
          ...organizer,
          events_count: count || 0,
        };
      })
    );

    return NextResponse.json({ organizers: organizersWithCounts });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch organizers" },
      { status: 500 }
    );
  }
}

