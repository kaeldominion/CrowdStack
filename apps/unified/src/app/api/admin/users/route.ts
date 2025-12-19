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

    // Get roles and profile for each user
    const usersWithRoles = await Promise.all(
      (authUsers?.users || []).map(async (authUser) => {
        // Get roles
        const { data: roles } = await serviceSupabase
          .from("user_roles")
          .select("role")
          .eq("user_id", authUser.id);

        // Get attendee profile if linked
        const { data: attendee } = await serviceSupabase
          .from("attendees")
          .select("id, name, surname, email, phone, whatsapp, avatar_url, instagram_handle, tiktok_handle, date_of_birth, bio")
          .eq("user_id", authUser.id)
          .single();

        // Get venue assignments
        const { data: venueAssignments } = await serviceSupabase
          .from("venue_users")
          .select("venue:venues(id, name)")
          .eq("user_id", authUser.id);

        // Get organizer assignments
        const { data: organizerAssignments } = await serviceSupabase
          .from("organizer_users")
          .select("organizer:organizers(id, name)")
          .eq("user_id", authUser.id);

        return {
          id: authUser.id,
          email: authUser.email,
          created_at: authUser.created_at,
          last_sign_in_at: authUser.last_sign_in_at,
          roles: roles?.map((r) => r.role) || [],
          profile: attendee || null,
          venues: venueAssignments?.map((v: any) => {
            const venue = Array.isArray(v.venue) ? v.venue[0] : v.venue;
            return venue;
          }).filter(Boolean) || [],
          organizers: organizerAssignments?.map((o: any) => {
            const org = Array.isArray(o.organizer) ? o.organizer[0] : o.organizer;
            return org;
          }).filter(Boolean) || [],
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

