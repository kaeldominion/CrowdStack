import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { WidgetEventCard, type WidgetEvent } from "@/components/widget/WidgetEventCard";
import { WidgetHeader } from "@/components/widget/WidgetHeader";
import { Calendar, ExternalLink } from "lucide-react";

export const revalidate = 30; // ISR: revalidate every 30 seconds

type WidgetTheme = "light" | "dark";
type WidgetLayout = "list" | "grid";

interface VenueWidgetPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    theme?: string;
    layout?: string;
    limit?: string;
    accent?: string;
    hideHeader?: string;
  }>;
}

export default async function VenueWidgetPage({
  params,
  searchParams,
}: VenueWidgetPageProps) {
  const { slug } = await params;
  const query = await searchParams;

  // Parse widget configuration from URL params
  const theme: WidgetTheme = query.theme === "light" ? "light" : "dark";
  const layout: WidgetLayout = query.layout === "grid" ? "grid" : "list";
  const limit = Math.min(Math.max(parseInt(query.limit || "5", 10), 1), 20);
  const accentColor = query.accent || null;
  const hideHeader = query.hideHeader === "true";

  const supabase = createServiceRoleClient();

  // Fetch venue
  const { data: venue, error: venueError } = await supabase
    .from("venues")
    .select("id, name, slug, logo_url, accent_color")
    .eq("slug", slug)
    .single();

  if (venueError || !venue) {
    notFound();
  }

  // Fetch upcoming events
  const now = new Date().toISOString();
  const { data: events } = await supabase
    .from("events")
    .select(`
      id,
      slug,
      name,
      start_time,
      end_time,
      cover_image_url,
      flier_url,
      organizer:organizers(id, name)
    `)
    .eq("venue_id", venue.id)
    .eq("status", "published")
    .gte("start_time", now)
    .order("start_time", { ascending: true })
    .limit(limit);

  // Get registration counts
  const eventIds = events?.map((e) => e.id) || [];
  let registrationCounts: Record<string, number> = {};

  if (eventIds.length > 0) {
    const { data: registrations } = await supabase
      .from("registrations")
      .select("event_id")
      .in("event_id", eventIds);

    registrationCounts = (registrations || []).reduce(
      (acc, reg) => {
        acc[reg.event_id] = (acc[reg.event_id] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }

  // Format events for widget
  const formattedEvents: WidgetEvent[] = (events || []).map((event) => {
    // Handle Supabase's array return type for relations
    const organizer = Array.isArray(event.organizer) ? event.organizer[0] : event.organizer;
    return {
      id: event.id,
      slug: event.slug,
      name: event.name,
      start_time: event.start_time,
      end_time: event.end_time,
      cover_image_url: event.cover_image_url || event.flier_url,
      organizer_name: organizer?.name || null,
      registration_count: registrationCounts[event.id] || 0,
    };
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crowdstack.app";
  const effectiveAccent = accentColor || venue.accent_color || "9933ff";

  // Generate CSS custom properties
  const customStyles = `
    :root {
      --widget-accent: #${effectiveAccent.replace("#", "")};
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />
      <div data-theme={theme}>
        {!hideHeader && (
          <WidgetHeader
            name={venue.name}
            logoUrl={venue.logo_url}
            type="venue"
          />
        )}

        {formattedEvents.length > 0 ? (
          <div className={layout === "grid" ? "widget-events-grid" : "widget-events"}>
            {formattedEvents.map((event) => (
              <WidgetEventCard
                key={event.id}
                event={event}
                baseUrl={baseUrl}
                layout={layout}
              />
            ))}
          </div>
        ) : (
          <div className="widget-empty">
            <Calendar className="widget-empty-icon" />
            <p className="widget-empty-text">No upcoming events</p>
          </div>
        )}

        <div className="widget-footer">
          <a
            href={`${baseUrl}/v/${venue.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="widget-footer-link"
          >
            View all events on CrowdStack
            <ExternalLink />
          </a>
        </div>
      </div>
    </>
  );
}
