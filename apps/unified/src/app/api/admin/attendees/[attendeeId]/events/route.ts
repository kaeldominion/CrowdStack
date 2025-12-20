import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { cookies } from "next/headers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ attendeeId: string }> }
) {
  try {
    const { attendeeId } = await params;
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
        error: "Forbidden - Superadmin role required" 
      }, { status: 403 });
    }

    // Get all registrations for this attendee with event details
    const { data: registrations, error } = await serviceSupabase
      .from("registrations")
      .select(`
        id,
        registered_at,
        qr_pass_token,
        event:events (
          id,
          name,
          start_time,
          end_time,
          status,
          venue:venues (
            id,
            name
          )
        )
      `)
      .eq("attendee_id", attendeeId)
      .order("registered_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Get checkins for these registrations
    const regIds = registrations?.map((r) => r.id) || [];
    let checkins: any[] = [];
    
    if (regIds.length > 0) {
      const { data: checkinData } = await serviceSupabase
        .from("checkins")
        .select("registration_id, checked_in_at")
        .in("registration_id", regIds)
        .is("undo_at", null);
      
      checkins = checkinData || [];
    }

    // Map registrations to a simpler format
    const events = registrations?.map((reg: any) => {
      const event = Array.isArray(reg.event) ? reg.event[0] : reg.event;
      const venue = event?.venue ? (Array.isArray(event.venue) ? event.venue[0] : event.venue) : null;
      const checkin = checkins.find((c) => c.registration_id === reg.id);

      return {
        registration_id: reg.id,
        event_id: event?.id,
        event_name: event?.name || "Unknown Event",
        event_date: event?.start_time,
        event_status: event?.status,
        venue_id: venue?.id,
        venue_name: venue?.name || "Unknown Venue",
        registered_at: reg.registered_at,
        checked_in: !!checkin,
        checked_in_at: checkin?.checked_in_at || null,
      };
    }) || [];

    return NextResponse.json({ events });
  } catch (error: any) {
    console.error("Error fetching attendee events:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch attendee events" },
      { status: 500 }
    );
  }
}

