import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * Debug endpoint to check if seed data exists
 * This bypasses RLS using service role
 */
export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    const [venues, organizers, promoters, attendees, events, registrations] = await Promise.all([
      supabase.from("venues").select("id, name").limit(10),
      supabase.from("organizers").select("id, name").limit(10),
      supabase.from("promoters").select("id, name").limit(10),
      supabase.from("attendees").select("id, name").limit(10),
      supabase.from("events").select("id, name").limit(10),
      supabase.from("registrations").select("id").limit(10),
    ]);

    return NextResponse.json({
      venues: {
        count: venues.data?.length || 0,
        sample: venues.data?.slice(0, 3) || [],
        error: venues.error?.message,
      },
      organizers: {
        count: organizers.data?.length || 0,
        sample: organizers.data?.slice(0, 3) || [],
        error: organizers.error?.message,
      },
      promoters: {
        count: promoters.data?.length || 0,
        sample: promoters.data?.slice(0, 3) || [],
        error: promoters.error?.message,
      },
      attendees: {
        count: attendees.data?.length || 0,
        sample: attendees.data?.slice(0, 3) || [],
        error: attendees.error?.message,
      },
      events: {
        count: events.data?.length || 0,
        sample: events.data?.slice(0, 3) || [],
        error: events.error?.message,
      },
      registrations: {
        count: registrations.data?.length || 0,
        error: registrations.error?.message,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to check data" },
      { status: 500 }
    );
  }
}

