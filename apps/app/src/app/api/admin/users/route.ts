import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRole } from "@crowdstack/shared/auth/roles";

export async function GET() {
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

    // Get all auth users
    const { data: authUsers, error: authError } = await serviceSupabase.auth.admin.listUsers();

    if (authError) {
      throw authError;
    }

    // Get roles for each user
    const usersWithRoles = await Promise.all(
      (authUsers?.users || []).map(async (authUser) => {
        const { data: roles } = await serviceSupabase
          .from("user_roles")
          .select("role")
          .eq("user_id", authUser.id);

        return {
          id: authUser.id,
          email: authUser.email,
          created_at: authUser.created_at,
          last_sign_in_at: authUser.last_sign_in_at,
          roles: roles?.map((r) => r.role) || [],
        };
      })
    );

    return NextResponse.json({ users: usersWithRoles });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch users" },
      { status: 500 }
    );
  }
}

