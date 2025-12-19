import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceSupabase = createServiceRoleClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Step 1: Check if attendee exists for this user
    const { data: attendeeByUserId, error: attendeeError } = await serviceSupabase
      .from("attendees")
      .select("*")
      .eq("user_id", user.id);
    
    // Step 2: Check if attendee exists by email
    const { data: attendeeByEmail, error: emailError } = await serviceSupabase
      .from("attendees")
      .select("*")
      .eq("email", user.email);

    // Step 3: Get all registrations for this user's attendee(s)
    const attendeeIds = [
      ...(attendeeByUserId?.map(a => a.id) || []),
      ...(attendeeByEmail?.map(a => a.id) || []),
    ];
    const uniqueAttendeeIds = [...new Set(attendeeIds)];

    let registrations = null;
    if (uniqueAttendeeIds.length > 0) {
      const { data: regs, error: regError } = await serviceSupabase
        .from("registrations")
        .select(`
          id,
          event_id,
          attendee_id,
          created_at,
          event:events(id, name, slug, start_time, end_time, status)
        `)
        .in("attendee_id", uniqueAttendeeIds);
      
      registrations = regs;
    }

    // Step 4: Check RLS - what does the normal client see?
    const { data: rlsAttendee, error: rlsAttendeeError } = await supabase
      .from("attendees")
      .select("*")
      .eq("user_id", user.id);

    const { data: rlsRegistrations, error: rlsRegError } = await supabase
      .from("registrations")
      .select("*");

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      attendee_by_user_id: {
        data: attendeeByUserId,
        error: attendeeError?.message,
      },
      attendee_by_email: {
        data: attendeeByEmail,
        error: emailError?.message,
      },
      unique_attendee_ids: uniqueAttendeeIds,
      registrations_via_service_role: registrations,
      rls_check: {
        attendee_visible: rlsAttendee,
        attendee_error: rlsAttendeeError?.message,
        registrations_visible: rlsRegistrations,
        registrations_error: rlsRegError?.message,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

