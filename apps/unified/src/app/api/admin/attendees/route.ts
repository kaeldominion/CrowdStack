import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { cookies } from "next/headers";

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

    const { data: attendees, error } = await serviceSupabase
      .from("attendees")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000); // Limit for performance

    if (error) {
      throw error;
    }

    // Get counts for each attendee
    const attendeesWithCounts = await Promise.all(
      (attendees || []).map(async (attendee: any) => {
        const { count: eventsCount } = await serviceSupabase
          .from("registrations")
          .select("*", { count: "exact", head: true })
          .eq("attendee_id", attendee.id);

        // Get check-ins through registrations
        const { data: registrations } = await serviceSupabase
          .from("registrations")
          .select("id")
          .eq("attendee_id", attendee.id);
        
        const regIds = registrations?.map((r) => r.id) || [];
        let checkinsCount = 0;
        
        if (regIds.length > 0) {
          const { count } = await serviceSupabase
            .from("checkins")
            .select("*", { count: "exact", head: true })
            .in("registration_id", regIds)
            .is("undo_at", null);
          checkinsCount = count || 0;
        }

        // Get unique venues
        const { data: venueEvents } = await serviceSupabase
          .from("registrations")
          .select("event:events(venue_id)")
          .eq("attendee_id", attendee.id);

        const uniqueVenues = new Set(
          venueEvents?.map((r: any) => r.event?.venue_id).filter(Boolean) || []
        );

        // Get user info if linked - query auth.users table (admin only)
        let userInfo = null;
        if (attendee.user_id) {
          // Note: This requires admin access - using service role client
          // In production, you might want to use Supabase Admin API directly
          try {
            const { data: authUser } = await serviceSupabase
              .from("users") // This won't work directly - need to use Admin API
              .select("email, created_at, last_sign_in_at")
              .eq("id", attendee.user_id)
              .single();
            
            // For now, just mark that user_id exists
            userInfo = {
              user_id: attendee.user_id,
              has_account: true,
            };
          } catch {
            // User exists but we can't fetch details without Admin API
            userInfo = {
              user_id: attendee.user_id,
              has_account: true,
            };
          }
        }

        return {
          ...attendee,
          events_count: eventsCount || 0,
          checkins_count: checkinsCount,
          venues_count: uniqueVenues.size,
          user_info: userInfo,
        };
      })
    );

    return NextResponse.json({ attendees: attendeesWithCounts });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch attendees" },
      { status: 500 }
    );
  }
}

