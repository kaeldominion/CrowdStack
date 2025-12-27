"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, Button, Badge } from "@crowdstack/ui";
import { Calendar, Clock, Users, ArrowRight } from "lucide-react";

interface UpcomingEvent {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  cover_image_url: string | null;
  capacity: number | null;
  registration_count: number;
  organizer: {
    id: string;
    name: string;
  } | null;
}

interface UpcomingEventsListProps {
  events: UpcomingEvent[];
}

export function UpcomingEventsList({ events }: UpcomingEventsListProps) {
  if (!events || events.length === 0) {
    return (
      <Card>
        <h2 className="text-2xl font-semibold text-primary mb-6">Upcoming Events</h2>
        <div className="text-center py-12">
          <p className="text-secondary">No upcoming events scheduled.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="text-2xl font-semibold text-primary mb-6">Upcoming Events</h2>
      <div className="space-y-6">
        {events.map((event) => {
          const startDate = new Date(event.start_time);
          const endDate = event.end_time ? new Date(event.end_time) : null;
          const isUpcoming = startDate > new Date();
          const isLive = startDate <= new Date() && (!endDate || endDate > new Date());

          return (
            <div
              key={event.id}
              className="border-2 border-border p-4 hover:border-primary/50 transition-colors"
            >
              <div className="flex flex-col md:flex-row gap-4">
                {/* Event Image */}
                {event.cover_image_url && (
                  <div className="relative w-full md:w-48 h-32 flex-shrink-0 border-2 border-border">
                    <Image
                      src={event.cover_image_url}
                      alt={event.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                {/* Event Details */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-primary mb-1">{event.name}</h3>
                      {event.description && (
                        <p className="text-sm text-secondary line-clamp-2">
                          {event.description}
                        </p>
                      )}
                    </div>
                    {isLive && (
                      <Badge variant="success" size="sm">
                        Live Now
                      </Badge>
                    )}
                    {isUpcoming && (
                      <Badge variant="default" size="sm">
                        Upcoming
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-secondary">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {startDate.toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>
                        {startDate.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        {endDate &&
                          ` - ${endDate.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}`}
                      </span>
                    </div>
                    {event.capacity && (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>
                          {event.registration_count} / {event.capacity}
                        </span>
                      </div>
                    )}
                    {event.organizer && (
                      <div className="text-secondary">
                        by {event.organizer.name}
                      </div>
                    )}
                  </div>

                  <Link href={`/e/${event.slug}`}>
                    <Button variant="secondary" size="sm">
                      View Event
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

