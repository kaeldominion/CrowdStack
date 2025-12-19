import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@crowdstack/shared";

async function getUser(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
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
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isSuperadmin(user.id))) {
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

    if (error || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Get stats
    const { count: registrationsCount } = await supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("event_id", params.eventId);

    const { count: checkinsCount } = await supabase
      .from("checkins")
      .select("*", { count: "exact", head: true })
      .eq("registration_id", params.eventId);

    return NextResponse.json({
      event,
      stats: {
        registrations_count: registrationsCount || 0,
        checkins_count: checkinsCount || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching event:", error);
    return NextResponse.json(
      { error: "Failed to fetch event" },
      { status: 500 }
    );
  }
}

