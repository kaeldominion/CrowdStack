"use client";

import { useState, useEffect } from "react";
import { Button, LoadingSpinner, Card, Badge } from "@crowdstack/ui";
import { QrCode, Calendar, Users, ArrowRight, MapPin, Clock } from "lucide-react";
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

  const isEventLive = (event: Event) => {
    const now = new Date();
    const start = new Date(event.start_time);
    const end = start.getTime() + (2 * 60 * 60 * 1000);
    return now >= start && now.getTime() <= end && event.status === "published";
  };

  const activeEvents = events.filter(isEventLive);
  const upcomingEvents = events.filter(
    (e) => new Date(e.start_time) > new Date() && e.status === "published"
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <LoadingSpinner text="Loading events..." size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Door Scanner</h1>
        <p className="mt-2 text-sm text-secondary">
          Select an event to start scanning QR codes and checking in attendees
        </p>
      </div>

      {activeEvents.length > 0 && (
        <div>
          <h2 className="section-header mb-4 flex items-center gap-2">
            <div className="h-2 w-2 bg-accent-success rounded-full animate-pulse" />
            Live Now
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeEvents.map((event) => (
              <Card key={event.id} className="p-6 hover:border-accent-primary/50 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-primary mb-1 truncate">{event.name}</h3>
                    {event.venue && (
                      <p className="text-sm text-secondary flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {event.venue.name}
                      </p>
                    )}
                  </div>
                  <Badge variant="success" className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 bg-accent-success rounded-full animate-pulse" />
                    LIVE
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mb-5 text-sm text-secondary">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    <span className="font-medium text-primary">{event.current_attendance || 0}</span>
                    {event.capacity && <span>/ {event.capacity}</span>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {new Date(event.start_time).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <Link href={`/door/${event.id}`}>
                  <Button variant="primary" size="lg" className="w-full">
                    Start Scanning
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      )}

      {upcomingEvents.length > 0 && (
        <div>
          <h2 className="section-header mb-4">Upcoming Events</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingEvents.map((event) => (
              <Card key={event.id} className="p-6 hover:border-accent-primary/50 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-primary mb-1 truncate">{event.name}</h3>
                    {event.venue && (
                      <p className="text-sm text-secondary flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {event.venue.name}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 mb-5 text-sm text-secondary">
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
                  <Button variant="secondary" size="lg" className="w-full">
                    Open Scanner
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      )}

      {events.length === 0 && (
        <Card className="p-12 text-center">
          <QrCode className="h-12 w-12 text-muted mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-primary mb-2">No Events Available</h3>
          <p className="text-secondary">
            You don't have access to any events yet. Contact your administrator.
          </p>
        </Card>
      )}
    </div>
  );
}
