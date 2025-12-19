import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { cookies } from "next/headers";

async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userId = user?.id;

  // If no user from Supabase client, try reading from localhost cookie
  if (!userId) {
    const cookieStore = await cookies();
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

  return userId || null;
}

async function isSuperadmin(userId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "superadmin")
    .single();
  return !!data;
}

/**
 * GET /api/admin/events/[eventId]
 * Get event details for admin
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isSuperadmin(userId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createServiceRoleClient();

    // Get event with related data
    const { data: event, error } = await supabase
      .from("events")
      .select(`
        *,
        venue:venues!events_venue_id_fkey(id, name, address, city),
        organizer:organizers!events_organizer_id_fkey(id, name, email, created_by),
        event_promoters(
          id,
          commission_type,
          commission_config,
          promoter:promoters(id, name, email)
        )
      `)
      .eq("id", params.eventId)
      .single();

    if (error) {
      console.error("Error fetching event:", error);
      return NextResponse.json({ error: "Event not found", details: error.message }, { status: 404 });
    }

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Get registration count
    const { count: registrationsCount } = await supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("event_id", params.eventId);

    // Get check-ins count through registrations
    const { data: registrations } = await supabase
      .from("registrations")
      .select("id")
      .eq("event_id", params.eventId);
    
    let checkinsCount = 0;
    const regIds = registrations?.map((r) => r.id) || [];
    
    if (regIds.length > 0) {
      const { count } = await supabase
        .from("checkins")
        .select("*", { count: "exact", head: true })
        .in("registration_id", regIds)
        .is("undo_at", null);
      checkinsCount = count || 0;
    }

    return NextResponse.json({
      event,
      stats: {
        registrations_count: registrationsCount || 0,
        checkins_count: checkinsCount,
      },
    });
  } catch (error) {
    console.error("Error fetching event:", error);
    return NextResponse.json(
      { error: "Failed to fetch event", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
