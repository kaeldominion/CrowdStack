import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getCacheControl } from "@/lib/cache";

// This route doesn't use cookies, but we'll use cache headers instead of revalidate
// Cache headers provide better control for API routes

/**
 * GET /api/events/by-slug/[slug]
 * Get event by slug (public route - only returns published events)
 * This is the canonical route used by the event page component
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = createServiceRoleClient();

    // Get published event by slug
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select(`
        *,
        organizer:organizers(id, name),
        venue:venues(id, name, slug, address, city, state, country)
      `)
      .eq("slug", params.slug)
      .eq("status", "published")
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Get registration count
    const { count: registrationCount } = await supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("event_id", event.id);

    return NextResponse.json({
      event: {
        ...event,
        registration_count: registrationCount || 0,
      },
    }, {
      headers: {
        'Cache-Control': getCacheControl({ tier: 'public-short', maxAge: 30, swr: 120 }),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch event" },
      { status: 500 }
    );
  }
}

