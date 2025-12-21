"use client";

import { useState, useEffect } from "react";
import { Button, LoadingSpinner } from "@crowdstack/ui";
import { QrCode, Calendar, Users, ArrowRight, MapPin } from "lucide-react";
import Link from "next/link";

interface Event {
  id: string;
  name: string;
  slug: string;
  start_time: string;
  venue?: { name: string };
  status: string;
  current_attendance?: number;
  capacity?: number;
  flier_url?: string;
}

export default function DoorLandingPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const response = await fetch("/api/door/events");
      if (!response.ok) throw new Error("Failed to load events");
      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
    }
  };

  const isEventActive = (event: Event) => {
    const now = new Date();
    const start = new Date(event.start_time);
    const end = start.getTime() + (2 * 60 * 60 * 1000); // Assume 2 hour events if no end_time
    return now >= start && now.getTime() <= end && event.status === "published";
  };

  const activeEvents = events.filter(isEventActive);
  const upcomingEvents = events.filter(
    (e) => new Date(e.start_time) > new Date() && e.status === "published"
  );

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <LoadingSpinner text="Loading events..." size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] px-4 pb-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Select an Event</h1>
          <p className="text-base text-white/60">
            Choose an event to start scanning QR codes
          </p>
        </div>

        {activeEvents.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              Live Now
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {activeEvents.map((event) => (
                <div
                  key={event.id}
                  className="relative overflow-hidden rounded-2xl border border-white/20 backdrop-blur-md bg-black/30 hover:border-white/40 hover:bg-black/40 transition-all group"
                >
                  {/* Flier background if available */}
                  {event.flier_url && (
                    <div
                      className="absolute inset-0 z-0 opacity-20 group-hover:opacity-30 transition-opacity"
                      style={{
                        backgroundImage: `url(${event.flier_url})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        filter: "blur(20px)",
                      }}
                    />
                  )}
                  <div className="relative z-10 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-white mb-1 truncate">{event.name}</h3>
                        {event.venue && (
                          <p className="text-sm text-white/60 flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {event.venue.name}
                          </p>
                        )}
                      </div>
                      <div className="px-2.5 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded-full border border-green-500/30 flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 bg-green-400 rounded-full animate-pulse" />
                        LIVE
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mb-5 text-sm text-white/60">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        <span className="font-medium text-white">{event.current_attendance || 0}</span>
                        {event.capacity && <span>/ {event.capacity}</span>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        {new Date(event.start_time).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <Link href={`/door/${event.id}`}>
                      <Button className="w-full" size="lg">
                        Start Scanning
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {upcomingEvents.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">Upcoming Events</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="relative overflow-hidden rounded-2xl border border-white/15 backdrop-blur-md bg-black/20 hover:border-white/30 hover:bg-black/30 transition-all group"
                >
                  {/* Flier background if available */}
                  {event.flier_url && (
                    <div
                      className="absolute inset-0 z-0 opacity-10 group-hover:opacity-20 transition-opacity"
                      style={{
                        backgroundImage: `url(${event.flier_url})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        filter: "blur(20px)",
                      }}
                    />
                  )}
                  <div className="relative z-10 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-white mb-1 truncate">{event.name}</h3>
                        {event.venue && (
                          <p className="text-sm text-white/60 flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {event.venue.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mb-5 text-sm text-white/60">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        {new Date(event.start_time).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <Link href={`/door/${event.id}`}>
                      <Button variant="secondary" className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20" size="lg">
                        Open Scanner
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {events.length === 0 && (
          <div className="rounded-2xl border border-white/15 backdrop-blur-md bg-black/20">
            <div className="p-12 text-center">
              <QrCode className="h-12 w-12 text-white/40 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Events Available</h3>
              <p className="text-white/60">
                You don't have access to any events yet. Contact your administrator.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

