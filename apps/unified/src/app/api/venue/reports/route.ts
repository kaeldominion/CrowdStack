import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserVenueId } from "@/lib/data/get-user-entity";

export const dynamic = 'force-dynamic';

/**
 * GET /api/venue/reports
 * Get aggregated reports data for venue
 * Query params: ?type=event_performance|attendee_analytics|revenue|organizer_performance&startDate=&endDate=
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const venueId = await getUserVenueId();
    if (!venueId) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("type") || "event_performance";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const serviceSupabase = createServiceRoleClient();

    // Build date filter
    let dateFilter = {};
    if (startDate) {
      dateFilter = { ...dateFilter, gte: startDate };
    }
    if (endDate) {
      dateFilter = { ...dateFilter, lte: endDate };
    }

    switch (reportType) {
      case "event_performance": {
        // Get all events for this venue
        let eventsQuery = serviceSupabase
          .from("events")
          .select(`
            id,
            name,
            slug,
            start_time,
            end_time,
            status,
            capacity,
            organizer:organizers(id, name)
          `)
          .eq("venue_id", venueId)
          .order("start_time", { ascending: false });

        if (startDate) {
          eventsQuery = eventsQuery.gte("start_time", startDate);
        }
        if (endDate) {
          eventsQuery = eventsQuery.lte("start_time", endDate);
        }

        const { data: events } = await eventsQuery;

        if (!events || events.length === 0) {
          return NextResponse.json({ events: [], summary: null });
        }

        const eventIds = events.map(e => e.id);

        // Get registrations and check-ins in batch
        const { data: registrations } = await serviceSupabase
          .from("registrations")
          .select("id, event_id")
          .in("event_id", eventIds);

        const regIds = registrations?.map(r => r.id) || [];
        const { data: checkins } = await regIds.length > 0
          ? await serviceSupabase
              .from("checkins")
              .select("registration_id, registrations!inner(event_id)")
              .in("registration_id", regIds)
              .is("undo_at", null)
          : { data: [] };

        // Build counts
        const regsByEvent = new Map<string, number>();
        const checkinsByEvent = new Map<string, number>();

        registrations?.forEach(reg => {
          regsByEvent.set(reg.event_id, (regsByEvent.get(reg.event_id) || 0) + 1);
        });

        (checkins || []).forEach((checkin: any) => {
          const eventId = checkin.registrations?.event_id;
          if (eventId) {
            checkinsByEvent.set(eventId, (checkinsByEvent.get(eventId) || 0) + 1);
          }
        });

        // Build event performance data
        const eventPerformance = events.map(event => {
          const regs = regsByEvent.get(event.id) || 0;
          const checkins = checkinsByEvent.get(event.id) || 0;
          const conversionRate = regs > 0 ? Math.round((checkins / regs) * 100) : 0;

          return {
            id: event.id,
            name: event.name,
            slug: event.slug,
            start_time: event.start_time,
            end_time: event.end_time,
            status: event.status,
            capacity: event.capacity,
            organizer: Array.isArray(event.organizer) ? event.organizer[0] : event.organizer,
            registrations: regs,
            checkins: checkins,
            conversionRate,
          };
        });

        // Calculate summary
        const totalRegistrations = Array.from(regsByEvent.values()).reduce((a, b) => a + b, 0);
        const totalCheckins = Array.from(checkinsByEvent.values()).reduce((a, b) => a + b, 0);
        const avgConversionRate = eventPerformance.length > 0
          ? Math.round(eventPerformance.reduce((sum, e) => sum + e.conversionRate, 0) / eventPerformance.length)
          : 0;

        return NextResponse.json({
          events: eventPerformance,
          summary: {
            totalEvents: eventPerformance.length,
            totalRegistrations,
            totalCheckins,
            avgConversionRate,
          },
        });
      }

      case "attendee_analytics": {
        // Get all events for this venue
        const { data: venueEvents } = await serviceSupabase
          .from("events")
          .select("id")
          .eq("venue_id", venueId);

        const eventIds = venueEvents?.map(e => e.id) || [];
        if (eventIds.length === 0) {
          return NextResponse.json({
            totalAttendees: 0,
            newAttendees: 0,
            returningAttendees: 0,
            vipCount: 0,
            flaggedCount: 0,
            trends: [],
          });
        }

        // Get all registrations
        let regsQuery = serviceSupabase
          .from("registrations")
          .select("id, attendee_id, registered_at, event_id")
          .in("event_id", eventIds);

        if (startDate) {
          regsQuery = regsQuery.gte("registered_at", startDate);
        }
        if (endDate) {
          regsQuery = regsQuery.lte("registered_at", endDate);
        }

        const { data: registrations } = await regsQuery;

        const attendeeIds = Array.from(new Set(registrations?.map(r => r.attendee_id) || []));
        const totalAttendees = attendeeIds.length;

        // Get attendee details
        const { data: attendees } = await serviceSupabase
          .from("attendees")
          .select("id, created_at")
          .in("id", attendeeIds);

        // Count new vs returning (new = created in date range, returning = created before)
        const dateRangeStart = startDate ? new Date(startDate) : new Date(0);
        const newAttendees = attendees?.filter(a => new Date(a.created_at) >= dateRangeStart).length || 0;
        const returningAttendees = totalAttendees - newAttendees;

        // Get VIP counts
        const { data: venueVips } = await serviceSupabase
          .from("venue_vips")
          .select("attendee_id")
          .eq("venue_id", venueId)
          .in("attendee_id", attendeeIds);

        const { data: globalVips } = await serviceSupabase
          .from("attendees")
          .select("id")
          .in("id", attendeeIds)
          .eq("is_global_vip", true);

        const vipCount = new Set([
          ...(venueVips?.map(v => v.attendee_id) || []),
          ...(globalVips?.map(a => a.id) || []),
        ]).size;

        // Get flagged count
        const { data: flags } = await serviceSupabase
          .from("guest_flags")
          .select("attendee_id")
          .eq("venue_id", venueId)
          .in("attendee_id", attendeeIds);

        const flaggedCount = new Set(flags?.map(f => f.attendee_id) || []).size;

        // Build trends (monthly breakdown)
        const trends: Array<{ month: string; newAttendees: number; totalAttendees: number }> = [];
        if (registrations && registrations.length > 0) {
          const byMonth = new Map<string, { new: Set<string>; total: Set<string> }>();

          registrations.forEach(reg => {
            const date = new Date(reg.registered_at);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            
            if (!byMonth.has(monthKey)) {
              byMonth.set(monthKey, { new: new Set(), total: new Set() });
            }

            const monthData = byMonth.get(monthKey)!;
            monthData.total.add(reg.attendee_id);

            // Check if attendee is new (created in this month)
            const attendee = attendees?.find(a => a.id === reg.attendee_id);
            if (attendee) {
              const attendeeDate = new Date(attendee.created_at);
              const attendeeMonth = `${attendeeDate.getFullYear()}-${String(attendeeDate.getMonth() + 1).padStart(2, "0")}`;
              if (attendeeMonth === monthKey) {
                monthData.new.add(reg.attendee_id);
              }
            }
          });

          const sortedMonths = Array.from(byMonth.entries()).sort();
          trends.push(...sortedMonths.map(([month, data]) => ({
            month,
            newAttendees: data.new.size,
            totalAttendees: data.total.size,
          })));
        }

        return NextResponse.json({
          totalAttendees,
          newAttendees,
          returningAttendees,
          vipCount,
          flaggedCount,
          trends,
        });
      }

      case "organizer_performance": {
        // Get all events for this venue
        const { data: venueEvents } = await serviceSupabase
          .from("events")
          .select("id, organizer_id, start_time")
          .eq("venue_id", venueId);

        if (!venueEvents || venueEvents.length === 0) {
          return NextResponse.json({ organizers: [] });
        }

        // Filter by date if provided
        let filteredEvents = venueEvents;
        if (startDate) {
          filteredEvents = filteredEvents.filter(e => new Date(e.start_time) >= new Date(startDate));
        }
        if (endDate) {
          filteredEvents = filteredEvents.filter(e => new Date(e.start_time) <= new Date(endDate));
        }

        const eventIds = filteredEvents.map(e => e.id);
        const organizerIds = Array.from(new Set(filteredEvents.map(e => e.organizer_id).filter(Boolean)));

        // Get organizer details
        const { data: organizers } = await serviceSupabase
          .from("organizers")
          .select("id, name, email")
          .in("id", organizerIds);

        // Get registrations and check-ins
        const { data: registrations } = await serviceSupabase
          .from("registrations")
          .select("id, event_id")
          .in("event_id", eventIds);

        const regIds = registrations?.map(r => r.id) || [];
        const { data: checkins } = await regIds.length > 0
          ? await serviceSupabase
              .from("checkins")
              .select("registration_id, registrations!inner(event_id)")
              .in("registration_id", regIds)
              .is("undo_at", null)
          : { data: [] };

        // Build organizer stats
        const organizerStats = new Map<string, { events: number; registrations: number; checkins: number }>();

        filteredEvents.forEach(event => {
          if (!event.organizer_id) return;
          if (!organizerStats.has(event.organizer_id)) {
            organizerStats.set(event.organizer_id, { events: 0, registrations: 0, checkins: 0 });
          }
          const stats = organizerStats.get(event.organizer_id)!;
          stats.events += 1;
        });

        registrations?.forEach(reg => {
          const event = filteredEvents.find(e => e.id === reg.event_id);
          if (event?.organizer_id) {
            const stats = organizerStats.get(event.organizer_id);
            if (stats) {
              stats.registrations += 1;
            }
          }
        });

        (checkins || []).forEach((checkin: any) => {
          const eventId = checkin.registrations?.event_id;
          const event = filteredEvents.find(e => e.id === eventId);
          if (event?.organizer_id) {
            const stats = organizerStats.get(event.organizer_id);
            if (stats) {
              stats.checkins += 1;
            }
          }
        });

        // Build response
        const organizerPerformance = (organizers || []).map(org => {
          const stats = organizerStats.get(org.id) || { events: 0, registrations: 0, checkins: 0 };
          const conversionRate = stats.registrations > 0
            ? Math.round((stats.checkins / stats.registrations) * 100)
            : 0;

          return {
            id: org.id,
            name: org.name,
            email: org.email,
            ...stats,
            conversionRate,
          };
        }).sort((a, b) => b.events - a.events);

        return NextResponse.json({ organizers: organizerPerformance });
      }

      case "revenue": {
        // Get all events for this venue
        let eventsQuery = serviceSupabase
          .from("events")
          .select("id, name, slug, start_time, currency")
          .eq("venue_id", venueId);

        if (startDate) {
          eventsQuery = eventsQuery.gte("start_time", startDate);
        }
        if (endDate) {
          eventsQuery = eventsQuery.lte("start_time", endDate);
        }

        const { data: events } = await eventsQuery;
        const eventIds = events?.map(e => e.id) || [];

        if (eventIds.length === 0) {
          return NextResponse.json({
            totalRevenue: 0,
            totalCommissions: 0,
            events: [],
            byCurrency: {},
          });
        }

        // Get table booking commissions
        const { data: commissions } = await serviceSupabase
          .from("table_booking_commissions")
          .select("event_id, venue_commission_amount, spend_amount, currency")
          .in("event_id", eventIds);

        // Aggregate by event and currency
        const eventRevenue = new Map<string, { revenue: number; commissions: number; currency: string }>();
        const byCurrency: Record<string, { revenue: number; commissions: number }> = {};

        events?.forEach(event => {
          eventRevenue.set(event.id, {
            revenue: 0,
            commissions: 0,
            currency: event.currency || "USD",
          });
        });

        commissions?.forEach(comm => {
          const currency = comm.currency || "USD";
          const eventData = eventRevenue.get(comm.event_id);
          if (eventData) {
            eventData.revenue += comm.spend_amount || 0;
            eventData.commissions += comm.venue_commission_amount || 0;
          }

          if (!byCurrency[currency]) {
            byCurrency[currency] = { revenue: 0, commissions: 0 };
          }
          byCurrency[currency].revenue += comm.spend_amount || 0;
          byCurrency[currency].commissions += comm.venue_commission_amount || 0;
        });

        const revenueEvents = events?.map(event => {
          const data = eventRevenue.get(event.id) || { revenue: 0, commissions: 0, currency: event.currency || "USD" };
          return {
            id: event.id,
            name: event.name,
            slug: event.slug,
            start_time: event.start_time,
            currency: data.currency,
            revenue: data.revenue,
            commissions: data.commissions,
          };
        }) || [];

        const totalRevenue = Object.values(byCurrency).reduce((sum, c) => sum + c.revenue, 0);
        const totalCommissions = Object.values(byCurrency).reduce((sum, c) => sum + c.commissions, 0);

        return NextResponse.json({
          totalRevenue,
          totalCommissions,
          events: revenueEvents,
          byCurrency,
        });
      }

      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("[Venue Reports] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate report" },
      { status: 500 }
    );
  }
}
