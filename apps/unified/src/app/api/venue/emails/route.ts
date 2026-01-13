import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserVenueId } from "@/lib/data/get-user-entity";

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';

/**
 * GET /api/venue/emails
 * Get email logs for all events at this venue with pagination and filters
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const venueId = await getUserVenueId();
    if (!venueId) {
      return NextResponse.json({ error: "No venue found" }, { status: 404 });
    }

    const serviceSupabase = createServiceRoleClient();
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Filters
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const emailType = searchParams.get("emailType") || "";
    const templateSlug = searchParams.get("templateSlug") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    // Get all events for this venue
    const { data: events } = await serviceSupabase
      .from("events")
      .select("id")
      .eq("venue_id", venueId);

    const eventIds = events?.map((e) => e.id) || [];

    // Build query for email logs
    let query = serviceSupabase
      .from("email_send_logs")
      .select("*", { count: "exact" });

    // Filter by venue_id in metadata OR event_id in metadata
    if (eventIds.length > 0) {
      const orConditions: string[] = [];
      eventIds.forEach((eventId) => {
        orConditions.push(`metadata->>event_id.eq.${eventId}`);
      });
      orConditions.push(`metadata->>venue_id.eq.${venueId}`);
      query = query.or(orConditions.join(","));
    } else {
      // Only filter by venue_id if no events
      query = query.filter("metadata->>venue_id", "eq", venueId);
    }

    // Apply filters
    if (search) {
      query = query.or(`recipient.ilike.%${search}%,subject.ilike.%${search}%`);
    }
    if (status) {
      query = query.eq("status", status);
    }
    if (emailType) {
      query = query.eq("email_type", emailType);
    }
    if (templateSlug) {
      query = query.eq("template_slug", templateSlug);
    }
    if (startDate) {
      query = query.gte("created_at", `${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      query = query.lte("created_at", `${endDate}T23:59:59.999Z`);
    }

    // Order and paginate
    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: emails, error, count } = await query;

    if (error) {
      throw error;
    }

    // Calculate stats (for first page only)
    let stats = null;
    if (page === 1) {
      // Get all emails for stats (without pagination)
      let statsQuery = serviceSupabase
        .from("email_send_logs")
        .select("status, opened_at, clicked_at, open_count, click_count, email_type, created_at");

      if (eventIds.length > 0) {
        const orConditions: string[] = [];
        eventIds.forEach((eventId) => {
          orConditions.push(`metadata->>event_id.eq.${eventId}`);
        });
        orConditions.push(`metadata->>venue_id.eq.${venueId}`);
        statsQuery = statsQuery.or(orConditions.join(","));
      } else {
        statsQuery = statsQuery.filter("metadata->>venue_id", "eq", venueId);
      }

      const { data: allEmails } = await statsQuery;

      if (allEmails) {
        const total = allEmails.length;
        const totalSent = allEmails.filter((e) => e.status === "sent").length;
        const totalFailed = allEmails.filter((e) => e.status === "failed").length;
        const totalBounced = allEmails.filter((e) => e.status === "bounced").length;
        const totalPending = allEmails.filter((e) => e.status === "pending").length;
        const totalOpened = allEmails.filter((e) => e.opened_at || (e.open_count && e.open_count > 0)).length;
        const totalClicked = allEmails.filter((e) => e.clicked_at || (e.click_count && e.click_count > 0)).length;

        const today = new Date().toISOString().split("T")[0];
        const todayCount = allEmails.filter((e) => e.created_at?.startsWith(today)).length;

        // Group by type
        const byType: Record<string, number> = {};
        allEmails.forEach((e) => {
          const type = e.email_type || "unknown";
          byType[type] = (byType[type] || 0) + 1;
        });

        stats = {
          total,
          totalSent,
          totalFailed,
          totalBounced,
          totalPending,
          totalOpened,
          totalClicked,
          openRate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 1000) / 10 : 0,
          clickRate: totalSent > 0 ? Math.round((totalClicked / totalSent) * 1000) / 10 : 0,
          bounceRate: totalSent > 0 ? Math.round((totalBounced / totalSent) * 1000) / 10 : 0,
          todayCount,
          byType,
        };
      }
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      emails: emails || [],
      stats,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error: any) {
    console.error("Error fetching venue emails:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch emails" },
      { status: 500 }
    );
  }
}
