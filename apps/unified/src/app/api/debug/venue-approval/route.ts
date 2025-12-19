import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";

/**
 * Debug endpoint to check venue approval system status
 * Only accessible by superadmins
 */
export async function GET() {
  try {
    const hasAccess = await userHasRoleOrSuperadmin("superadmin");
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createServiceRoleClient();
    const diagnostics: Record<string, any> = {};

    // 1. Check if venue_approval_status column exists
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("id, name, venue_approval_status, venue_id")
      .limit(5);
    
    diagnostics.events_sample = events;
    diagnostics.events_error = eventsError?.message;
    diagnostics.column_exists = !eventsError && events !== null;

    // 2. Check notifications table
    const { data: notifications, error: notifError } = await supabase
      .from("notifications")
      .select("id, type, title, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    
    diagnostics.notifications_sample = notifications;
    diagnostics.notifications_error = notifError?.message;
    diagnostics.notifications_table_exists = !notifError;

    // 3. Check venue_organizer_partnerships table
    const { data: partnerships, error: partnerError } = await supabase
      .from("venue_organizer_partnerships")
      .select("*")
      .limit(5);
    
    diagnostics.partnerships_sample = partnerships;
    diagnostics.partnerships_error = partnerError?.message;
    diagnostics.partnerships_table_exists = !partnerError;

    // 4. Check venue_users for a sample venue
    const { data: venues } = await supabase
      .from("venues")
      .select("id, name, created_by")
      .limit(3);
    
    diagnostics.venues_sample = venues;

    if (venues && venues.length > 0) {
      const { data: venueUsers } = await supabase
        .from("venue_users")
        .select("*")
        .eq("venue_id", venues[0].id);
      
      diagnostics.venue_users_for_first_venue = venueUsers;
    }

    // 5. Check event_edits table
    const { data: edits, error: editsError } = await supabase
      .from("event_edits")
      .select("*")
      .limit(5);
    
    diagnostics.event_edits_sample = edits;
    diagnostics.event_edits_error = editsError?.message;
    diagnostics.event_edits_table_exists = !editsError;

    return NextResponse.json({
      status: "ok",
      diagnostics,
      migrations_needed: {
        "017_venue_approval_notifications.sql": !diagnostics.column_exists || !diagnostics.notifications_table_exists,
        "018_event_edit_audit.sql": !diagnostics.event_edits_table_exists,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      status: "error",
      error: error.message,
    }, { status: 500 });
  }
}

