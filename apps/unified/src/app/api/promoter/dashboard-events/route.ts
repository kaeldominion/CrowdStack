import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserPromoterId } from "@/lib/data/get-user-entity";

export interface PromoterDashboardEvent {
  id: string;
  name: string;
  slug: string;
  start_time: string;
  end_time: string | null;
  status: string;
  flier_url: string | null;
  venue_name: string | null;
  referral_link: string;
  registrations: number;
  checkins: number;
  conversionRate: number;
  isLive: boolean;
  isUpcoming: boolean;
  isPast: boolean;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const promoterId = await getUserPromoterId();
    if (!promoterId) {
      return NextResponse.json({ error: "Promoter not found" }, { status: 404 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get events this promoter is assigned to
    const { data: eventPromoters } = await serviceSupabase
      .from("event_promoters")
      .select("event_id")
      .eq("promoter_id", promoterId);

    const eventIds = eventPromoters?.map((ep) => ep.event_id) || [];

    if (eventIds.length === 0) {
      return NextResponse.json({ 
        events: [],
        liveEvents: [],
        upcomingEvents: [],
        pastEvents: [],
      });
    }

    // Get events with venue info
    const { data: events } = await serviceSupabase
      .from("events")
      .select(`
        id,
        name,
        slug,
        start_time,
        end_time,
        status,
        flier_url,
        venue:venues(name)
      `)
      .in("id", eventIds)
      .order("start_time", { ascending: false });

    if (!events || events.length === 0) {
      return NextResponse.json({ 
        events: [],
        liveEvents: [],
        upcomingEvents: [],
        pastEvents: [],
      });
    }

    // Get registration and checkin stats for each event
    const now = new Date();
    const enrichedEvents: PromoterDashboardEvent[] = [];

    for (const event of events) {
      // Get registrations this promoter brought
      const { count: registrations } = await serviceSupabase
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .eq("event_id", event.id)
        .eq("referral_promoter_id", promoterId);

      // Get checkins from this promoter's registrations
      const { data: promoterRegs } = await serviceSupabase
        .from("registrations")
        .select("id")
        .eq("event_id", event.id)
        .eq("referral_promoter_id", promoterId);

      let checkins = 0;
      if (promoterRegs && promoterRegs.length > 0) {
        const regIds = promoterRegs.map(r => r.id);
        const { count } = await serviceSupabase
          .from("checkins")
          .select("*", { count: "exact", head: true })
          .in("registration_id", regIds)
          .is("undo_at", null);
        checkins = count || 0;
      }

      const startTime = new Date(event.start_time);
      const endTime = event.end_time ? new Date(event.end_time) : new Date(startTime.getTime() + 6 * 60 * 60 * 1000); // Default 6 hours

      const isLive = now >= startTime && now <= endTime && event.status === "published";
      const isUpcoming = now < startTime && event.status === "published";
      const isPast = now > endTime || event.status === "completed";

      // Generate referral link
      const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || "https://crowdstack.app";
      const referralLink = `${baseUrl}/e/${event.slug}?ref=${promoterId}`;

      enrichedEvents.push({
        id: event.id,
        name: event.name,
        slug: event.slug,
        start_time: event.start_time,
        end_time: event.end_time,
        status: event.status,
        flier_url: event.flier_url,
        venue_name: (event.venue as any)?.name || null,
        referral_link: referralLink,
        registrations: registrations || 0,
        checkins: checkins,
        conversionRate: registrations && registrations > 0 
          ? Math.round((checkins / registrations) * 100) 
          : 0,
        isLive,
        isUpcoming,
        isPast,
      });
    }

    // Sort and categorize
    const liveEvents = enrichedEvents.filter(e => e.isLive);
    const upcomingEvents = enrichedEvents
      .filter(e => e.isUpcoming)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    const pastEvents = enrichedEvents
      .filter(e => e.isPast)
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

    return NextResponse.json({
      events: enrichedEvents,
      liveEvents,
      upcomingEvents,
      pastEvents,
      promoterId,
    });
  } catch (error: any) {
    console.error("[Promoter Dashboard Events] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch promoter events" },
      { status: 500 }
    );
  }
}

