import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { cookies } from "next/headers";

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

    return NextResponse.json({
      dj: {
        ...dj,
        email,
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
