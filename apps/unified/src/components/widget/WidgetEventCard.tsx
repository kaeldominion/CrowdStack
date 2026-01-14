import { MapPin, Users, Ticket } from "lucide-react";

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
  has_guestlist?: boolean;
}

interface WidgetEventCardProps {
  event: WidgetEvent;
  baseUrl: string;
  layout: "list" | "grid" | "full";
}

function formatEventDate(startTime: string): { date: string; time: string; isToday: boolean; isTomorrow: boolean } {
  const date = new Date(startTime);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  let dateStr: string;
  if (isToday) {
    dateStr = "TODAY";
  } else if (isTomorrow) {
    dateStr = "TOMORROW";
  } else {
    const day = date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
    const dayNum = date.getDate();
    const month = date.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
    dateStr = `${day} ${dayNum} ${month}`;
  }

  return { date: dateStr, time: timeStr, isToday, isTomorrow };
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
  const { date, time, isToday, isTomorrow } = formatEventDate(event.start_time);

  const locationText = event.venue_name
    ? event.venue_city
      ? `${event.venue_name}, ${event.venue_city}`
      : event.venue_name
    : event.organizer_name || null;

  // Full layout = 9:16 aspect ratio showing entire flier
  if (layout === "full") {
    return (
      <a
        href={eventUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="widget-card-full"
      >
        <div className="widget-card-full-inner">
          {event.cover_image_url ? (
            <img
              src={event.cover_image_url}
              alt={event.name}
              className="widget-card-full-img"
            />
          ) : (
            <div className="widget-card-full-placeholder">
              <Ticket className="widget-card-full-placeholder-icon" />
            </div>
          )}

          {/* Gradient overlay */}
          <div className="widget-card-full-gradient" />

          {/* Top badge */}
          <div className="widget-card-full-badges">
            {isLive ? (
              <span className="widget-badge widget-badge-live">
                <span className="widget-badge-dot" />
                LIVE
              </span>
            ) : (isToday || isTomorrow) ? (
              <span className="widget-badge widget-badge-upcoming">{date}</span>
            ) : null}
          </div>

          {/* Bottom content */}
          <div className="widget-card-full-content">
            <p className="widget-card-full-datetime">
              {date} • {time}
            </p>
            <h3 className="widget-card-full-name">{event.name}</h3>
            {locationText && (
              <p className="widget-card-full-venue">@ {locationText}</p>
            )}
            {event.has_guestlist && event.registration_count !== undefined && event.registration_count > 0 && (
              <div className="widget-card-full-stats">
                <Users className="widget-card-full-stats-icon" />
                <span>{event.registration_count} registered</span>
              </div>
            )}
          </div>
        </div>
      </a>
    );
  }

  // Grid layout = 3:4 portrait cards
  if (layout === "grid") {
    return (
      <a
        href={eventUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="widget-card-portrait"
      >
        <div className="widget-card-portrait-inner">
          {event.cover_image_url ? (
            <img
              src={event.cover_image_url}
              alt={event.name}
              className="widget-card-portrait-img"
            />
          ) : (
            <div className="widget-card-portrait-placeholder">
              <Ticket className="widget-card-portrait-placeholder-icon" />
            </div>
          )}

          <div className="widget-card-portrait-gradient" />

          <div className="widget-card-portrait-badges">
            {isLive ? (
              <span className="widget-badge widget-badge-live">
                <span className="widget-badge-dot" />
                LIVE
              </span>
            ) : (isToday || isTomorrow) ? (
              <span className="widget-badge widget-badge-upcoming">{date}</span>
            ) : null}
          </div>

          <div className="widget-card-portrait-content">
            <p className="widget-card-portrait-datetime">{date} • {time}</p>
            <h3 className="widget-card-portrait-name">{event.name}</h3>
            {locationText && (
              <p className="widget-card-portrait-venue">@ {locationText}</p>
            )}
            {event.has_guestlist && event.registration_count !== undefined && event.registration_count > 0 && (
              <div className="widget-card-portrait-stats">
                <Users className="widget-card-portrait-stats-icon" />
                <span>{event.registration_count} registered</span>
              </div>
            )}
          </div>
        </div>
      </a>
    );
  }

  // List layout = Row cards
  return (
    <a
      href={eventUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="widget-card-row"
    >
      <div className="widget-card-row-image">
        {event.cover_image_url ? (
          <img
            src={event.cover_image_url}
            alt={event.name}
            className="widget-card-row-img"
          />
        ) : (
          <div className="widget-card-row-placeholder">
            <Ticket className="widget-card-row-placeholder-icon" />
          </div>
        )}
        {isLive && (
          <span className="widget-card-row-live">
            <span className="widget-badge-dot" />
            LIVE
          </span>
        )}
      </div>

      <div className="widget-card-row-content">
        <div className="widget-card-row-top">
          <p className="widget-card-row-datetime">{date} • {time}</p>
          {(isToday || isTomorrow) && !isLive && (
            <span className="widget-badge widget-badge-upcoming widget-badge-sm">{date}</span>
          )}
        </div>
        <h3 className="widget-card-row-name">{event.name}</h3>
        {locationText && (
          <p className="widget-card-row-venue">
            <MapPin className="widget-card-row-venue-icon" />
            <span>{locationText}</span>
          </p>
        )}
        {event.has_guestlist && event.registration_count !== undefined && event.registration_count > 0 && (
          <div className="widget-card-row-stats">
            <span className="widget-card-row-stat-value">{event.registration_count}</span>
            <span className="widget-card-row-stat-label">registered</span>
          </div>
        )}
      </div>

      <div className="widget-card-row-arrow">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </div>
    </a>
  );
}
