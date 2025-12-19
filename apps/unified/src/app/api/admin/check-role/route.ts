import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { cookies } from "next/headers";

/**
 * Debug endpoint to check user roles
 * This endpoint also checks for localhost custom cookie format
 */
export async function GET() {
  try {
    // First, try to get user with regular client
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    // If no user, try checking localhost cookie directly
    if (!user) {
      const cookieStore = await cookies();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase/)?.[1] || "supabase";
      const authCookieName = `sb-${projectRef}-auth-token`;
      const authCookie = cookieStore.get(authCookieName);

      if (authCookie) {
        try {
          const cookieValue = decodeURIComponent(authCookie.value);
          const parsed = JSON.parse(cookieValue);

          if (parsed.user) {
            // We have user from cookie, but Supabase client doesn't see it
            // Use service role to get roles
            const serviceSupabase = createServiceRoleClient();
            const { data: userRoles } = await serviceSupabase
              .from("user_roles")
              .select("role")
              .eq("user_id", parsed.user.id);

            return NextResponse.json({
              user: {
                id: parsed.user.id,
                email: parsed.user.email,
                fromCookie: true,
              },
              roles: userRoles?.map((r) => r.role) || [],
              hasSuperadmin: userRoles?.some((r) => r.role === "superadmin") || false,
              cookieFound: true,
              message: "User found in cookie but Supabase client didn't authenticate",
            });
          }
        } catch (e) {
          // Cookie parse error
        }
      }

      // In local dev, redirect should use same origin. In production, use full URLs
      const isLocalDev = request.headers.get("host")?.includes("localhost");
      const redirectPath = "/admin";
      const loginUrl = "/login";
      
      return NextResponse.json({
        error: "Unauthorized",
        user: null,
        cookieFound: !!authCookie,
        message: `Please log in at ${loginUrl}?redirect=${redirectPath}`,
      }, { status: 401 });
    }

    // User found, get roles
    const roles = await getUserRolesFromDb(user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      roles,
      hasSuperadmin: roles.includes("superadmin"),
      cookieFound: false,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to check role", roles: [] },
      { status: 500 }
    );
  }
}

async function getUserRolesFromDb(userId: string) {
  const serviceSupabase = createServiceRoleClient();
  const { data } = await serviceSupabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  
  return data?.map((r) => r.role as string) || [];
}
