import { Calendar, Users, MapPin } from "lucide-react";

export interface WidgetEvent {
  id: string;
  slug: string;
  name: string;
  start_time: string;
  end_time: string | null;
  cover_image_url: string | null;
  venue_name?: string | null;
  venue_city?: string | null;
  organizer_name?: string | null;
  registration_count?: number;
}

interface WidgetEventCardProps {
  event: WidgetEvent;
  baseUrl: string;
  layout: "list" | "grid";
}

function formatEventDate(startTime: string): string {
  const date = new Date(startTime);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) {
    return `Today at ${timeStr}`;
  }
  if (isTomorrow) {
    return `Tomorrow at ${timeStr}`;
  }

  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return `${dateStr} at ${timeStr}`;
}

function isEventLive(startTime: string, endTime: string | null): boolean {
  const now = new Date();
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : null;

  if (start > now) return false;
  if (end && end < now) return false;
  if (!end && now.getTime() - start.getTime() > 8 * 60 * 60 * 1000) return false;

  return true;
}

export function WidgetEventCard({ event, baseUrl, layout }: WidgetEventCardProps) {
  const eventUrl = `${baseUrl}/e/${event.slug}`;
  const isLive = isEventLive(event.start_time, event.end_time);
  const locationText = event.venue_name
    ? event.venue_city
      ? `${event.venue_name}, ${event.venue_city}`
      : event.venue_name
    : event.organizer_name || null;

  if (layout === "grid") {
    return (
      <a
        href={eventUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="widget-event-card-grid"
      >
        {event.cover_image_url ? (
          <img
            src={event.cover_image_url}
            alt={event.name}
            className="widget-event-image"
          />
        ) : (
          <div className="widget-event-image-placeholder">
            <Calendar />
          </div>
        )}
        <div className="widget-event-info">
          {isLive && <span className="widget-badge-live">Live</span>}
          <h3 className="widget-event-name">{event.name}</h3>
          <p className="widget-event-date">{formatEventDate(event.start_time)}</p>
          {locationText && (
            <p className="widget-event-venue">{locationText}</p>
          )}
        </div>
      </a>
    );
  }

  // List layout (default)
  return (
    <a
      href={eventUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="widget-event-card"
    >
      {event.cover_image_url ? (
        <img
          src={event.cover_image_url}
          alt={event.name}
          className="widget-event-image"
        />
      ) : (
        <div className="widget-event-image-placeholder">
          <Calendar />
        </div>
      )}
      <div className="widget-event-info">
        {isLive && <span className="widget-badge-live">Live</span>}
        <h3 className="widget-event-name">{event.name}</h3>
        <p className="widget-event-date">{formatEventDate(event.start_time)}</p>
        {locationText && (
          <p className="widget-event-venue">
            <MapPin className="inline-block w-3 h-3 mr-1" />
            {locationText}
          </p>
        )}
        {event.registration_count !== undefined && event.registration_count > 0 && (
          <div className="widget-event-meta">
            <span className="widget-event-attendees">
              <Users />
              {event.registration_count} going
            </span>
          </div>
        )}
      </div>
    </a>
  );
}
