import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;

    // Verify admin access
    const hasAccess = await userHasRoleOrSuperadmin("superadmin");
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get venue assignments
    const { data: venueAssignments, error: venueError } = await serviceSupabase
      .from("venue_users")
      .select("venue_id")
      .eq("user_id", userId);

    if (venueError) {
      console.error("Error fetching venue assignments:", venueError);
    }

    // Get organizer assignments
    const { data: organizerAssignments, error: orgError } = await serviceSupabase
      .from("organizer_users")
      .select("organizer_id")
      .eq("user_id", userId);

    if (orgError) {
      console.error("Error fetching organizer assignments:", orgError);
    }

    return NextResponse.json({
      venues: (venueAssignments || []).map((v) => v.venue_id),
      organizers: (organizerAssignments || []).map((o) => o.organizer_id),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch assignments" },
      { status: 500 }
    );
  }
}

