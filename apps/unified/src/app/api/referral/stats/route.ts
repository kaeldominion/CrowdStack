import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Get total clicks for this user
    const { count: totalClicks } = await serviceSupabase
      .from("referral_clicks")
      .select("*", { count: "exact", head: true })
      .eq("referrer_user_id", user.id);

    // Get total registrations from this user's referrals
    const { count: totalRegistrations } = await serviceSupabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("referred_by_user_id", user.id);

    // Get converted clicks (clicks that led to registrations)
    const { count: convertedClicks } = await serviceSupabase
      .from("referral_clicks")
      .select("*", { count: "exact", head: true })
      .eq("referrer_user_id", user.id)
      .not("converted_at", "is", null);

    // Calculate conversion rate
    const conversionRate = totalClicks && totalClicks > 0
      ? Math.round((convertedClicks || 0) / totalClicks * 100)
      : 0;

    // Get per-event breakdown
    const { data: eventStats } = await serviceSupabase
      .from("referral_clicks")
      .select(`
        event_id,
        events!inner(id, name, slug)
      `)
      .eq("referrer_user_id", user.id);

    // Aggregate by event
    const eventBreakdown: Record<string, {
      eventId: string;
      eventName: string;
      eventSlug: string;
      clicks: number;
      registrations: number;
    }> = {};

    if (eventStats) {
      for (const click of eventStats) {
        const event = Array.isArray(click.events) ? click.events[0] : click.events;
        if (!event) continue;

        const eventId = click.event_id;
        if (!eventBreakdown[eventId]) {
          eventBreakdown[eventId] = {
            eventId,
            eventName: event.name,
            eventSlug: event.slug,
            clicks: 0,
            registrations: 0,
          };
        }
        eventBreakdown[eventId].clicks++;
      }
    }

    // Get registration counts per event
    const { data: registrations } = await serviceSupabase
      .from("registrations")
      .select(`
        event_id,
        events!inner(id, name, slug)
      `)
      .eq("referred_by_user_id", user.id);

    if (registrations) {
      for (const reg of registrations) {
        const event = Array.isArray(reg.events) ? reg.events[0] : reg.events;
        if (!event) continue;

        const eventId = reg.event_id;
        if (eventBreakdown[eventId]) {
          eventBreakdown[eventId].registrations++;
        }
      }
    }

    return NextResponse.json({
      totalClicks: totalClicks || 0,
      totalRegistrations: totalRegistrations || 0,
      convertedClicks: convertedClicks || 0,
      conversionRate,
      eventBreakdown: Object.values(eventBreakdown),
    });
  } catch (error: any) {
    console.error("[Referral Stats] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch stats" },
      { status: 500 }
    );
  }
}

