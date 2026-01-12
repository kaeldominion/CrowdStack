import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserOrganizerId } from "@/lib/data/get-user-entity";

export const dynamic = 'force-dynamic';

/**
 * GET /api/organizer/reports
 * Get aggregated reports data for organizer
 * Query params: ?type=event_performance|promoter_performance|payouts|attendee_analytics&startDate=&endDate=
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizerId = await getUserOrganizerId();
    if (!organizerId) {
      return NextResponse.json({ error: "Organizer not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("type") || "event_performance";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const serviceSupabase = createServiceRoleClient();

    switch (reportType) {
      case "event_performance": {
        // Get all events for this organizer
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
            venue:venues(id, name)
          `)
          .eq("organizer_id", organizerId)
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

        // Get promoter counts per event
        const { data: eventPromoters } = await serviceSupabase
          .from("event_promoters")
          .select("event_id")
          .in("event_id", eventIds);

        const promotersByEvent = new Map<string, number>();
        eventPromoters?.forEach(ep => {
          promotersByEvent.set(ep.event_id, (promotersByEvent.get(ep.event_id) || 0) + 1);
        });

        // Build event performance data
        const eventPerformance = events.map(event => {
          const regs = regsByEvent.get(event.id) || 0;
          const checkins = checkinsByEvent.get(event.id) || 0;
          const conversionRate = regs > 0 ? Math.round((checkins / regs) * 100) : 0;
          const promoters = promotersByEvent.get(event.id) || 0;

          return {
            id: event.id,
            name: event.name,
            slug: event.slug,
            start_time: event.start_time,
            end_time: event.end_time,
            status: event.status,
            capacity: event.capacity,
            venue: Array.isArray(event.venue) ? event.venue[0] : event.venue,
            registrations: regs,
            checkins: checkins,
            conversionRate,
            promoters,
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
            totalPromoters: new Set(eventPromoters?.map(ep => ep.event_id) || []).size,
          },
        });
      }

      case "promoter_performance": {
        // Get all events for this organizer
        const { data: events } = await serviceSupabase
          .from("events")
          .select("id, start_time")
          .eq("organizer_id", organizerId);

        if (!events || events.length === 0) {
          return NextResponse.json({ promoters: [] });
        }

        // Filter by date if provided
        let filteredEvents = events;
        if (startDate) {
          filteredEvents = filteredEvents.filter(e => new Date(e.start_time) >= new Date(startDate));
        }
        if (endDate) {
          filteredEvents = filteredEvents.filter(e => new Date(e.start_time) <= new Date(endDate));
        }

        const eventIds = filteredEvents.map(e => e.id);

        // Get event promoters
        const { data: eventPromoters } = await serviceSupabase
          .from("event_promoters")
          .select("event_id, promoter_id")
          .in("event_id", eventIds);

        const promoterIds = Array.from(new Set(eventPromoters?.map(ep => ep.promoter_id) || []));

        if (promoterIds.length === 0) {
          return NextResponse.json({ promoters: [] });
        }

        // Get promoter details
        const { data: promoters } = await serviceSupabase
          .from("promoters")
          .select("id, name, email")
          .in("id", promoterIds);

        // Get registrations and check-ins by promoter
        const { data: registrations } = await serviceSupabase
          .from("registrations")
          .select("id, event_id, referral_promoter_id")
          .in("event_id", eventIds)
          .in("referral_promoter_id", promoterIds);

        const regIds = registrations?.map(r => r.id) || [];
        const { data: checkins } = await regIds.length > 0
          ? await serviceSupabase
              .from("checkins")
              .select("registration_id, registrations!inner(event_id, referral_promoter_id)")
              .in("registration_id", regIds)
              .is("undo_at", null)
          : { data: [] };

        // Get payout data
        const { data: payoutLines } = await serviceSupabase
          .from("payout_lines")
          .select(`
            promoter_id,
            commission_amount,
            checkins_count,
            payment_status,
            payout_runs!inner(event_id)
          `)
          .in("payout_runs.event_id", eventIds)
          .in("promoter_id", promoterIds);

        // Build promoter stats
        const promoterStats = new Map<string, {
          events: number;
          registrations: number;
          checkins: number;
          earnings: number;
          paidEarnings: number;
          pendingEarnings: number;
        }>();

        // Initialize
        promoters?.forEach(p => {
          promoterStats.set(p.id, {
            events: 0,
            registrations: 0,
            checkins: 0,
            earnings: 0,
            paidEarnings: 0,
            pendingEarnings: 0,
          });
        });

        // Count events per promoter
        eventPromoters?.forEach(ep => {
          const stats = promoterStats.get(ep.promoter_id);
          if (stats) {
            stats.events += 1;
          }
        });

        // Count registrations and check-ins
        registrations?.forEach(reg => {
          if (reg.referral_promoter_id) {
            const stats = promoterStats.get(reg.referral_promoter_id);
            if (stats) {
              stats.registrations += 1;
            }
          }
        });

        (checkins || []).forEach((checkin: any) => {
          const promoterId = checkin.registrations?.referral_promoter_id;
          if (promoterId) {
            const stats = promoterStats.get(promoterId);
            if (stats) {
              stats.checkins += 1;
            }
          }
        });

        // Calculate earnings from payout lines
        payoutLines?.forEach(line => {
          const stats = promoterStats.get(line.promoter_id);
          if (stats) {
            const amount = parseFloat(line.commission_amount || "0");
            stats.earnings += amount;
            if (line.payment_status === "paid" || line.payment_status === "confirmed") {
              stats.paidEarnings += amount;
            } else {
              stats.pendingEarnings += amount;
            }
          }
        });

        // Build response
        const promoterPerformance = (promoters || []).map(p => {
          const stats = promoterStats.get(p.id) || {
            events: 0,
            registrations: 0,
            checkins: 0,
            earnings: 0,
            paidEarnings: 0,
            pendingEarnings: 0,
          };
          const conversionRate = stats.registrations > 0
            ? Math.round((stats.checkins / stats.registrations) * 100)
            : 0;

          return {
            id: p.id,
            name: p.name,
            email: p.email,
            ...stats,
            conversionRate,
          };
        }).sort((a, b) => b.checkins - a.checkins);

        return NextResponse.json({ promoters: promoterPerformance });
      }

      case "payouts": {
        // Get all events for this organizer
        const { data: events } = await serviceSupabase
          .from("events")
          .select("id, name, slug, start_time, currency")
          .eq("organizer_id", organizerId)
          .order("start_time", { ascending: false });

        if (!events || events.length === 0) {
          return NextResponse.json({ payouts: [], summary: null });
        }

        const eventIds = events.map(e => e.id);

        // Get payout runs
        const { data: payoutRuns } = await serviceSupabase
          .from("payout_runs")
          .select(`
            id,
            event_id,
            generated_at,
            statement_pdf_path,
            events!inner(name, slug, start_time, currency)
          `)
          .in("event_id", eventIds)
          .order("generated_at", { ascending: false });

        // Get payout lines
        const runIds = payoutRuns?.map(pr => pr.id) || [];
        const { data: payoutLines } = await runIds.length > 0
          ? await serviceSupabase
              .from("payout_lines")
              .select(`
                id,
                payout_run_id,
                promoter_id,
                commission_amount,
                checkins_count,
                payment_status,
                promoters(id, name)
              `)
              .in("payout_run_id", runIds)
          : { data: [] };

        // Build payout data
        const payouts = (payoutRuns || []).map(pr => {
          const event = Array.isArray(pr.events) ? pr.events[0] : pr.events;
          const lines = payoutLines?.filter(pl => pl.payout_run_id === pr.id) || [];
          const totalAmount = lines.reduce((sum, line) => sum + parseFloat(line.commission_amount || "0"), 0);
          const paidAmount = lines
            .filter(line => line.payment_status === "paid" || line.payment_status === "confirmed")
            .reduce((sum, line) => sum + parseFloat(line.commission_amount || "0"), 0);
          const pendingAmount = totalAmount - paidAmount;

          return {
            id: pr.id,
            event: {
              id: event?.id,
              name: event?.name,
              slug: event?.slug,
              start_time: event?.start_time,
              currency: event?.currency || "USD",
            },
            generated_at: pr.generated_at,
            statement_pdf_path: pr.statement_pdf_path,
            totalAmount,
            paidAmount,
            pendingAmount,
            promoterCount: new Set(lines.map(l => l.promoter_id)).size,
            lineCount: lines.length,
          };
        });

        // Calculate summary
        const totalPayouts = payouts.length;
        const totalAmount = payouts.reduce((sum, p) => sum + p.totalAmount, 0);
        const totalPaid = payouts.reduce((sum, p) => sum + p.paidAmount, 0);
        const totalPending = payouts.reduce((sum, p) => sum + p.pendingAmount, 0);

        return NextResponse.json({
          payouts,
          summary: {
            totalPayouts,
            totalAmount,
            totalPaid,
            totalPending,
          },
        });
      }

      case "attendee_analytics": {
        // Get all events for this organizer
        const { data: events } = await serviceSupabase
          .from("events")
          .select("id, start_time")
          .eq("organizer_id", organizerId);

        if (!events || events.length === 0) {
          return NextResponse.json({
            totalAttendees: 0,
            bySource: {},
            trends: [],
          });
        }

        const eventIds = events.map(e => e.id);

        // Get all registrations
        let regsQuery = serviceSupabase
          .from("registrations")
          .select("id, attendee_id, registered_at, referral_promoter_id, referred_by_user_id")
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

        // Count by source
        const bySource = {
          direct: 0,
          promoter: 0,
          userReferral: 0,
        };

        registrations?.forEach(reg => {
          if (reg.referral_promoter_id) {
            bySource.promoter += 1;
          } else if (reg.referred_by_user_id) {
            bySource.userReferral += 1;
          } else {
            bySource.direct += 1;
          }
        });

        // Build trends (monthly breakdown)
        const trends: Array<{ month: string; registrations: number; checkins: number }> = [];
        if (registrations && registrations.length > 0) {
          const regIds = registrations.map(r => r.id);
          const { data: checkins } = await regIds.length > 0
            ? await serviceSupabase
                .from("checkins")
                .select("registration_id, checked_in_at")
                .in("registration_id", regIds)
                .is("undo_at", null)
            : { data: [] };

          const byMonth = new Map<string, { regs: number; checkins: number }>();

          registrations.forEach(reg => {
            const date = new Date(reg.registered_at);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            
            if (!byMonth.has(monthKey)) {
              byMonth.set(monthKey, { regs: 0, checkins: 0 });
            }

            byMonth.get(monthKey)!.regs += 1;
          });

          (checkins || []).forEach(checkin => {
            const date = new Date(checkin.checked_in_at);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            
            if (byMonth.has(monthKey)) {
              byMonth.get(monthKey)!.checkins += 1;
            }
          });

          const sortedMonths = Array.from(byMonth.entries()).sort();
          trends.push(...sortedMonths.map(([month, data]) => ({
            month,
            registrations: data.regs,
            checkins: data.checkins,
          })));
        }

        return NextResponse.json({
          totalAttendees,
          bySource,
          trends,
        });
      }

      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("[Organizer Reports] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate report" },
      { status: 500 }
    );
  }
}
