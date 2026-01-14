import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { WidgetEventCard, type WidgetEvent } from "@/components/widget/WidgetEventCard";
import { WidgetHeader } from "@/components/widget/WidgetHeader";
import { WidgetCarousel, type CardSize } from "@/components/widget/WidgetCarousel";
import { Calendar, ExternalLink } from "lucide-react";

export const revalidate = 30; // ISR: revalidate every 30 seconds

type WidgetTheme = "light" | "dark";
type WidgetLayout = "list" | "grid" | "full";

interface OrganizerWidgetPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    theme?: string;
    layout?: string;
    limit?: string;
    accent?: string;
    hideHeader?: string;
    cardSize?: string;
  }>;
}

export default async function OrganizerWidgetPage({
  params,
  searchParams,
}: OrganizerWidgetPageProps) {
  const { id } = await params;
  const query = await searchParams;

  // Parse widget configuration from URL params
  const theme: WidgetTheme = query.theme === "light" ? "light" : "dark";
  const layout: WidgetLayout = query.layout === "full" ? "full" : query.layout === "grid" ? "grid" : "list";
  const limit = Math.min(Math.max(parseInt(query.limit || "5", 10), 1), 20);
  const accentColor = query.accent || null;
  const hideHeader = query.hideHeader === "true";
  const cardSize: CardSize = query.cardSize === "lg" ? "lg" : query.cardSize === "md" ? "md" : "sm";

  const supabase = createServiceRoleClient();

  // Fetch organizer
  const { data: organizer, error: organizerError } = await supabase
    .from("organizers")
    .select("id, name, logo_url")
    .eq("id", id)
    .single();

  if (organizerError || !organizer) {
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
      has_guestlist,
      venue:venues(id, name, city)
    `)
    .eq("organizer_id", organizer.id)
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
    const venue = Array.isArray(event.venue) ? event.venue[0] : event.venue;
    return {
      id: event.id,
      slug: event.slug,
      name: event.name,
      start_time: event.start_time,
      end_time: event.end_time,
      cover_image_url: event.cover_image_url || event.flier_url,
      venue_name: venue?.name || null,
      venue_city: venue?.city || null,
      registration_count: registrationCounts[event.id] || 0,
      has_guestlist: event.has_guestlist ?? false,
    };
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crowdstack.app";
  const effectiveAccent = accentColor || "9933ff";

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
            name={organizer.name}
            logoUrl={organizer.logo_url}
            type="organizer"
          />
        )}

        {formattedEvents.length > 0 ? (
          layout === "full" ? (
            <WidgetCarousel cardSize={cardSize}>
              {formattedEvents.map((event) => (
                <WidgetEventCard
                  key={event.id}
                  event={event}
                  baseUrl={baseUrl}
                  layout={layout}
                />
              ))}
            </WidgetCarousel>
          ) : (
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
          )
        ) : (
          <div className="widget-empty">
            <Calendar className="widget-empty-icon" />
            <p className="widget-empty-text">No upcoming events</p>
          </div>
        )}

        <div className="widget-footer">
          <a
            href={baseUrl}
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
