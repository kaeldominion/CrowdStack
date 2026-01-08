import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { cookies } from "next/headers";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
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

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const { data: events, error } = await serviceSupabase
      .from("events")
      .select(`
        *,
        venue:venues(name),
        organizer:organizers(name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Get counts for each event
    const eventsWithCounts = await Promise.all(
      (events || []).map(async (event: any) => {
        const { count: regCount } = await serviceSupabase
          .from("registrations")
          .select("*", { count: "exact", head: true })
          .eq("event_id", event.id);

        // Get check-ins through registrations
        const { data: registrations } = await serviceSupabase
          .from("registrations")
          .select("id")
          .eq("event_id", event.id);
        
        const regIds = registrations?.map((r) => r.id) || [];
        let checkinCount = 0;
        
        if (regIds.length > 0) {
          const { count } = await serviceSupabase
            .from("checkins")
            .select("*", { count: "exact", head: true })
            .in("registration_id", regIds)
            .is("undo_at", null);
          checkinCount = count || 0;
        }

        return {
          ...event,
          venue: event.venue,
          organizer: event.organizer,
          registrations_count: regCount || 0,
          checkins_count: checkinCount || 0,
        };
      })
    );

    return NextResponse.json({ events: eventsWithCounts });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch events" },
      { status: 500 }
    );
  }
}

