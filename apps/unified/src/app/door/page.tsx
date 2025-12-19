"use client";

import { useState, useEffect } from "react";
import { Card, Button } from "@crowdstack/ui";
import { QrCode, Calendar, Users, ArrowRight } from "lucide-react";
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading events...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">Door Scanner</h1>
          <p className="text-lg text-white/60">
            Select an event to start scanning QR codes
          </p>
        </div>

        {activeEvents.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Active Events
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {activeEvents.map((event) => (
                <Card key={event.id} className="bg-white/5 border-white/10 hover:border-white/20 transition-colors">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">{event.name}</h3>
                        {event.venue && (
                          <p className="text-sm text-white/60">{event.venue.name}</p>
                        )}
                      </div>
                      <div className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded">
                        LIVE
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mb-4 text-sm text-white/60">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {event.current_attendance || 0}
                        {event.capacity && ` / ${event.capacity}`}
                      </div>
                      <div className="flex items-center gap-1">
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
                </Card>
              ))}
            </div>
          </div>
        )}

        {upcomingEvents.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Upcoming Events</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {upcomingEvents.map((event) => (
                <Card key={event.id} className="bg-white/5 border-white/10 hover:border-white/20 transition-colors">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">{event.name}</h3>
                        {event.venue && (
                          <p className="text-sm text-white/60">{event.venue.name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mb-4 text-sm text-white/60">
                      <div className="flex items-center gap-1">
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
                      <Button variant="secondary" className="w-full" size="lg">
                        Open Scanner
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {events.length === 0 && (
          <Card className="bg-white/5 border-white/10">
            <div className="p-12 text-center">
              <QrCode className="h-12 w-12 text-white/40 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Events Available</h3>
              <p className="text-white/60">
                You don't have access to any events yet. Contact your administrator.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

